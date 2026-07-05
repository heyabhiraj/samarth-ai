import { Hono } from "hono";
import type { Env } from "../types";
import { voiceQuerySchema } from "../utils/validation";
import { ok, fail } from "../utils/response";
import { answerVoiceQuery } from "../services/voiceService";
import { createDocument } from "../services/firestoreService";
import type { AuthVariables } from "../middleware/auth";
import { optionalAuth } from "../middleware/auth";

const voice = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

voice.use("*", optionalAuth);

voice.post("/", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return fail(c, "INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const parsed = voiceQuerySchema.safeParse(body);
  if (!parsed.success) {
    return fail(c, "VALIDATION_ERROR", "Invalid voice query", 422, parsed.error.flatten());
  }

  try {
    const result = await answerVoiceQuery(c.env, parsed.data);

    const farmerId = c.get("farmerId");
    if (farmerId) {
      try {
        await createDocument(c.env, "voice_queries", {
          farmerId,
          queryText: parsed.data.query,
          answerText: result.answer,
          language: result.language,
          confidencePct: result.confidencePct,
          createdAt: new Date().toISOString(),
        });
      } catch (historyErr) {
        console.error("Could not save voice query history", historyErr);
      }
    }

    return ok(c, result);
  } catch (err) {
    return fail(c, "VOICE_QUERY_FAILED", (err as Error).message, 502);
  }
});

export default voice;
