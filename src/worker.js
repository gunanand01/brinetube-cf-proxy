export default {
  async fetch(request, env, ctx) {
    const RENDER_URL = 'https://brinetube-extracter.onrender.com';
    const url = new URL(request.url);

    if (url.pathname === '/extract' && request.method === 'POST') {
      const body = await request.text();

      // Cache key with version bump
      const cacheUrl = new URL(url.origin + '/extract');
      cacheUrl.searchParams.set('body', body);
      cacheUrl.searchParams.set('v', '3'); // ← version bump — purana cache bypass

      const cacheKey = new Request(cacheUrl.toString(), {
        method: 'GET',
      });

      const cache = caches.default;
      let cachedResponse = await cache.match(cacheKey);

      if (cachedResponse) {
        const newHeaders = new Headers(cachedResponse.headers);
        newHeaders.set('X-Cache', 'HIT');
        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          headers: newHeaders,
        });
      }

      // Fetch from Render
      const target = RENDER_URL + url.pathname + url.search;
      const modified = new Request(target, {
        method: 'POST',
        headers: request.headers,
        body,
      });

      const renderResponse = await fetch(modified);
      const responseBody = await renderResponse.text();

      // Only cache successful responses
      const finalHeaders = new Headers();
      finalHeaders.set('Content-Type', 'application/json');
      finalHeaders.set('Access-Control-Allow-Origin', '*');
      finalHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      finalHeaders.set('Access-Control-Allow-Headers', '*');
      finalHeaders.set('X-Cache', 'MISS');

      if (renderResponse.ok) {
        finalHeaders.set('Cache-Control', 'public, max-age=3600');

        const cached = new Response(responseBody, {
          status: 200,
          headers: finalHeaders,
        });

        ctx.waitUntil(cache.put(cacheKey, cached.clone()));
      }

      return new Response(responseBody, {
        status: renderResponse.status,
        headers: finalHeaders,
      });
    }

    // Non-extract requests — proxy
    const target = RENDER_URL + url.pathname + url.search;
    const modified = new Request(target, {
      method: request.method,
      headers: request.headers,
      body:
        request.method !== 'GET' && request.method !== 'HEAD'
          ? await request.text()
          : undefined,
    });

    const response = await fetch(modified);

    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    newHeaders.set('Access-Control-Allow-Headers', '*');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};
