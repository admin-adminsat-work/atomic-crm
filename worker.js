/**
 * Cloudflare Worker entry point.
 *
 * index.html is embedded directly in the Worker bundle at deploy time,
 * so it is always served from the current Worker code — never from any
 * CDN or asset cache layer.  All other paths fall through to ASSETS.
 */
import indexHtml from "./dist/index.html";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/" || path === "/index.html") {
      return new Response(indexHtml, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
