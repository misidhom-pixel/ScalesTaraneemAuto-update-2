// Service Worker لتطبيق Scales - يشتغل التطبيق أوفلاين بالكامل
// لو عدّلت في التطبيق، غيّر رقم الإصدار ده عشان الكاش يتحدث عند المستخدمين
const CACHE_VERSION = 'scales-cache-v1';

// الملفات الأساسية اللي لازم تتخزن عشان التطبيق يفتح أوفلاين
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

// ملف الترانيم اختياري (ممكن يكون موجود أو لأ حسب إعداد المستخدم)
const OPTIONAL_ASSETS = [
  './songs.json'
];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      // نخزن الملفات الأساسية، ولو ملف اختياري مش موجود منعرقلش التثبيت
      var allAssets = CORE_ASSETS.concat(OPTIONAL_ASSETS);
      return Promise.all(
        allAssets.map(function (url) {
          return cache.add(url).catch(function () {
            // تجاهل أي ملف مش موجود بدل ما يفشل التثبيت كله
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

  // اطلبات لمصادر تانية (زي تحديث الترانيم من GitHub) سيبها تروح للنت عادي من غير تدخل من الكاش
  if (url.origin !== self.location.origin) {
    return;
  }

  // songs.json: نحاول النت الأول (عشان نجيب أحدث نسخة)، ولو مفيش نت نرجع للكاش
  if (url.pathname.endsWith('songs.json')) {
    event.respondWith(
      fetch(req).then(function (res) {
        var resClone = res.clone();
        caches.open(CACHE_VERSION).then(function (cache) { cache.put(req, resClone); });
        return res;
      }).catch(function () {
        return caches.match(req);
      })
    );
    return;
  }

  // باقي ملفات التطبيق (index.html, manifest, icons): كاش أول، ولو مش موجود نجيب من النت ونخزنه
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
