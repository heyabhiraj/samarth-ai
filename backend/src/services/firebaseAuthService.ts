import type { Env } from "../types";
import { base64UrlToArrayBuffer } from "../utils/googleCrypto";

const JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const DEFAULT_JWKS_TTL_MS = 6 * 60 * 60 * 1000;
const CLOCK_SKEW_SECONDS = 60;

interface CachedJwks {
  keys: JsonWebKey[];
  expiresAt: number;
}

// Per-isolate cache — Google rotates these keys infrequently and sends a
// Cache-Control max-age we respect, so most requests never re-fetch them.
let jwksCache: CachedJwks | null = null;

async function getFirebaseJwks(): Promise<JsonWebKey[]> {
  const now = Date.now();
  if (jwksCache && jwksCache.expiresAt > now) return jwksCache.keys;

  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error(`Failed to fetch Firebase public keys (${res.status})`);

  const json = (await res.json()) as { keys: JsonWebKey[] };
  const cacheControl = res.headers.get("cache-control") ?? "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const ttlMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : DEFAULT_JWKS_TTL_MS;

  jwksCache = { keys: json.keys, expiresAt: now + ttlMs };
  return json.keys;
}

export interface FirebaseTokenClaims {
  uid: string;
  phoneNumber?: string;
}

/**
 * Verifies a Firebase Authentication ID token without the (Node-only)
 * Firebase Admin SDK, following Firebase's documented "verify ID tokens
 * using a third-party JWT library" approach: fetch Google's public signing
 * keys, verify the RS256 signature, then check standard claims.
 * https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
 */
export async function verifyFirebaseIdToken(env: Env, idToken: string): Promise<FirebaseTokenClaims | null> {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    const header = JSON.parse(new TextDecoder().decode(base64UrlToArrayBuffer(headerB64))) as {
      alg: string;
      kid?: string;
    };
    if (header.alg !== "RS256" || !header.kid) return null;

    const jwks = await getFirebaseJwks();
    const jwk = jwks.find((key) => (key as { kid?: string }).kid === header.kid);
    if (!jwk) return null;

    const cryptoKey = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, [
      "verify",
    ]);

    const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlToArrayBuffer(signatureB64);
    const isSignatureValid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, signature, signedData);
    if (!isSignatureValid) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlToArrayBuffer(payloadB64))) as {
      iss: string;
      aud: string;
      exp: number;
      iat: number;
      auth_time: number;
      sub: string;
      phone_number?: string;
    };

    const now = Math.floor(Date.now() / 1000);
    const expectedIssuer = `https://securetoken.google.com/${env.GCP_PROJECT_ID}`;

    if (payload.iss !== expectedIssuer) return null;
    if (payload.aud !== env.GCP_PROJECT_ID) return null;
    if (payload.exp < now) return null;
    if (payload.iat > now + CLOCK_SKEW_SECONDS) return null;
    if (payload.auth_time > now + CLOCK_SKEW_SECONDS) return null;
    if (!payload.sub) return null;

    return { uid: payload.sub, phoneNumber: payload.phone_number };
  } catch {
    return null;
  }
}
