import { Hono } from "hono";
import type { Env } from "../types";
import { reverseGeocodeSchema } from "../utils/validation";
import { ok, fail } from "../utils/response";
import { reverseGeocode } from "../services/geocodeService";

const geocode = new Hono<{ Bindings: Env }>();

geocode.get("/reverse", async (c) => {
  const parsed = reverseGeocodeSchema.safeParse({
    lat: c.req.query("lat"),
    lon: c.req.query("lon"),
  });

  if (!parsed.success) {
    return fail(c, "VALIDATION_ERROR", "Valid lat and lon query params are required", 422, parsed.error.flatten());
  }

  // Always resolves — falls back to the nearest known state centroid rather
  // than failing, so "Use My Location" never dead-ends for the farmer.
  const result = await reverseGeocode(parsed.data.lat, parsed.data.lon);
  return ok(c, result);
});

export default geocode;
