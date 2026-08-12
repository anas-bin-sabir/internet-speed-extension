import { useEffect, useRef, useState } from "react";
import { measureDownloadSpeed } from "../services/speedTest";
import type { TestStatus } from "../types/speed";

const STATUS_LABEL: Record<TestStatus, string> = {
  idle: "Idle",
  testing: "Testing",
  complete: "Complete",
  error: "Error",
};

export default function Popup() {
  const [status, setStatus] = useState<TestStatus>("idle");
  const [mbps, setMbps] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const testIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleRunTest = async () => {
    const currentTestId = ++testIdRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus("testing");
    setError(null);
    setMbps(0);

    try {
      const result = await measureDownloadSpeed((liveMbps) => {
        if (testIdRef.current === currentTestId) setMbps(liveMbps);
      }, controller.signal);

      if (testIdRef.current === currentTestId) {
        setMbps(result.mbps);
        setStatus("complete");
      }
    } catch (err) {
      if (testIdRef.current === currentTestId) {
        setError(err instanceof Error ? err.message : "Unknown error occurred.");
        setStatus("error");
      }
    }
  };

  const isTesting = status === "testing";

  return (
    <div className="popup">
      <h1 className="popup__title">Internet Speed</h1>

      <div className="popup__speed">
        <span aria-hidden="true">↓</span> {mbps.toFixed(1)} Mbps
      </div>

      <button className="popup__button" onClick={handleRunTest} disabled={isTesting}>
        {isTesting ? "Testing..." : "Run Test"}
      </button>

      <div className="popup__status">
        Status: {STATUS_LABEL[status]}
        {status === "error" && error ? ` — ${error}` : ""}
      </div>
    </div>
  );
}
