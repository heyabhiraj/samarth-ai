import { Hono } from "hono";
import type { Env } from "../types";
import { cropRecommendationSchema } from "../utils/validation";
import { ok, fail } from "../utils/response";
import { recommendCrops } from "../services/cropService";
import { createDocument } from "../services/firestoreService";
import type { AuthVariables } from "../middleware/auth";
import { optionalAuth } from "../middleware/auth";

const recommend = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

recommend.use("*", optionalAuth);

recommend.post("/", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return fail(c, "INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const parsed = cropRecommendationSchema.safeParse(body);
  if (!parsed.success) {
    return fail(c, "VALIDATION_ERROR", "Invalid crop recommendation request", 422, parsed.error.flatten());
  }

  try {
    const result = await recommendCrops(c.env, parsed.data);

    await createDocument(c.env, "crop_recommendations", {
      farmerId: c.get("farmerId") ?? null,
      state: parsed.data.state,
      district: parsed.data.district,
      village: parsed.data.village,
      season: parsed.data.season,
      recommendations: result.recommendations,
      aiSummary: result.aiSummary,
      confidencePct: result.confidencePct,
      createdAt: new Date().toISOString(),
    });

    return ok(c, result);
  } catch (err) {
    return fail(c, "RECOMMENDATION_FAILED", (err as Error).message, 502);
  }
});

export default recommend;
