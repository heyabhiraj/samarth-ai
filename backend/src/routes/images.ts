import { Hono } from "hono";
import type { Env } from "../types";
import { getObject } from "../services/gcsService";

const images = new Hono<{ Bindings: Env }>();

images.get("/*", async (c) => {
  const key = c.req.path.replace(/^\/api\/images\//, "");

  try {
    const object = await getObject(c.env, key);
    if (!object) return c.notFound();

    const headers = new Headers();
    headers.set("Content-Type", object.contentType);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new Response(object.body, { headers });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, error: { code: "IMAGE_FETCH_FAILED", message: "Could not load image" } }, 502);
  }
});

export default images;
