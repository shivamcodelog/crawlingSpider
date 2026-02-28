import { useState, useEffect, useRef, useCallback } from "react";
import client from "../api/client";

/**
 * Poll a job's status every `interval` ms while it's queued or running.
 * Returns { job, loading, error, elapsedSeconds, refresh }.
 */
export function useJobPolling(jobId, interval = 2000) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef(null);
  const elapsedRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  const fetchJob = useCallback(async () => {
    try {
      const { data } = await client.get(`/api/jobs/${jobId}`);
      if (data.success) {
        setJob(data.data);
        setError(null);

        if (data.data.status === "done" || data.data.status === "failed") {
          clearInterval(timerRef.current);
          clearInterval(elapsedRef.current);
          timerRef.current = null;
          elapsedRef.current = null;
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch job.");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;

    startTimeRef.current = Date.now();

    // Initial fetch
    fetchJob();

    // Poll job status
    timerRef.current = setInterval(fetchJob, interval);

    // Tick elapsed time every second
    elapsedRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
      clearInterval(elapsedRef.current);
    };
  }, [jobId, interval, fetchJob]);

  return { job, loading, error, elapsedSeconds, refresh: fetchJob };
}
