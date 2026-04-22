const CACHE_NAME = 'jlpt-crosswords-v68'; 

const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './js/main.js',
  './js/storage.js',
  './js/utils.js',
  './js/shop.js',
  './js/crossword.js',
  './n5.js',
  './n4.js',
  './n3.js',
  './n2.js',
  './n1.js',
  './manifest.webmanifest'
];

// 1. Установка: кэшируем статические ресурсы
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// 2. Активация: удаляем старые кэши
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => {
                        console.log('Deleting old cache:', key);
                        return caches.delete(key);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. Перехват запросов: разные стратегии для разных типов файлов
self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);

    // Для HTML (навигация) – Network First (свежая страница, кэш при офлайне)
    if (event.request.mode === 'navigate' || requestUrl.pathname.endsWith('.html')) {
        event.respondWith(
            fetch(event.request)
                .then(networkResponse => {
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
                        return networkResponse;
                    }
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return networkResponse;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Для JS и CSS – Network First (всегда свежие скрипты и стили, кэш при офлайне)
    if (requestUrl.pathname.match(/\.(js|css)$/)) {
        event.respondWith(
            fetch(event.request)
                .then(networkResponse => {
                    if (!networkResponse || networkResponse.status !== 200) {
                        return networkResponse;
                    }
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return networkResponse;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Для всего остального (изображения, шрифты, данные) – Cache First (быстрая загрузка)
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then(networkResponse => {
                    if (!networkResponse || networkResponse.status !== 200) {
                        return networkResponse;
                    }
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return networkResponse;
                });
            })
    );
});
