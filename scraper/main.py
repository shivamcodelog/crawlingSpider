"""
════════════════════════════════════════════════════════════
  MapScraper Pro — FastAPI Scraper Microservice
  Logs and progress written to disk — survives uvicorn --reload.
════════════════════════════════════════════════════════════
"""

import os
import json
import asyncio
import traceback
import threading
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor
from functools import partial
from typing import Optional

import httpx
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
import cloudinary
import cloudinary.uploader

from scraper_engine import run_scrape_job, OUTPUTS_DIR, JobCancelled

app = FastAPI(title="MapScraper Pro — Scraper Service", version="1.0.0")

# ── In-memory store (status/progress only; logs live on disk) ──
job_store: dict = {}

# ── Per-job write locks ──
_log_locks: dict = {}
_lock_registry = threading.Lock()

# ── Per-job cancellation events ──
_cancel_events: dict = {}

# ── Thread pool (Playwright is sync) ──
executor = ThreadPoolExecutor(max_workers=4)

# ── Backend callback URL ──
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:5000")

cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
)


def upload_to_cloudinary(filepath: str, job_id: str) -> str:
    result = cloudinary.uploader.upload(
        filepath,
        resource_type="raw",
        public_id=f"mapscraper/{job_id}",
        overwrite=True,
    )
    return result["secure_url"]


# ══════════════════════════════════════════
#  Disk helpers  (survive uvicorn reload)
# ══════════════════════════════════════════

def _log_path(job_id: str) -> str:
    return os.path.join(OUTPUTS_DIR, job_id + ".logs.jsonl")

def _progress_path(job_id: str) -> str:
    return os.path.join(OUTPUTS_DIR, job_id + ".progress.json")

def _get_lock(job_id: str) -> threading.Lock:
    with _lock_registry:
        if job_id not in _log_locks:
            _log_locks[job_id] = threading.Lock()
        return _log_locks[job_id]

