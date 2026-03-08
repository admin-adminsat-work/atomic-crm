/**
 * Cloudflare Worker entry point.
 *
 * Serves all static assets from the ASSETS binding (bypasses CDN cache for
 * index.html so stale builds are never served after a deploy).
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Fetch the asset from the bundled files (not from CDN cache)
    const response = await env.ASSETS.fetch(request);

    // For index.html (root or explicit path), strip CDN caching so
    // Cloudflare never serves a stale shell after a new deploy.
    if (path === "/" || path === "/index.html") {
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return response;
  },
};
