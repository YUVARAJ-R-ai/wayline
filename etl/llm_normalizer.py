#!/usr/bin/env python3
"""Wayline LLM-Assisted Normalization Module.

Handles unstructured, free-text, and ambiguous geographic inputs that deterministic
rules cannot resolve (e.g., 'near old temple, Kilpauk', abbreviations, relative landmarks).

Architecture:
- Hybrid Router: Automatically directs structured data (valid lat/lon + schema)
  to deterministic parsing, and messy/free-text records to the LLM engine.
- Ollama Integration: Communicates with local/remote Ollama instance (default: mistral:7b)
  over HTTP without third-party token fees or data leaving the local network.
- Quality Gate: Records with confidence < threshold (default: 0.70) or unverified
  coordinates are flagged with `flagged: true` and `needs_review: true`.
- Offline/Mock Fallback: Provides resilient heuristic extraction and offline mode
  so CI/CD tests and non-GPU environments function gracefully.
"""

import os
import re
import json
import logging
from typing import Dict, Any, Optional, List, Union

try:
    import requests
except ImportError:
    requests = None

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("wayline.llm_normalizer")


DEFAULT_OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
DEFAULT_MODEL = os.environ.get("OLLAMA_MODEL", "mistral:7b")
DEFAULT_CONFIDENCE_THRESHOLD = float(os.environ.get("CONFIDENCE_THRESHOLD", "0.70"))
DEFAULT_TIMEOUT = int(os.environ.get("LLM_TIMEOUT", "12"))


