import { NextResponse } from "next/server";

import { securityHeaders } from "@/lib/security/headers";

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: string;
}

/** Stamp the shared security headers onto any response. */
export function applySecurityHeaders<T extends Response>(response: T): T {
  for (const header of securityHeaders) {
    response.headers.set(header.key, header.value);
  }
  return response;
}

/** Typed success envelope: { ok: true, data }. */
export function jsonOk<T>(data: T, status: number = 200): NextResponse {
  const body: ApiSuccess<T> = { ok: true, data };
  return applySecurityHeaders(NextResponse.json(body, { status }));
}

/** Typed failure envelope: { ok: false, error } — never leaks stack traces. */
export function jsonError(
  error: string,
  status: number,
  extraHeaders?: ReadonlyArray<{ key: string; value: string }>,
): NextResponse {
  const body: ApiFailure = { ok: false, error };
  const response = NextResponse.json(body, { status });
  if (extraHeaders !== undefined) {
    for (const header of extraHeaders) {
      response.headers.set(header.key, header.value);
    }
  }
  return applySecurityHeaders(response);
}
