import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { Env } from "./types";
import type { AuthVariables } from "./middleware/auth";
import { fail } from "./utils/response";

import weather from "./routes/weather";
import soil from "./routes/soil";
import groundwater from "./routes/groundwater";
import satellite from "./routes/satellite";
import crops from "./routes/crops";
import recommend from "./routes/recommend";
import disease from "./routes/disease";
import voice from "./routes/voice";
import advisory from "./routes/advisory";
import images from "./routes/images";
import auth from "./routes/auth";
import profile from "./routes/profile";
import history from "./routes/history";
import geocode from "./routes/geocode";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.use("*", async (c, next) => {
  if (!c.env || Object.keys(c.env).length === 0) {
    c.env = process.env as any;
  }
  await next();
});

app.use("*", logger());
app.use(
  "/api/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/", (c) => c.json({ name: "Samarth Kisan AI API", status: "ok" }));
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

app.route("/api/weather", weather);
app.route("/api/soil", soil);
app.route("/api/groundwater", groundwater);
app.route("/api/satellite", satellite);
app.route("/api/crops", crops);
app.route("/api/recommend", recommend);
app.route("/api/disease", disease);
app.route("/api/voice", voice);
app.route("/api/advisory", advisory);
app.route("/api/images", images);
app.route("/api/auth", auth);
app.route("/api/profile", profile);
app.route("/api/history", history);
app.route("/api/geocode", geocode);

app.notFound((c) => fail(c, "NOT_FOUND", "Route not found", 404));

app.onError((err, c) => {
  console.error(err);
  return fail(c, "INTERNAL_ERROR", "Something went wrong. Please try again.", 500);
});

export default app;
