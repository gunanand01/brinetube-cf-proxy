export default {
  async fetch(request, env, ctx) {
    const RENDER_URL = 'https://brinetube-extracter.onrender.com';
    const url = new URL(request.url);

    // Handle /extract with caching
    if (url.pathname === '/extract' && request.method === 'POST') {
      const body = await request.text();

      // Create cache key from body
      const cacheUrl = new URL(url.origin + '/extract');
      cacheUrl.searchParams.set('body', body);

      const cacheKey = new Request(cacheUrl.toString(), {
        method: 'GET',
      });

      const cache = caches.default;
      let response = await cache.match(cacheKey);

      if (response) {
        const newHeaders = new Headers(response.headers);
        newHeaders.set('X-Cache', 'HIT');
        return new Response(response.body, {
          status: response.status,
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

      const cached = new Response(responseBody, {
        status: renderResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600',
          'X-Cache': 'MISS',
        },
      });

      ctx.waitUntil(cache.put(cacheKey, cached.clone()));

      const finalHeaders = new Headers(cached.headers);
      finalHeaders.set('Access-Control-Allow-Origin', '*');
      finalHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      finalHeaders.set('Access-Control-Allow-Headers', '*');

      return new Response(cached.body, {
        status: cached.status,
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
