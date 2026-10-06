export default {
  async fetch(request, env, ctx) {
    const RENDER_URL = 'https://brinetube-extracter.onrender.com';
    const url = new URL(request.url);
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