class LLMNormalizer:
    """Normalizes unstructured geographic inputs via local LLM with quality gating."""

    def __init__(
        self,
        ollama_url: str = DEFAULT_OLLAMA_URL,
        model: str = DEFAULT_MODEL,
        confidence_threshold: float = DEFAULT_CONFIDENCE_THRESHOLD,
        timeout: int = DEFAULT_TIMEOUT,
        mock_mode: bool = False,
    ):
        self.ollama_url = ollama_url.rstrip("/")
        self.model = model
        self.confidence_threshold = confidence_threshold
        self.timeout = timeout
        self.mock_mode = mock_mode

    def is_messy_input(self, record: Union[str, Dict[str, Any]]) -> bool:
        """Determines if an input requires LLM parsing vs deterministic parsing.
        
        Returns True if:
        - Input is a raw free-text string without structured key-value coordinates.
        - Dict lacks explicit numerical 'lat'/'lng' (or 'latitude'/'longitude').
        - Text contains fuzzy geographic markers ('near', 'opp', 'behind', 'beside', 'adj').
        - Coordinate values are invalid, null, or out-of-range strings.
        """
        if isinstance(record, str):
            text = record.strip()
            # If plain string with comma-separated floats, it's structured coordinate
            if re.match(r"^-?\d{1,3}\.\d+,\s*-?\d{1,3}\.\d+$", text):
                return False
            return True

        if isinstance(record, dict):
            # Check for standard geometry or lat/lon
            has_lat = any(k in record for k in ("lat", "latitude", "y"))
            has_lon = any(k in record for k in ("lon", "longitude", "lng", "x"))
            
            if has_lat and has_lon:
                try:
                    lat = float(record.get("lat") or record.get("latitude") or record.get("y"))
                    lon = float(record.get("lon") or record.get("longitude") or record.get("lng") or record.get("x"))
                    if -90 <= lat <= 90 and -180 <= lon <= 180:
                        # Clean structured coordinate
                        return False
                except (ValueError, TypeError):
                    return True
            
            # Check if address/name contains relational markers
            address_str = str(record.get("address") or record.get("name") or record.get("raw") or "")
            if any(marker in address_str.lower() for marker in ["near", "opp", "opposite", "behind", "next to", "beside"]):
                return True

            return not (has_lat and has_lon)

        return True

    def _build_prompt(self, raw_text: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Constructs a strict JSON extraction prompt."""
        context_str = f"\nContext: {json.dumps(context)}" if context else ""
        return f"""You are Wayline's Spatial Extraction Engine.
Extract the standardized geographic entities and coordinates from the following unstructured input.
Respond ONLY with a valid JSON object matching this exact schema:
{{
  "name": "Standardized canonical location name",
  "locality": "Neighborhood / Locality (or null)",
  "city": "City name (or null)",
  "state": "State/Province (or null)",
  "landmark": "Relative landmark phrase (e.g. 'Old Temple', or null)",
  "lat": float coordinate or null,
  "lng": float coordinate or null,
  "confidence": float between 0.00 and 1.00,
  "reasoning": "Brief explanation of coordinate certainty and entity resolution"
}}

Input: "{raw_text}"{context_str}
JSON:"""

    def _call_ollama(self, prompt: str) -> Optional[Dict[str, Any]]:
        """Sends inference request to Ollama HTTP API."""
        if not requests or self.mock_mode:
            return None

        url = f"{self.ollama_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.1,
                "top_p": 0.9,
            },
        }

        try:
            resp = requests.post(url, json=payload, timeout=self.timeout)
            if resp.status_code == 200:
                result = resp.json()
                raw_response = result.get("response", "")
                return self._parse_json_response(raw_response)
            else:
                logger.warning(f"Ollama API returned HTTP {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.warning(f"Ollama connection error ({self.ollama_url}): {e}")

        return None

    def _parse_json_response(self, text: str) -> Optional[Dict[str, Any]]:
        """Extracts and parses JSON object from model response string."""
        if not text:
            return None
        text = text.strip()
        # Direct parse
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Try regex extract
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass

        return None

    def _fallback_extract(self, raw_text: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Heuristic rule-based extraction fallback when LLM is unavailable or offline."""
        clean_text = raw_text.strip()
        
        # Check for landmark patterns e.g. "near X, Y"
        landmark = None
        landmark_match = re.search(r"(?:near|opp|opposite|behind|beside|next to)\s+([^,]+)", clean_text, re.IGNORECASE)
        if landmark_match:
            landmark = landmark_match.group(1).strip()

        # Split locality / city
        parts = [p.strip() for p in clean_text.split(",") if p.strip()]
        name = parts[0] if parts else clean_text
        locality = parts[1] if len(parts) > 1 else None
        city = parts[2] if len(parts) > 2 else (context.get("city") if context else None)

        # Coordinate detection in text if present
        coord_match = re.search(r"(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)", clean_text)
        lat, lng = None, None
        confidence = 0.40  # baseline heuristic confidence

        if coord_match:
            try:
                lat = float(coord_match.group(1))
                lng = float(coord_match.group(2))
                confidence = 0.80
            except ValueError:
                pass

        return {
            "name": name,
            "locality": locality,
            "city": city,
            "state": context.get("state") if context else None,
            "landmark": landmark,
            "lat": lat,
            "lng": lng,
            "confidence": confidence,
            "reasoning": "Heuristic fallback rule-based extraction (Ollama offline/mock mode)",
        }

    def normalize(self, raw_input: Union[str, Dict[str, Any]], context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Normalizes an input item, enforcing quality gates and confidence checks."""
        raw_text = raw_input if isinstance(raw_input, str) else str(raw_input.get("raw") or raw_input.get("address") or raw_input.get("name") or "")
        
        # 1. Attempt LLM extraction
        prompt = self._build_prompt(raw_text, context=context)
        extracted = None

        if not self.mock_mode:
            extracted = self._call_ollama(prompt)

        # 2. Fallback if Ollama unavailable or in mock mode
        if not extracted:
            extracted = self._fallback_extract(raw_text, context=context)

        # 3. Apply Quality Gating
        confidence = float(extracted.get("confidence") or 0.0)
        has_coords = (extracted.get("lat") is not None) and (extracted.get("lng") is not None)
        
        flagged = (confidence < self.confidence_threshold) or not has_coords
        flag_reason = []
        if confidence < self.confidence_threshold:
            flag_reason.append(f"Confidence score {confidence:.2f} below threshold {self.confidence_threshold:.2f}")
        if not has_coords:
            flag_reason.append("Missing verified latitude/longitude coordinates")

        return {
            "raw_input": raw_text,
            "standardized_name": extracted.get("name") or raw_text,
            "locality": extracted.get("locality"),
            "city": extracted.get("city"),
            "state": extracted.get("state"),
            "landmark": extracted.get("landmark"),
            "lat": extracted.get("lat"),
            "lng": extracted.get("lng"),
            "confidence": confidence,
            "flagged": flagged,
            "needs_review": flagged,
            "flag_reason": "; ".join(flag_reason) if flag_reason else None,
            "reasoning": extracted.get("reasoning"),
            "engine": "llm_ollama" if (not self.mock_mode and requests) else "heuristic_fallback",
        }

    def route_and_process(self, item: Union[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Hybrid Router: Passes structured data directly or routes messy data to LLM."""
        if not self.is_messy_input(item):
            # Deterministic clean path
            if isinstance(item, dict):
                lat = float(item.get("lat") or item.get("latitude") or item.get("y", 0.0))
                lng = float(item.get("lon") or item.get("longitude") or item.get("lng") or item.get("x", 0.0))
                name = item.get("name") or item.get("address") or "Structured Coordinate"
                return {
                    "raw_input": str(item),
                    "standardized_name": name,
                    "lat": lat,
                    "lng": lng,
                    "confidence": 1.00,
                    "flagged": False,
                    "needs_review": False,
                    "flag_reason": None,
                    "engine": "deterministic",
                }
            elif isinstance(item, str):
                parts = item.split(",")
                lat, lng = float(parts[0].strip()), float(parts[1].strip())
                return {
                    "raw_input": item,
                    "standardized_name": f"Coordinate ({lat:.5f}, {lng:.5f})",
                    "lat": lat,
                    "lng": lng,
                    "confidence": 1.00,
                    "flagged": False,
                    "needs_review": False,
                    "flag_reason": None,
                    "engine": "deterministic",
                }

        # Messy input -> LLM normalization pathway
        return self.normalize(item)


if __name__ == "__main__":
    normalizer = LLMNormalizer(mock_mode=True)
    samples = [
        "13.0827, 80.2707",
        "Opposite Central Station, Poonamallee High Rd, Chennai",
        "near the old temple, Kilpauk",
        {"name": "Guindy Tech Park", "lat": 13.0067, "lng": 80.2024},
        {"address": "Shop behind bus stop, T Nagar"},
    ]

    print("--- Wayline Hybrid Normalization Demo ---")
    for s in samples:
        res = normalizer.route_and_process(s)
        flag_str = "[FLAGGED - REVIEW NEEDED]" if res["flagged"] else "[VERIFIED]"
        print(f"\nInput: {s}")
        print(f"  Result: {res['standardized_name']} | Engine: {res['engine']} | Confidence: {res['confidence']:.2f} {flag_str}")
        if res.get("flag_reason"):
            print(f"  Reason: {res['flag_reason']}")
