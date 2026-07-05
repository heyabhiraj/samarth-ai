import { Hono } from "hono";
import type { Env } from "../types";
import { ok, fail } from "../utils/response";
import { detectDisease } from "../services/diseaseService";
import { createDocument } from "../services/firestoreService";
import type { AuthVariables } from "../middleware/auth";
import { optionalAuth } from "../middleware/auth";

const disease = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

disease.use("*", optionalAuth);

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

disease.post("/", async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.parseBody();
  } catch {
    return fail(c, "INVALID_FORM", "Expected multipart/form-data with an 'image' field", 400);
  }

  const file = body.image;
  if (!(file instanceof File)) {
    return fail(c, "MISSING_IMAGE", "An 'image' file field is required", 422);
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return fail(c, "UNSUPPORTED_TYPE", "Only JPEG, PNG, or WEBP images are supported", 422);
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return fail(c, "IMAGE_TOO_LARGE", "Image must be smaller than 8MB", 422);
  }

  const cropName = typeof body.cropName === "string" ? body.cropName : undefined;

  try {
    const buffer = await file.arrayBuffer();
    const result = await detectDisease(c.env, buffer, file.type, cropName, c.req.url);

    await createDocument(c.env, "disease_reports", {
      farmerId: c.get("farmerId") ?? null,
      imageUrl: result.imageUrl,
      disease: result.disease,
      isHealthy: result.isHealthy,
      confidencePct: result.confidencePct,
      treatment: result.treatment,
      fertilizerRecommendation: result.fertilizerRecommendation,
      expertRecommendation: result.expertRecommendation,
      createdAt: result.detectedAt,
    });

    return ok(c, result);
  } catch (err) {
    return fail(c, "DISEASE_DETECTION_FAILED", (err as Error).message, 502);
  }
});

export default disease;
