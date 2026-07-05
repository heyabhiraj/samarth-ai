import { Hono } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { ok, fail } from "../utils/response";
import { getFarmerHistory } from "../services/historyService";

const history = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

history.get("/", requireAuth, async (c) => {
  try {
    const farmerId = c.get("farmerId") as string;
    const result = await getFarmerHistory(c.env, farmerId);
    return ok(c, result);
  } catch (err) {
    return fail(c, "HISTORY_FETCH_FAILED", (err as Error).message, 502);
  }
});

export default history;
