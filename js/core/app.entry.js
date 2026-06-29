/**
 * app.entry.js
 * Единая точка инициализации модулей платформы RBI Quality Pro.
 *
 * Вызывается ПОСЛЕ initApp() из app.js — когда все сервисы уже загружены.
 * Не заменяет app.js. Работает параллельно с legacy-кодом.
 *
 * Паттерн:
 *   1. Получить ctx через RBI.createContext()
 *   2. Получить все модули из RBI.registry
 *   3. Вызвать module.init(ctx) на каждом
 *   4. Зарегистрировать себя как window.RBI.entry
 */
(function () {
    'use strict';

    var MODULE_KEYS = [
        'module.history',
        'module.audit',
        'module.analytics',
        'module.tasks',
        'module.sk',
        'module.etalon',
        'module.reports',
        'module.settings',
        'module.knowledge',
        'module.construction',
        'module.game',
        'module.engineer',
        'module.ai',
    ];

    async function initAllModules() {
        if (!window.RBI) {
            console.error('[app.entry] RBI не инициализирован — app.entry.js загружен слишком рано');
            return;
        }

        // Фаза 54: гарантируем загрузку настроек до инициализации модулей
        if (window.RBI.services && window.RBI.services.settings &&
            typeof window.RBI.services.settings.load === 'function') {
            try { await window.RBI.services.settings.load(); } catch (e) { /* настройки загружаются и без этого через app.js */ }
        }

        var ctx = window.RBI.createContext();

        console.log('[app.entry] Инициализация модулей...');

        for (var i = 0; i < MODULE_KEYS.length; i++) {
            var key = MODULE_KEYS[i];
            var mod = window.RBI.registry.get(key);
            if (!mod) {
                console.warn('[app.entry] Модуль не найден в реестре: ' + key);
                continue;
            }
            if (typeof mod.init !== 'function') {
                console.warn('[app.entry] У модуля нет метода init(): ' + key);
                continue;
            }
            try {
                await mod.init(ctx);
                console.log('[app.entry] \u2705 ' + key + ' \u2014 init() \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d');
            } catch (e) {
                console.error('[app.entry] \u274c \u041e\u0448\u0438\u0431\u043a\u0430 init() \u0434\u043b\u044f ' + key + ':', e);
            }
        }

        console.log('[app.entry] \u0412\u0441\u0435 \u043c\u043e\u0434\u0443\u043b\u0438 \u0438\u043d\u0438\u0446\u0438\u0430\u043b\u0438\u0437\u0438\u0440\u043e\u0432\u0430\u043d\u044b.');

        if (window.RBI.events && typeof window.RBI.events.emit === 'function') {
            window.RBI.events.emit('platform:ready', { modules: MODULE_KEYS.length });
        }
    }

    window.RBI = window.RBI || {};
    window.RBI.entry = {
        init: initAllModules
    };

    console.log('[app.entry] app.entry.js \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d. \u0412\u044b\u0437\u043e\u0432\u0438\u0442\u0435 window.RBI.entry.init() \u0434\u043b\u044f \u0441\u0442\u0430\u0440\u0442\u0430.');
}());
