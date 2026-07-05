import { Hono } from "hono";
import type { Env } from "../types";
import { ok } from "../utils/response";
import { CROP_REFERENCE_DATA } from "../data/crops";

const crops = new Hono<{ Bindings: Env }>();

crops.get("/", (c) => {
  const season = c.req.query("season");
  const data = season ? CROP_REFERENCE_DATA.filter((crop) => crop.seasons.includes(season as any)) : CROP_REFERENCE_DATA;
  return ok(c, data);
});

export default crops;
