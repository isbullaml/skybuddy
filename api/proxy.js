// Sky Buddy relay: a Vercel serverless function at /api/proxy?url=...
// The page and this function share one origin on Vercel, so the browser's
// CORS rule never applies. Only the flight-data hosts below are relayed.
const ALLOWED_HOSTS = ['api.adsb.lol', 'api.airplanes.live', 'opendata.adsb.fi', 'api.adsbdb.com'];

module.exports = async (req, res) => {
  let target;
  try { target = new URL(req.query.url); }
  catch (e) { res.status(400).send('Missing or bad ?url='); return; }
  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.includes(target.hostname)) {
    res.status(403).send('Host not allowed'); return;
  }
  try {
    const upstream = await fetch(target.toString(), {
      headers: { 'User-Agent': 'SkyBuddy/1.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(9000)
    });
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.setHeader('Cache-Control', 's-maxage=5');
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (e) {
    res.status(502).send('Upstream failed: ' + e.message);
  }
};
