/**
 * Small shared wrapper around the native Fetch API.
 */

import {
  type RequestErrorReport,
  sendErrorReport,
} from "~shared/lib/error-report";

type RequestMethod = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";

interface ErrorReportContext {
  functionName: string;
  title: string;
}

export interface RequestParams {
  url: string;
  /** Overrides the environment API URL for a request to another backend. */
  domain?: string;
  /** Non-2xx statuses that feature code intentionally handles from the Response. */
  allowedStatusCodes?: readonly number[];
  authorization?: string | undefined;
  headers?: HeadersInit;
  credentials?: RequestCredentials;
  /** Plain data serialized as JSON. Files require a separate upload helper. */
  body?: unknown;
  cache?: RequestCache;
  errorReport?: ErrorReportContext;
  method?: RequestMethod;
  signal?: AbortSignal | null;
}

interface RequestErrorOptions {
  cause?: unknown;
  response?: Response;
}

export class RequestError extends Error {
  readonly response: Response | undefined;

  constructor(message: string, options: RequestErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = "RequestError";
    this.response = options.response;
  }
}

export async function request(
  params: RequestParams,
): Promise<Response> {
  const {
    allowedStatusCodes,
    authorization,
    body,
    cache,
    credentials,
    domain,
    errorReport,
    headers,
    method = "GET",
    signal,
    url,
  } = params;

  const requestUrl = resolveRequestUrl(url, domain);
  const serializedBody = serializeJsonBody(body);
  const requestHeaders = new Headers(headers);

  if (authorization !== undefined) {
    requestHeaders.set("Authorization", `Bearer ${authorization}`);
  }

  let response: Response;

  try {
    response = await fetch(requestUrl, {
      ...(serializedBody !== undefined && { body: serializedBody }),
      ...(cache !== undefined && { cache }),
      ...(credentials !== undefined && { credentials }),
      headers: requestHeaders,
      method,
      ...(signal !== null && signal !== undefined && { signal }),
    });
  } catch (error_) {
    // An explicit cancellation is expected control flow and is not reported.
    if (signal?.aborted === true) {
      throw error_;
    }

    reportError({
      ...errorReport,
      kind: "network",
      method,
      pathname: requestUrl.pathname,
    });

    throw new RequestError("Network request failed.", { cause: error_ });
  }

  const isAllowedError = allowedStatusCodes?.includes(response.status) === true;

  if (!isAllowedError && !response.ok) {
    reportError({
      ...errorReport,
      kind: "http",
      method,
      pathname: requestUrl.pathname,
      status: response.status,
      statusText: response.statusText,
    });

    throw new RequestError(
      `Request failed with status ${String(response.status)}.`,
      { response },
    );
  }

  return response;
}

function resolveRequestUrl(path: string, domain?: string): URL {
  try {
    // An absolute URL is useful for the occasional third-party request.
    return new URL(path);
  } catch {
    const baseUrl = domain ?? import.meta.env.VITE_APP_API_URL;

    if (baseUrl === undefined || baseUrl.trim().length === 0) {
      throw new RequestError("API URL is not configured.");
    }

    const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    const normalizedPath = path.replace(/^\/+/, "");

    return new URL(normalizedPath, normalizedBaseUrl);
  }
}

function serializeJsonBody(body: unknown): string | undefined {
  if (body === undefined) {
    return undefined;
  }

  try {
    return JSON.stringify(body);
  } catch (error) {
    throw new RequestError(
      "Request body cannot be serialized as JSON.",
      { cause: error },
    );
  }
}

function reportError(report: RequestErrorReport): void {
  try {
    sendErrorReport(report);
  } catch {
    // Logging must never hide or replace the original request failure.
  }
}
