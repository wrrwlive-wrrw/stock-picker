const CACHE_NAME = 'stock-picker-v7';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/api.js',
  './js/app.js',
  './js/market.js',
  './js/methodology.js',
  './js/macro.js',
  './js/stock-query.js',
  './js/stock-analysis.js',
  './js/strategy.js',
  './js/recommend.js',
  './js/trade-signal.js',
  './js/watchlist.js',
  './js/daily-ai.js',
  './js/ai-stock-agent.js',
  './js/daily-report.js',
  './js/video-research.js'
];

// 安装 — 缓存核心资源
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 激活 — 清理旧缓存
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 请求拦截 — 网络优先，失败回退缓存
self.addEventListener('fetch', e => {
  // API请求不缓存
  if (e.request.url.includes('api.siliconflow.cn') ||
      e.request.url.includes('qt.gtimg.cn') ||
      e.request.url.includes('push2.eastmoney.com') ||
      e.request.url.includes('smartbox.gtimg.cn') ||
      e.request.url.includes('allorigins.win') ||
      e.request.url.includes('corsproxy.io') ||
      e.request.url.includes('codetabs.com')) {
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return resp;
      })
      .catch(() => caches.match(e.request))
  );
});
