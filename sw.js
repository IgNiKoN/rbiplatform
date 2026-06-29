/* Файл: sw.js */
// ОБЯЗАТЕЛЬНО МЕНЯЕМ ВЕРСИЮ при любых изменениях в коде!
// ОБЯЗАТЕЛЬНО МЕНЯЕМ ВЕРСИЮ при любых изменениях в коде!
const APP_VERSION = '18.24.0';
const SW_VERSION = '18.24.0';
const CACHE_NAME = `rbi-quality-v${SW_VERSION}`;

// 1. ПРЕ-КЭШ: Локальные файлы и ВНЕШНИЕ БИБЛИОТЕКИ (для 100% офлайна)
const urlsToCache = [
  './',
  './index.html',
  './report.html',
  './css/style.css',
  './data/system_docs.js',
  './data/system_nodes.js',
  './data/system_twi.js',
  './js/construction/constructionManager.js',
  './js/construction/transferManager.js',
  './js/router.js',
  './js/views.js',
  './js/config.js',
  './libs/tailwindcdn.js',
  './libs/chart.umd.min.js',
  './libs/xlsx.full.min.js',
  './libs/html2pdf.bundle.min.js',
  './libs/pdfjs/pdf.min.js',
  './libs/pdfjs/pdf.worker.min.js',
  './libs/qrcode.min.js',
  './libs/panzoom.min.js',
  './libs/Sortable.min.js',
  './libs/supabase-js.min.js',
  './js/contractorDirectory.js',
  './js/objectDirectory.js',
  './js/roles.js', // <-- ДОБАВИЛИ РОЛИ (КРИТИЧНО ДЛЯ ОФЛАЙНА!)
  './js/sync.js',
  './js/storage.js',
  './js/templates.js',
  './js/math.js',
  './js/shared/math.utils.js',
  './js/shared/toast.utils.js',
  './js/shared/template.utils.js',
  './js/ai.js',
  './js/faq.js',
  './js/etalon.js',
  './js/app.js',
  './js/export.js',
  './js/game.js',

  // Ядро модульной архитектуры
  './js/core/rbi-core.js',
  './js/core/app.entry.js',

  // Сервисы
  './js/services/storage.service.js',
  './js/services/permission.service.js',
  './js/services/sync.service.js',
  './js/services/inspection.service.js',
  './js/services/file.service.js',
  './js/services/report.service.js',
  './js/services/contractor-directory.service.js',
  './js/services/object-directory.service.js',
  './js/services/task.service.js',
  './js/services/sk.service.js',
  './js/services/knowledge.service.js',
  './js/services/analytics.service.js',

  // Фаза 21 — AI Service
  './js/services/ai.service.js',

  // Фаза 22/23 — Master Data Service
  './js/services/masterData.service.js',

  // Фаза 29 — Template Service
  './js/services/template.service.js',

  // Фаза 8 — Settings
  './js/services/settings.service.js',
  './js/services/app-mode.service.js',
  './js/services/session.service.js',
  './js/modules/settings/settings.actions.js',
  './js/modules/settings/settings.module.js',

  // Фаза 9 — Knowledge Module
  './js/modules/knowledge/knowledge.module.js',
  './js/modules/knowledge/knowledge.state.js',
  './js/modules/knowledge/knowledge.actions.js',
  './js/modules/knowledge/knowledge.render.js',

  // Фаза 10 — Tasks Module
  './js/modules/quality/tasks.module.js',
  './js/modules/quality/tasks.state.js',
  './js/modules/quality/tasks.actions.js',
  './js/modules/quality/tasks.render.js',

  // Фаза 11 — Analytics Module
  './js/modules/quality/analytics.module.js',
  './js/modules/quality/analytics.state.js',
  './js/modules/quality/analytics.actions.js',
  './js/modules/quality/analytics.render.js',

  // Фаза 12 — History Module
  './js/modules/quality/history.module.js',
  './js/modules/quality/history.state.js',
  './js/modules/quality/history.actions.js',
  './js/modules/quality/history.render.js',

  // Фаза 13 — SK Module
  './js/modules/sk/sk.module.js',
  './js/modules/sk/sk.state.js',
  './js/modules/sk/sk.actions.js',
  './js/modules/sk/sk.render.js',

  // Фаза 14 — Audit Module
  './js/modules/quality/audit.module.js',
  './js/modules/quality/audit.state.js',
  './js/modules/quality/audit.actions.js',
  './js/modules/quality/audit.render.js',

  // Фаза 15 — Construction Module
  './js/modules/construction/construction.module.js',
  './js/modules/construction/construction.state.js',
  './js/modules/construction/construction.actions.js',
  './js/modules/construction/construction.render.js',

  // Фаза 16 — Reports Module
  './js/modules/quality/reports.module.js',
  './js/modules/quality/reports.state.js',
  './js/modules/quality/reports.actions.js',
  './js/modules/quality/reports.render.js',

  // Фаза 17 — Game Module
  './js/modules/gamification/game.module.js',
  './js/modules/gamification/game.state.js',
  './js/modules/gamification/game.actions.js',
  './js/modules/gamification/game.render.js',

  // Фаза 18 — Etalon Module
  './js/modules/quality/etalon.module.js',
  './js/modules/quality/etalon.state.js',
  './js/modules/quality/etalon.actions.js',
  './js/modules/quality/etalon.render.js',

  // Фаза 19 — AI Module
  './js/modules/ai/ai.module.js',
  './js/modules/ai/ai.state.js',
  './js/modules/ai/ai.actions.js',
  './js/modules/ai/ai.render.js',

  // Фаза 20 — Engineer Module
  './js/modules/quality/engineer/engineer.module.js',
  './js/modules/quality/engineer/engineer.state.js',
  './js/modules/quality/engineer/engineer.actions.js',
  './js/modules/quality/engineer/engineer.render.js',

  // Модули (legacy)
  './js/modules/quality/history.legacy.js',
  './js/modules/quality/audit.legacy.js',
  './js/modules/quality/tasks.legacy.js',
  './js/modules/quality/analytics.legacy.js',
  './js/modules/sk/sk.legacy.js',
  './js/modules/construction/construction.legacy.js',
  './js/modules/knowledge/knowledge.legacy.js',
  './js/modules/settings/settings.legacy.js',

  './manifest.webmanifest',
    // Шрифты Inter (интерфейс)
  './fonts/Inter-Regular.woff2',
  './fonts/Inter-Medium.woff2',
  './fonts/Inter-SemiBold.woff2',
  './fonts/Inter-Bold.woff2',
  './fonts/Inter-ExtraBold.woff2',
  './fonts/Inter-Black.woff2',

  // Шрифты Playfair Display (PDF – заголовки)
  './fonts/PlayfairDisplay-Regular.woff2',
  './fonts/PlayfairDisplay-Italic.woff2',
  './fonts/PlayfairDisplay-Medium.woff2',
  './fonts/PlayfairDisplay-MediumItalic.woff2',
  './fonts/PlayfairDisplay-SemiBold.woff2',
  './fonts/PlayfairDisplay-SemiBoldItalic.woff2',
  './fonts/PlayfairDisplay-Bold.woff2',
  './fonts/PlayfairDisplay-BoldItalic.woff2',
  './fonts/PlayfairDisplay-ExtraBold.woff2',
  './fonts/PlayfairDisplay-ExtraBoldItalic.woff2',
  './fonts/PlayfairDisplay-Black.woff2',
  './fonts/PlayfairDisplay-BlackItalic.woff2',

  // Шрифты Bricolage Grotesque (PDF – основной текст)
  './fonts/BricolageGrotesque-Light.woff2',
  './fonts/BricolageGrotesque-Regular.woff2',
  './fonts/BricolageGrotesque-Medium.woff2',
  './fonts/BricolageGrotesque-SemiBold.woff2',
  './fonts/BricolageGrotesque-Bold.woff2',
  './fonts/BricolageGrotesque-ExtraBold.woff2'
];