def write_log(job_id: str, text: str, level: str = "muted"):
    entry = {"text": text, "level": level, "ts": datetime.now(timezone.utc).isoformat()}
    with _get_lock(job_id):
        with open(_log_path(job_id), "a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry, ensure_ascii=False) + "\n")

def read_logs(job_id: str) -> list:
    path = _log_path(job_id)
    if not os.path.exists(path):
        return []
    entries = []
    try:
        with open(path, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line:
                    entries.append(json.loads(line))
    except Exception:
        pass
    return entries

def write_progress(job_id: str, current: int, total: int, status: str = "running"):
    try:
        data = {"current": current, "total": total, "status": status,
                "ts": datetime.now(timezone.utc).isoformat()}
        with open(_progress_path(job_id), "w", encoding="utf-8") as fh:
            json.dump(data, fh)
    except Exception:
        pass

def read_progress(job_id: str) -> dict:
    try:
        with open(_progress_path(job_id), "r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return {}


# ══════════════════════════════════════════
#  Models
# ══════════════════════════════════════════

class ScrapeStartRequest(BaseModel):
    jobId: str
    queries: list[str]
    totalRecordsRequested: int
    outputFilename: Optional[str] = "output.xlsx"


# ══════════════════════════════════════════
#  Background runner
# ══════════════════════════════════════════

def run_job_sync(job_id: str, queries: list, total_records: int, output_filename: str):
    def _log(text: str, level: str = "muted"):
        write_log(job_id, text, level)

    def _progress(current: int):
        write_progress(job_id, current, total_records, "running")
        if job_id in job_store:
            job_store[job_id]["progress"] = {"current": current, "total": total_records}

    # Retrieve the cancellation event created in start_scrape
    cancel_event = _cancel_events.get(job_id)

    try:
        if job_id in job_store:
            job_store[job_id]["status"] = "running"
            job_store[job_id]["startedAt"] = datetime.utcnow().isoformat()

        queries_str = ", ".join(queries)
        _log('$ mapscraper --queries "' + queries_str + '" --limit ' + str(total_records), "primary")
        _log("[INFO] Job started. Initialising scraper engine...", "muted")

        result = run_scrape_job(
            job_id=job_id,
            queries=queries,
            total_records=total_records,
            output_filename=output_filename,
            progress_callback=_progress,
            log_callback=_log,
            cancel_event=cancel_event,
        )

        # If the job was cancelled while the thread was finishing up, discard results
        if cancel_event and cancel_event.is_set():
            _log("[WARN] Job was cancelled. Results discarded.", "warning")
            write_progress(job_id, 0, total_records, "failed")
            if job_id in job_store:
                job_store[job_id]["status"] = "failed"
            return  # Do NOT notify backend — it already marked the job as failed

        write_progress(job_id, result["resultCount"], total_records, "done")
        if job_id in job_store:
            job_store[job_id]["status"] = "done"
            job_store[job_id]["resultFile"] = result["resultFile"]
            job_store[job_id]["resultCount"] = result["resultCount"]
            job_store[job_id]["completedAt"] = datetime.utcnow().isoformat()
            job_store[job_id]["progress"] = {
                "current": result["resultCount"],
                "total": total_records,
            }

        try:
            file_url = upload_to_cloudinary(result["resultFile"], job_id)
            try:
                os.remove(result["resultFile"])
            except Exception:
                pass
            _notify_backend(job_id, "done", file_url, result["resultCount"])
        except Exception as e:
            print(f"[SCRAPER] Cloudinary upload failed: {e}")
            _notify_backend(job_id, "failed", error_message=f"File upload failed: {str(e)}")

    except JobCancelled:
        # Clean cancellation — user pressed Kill Job
        _log("[WARN] Job cancelled. Execution stopped.", "warning")
        write_progress(job_id, 0, total_records, "failed")
        if job_id in job_store:
            job_store[job_id]["status"] = "failed"
            job_store[job_id]["completedAt"] = datetime.utcnow().isoformat()
        # Do NOT call _notify_backend — backend already handled cancel + credit refund
        # Delete any partial Excel file so data isn't accessible
        partial_file = os.path.join(OUTPUTS_DIR, job_id + ".xlsx")
        if os.path.exists(partial_file):
            try:
                os.remove(partial_file)
            except Exception:
                pass

    except Exception as e:
        error_msg = str(e) + "\n" + traceback.format_exc()
        _log("[ERROR] " + str(e)[:200], "error")
        write_progress(job_id, 0, total_records, "failed")
        if job_id in job_store:
            job_store[job_id]["status"] = "failed"
            job_store[job_id]["error"] = error_msg
            job_store[job_id]["completedAt"] = datetime.utcnow().isoformat()
        _notify_backend(job_id, "failed", error_message=error_msg)


def _notify_backend(job_id, status, result_file=None, result_count=0, error_message=None):
    try:
        headers = {}
        secret = os.environ.get("INTERNAL_SECRET")
        if not secret:
            print("[SCRAPER] WARNING: INTERNAL_SECRET not set")
        else:
            headers["x-internal-secret"] = secret
        with httpx.Client(timeout=10) as client:
            client.post(BACKEND_URL + "/internal/job-complete", json={
                "jobId": job_id, "status": status,
                "resultFile": result_file, "resultCount": result_count,
                "errorMessage": error_message,
            }, headers=headers)
    except Exception as e:
        print("[SCRAPER] Notify failed:", e)


# ══════════════════════════════════════════
#  ENDPOINTS
# ══════════════════════════════════════════

@app.get("/health")
async def health():
    return {"status": "ok", "service": "scraper", "activeJobs": len(
        [j for j in job_store.values() if j.get("status") in ("queued", "running")]
    )}


@app.post("/scrape/start")
async def start_scrape(req: ScrapeStartRequest, background_tasks: BackgroundTasks):
    if req.jobId in job_store and job_store[req.jobId].get("status") in ("queued", "running"):
        raise HTTPException(status_code=409, detail="Job is already running.")

    # Wipe any old log file for this job
    lp = _log_path(req.jobId)
    if os.path.exists(lp):
        os.remove(lp)

    # Write seed logs to disk immediately (visible even before thread starts)
    queries_str = ", ".join(req.queries)
    write_log(req.jobId, "[INFO] Job accepted and queued.", "muted")
    write_log(req.jobId, '[INFO] Queries: ' + queries_str, "primary")
    write_log(req.jobId, "[INFO] Target: " + str(req.totalRecordsRequested) + " records", "muted")
    write_log(req.jobId, "[INFO] Waiting for browser to launch...", "muted")

    job_store[req.jobId] = {
        "jobId": req.jobId,
        "status": "queued",
        "progress": {"current": 0, "total": req.totalRecordsRequested},
        "resultFile": None,
        "resultCount": 0,
        "error": None,
        "startedAt": None,
        "completedAt": None,
    }

    # Reset/create cancellation event so it starts fresh (not pre-cancelled)
    ev = threading.Event()
    _cancel_events[req.jobId] = ev

    loop = asyncio.get_running_loop()
    loop.run_in_executor(executor, partial(
        run_job_sync,
        req.jobId,
        req.queries,
        req.totalRecordsRequested,
        req.outputFilename or "output.xlsx",
    ))

    return {"success": True, "message": "Job queued.", "jobId": req.jobId}


@app.get("/scrape/status/{job_id}")
async def get_status(job_id: str):
    # In-memory first
    if job_id in job_store:
        job = job_store[job_id]
        return {
            "jobId": job_id,
            "status": job.get("status", "unknown"),
            "progress": job.get("progress", {"current": 0, "total": 0}),
            "resultCount": job.get("resultCount", 0),
            "error": job.get("error"),
        }
    # Fallback to disk (survives reload)
    prog = read_progress(job_id)
    if prog:
        return {
            "jobId": job_id,
            "status": prog.get("status", "running"),
            "progress": {"current": prog.get("current", 0), "total": prog.get("total", 0)},
            "resultCount": prog.get("current", 0),
            "error": None,
        }
    raise HTTPException(status_code=404, detail="Job not found.")


@app.get("/scrape/logs/{job_id}")
async def get_logs(job_id: str):
    """Always read from disk — works even after uvicorn reload."""
    return {"logs": read_logs(job_id)}


@app.get("/scrape/cancel/{job_id}")
async def cancel_job(job_id: str):
    # Signal the worker thread to stop
    if job_id not in _cancel_events:
        _cancel_events[job_id] = threading.Event()
    _cancel_events[job_id].set()

    if job_id in job_store:
        job_store[job_id]["status"] = "failed"
        job_store[job_id]["error"] = "Cancelled by user."
    write_log(job_id, "[WARN] Cancellation signal sent. Stopping after current operation...", "warning")
    write_progress(job_id, 0, 0, "failed")
    return {"success": True, "message": "Cancellation requested."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


# THIS IS SCRAPER/MAIN.PY 