async function probe() {
  const routes = [
    'https://youtube-streaming-ten.vercel.app/',
    'https://youtube-streaming-ten.vercel.app/api/auth/session',
    'https://youtube-streaming-ten.vercel.app/api/content/feed',
    'https://youtube-streaming-ten.vercel.app/api/content/recommendations',
    'https://youtube-streaming-ten.vercel.app/api/content/search?q=coding',
    'https://youtube-streaming-ten.vercel.app/api/providers/status',
    'https://youtube-streaming-ten.vercel.app/api/content/watch-progress',
    'https://youtube-streaming-ten.vercel.app/api/content/history',
    'https://youtube-streaming-ten.vercel.app/api/content/saved'
  ];
  console.log('Probing production endpoints:');
  for (const url of routes) {
    const t0 = performance.now();
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'PerformanceAudit/1.0' } });
      const ms = (performance.now() - t0).toFixed(1);
      console.log(`${res.status} (${ms}ms) -> ${url}`);
    } catch (e: any) {
      const ms = (performance.now() - t0).toFixed(1);
      console.log(`ERR (${ms}ms) -> ${url}: ${e.message}`);
    }
  }
}
probe();
