/* 하루나 서비스 워커: 앱 화면 파일을 캐시해 오프라인에서도 열리게 합니다. 기록은 IndexedDB에 따로 저장됩니다. */
const CACHE = 'haruna-v1';
const SHELL = ['./', 'index.html', 'app.css', 'app.js', 'mascot.png', 'manifest.webmanifest',
  'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith('haruna-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// 네트워크 우선: 새 버전은 바로 반영, 오프라인일 때만 캐시 사용
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});
