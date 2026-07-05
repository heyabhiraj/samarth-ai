import { Hono } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { ok, fail } from "../utils/response";
import { getFarmerById, updateFarmerProfile } from "../services/authService";
import { updateProfileSchema } from "../utils/validation";

const profile = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

profile.get("/", requireAuth, async (c) => {
  const farmerId = c.get("farmerId") as string;
  const farmer = await getFarmerById(c.env, farmerId);
  if (!farmer) return fail(c, "NOT_FOUND", "Account not found", 404);
  return ok(c, farmer);
});

profile.put("/", requireAuth, async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return fail(c, "INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return fail(c, "VALIDATION_ERROR", "Invalid profile update", 422, parsed.error.flatten());
  }

  try {
    const farmerId = c.get("farmerId") as string;
    const { name, ...preferences } = parsed.data;
    const updated = await updateFarmerProfile(c.env, farmerId, { name, preferences });
    return ok(c, updated);
  } catch (err) {
    return fail(c, "PROFILE_UPDATE_FAILED", (err as Error).message, 400);
  }
});

export default profile;
