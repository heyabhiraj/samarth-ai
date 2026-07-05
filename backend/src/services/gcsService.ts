import type { Env } from "../types";
import { getGoogleAccessToken, SCOPES } from "./googleAuthService";

async function authHeaders(env: Env, extra: HeadersInit = {}): Promise<HeadersInit> {
  const token = await getGoogleAccessToken(env, [SCOPES.storage]);
  return { Authorization: `Bearer ${token}`, ...extra };
}

export async function uploadObject(env: Env, key: string, data: ArrayBuffer, contentType: string): Promise<void> {
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${env.GCS_BUCKET_NAME}/o?uploadType=media&name=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: await authHeaders(env, { "Content-Type": contentType }),
    body: data,
  });
  if (!res.ok) throw new Error(`GCS upload failed (${res.status}): ${await res.text()}`);
}

/**
 * Fetches an object's bytes + content-type from GCS. Used by the /api/images
 * proxy route since the bucket is private (accessed only via the service
 * account), rather than exposing objects with public ACLs.
 */
export async function getObject(env: Env, key: string): Promise<{ body: ReadableStream | null; contentType: string } | null> {
  const url = `https://storage.googleapis.com/storage/v1/b/${env.GCS_BUCKET_NAME}/o/${encodeURIComponent(key)}?alt=media`;
  const res = await fetch(url, { headers: await authHeaders(env) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GCS getObject failed (${res.status}): ${await res.text()}`);
  return { body: res.body, contentType: res.headers.get("content-type") ?? "application/octet-stream" };
}

export async function deleteObject(env: Env, key: string): Promise<void> {
  const url = `https://storage.googleapis.com/storage/v1/b/${env.GCS_BUCKET_NAME}/o/${encodeURIComponent(key)}`;
  const res = await fetch(url, { method: "DELETE", headers: await authHeaders(env) });
  if (!res.ok && res.status !== 404) throw new Error(`GCS deleteObject failed (${res.status}): ${await res.text()}`);
}
