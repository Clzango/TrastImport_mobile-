const { getDefaultConfig } = require("expo/metro-config");
const https = require("https");
const http = require("http");

const config = getDefaultConfig(__dirname);

// The API doesn't send CORS headers, so a browser can't call it from localhost. In dev, the web
// app calls /api on this server instead and it forwards to the backend, like the Vercel and
// Docker deployments do.
const upstream = new URL(
  /^https?:\/\//.test(process.env.EXPO_PUBLIC_API_URL ?? "")
    ? process.env.EXPO_PUBLIC_API_URL
    : "https://trastipmortapp-production.up.railway.app",
);

function proxyApi(req, res) {
  const target = new URL(req.url.replace(/^\/api/, "") || "/", upstream);
  const headers = { ...req.headers, host: target.host };
  delete headers.origin;
  delete headers.referer;
  const client = target.protocol === "https:" ? https : http;
  const proxied = client.request(target, { method: req.method, headers }, (upstreamRes) => {
    res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
    upstreamRes.pipe(res);
  });
  proxied.on("error", () => {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ detail: "Can't reach the API." }));
  });
  req.pipe(proxied);
}

const enhance = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const next = enhance ? enhance(middleware, server) : middleware;
  return (req, res, nextFn) =>
    req.url === "/api" || req.url.startsWith("/api/") ? proxyApi(req, res) : next(req, res, nextFn);
};

module.exports = config;
