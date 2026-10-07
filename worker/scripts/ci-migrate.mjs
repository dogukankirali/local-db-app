// Cloudflare Workers Builds'te (WORKERS_CI=1) deploy'dan önce D1 migration'larını uzak veritabanına uygular (#24).
// Lokal `wrangler dev`, GitHub CI'daki dry-run ve main dışındaki branch build'lerinde hiçbir şey yapmaz.
import { execSync } from "node:child_process";

// Önizleme (PR) build'leri de WORKERS_CI=1 ile çalışır; canlı veritabanına yalnızca main build'i yazar
if (process.env.WORKERS_CI === "1" && process.env.WORKERS_CI_BRANCH === "main") {
  execSync("npx wrangler d1 migrations apply kiroku --remote", { stdio: "inherit", env: { ...process.env, CI: "1" } });
}
