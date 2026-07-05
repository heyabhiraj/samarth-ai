import type { Context, Next } from "hono";
import type { Env } from "../types";
import { verifyFirebaseIdToken } from "../services/firebaseAuthService";
import { fail } from "../utils/response";

export type AuthVariables = { farmerId?: string; phoneNumber?: string };

function extractToken(c: Context): string | null {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

/**
 * Verifies the Firebase ID token if present and attaches `farmerId`
 * (Firebase UID) to context. Never rejects the request — features work
 * anonymously, but save history against the account when the caller is
 * logged in.
 */
export async function optionalAuth(c: Context<{ Bindings: Env; Variables: AuthVariables }>, next: Next) {
  const token = extractToken(c);
  if (token) {
    const claims = await verifyFirebaseIdToken(c.env, token);
    if (claims) {
      c.set("farmerId", claims.uid);
      c.set("phoneNumber", claims.phoneNumber);
    }
  }
  await next();
}

/**
 * Requires a valid Firebase ID token. Used for account-only endpoints
 * (/api/auth/session, /api/auth/me, /api/profile, /api/history).
 */
export async function requireAuth(c: Context<{ Bindings: Env; Variables: AuthVariables }>, next: Next) {
  const token = extractToken(c);
  const claims = token ? await verifyFirebaseIdToken(c.env, token) : null;

  if (!claims) {
    return fail(c, "UNAUTHORIZED", "Please sign in to continue", 401);
  }

  c.set("farmerId", claims.uid);
  c.set("phoneNumber", claims.phoneNumber);
  await next();
}
