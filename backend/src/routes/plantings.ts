import { Hono } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { ok, fail } from "../utils/response";
import { plantingSchema } from "../utils/validation";
import { addPlanting, listPlantings, removePlanting } from "../services/plantingService";

const plantings = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

plantings.use("*", requireAuth);

plantings.get("/", async (c) => {
  try {
    const farmerId = c.get("farmerId") as string;
    return ok(c, await listPlantings(c.env, farmerId));
  } catch (err) {
    return fail(c, "PLANTINGS_FETCH_FAILED", (err as Error).message, 502);
  }
});

plantings.post("/", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return fail(c, "INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const parsed = plantingSchema.safeParse(body);
  if (!parsed.success) {
    return fail(c, "VALIDATION_ERROR", "A crop and sowing date (YYYY-MM-DD) are required", 422, parsed.error.flatten());
  }

  try {
    const farmerId = c.get("farmerId") as string;
    const planting = await addPlanting(c.env, farmerId, parsed.data);
    return ok(c, planting, 201);
  } catch (err) {
    return fail(c, "PLANTING_ADD_FAILED", (err as Error).message, 422);
  }
});

plantings.delete("/:id", async (c) => {
  try {
    const farmerId = c.get("farmerId") as string;
    const deleted = await removePlanting(c.env, farmerId, c.req.param("id"));
    if (!deleted) return fail(c, "NOT_FOUND", "Planting not found", 404);
    return ok(c, { deleted: true });
  } catch (err) {
    return fail(c, "PLANTING_DELETE_FAILED", (err as Error).message, 502);
  }
});

export default plantings;
