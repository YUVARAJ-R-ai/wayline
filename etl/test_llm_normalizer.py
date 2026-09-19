#!/usr/bin/env python3
"""Unit test suite for Wayline LLM Normalizer & Hybrid Router."""

import unittest
from llm_normalizer import LLMNormalizer


class TestLLMNormalizer(unittest.TestCase):

    def setUp(self):
        self.normalizer = LLMNormalizer(mock_mode=True, confidence_threshold=0.70)

    def test_is_messy_input_structured(self):
        """Clean numerical coordinates and structured dicts should be flagged as non-messy."""
        self.assertFalse(self.normalizer.is_messy_input("13.0843, 80.2705"))
        self.assertFalse(self.normalizer.is_messy_input("-33.8688, 151.2093"))
        self.assertFalse(self.normalizer.is_messy_input({"name": "HQ", "lat": 13.0843, "lng": 80.2705}))
        self.assertFalse(self.normalizer.is_messy_input({"latitude": 13.0843, "longitude": 80.2705}))

    def test_is_messy_input_unstructured(self):
        """Unstructured text and relative landmark phrases must be identified as messy."""
        self.assertTrue(self.normalizer.is_messy_input("near the old temple, Kilpauk, Chennai"))
        self.assertTrue(self.normalizer.is_messy_input("Opposite Central Station"))
        self.assertTrue(self.normalizer.is_messy_input({"address": "Shop behind bus stop, T Nagar"}))
        self.assertTrue(self.normalizer.is_messy_input({"name": "Unknown", "lat": None, "lng": None}))
        self.assertTrue(self.normalizer.is_messy_input({"name": "Bad Coords", "lat": "invalid", "lng": "coords"}))

    def test_hybrid_router_deterministic_bypass(self):
        """Structured inputs must bypass LLM inference and return deterministic result."""
        result = self.normalizer.route_and_process({"name": "Chennai Central", "lat": 13.0827, "lng": 80.2707})
        self.assertEqual(result["engine"], "deterministic")
        self.assertEqual(result["confidence"], 1.00)
        self.assertFalse(result["flagged"])
        self.assertFalse(result["needs_review"])
        self.assertEqual(result["lat"], 13.0827)
        self.assertEqual(result["lng"], 80.2707)

    def test_quality_gating_flags_unverified_coordinates(self):
        """Messy inputs missing verified coordinates must be flagged with needs_review=True."""
        result = self.normalizer.route_and_process("near the old temple, Kilpauk")
        self.assertTrue(result["flagged"])
        self.assertTrue(result["needs_review"])
        self.assertIsNotNone(result["flag_reason"])
        self.assertIn("Missing verified latitude/longitude coordinates", result["flag_reason"])

    def test_landmark_and_locality_heuristic_extraction(self):
        """Fallback extractor should identify relative landmark and locality tokens."""
        result = self.normalizer.normalize("near the old temple, Kilpauk, Chennai")
        self.assertEqual(result["landmark"], "the old temple")
        self.assertEqual(result["locality"], "Kilpauk")
        self.assertEqual(result["city"], "Chennai")

    def test_json_parsing_resilience(self):
        """JSON parser should handle markdown-wrapped and whitespace-padded model outputs."""
        sample_markdown = '```json\n{\n  "name": "Guindy Hub",\n  "lat": 13.0067,\n  "lng": 80.2024,\n  "confidence": 0.95\n}\n```'
        parsed = self.normalizer._parse_json_response(sample_markdown)
        self.assertIsNotNone(parsed)
        self.assertEqual(parsed["name"], "Guindy Hub")
        self.assertEqual(parsed["lat"], 13.0067)
        self.assertEqual(parsed["confidence"], 0.95)


if __name__ == "__main__":
    unittest.main()