// 2. УСТАНОВКА: Безопасное скачивание файлов в память
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Кэшируем ядро и библиотеки...');
      // Безопасное кэширование: если одна ссылка недоступна, остальные всё равно скачаются
      return Promise.all(

        urlsToCache.map(url => {

          return fetch(url)

            .then(response => {

              if (
                response &&
                response.status === 200
              ) {

                return cache.put(
                  url,
                  response.clone()
                );

              }

            })

            .catch(err => {

              console.log(
                '[SW] Ошибка кэширования:',
                url,
                err
              );

            });

        })

      );
    })
  );
});

// 3. АКТИВАЦИЯ: Удаляем старые версии кэша
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Удаляем старый кэш:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 4. ПЕРЕХВАТ ЗАПРОСОВ
self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith('http')) return;
  if (event.request.method !== 'GET') return;

  // ✅ НОВОЕ: Полностью пропускаем запросы к облачному хранилищу (Storage)
  if (event.request.url.includes('/storage/v1/object/public/')) {
    return;   // Браузер обработает запрос напрямую, без вмешательства SW
  }

  // ✅ Пропускаем запросы к API (база данных, функции), чтобы не ломать синхронизацию
  const isApi = event.request.url.includes('api.rbi-q.ru') &&
    !event.request.url.includes('/storage/v1/object/public/');
  if (isApi) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// ==========================================
// PUSH УВЕДОМЛЕНИЯ
// ==========================================

// Слушаем приход Push-уведомления с сервера
self.addEventListener('push', function(event) {
    // Если сервер прислал данные, берем их. Иначе ставим заглушку.
    const data = event.data ? event.data.json() : { title: 'RBI Quality', body: 'У вас новое уведомление' };

    const options = {
        body: data.body,
        icon: './icons/icon-512-2.png',
        badge: './icons/icon-512-2.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/' // Ссылка, куда перейти при клике
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Слушаем клик пользователя по уведомлению
self.addEventListener('notificationclick', function(event) {
    event.notification.close(); // Закрываем уведомление

    // Открываем приложение по ссылке из уведомления
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});

// ==========================================
// ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ КЭША
// ==========================================
self.addEventListener('message', (event) => {
    // Если получаем команду SKIP_WAITING от кнопки "Обновить" в интерфейсе
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting(); // Заставляем новый Service Worker немедленно взять управление на себя
    }
});