import { Hono } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { ok, fail } from "../utils/response";
import { escalationSchema } from "../utils/validation";
import { createEscalation, listEscalations } from "../services/escalationService";

const escalations = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

escalations.use("*", requireAuth);

escalations.get("/", async (c) => {
  try {
    const farmerId = c.get("farmerId") as string;
    return ok(c, await listEscalations(c.env, farmerId));
  } catch (err) {
    return fail(c, "ESCALATIONS_FETCH_FAILED", (err as Error).message, 502);
  }
});

escalations.post("/", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return fail(c, "INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const parsed = escalationSchema.safeParse(body);
  if (!parsed.success) {
    return fail(c, "VALIDATION_ERROR", "A disease, state and district are required", 422, parsed.error.flatten());
  }

  try {
    const farmerId = c.get("farmerId") as string;
    const escalation = await createEscalation(c.env, farmerId, parsed.data);
    return ok(c, escalation, 201);
  } catch (err) {
    return fail(c, "ESCALATION_FAILED", (err as Error).message, 502);
  }
});

export default escalations;
