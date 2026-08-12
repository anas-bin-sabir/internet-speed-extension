import type { SpeedTestResult } from "../types/speed";

/** Single source of truth for the download test file. Change this to point at a different host/size. */
export const TEST_FILE_URL = "https://speed.cloudflare.com/__down?bytes=25000000";

const PROGRESS_INTERVAL_MS = 150;

function calculateMbps(bytesReceived: number, elapsedSeconds: number): number {
  return (bytesReceived * 8) / elapsedSeconds / 1_000_000;
}

/**
 * Downloads TEST_FILE_URL and streams the response, reporting live Mbps via
 * onProgress as chunks arrive. Resolves with the final measured result.
 */
export async function measureDownloadSpeed(
  onProgress: (mbps: number) => void,
  signal: AbortSignal,
): Promise<SpeedTestResult> {
  const startTime = performance.now();

  let response: Response;
  try {
    response = await fetch(TEST_FILE_URL, { cache: "no-store", signal });
  } catch {
    throw new Error("Network request failed. Check your connection.");
  }

  if (!response.ok) {
    throw new Error(`Server responded with status ${response.status}`);
  }
  if (!response.body) {
    throw new Error("Streaming is not supported for this response.");
  }

  const reader = response.body.getReader();
  let bytesReceived = 0;
  let lastProgressAt = startTime;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    bytesReceived += value.byteLength;

    const now = performance.now();
    if (now - lastProgressAt >= PROGRESS_INTERVAL_MS) {
      onProgress(calculateMbps(bytesReceived, (now - startTime) / 1000));
      lastProgressAt = now;
    }
  }

  const elapsedSeconds = (performance.now() - startTime) / 1000;
  if (bytesReceived === 0 || elapsedSeconds === 0) {
    throw new Error("Test completed too quickly to measure speed.");
  }

  return {
    mbps: calculateMbps(bytesReceived, elapsedSeconds),
    bytesReceived,
    elapsedSeconds,
  };
}
