import type { Env } from "../types";
import { getDocument, setDocument } from "../services/firestoreService";

const CACHE_COLLECTION = "cache";

/**
 * Cache-aside helper backed by a Firestore `cache` collection (replaces
 * Cloudflare KV). Used for weather/soil/groundwater/satellite lookups that
 * are expensive or rate-limited upstream but change slowly.
 *
 * Firestore has no built-in per-write TTL over the REST API, so expiry is
 * checked at read time via the `expiresAtMillis` field. For automatic
 * cleanup of stale documents, configure a Firestore TTL policy on that field
 * in the Google Cloud Console (Firestore > TTL) — see the README.
 */
export async function withCache<T>(
  env: Env,
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>
): Promise<T> {
  const docId = sanitizeKey(key);

  try {
    const cached = await getDocument<{ value: string; expiresAtMillis: number }>(env, CACHE_COLLECTION, docId);
    if (cached && cached.expiresAtMillis > Date.now()) {
      return JSON.parse(cached.value) as T;
    }
  } catch {
    // Cache read failures should never block the actual data fetch.
  }

  const value = await compute();

  try {
    await setDocument(env, CACHE_COLLECTION, docId, {
      value: JSON.stringify(value),
      expiresAtMillis: Date.now() + ttlSeconds * 1000,
    });
  } catch {
    // Cache write failures are non-fatal — the fresh value is still returned.
  }

  return value;
}

function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9-_:.]/g, "_");
}

export function cacheKey(namespace: string, location: { state: string; district: string; village?: string }): string {
  const parts = [namespace, location.state, location.district, location.village ?? "_"];
  return parts.join(":").toLowerCase().replace(/\s+/g, "-");
}
