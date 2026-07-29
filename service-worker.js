// Service Worker لتطبيق Scales - يعمل التطبيق أوفلاين بالكامل
const CACHE_VERSION = 'scales-cache-v7';

// الملفات الأساسية التي يجب تخزينها لفتح التطبيق أوفلاين
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

const OPTIONAL_ASSETS = [
  './songs.json'
];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      var allAssets = CORE_ASSETS.concat(OPTIONAL_ASSETS);
      return Promise.all(
        allAssets.map(function (url) {
          return cache.add(url).catch(function () {
            // تجاهل أي ملف غير موجود لعدم إعاقة التثبيت
          });
        })
      );
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_VERSION; })
            .map(function (key) { return caches.delete(key); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;

  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  // الطلبات الموجهة للروابط الخارجية (مثل جيت هب) تمر مباشرة عبر الشبكة للحصول على أحدث البصمات (ETag) والتحديثات
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        var resClone = res.clone();
        caches.open(CACHE_VERSION).then(function (cache) { cache.put(req, resClone); });
        return res;
      });
    })
  );
});