#!/usr/bin/env python3
"""Wayline ETL runner — a thin HTTP wrapper around normalizer.process_file.

The api-gateway container has no Python/GDAL, so it cannot run the ETL itself.
Instead this service runs inside its own image (python:3.11-slim + GDAL, same as
the CLI normalizer) and exposes a tiny internal API that the api-gateway calls:

    POST /run           {file_path, dataset_name?, format?, recreate?} -> {job_id}
    GET  /status/<id>   -> job record
    GET  /health        -> {status: "ok"}

It is NOT published to the host — only the api-gateway reaches it over the
internal Docker network. Source files are read from IMPORT_DATA_DIR (mounted
read-only); file_path is resolved *inside* that directory and path traversal is
rejected, so an authenticated import request cannot read arbitrary host files.
"""
import os
import threading
import datetime
import uuid

from flask import Flask, request, jsonify

import normalizer
from llm_normalizer import LLMNormalizer

app = Flask(__name__)

llm_normalizer = LLMNormalizer()

ES_URL = os.environ.get("ES_URL", "http://elasticsearch:9200")
GEO_INDEX = os.environ.get("GEO_INDEX", "wayline_geo")
# Source files must live under this directory (mounted read-only in compose).
IMPORT_DATA_DIR = os.path.abspath(os.environ.get("IMPORT_DATA_DIR", "/imports"))

# In-memory job store. Fine for a single-replica admin tool; jobs reset on
# restart, which is acceptable for a manual data-import endpoint.
_jobs = {}
_lock = threading.Lock()


def _resolve_path(file_path):
    """Resolve file_path under IMPORT_DATA_DIR, rejecting traversal/escape."""
    candidate = os.path.abspath(os.path.join(IMPORT_DATA_DIR, file_path))
    if not (candidate == IMPORT_DATA_DIR or candidate.startswith(IMPORT_DATA_DIR + os.sep)):
        raise ValueError("file_path escapes the import directory")
    if not os.path.isfile(candidate):
        raise FileNotFoundError(f"file not found under import dir: {file_path}")
    return candidate


def _run_job(job_id, abs_path, index_name, recreate):
    try:
        summary = normalizer.process_file(abs_path, index_name, ES_URL, recreate=recreate)
        with _lock:
            _jobs[job_id].update(status="completed",
                                 end_time=datetime.datetime.utcnow().isoformat(),
                                 result=summary)
    except Exception as e:  # noqa: BLE001 - report any ETL failure back to the caller
        with _lock:
            _jobs[job_id].update(status="failed",
                                 end_time=datetime.datetime.utcnow().isoformat(),
                                 error=str(e))


@app.get("/health")
def health():
    return jsonify(
        status="ok",
        index=GEO_INDEX,
        import_dir=IMPORT_DATA_DIR,
        llm_engine=llm_normalizer.model,
        ollama_url=llm_normalizer.ollama_url,
    )


@app.post("/normalize")
def normalize_endpoint():
    """Normalize raw text or batch records using hybrid LLM routing."""
    body = request.get_json(silent=True) or {}
    text = body.get("text")
    records = body.get("records")

    if text is not None:
        result = llm_normalizer.route_and_process(text)
        return jsonify(result)

    if isinstance(records, list):
        results = [llm_normalizer.route_and_process(r) for r in records]
        return jsonify(results=results, count=len(results))

    return jsonify(error="Expected 'text' (string) or 'records' (array of strings/objects)"), 400


@app.post("/run")
def run():
    body = request.get_json(silent=True) or {}
    file_path = body.get("file_path")
    if not file_path:
        return jsonify(error="file_path is required"), 400

    try:
        abs_path = _resolve_path(file_path)
    except (ValueError, FileNotFoundError) as e:
        return jsonify(error=str(e)), 400

    index_name = body.get("index") or GEO_INDEX
    recreate = bool(body.get("recreate", False))

    job_id = str(uuid.uuid4())
    with _lock:
        _jobs[job_id] = {
            "job_id": job_id,
            "status": "running",
            "dataset": body.get("dataset_name") or os.path.basename(abs_path),
            "index": index_name,
            "start_time": datetime.datetime.utcnow().isoformat(),
        }

    threading.Thread(target=_run_job, args=(job_id, abs_path, index_name, recreate),
                     daemon=True).start()
    return jsonify(job_id=job_id, status="running"), 202


@app.get("/status/<job_id>")
def status(job_id):
    with _lock:
        job = _jobs.get(job_id)
    if not job:
        return jsonify(error="Job not found"), 404
    return jsonify(job)


if __name__ == "__main__":
    # threaded=True so a running import doesn't block status polls.
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5055")), threaded=True)
