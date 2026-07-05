import { Hono } from "hono";
import type { Env } from "../types";
import { soilQuerySchema } from "../utils/validation";
import { ok, fail } from "../utils/response";
import { resolveLocation } from "../services/geocodeService";
import { getSoil } from "../services/soilService";

const soil = new Hono<{ Bindings: Env }>();

soil.get("/", async (c) => {
  const parsed = soilQuerySchema.safeParse({
    state: c.req.query("state"),
    district: c.req.query("district"),
    village: c.req.query("village") || undefined,
  });

  if (!parsed.success) {
    return fail(c, "VALIDATION_ERROR", "state and district are required", 422, parsed.error.flatten());
  }

  try {
    const location = await resolveLocation(c.env, parsed.data.state, parsed.data.district, parsed.data.village);
    const data = await getSoil(c.env, location);
    return ok(c, data);
  } catch (err) {
    return fail(c, "SOIL_FETCH_FAILED", (err as Error).message, 502);
  }
});

export default soil;
