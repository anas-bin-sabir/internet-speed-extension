export type TestStatus = "idle" | "testing" | "complete" | "error";

export interface SpeedTestResult {
  mbps: number;
  bytesReceived: number;
  elapsedSeconds: number;
}
