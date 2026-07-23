/**
 * Temporary transport for sanitized request errors.
 *
 * Replace this stub with a real logger endpoint.
 */

export interface RequestErrorReport {
  functionName?: string;
  kind: "http" | "network";
  method: string;
  pathname: string;
  status?: number;
  statusText?: string;
  title?: string;
}

export interface AppErrorReport {
  title?: string;
}

type Report = RequestErrorReport | AppErrorReport;

export function sendErrorReport(report: Report) {
  // Intentionally empty until the real logging transport is connected.
  console.error("report sent:", report);
}
