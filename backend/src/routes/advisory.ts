import { Hono } from "hono";
import type { Env } from "../types";
import { drySpellCheckSchema } from "../utils/validation";
import { ok, fail } from "../utils/response";
import { checkDrySpell, sendSmsAdvisory } from "../services/advisoryService";
import { createDocument } from "../services/firestoreService";
import type { AuthVariables } from "../middleware/auth";
import { optionalAuth } from "../middleware/auth";

const advisory = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

advisory.use("*", optionalAuth);

advisory.get("/", async (c) => {
  const parsed = drySpellCheckSchema.safeParse({
    state: c.req.query("state"),
    district: c.req.query("district"),
    village: c.req.query("village") || undefined,
  });

  if (!parsed.success) {
    return fail(c, "VALIDATION_ERROR", "state and district are required", 422, parsed.error.flatten());
  }

  try {
    const language = c.req.query("language") as any;
    const alerts = await checkDrySpell(c.env, parsed.data.state, parsed.data.district, parsed.data.village, language);
    const farmerId = c.get("farmerId");

    if (farmerId) {
      for (const alert of alerts) {
        try {
          await createDocument(c.env, "alerts", {
            farmerId,
            state: parsed.data.state,
            district: parsed.data.district,
            village: parsed.data.village,
            type: alert.type,
            severity: alert.severity,
            title: alert.title,
            message: alert.message,
            smsText: alert.smsText,
            createdAt: alert.createdAt,
          });
        } catch (historyErr) {
          console.error("Could not save alert history", historyErr);
        }
      }
    }

    return ok(c, { alerts });
  } catch (err) {
    return fail(c, "ADVISORY_CHECK_FAILED", (err as Error).message, 502);
  }
});

advisory.post("/sms", async (c) => {
  let body: { phoneNumber?: string; alert?: Parameters<typeof sendSmsAdvisory>[2] };
  try {
    body = await c.req.json();
  } catch {
    return fail(c, "INVALID_JSON", "Request body must be valid JSON", 400);
  }

  if (!body.phoneNumber || !body.alert) {
    return fail(c, "VALIDATION_ERROR", "phoneNumber and alert are required", 422);
  }

  const result = await sendSmsAdvisory(c.env, body.phoneNumber, body.alert);
  return ok(c, result);
});

export default advisory;
