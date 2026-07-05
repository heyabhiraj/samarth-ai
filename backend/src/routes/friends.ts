import { Hono } from "hono";
import type { Env, Friend } from "../types";
import type { AuthVariables } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { ok, fail } from "../utils/response";
import { friendSchema, broadcastSchema } from "../utils/validation";
import { createDocument, deleteDocument, getDocument, runQuery } from "../services/firestoreService";
import { sendRawSms } from "../services/advisoryService";

const MAX_FRIENDS = 50;
const FRIENDS_COLLECTION = "friends";

const friends = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

friends.use("*", requireAuth);

async function listFriends(env: Env, farmerId: string): Promise<Friend[]> {
  // Sorted client-side to avoid needing a farmerId+createdAt composite index.
  const results = await runQuery<Friend>(env, FRIENDS_COLLECTION, {
    filters: [{ field: "farmerId", op: "EQUAL", value: farmerId }],
    limit: MAX_FRIENDS,
  });
  return results.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

friends.get("/", async (c) => {
  try {
    const farmerId = c.get("farmerId") as string;
    return ok(c, await listFriends(c.env, farmerId));
  } catch (err) {
    return fail(c, "FRIENDS_FETCH_FAILED", (err as Error).message, 502);
  }
});

friends.post("/", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return fail(c, "INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const parsed = friendSchema.safeParse(body);
  if (!parsed.success) {
    return fail(c, "VALIDATION_ERROR", "A name and 10-digit phone number are required", 422, parsed.error.flatten());
  }

  try {
    const farmerId = c.get("farmerId") as string;
    const existing = await listFriends(c.env, farmerId);

    if (existing.length >= MAX_FRIENDS) {
      return fail(c, "FRIENDS_LIMIT", `You can save up to ${MAX_FRIENDS} friends`, 422);
    }
    if (existing.some((f) => f.phoneNumber === parsed.data.phoneNumber)) {
      return fail(c, "DUPLICATE_FRIEND", "This phone number is already in your friends list", 422);
    }

    const friend = await createDocument<Friend>(c.env, FRIENDS_COLLECTION, {
      farmerId,
      name: parsed.data.name,
      phoneNumber: parsed.data.phoneNumber,
      createdAt: new Date().toISOString(),
    });

    return ok(c, friend, 201);
  } catch (err) {
    return fail(c, "FRIEND_ADD_FAILED", (err as Error).message, 502);
  }
});

friends.delete("/:id", async (c) => {
  try {
    const farmerId = c.get("farmerId") as string;
    const id = c.req.param("id");

    const friend = await getDocument<Friend>(c.env, FRIENDS_COLLECTION, id);
    if (!friend || friend.farmerId !== farmerId) {
      return fail(c, "NOT_FOUND", "Friend not found", 404);
    }

    await deleteDocument(c.env, FRIENDS_COLLECTION, id);
    return ok(c, { deleted: true });
  } catch (err) {
    return fail(c, "FRIEND_DELETE_FAILED", (err as Error).message, 502);
  }
});

friends.post("/broadcast", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return fail(c, "INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const parsed = broadcastSchema.safeParse(body);
  if (!parsed.success) {
    return fail(c, "VALIDATION_ERROR", "A message (max 320 characters) is required", 422, parsed.error.flatten());
  }

  try {
    const farmerId = c.get("farmerId") as string;
    const list = await listFriends(c.env, farmerId);

    if (list.length === 0) {
      return fail(c, "NO_FRIENDS", "Add at least one friend before broadcasting", 422);
    }

    let sent = 0;
    let reason: string | undefined;
    for (const friend of list) {
      const result = await sendRawSms(c.env, friend.phoneNumber, parsed.data.message);
      if (result.sent) sent++;
      else reason = result.reason;
    }

    return ok(c, { total: list.length, sent, reason });
  } catch (err) {
    return fail(c, "BROADCAST_FAILED", (err as Error).message, 502);
  }
});

export default friends;
