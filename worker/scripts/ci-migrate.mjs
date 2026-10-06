// Cloudflare Workers Builds'te (WORKERS_CI=1) deploy'dan önce D1 migration'larını uzak veritabanına uygular (#24).
// Lokal `wrangler dev` ve GitHub CI'daki dry-run'da hiçbir şey yapmaz.
import { execSync } from "node:child_process";

if (process.env.WORKERS_CI === "1") {
  execSync("npx wrangler d1 migrations apply kiroku --remote", { stdio: "inherit", env: { ...process.env, CI: "1" } });
}
