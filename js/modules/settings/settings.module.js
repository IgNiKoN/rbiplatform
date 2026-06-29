/**
 * settings.module.js
 * Модуль настроек — контракт платформы (id / routes / dependencies / init / mount / unmount).
 *
 * Этот файл — оркестратор. Бизнес-логика остаётся в settings.legacy.js.
 * Загружается с type="module" (первый ES-модуль в проекте).
 *
 * Зависимости: window.RBI.services.settings, window.RBI.services.storage
 */

export const SettingsModule = {
    id: 'settings',
    routes: ['/settings'],
    dependencies: ['storage', 'settings'],

    /**
     * Инициализация: подписка на события платформы.
     * Вызывается один раз при старте приложения.
     */
    async init(ctx) {
        ctx.math      = window.RBI && window.RBI.utils && window.RBI.utils.math;
        ctx.toast     = window.RBI && window.RBI.utils && window.RBI.utils.toast;
        ctx.templates = window.RBI && window.RBI.utils && window.RBI.utils.templates;
        ctx.settings  = window.RBI && window.RBI.services && window.RBI.services.settings;

        if (window.SettingsActions) { window.SettingsActions.bindCtx(ctx); }

        // Загрузить настройки при старте
        const settingsSvc = ctx.settings;
        if (settingsSvc && typeof settingsSvc.load === 'function') {
            await settingsSvc.load();
        }

        // Подписаться на изменения через EventBus
        if (ctx && ctx.events && typeof ctx.events.on === 'function') {
            ctx.events.on('settings:changed', (payload) => {
                // Применить тему/UI при изменении настроек из других модулей
                if (payload && (payload.key === 'theme' || payload.key === 'fontSize' || payload.key === 'navPosition')) {
                    if (typeof window.applySettingsToUI === 'function') {
                        window.applySettingsToUI();
                    }
                }
            });
        }

        // Также подписаться через сервис (работает и до инициализации ctx)
        if (settingsSvc && typeof settingsSvc.onChange === 'function') {
            settingsSvc.onChange((payload) => {
                if (!payload) return;
                // Синхронизировать изменения с RBI.events если EventBus уже есть
                if (window.RBI && window.RBI.events && typeof window.RBI.events.emit === 'function') {
                    // событие уже эмитировано в settings.service.js — не дублируем
                }
            });
        }

        console.log('[SettingsModule] init complete');
    },

    /**
     * Рендер UI настроек в переданный контейнер.
     * Пока делегирует в settings.legacy.js через window.*
     */
    mount(container, ctx) {
        if (typeof window.renderSettingsTab === 'function') {
            window.renderSettingsTab();
        } else {
            console.warn('[SettingsModule] renderSettingsTab не найдена');
        }
    },

    /**
     * Очистка при уходе с вкладки настроек.
     */
    unmount() {
        // Будущие отписки от DOM-событий, таймеров и т.п.
    }
};

// Регистрация в реестре платформы (если RBI уже инициализирован)
if (typeof window !== 'undefined' && window.RBI && window.RBI.registry) {
    window.RBI.registry.register('module.settings', SettingsModule);
}

console.log('[SettingsModule] settings.module.js loaded (ES module)');
