/**
 * Runs only for requests that don't match a file in dist/ (Cloudflare serves those directly).
 * Mirrors the Vercel rewrites and nginx.conf:
 *  - /api/* is proxied to the Railway API (only used when EXPO_PUBLIC_API_URL=/api).
 *  - Dynamic routes map to the page expo export wrote, e.g. /company/42 -> company/[id].html.
 *  - Anything else gets the app's not-found page with a 404 status.
 */
const DYNAMIC_ROUTES = [
  [/^\/(company|manage|claim|edit-company|reply|chat)\/[^/]+\/?$/, (m) => `/${m[1]}/[id]`],
  [/^\/reset-password\/[^/]+\/[^/]+\/?$/, () => "/reset-password/[uid]/[token]"],
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      const target = env.API_UPSTREAM.replace(/\/+$/, "") + (url.pathname.slice(4) || "/") + url.search;
      return fetch(new Request(target, request));
    }

    for (const [pattern, page] of DYNAMIC_ROUTES) {
      const match = url.pathname.match(pattern);
      if (match) {
        // The asset store expects the brackets encoded, otherwise it answers with a redirect.
        const path = page(match).replace(/\[/g, "%5B").replace(/\]/g, "%5D");
        return env.ASSETS.fetch(new Request(new URL(path, url), request));
      }
    }

    const notFound = await env.ASSETS.fetch(new URL("/+not-found", url));
    return new Response(notFound.body, { status: 404, headers: notFound.headers });
  },
};
