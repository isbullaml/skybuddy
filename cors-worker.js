// Sky Buddy CORS relay: a free Cloudflare Worker.
// 1. Go to https://dash.cloudflare.com -> Workers & Pages -> Create -> Create Worker.
// 2. Replace the code with this file, then Deploy.
// 3. Put 'https://<your-worker>.workers.dev/?url=' in MY_PROXY in index.html.

const ALLOWED_HOSTS = ['api.adsb.lol', 'api.airplanes.live', 'opendata.adsb.fi', 'api.adsbdb.com'];
const ALLOWED_ORIGIN = 'https://isbullaml.github.io';

export default {
  async fetch(request) {
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    let target;
    try { target = new URL(new URL(request.url).searchParams.get('url')); }
    catch (e) { return new Response('Missing or bad ?url=', { status: 400, headers: cors }); }
    if (target.protocol !== 'https:' || !ALLOWED_HOSTS.includes(target.hostname)) {
      return new Response('Host not allowed', { status: 403, headers: cors });
    }

    const upstream = await fetch(target.toString(), { headers: { 'User-Agent': 'SkyBuddy/1.0', 'Accept': 'application/json' } });
    const headers = new Headers(cors);
    headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/json');
    headers.set('Cache-Control', 'public, max-age=5');
    return new Response(upstream.body, { status: upstream.status, headers });
  }
};
