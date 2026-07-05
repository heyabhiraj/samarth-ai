import { Hono } from "hono";
import type { Env } from "../types";
import { groundwaterQuerySchema } from "../utils/validation";
import { ok, fail } from "../utils/response";
import { resolveLocation } from "../services/geocodeService";
import { getGroundwater } from "../services/groundwaterService";

const groundwater = new Hono<{ Bindings: Env }>();

groundwater.get("/", async (c) => {
  const parsed = groundwaterQuerySchema.safeParse({
    state: c.req.query("state"),
    district: c.req.query("district"),
    village: c.req.query("village") || undefined,
  });

  if (!parsed.success) {
    return fail(c, "VALIDATION_ERROR", "state and district are required", 422, parsed.error.flatten());
  }

  try {
    const location = await resolveLocation(c.env, parsed.data.state, parsed.data.district, parsed.data.village);
    const data = await getGroundwater(c.env, location);
    return ok(c, data);
  } catch (err) {
    return fail(c, "GROUNDWATER_FETCH_FAILED", (err as Error).message, 502);
  }
});

export default groundwater;
