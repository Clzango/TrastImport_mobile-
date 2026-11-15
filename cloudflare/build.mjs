// Builds the web app for the Cloudflare Worker (run by `wrangler deploy`, see wrangler.jsonc).
// The app calls the API through this site's /api, which the Worker proxies to Railway, so the
// browser makes no cross-origin requests and Railway needs no CORS entry for this domain.
import { spawnSync } from "node:child_process";

const { status } = spawnSync("npx expo export --platform web --output-dir dist --clear", {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, EXPO_PUBLIC_API_URL: "/api" },
});
process.exit(status ?? 1);
