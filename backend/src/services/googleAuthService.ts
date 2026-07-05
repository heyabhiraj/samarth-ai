import type { Env } from "../types";
import { base64UrlEncode, signRS256 } from "../utils/googleCrypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const JWT_LIFETIME_SECONDS = 3600;

// Per-isolate in-memory cache. Best-effort only — Workers isolates are
// recycled, so this just avoids a token round-trip on warm requests within
// the same isolate rather than guaranteeing a single token globally.
const tokenCache = new Map<string, { accessToken: string; expiresAt: number }>();

export const SCOPES = {
  firestore: "https://www.googleapis.com/auth/datastore",
  storage: "https://www.googleapis.com/auth/devstorage.read_write",
};

export async function getGoogleAccessToken(env: Env, scopes: string[]): Promise<string> {
  const cacheKey = scopes.slice().sort().join(" ");
  const cached = tokenCache.get(cacheKey);
  const now = Math.floor(Date.now() / 1000);

  if (cached && cached.expiresAt - 60 > now) {
    return cached.accessToken;
  }

  if (!env.GCP_SERVICE_ACCOUNT_EMAIL || !env.GCP_SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error("GCP_SERVICE_ACCOUNT_EMAIL / GCP_SERVICE_ACCOUNT_PRIVATE_KEY are not configured");
  }

  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: env.GCP_SERVICE_ACCOUNT_EMAIL,
    scope: cacheKey,
    aud: TOKEN_URL,
    iat: now,
    exp: now + JWT_LIFETIME_SECONDS,
  };

  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`;
  const signature = await signRS256(unsigned, env.GCP_SERVICE_ACCOUNT_PRIVATE_KEY);
  const assertion = `${unsigned}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google OAuth2 token exchange failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache.set(cacheKey, { accessToken: json.access_token, expiresAt: now + json.expires_in });
  return json.access_token;
}
