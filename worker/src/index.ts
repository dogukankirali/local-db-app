import { Hono } from "hono";
import { cors } from "hono/cors";
import { anilistRoutes } from "./anilist";
import { anime, createAnime } from "./anime";
import { users } from "./users";
import type { AppEnv } from "./util";
import { watchlist } from "./watchlist";

// Tek Worker: Next.js statik çıktısı assets olarak sunulur, yalnızca /api/* ve eklentinin
// eski /createAnime adresi bu koda düşer (wrangler.jsonc → assets.run_worker_first).

const api = new Hono<AppEnv>();
api.get("/healthcheck", async (c) => {
  await c.env.DB.prepare("SELECT 1").first();
  return c.text("OK");
});
api.route("/", anime);
api.route("/", watchlist);
api.route("/", users);
api.route("/", anilistRoutes);

const app = new Hono<AppEnv>();
app.use("*", cors({ origin: "*", allowHeaders: ["Content-Type", "Authorization"], allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] }));
app.route("/api", api);
app.post("/createAnime", createAnime);

app.notFound((c) => (c.req.path.startsWith("/api/") ? c.json({ message: "Bulunamadı" }, 404) : c.env.ASSETS.fetch(c.req.raw)));
app.onError((err, c) => {
  console.error(err);
  return c.json({ message: "Sunucu hatası oluştu" }, 500);
});

export default app;
