import { Hono } from "hono";
import type { Env } from "../types";
import { schemesQuerySchema } from "../utils/validation";
import { ok, fail } from "../utils/response";
import { getGovtSchemes } from "../services/schemesService";

const schemes = new Hono<{ Bindings: Env }>();

schemes.get("/", async (c) => {
  const parsed = schemesQuerySchema.safeParse({
    state: c.req.query("state"),
    language: c.req.query("language") || undefined,
  });

  if (!parsed.success) {
    return fail(c, "VALIDATION_ERROR", "A valid state is required", 422, parsed.error.flatten());
  }

  try {
    const result = await getGovtSchemes(c.env, parsed.data.state, parsed.data.language ?? "en");
    return ok(c, result);
  } catch (err) {
    return fail(c, "SCHEMES_FETCH_FAILED", (err as Error).message, 502);
  }
});

export default schemes;
