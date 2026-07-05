import type { Context } from "hono";
import type { ApiResponse } from "../types";

export function ok<T>(c: Context, data: T, status: 200 | 201 = 200) {
  const body: ApiResponse<T> = { success: true, data };
  return c.json(body, status);
}

export function fail(
  c: Context,
  code: string,
  message: string,
  status: 400 | 401 | 404 | 422 | 500 | 502 = 400,
  details?: unknown
) {
  const body: ApiResponse<never> = {
    success: false,
    error: { code, message, details },
  };
  return c.json(body, status);
}
