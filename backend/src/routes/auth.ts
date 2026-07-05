import { Hono } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "../middleware/auth";
import { ok, fail } from "../utils/response";
import { ensureFarmerSession, getFarmerById } from "../services/authService";
import { requireAuth } from "../middleware/auth";

const auth = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * Called by the frontend right after Firebase Phone Auth verifies the SMS
 * OTP. The bearer token is the Firebase ID token; requireAuth has already
 * verified it and extracted the (server-trusted) uid/phoneNumber. This just
 * materializes the Firestore profile — creating it on first sign-in.
 */
auth.post("/session", requireAuth, async (c) => {
  try {
    const farmerId = c.get("farmerId") as string;
    const phoneNumber = c.get("phoneNumber") as string | undefined;
    const result = await ensureFarmerSession(c.env, farmerId, phoneNumber);
    return ok(c, result);
  } catch (err) {
    return fail(c, "SESSION_FAILED", (err as Error).message, 502);
  }
});

auth.get("/me", requireAuth, async (c) => {
  const farmerId = c.get("farmerId") as string;
  const farmer = await getFarmerById(c.env, farmerId);
  if (!farmer) return fail(c, "NOT_FOUND", "Account not found — call /api/auth/session first", 404);
  return ok(c, farmer);
});

export default auth;
