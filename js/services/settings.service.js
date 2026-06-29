/* Файл: js/services/settings.service.js */
/* Settings Service v1.0 — обёртка над window.appSettings + STORES.SETTINGS */

(function () {
    'use strict';

    window.RBI = window.RBI || {};
    window.RBI.services = window.RBI.services || {};

    var SETTINGS_KEY = 'user_prefs';
    var ALLOWED_THEMES = ['auto', 'light', 'dark', 'rbi-light', 'rbi-dark'];

    var _listeners = [];

    function _getSettings() {
        return window.appSettings || {};
    }

    function _notifyListeners(key, value) {
        var payload = { key: key, value: value, all: _getSettings() };

        // Уведомление через EventBus (если доступен)
        if (window.RBI && window.RBI.events && typeof window.RBI.events.emit === 'function') {
            window.RBI.events.emit('settings:changed', payload);
        }

        // Уведомление прямых подписчиков (для случаев до инициализации EventBus)
        for (var i = 0; i < _listeners.length; i++) {
            try { _listeners[i](payload); } catch (e) { /* ignore */ }
        }
    }

    window.RBI.services.settings = {

        /**
         * Получить значение одной настройки.
         */
        get: function (key) {
            return _getSettings()[key];
        },

        /**
         * Получить копию всех настроек.
         */
        getAll: function () {
            return Object.assign({}, _getSettings());
        },

        /**
         * Установить значение настройки и сохранить в IndexedDB.
         * Не блокирует: сохранение асинхронное.
         */
        set: async function (key, value) {
            if (!window.appSettings) {
                console.warn('[RBI.settings] appSettings не инициализирован');
                return false;
            }

            if (key === 'theme') {
                value = ALLOWED_THEMES.includes(value) ? value : 'auto';
                try { localStorage.setItem('rbi_theme_preference', value); } catch (e) { /* ignore */ }
            }

            window.appSettings[key] = value;

            try {
                var data = Object.assign({ key: SETTINGS_KEY }, window.appSettings);
                if (typeof dbPut === 'function') {
                    await dbPut(window.STORES ? window.STORES.SETTINGS : 'settings', data);
                }
            } catch (e) {
                console.error('[RBI.settings] Ошибка сохранения', e);
            }

            _notifyListeners(key, value);
            return true;
        },

        /**
         * Загрузить настройки из IndexedDB в window.appSettings.
         * Делегирует в window.loadSettings (из settings.legacy.js) если она доступна.
         */
        load: async function () {
            if (typeof window.loadSettings === 'function') {
                await window.loadSettings();
                return true;
            }

            // Fallback: загрузка напрямую
            try {
                var storeName = window.STORES ? window.STORES.SETTINGS : 'settings';
                var data = await dbGet(storeName, SETTINGS_KEY);
                if (data && window.appSettings) {
                    Object.assign(window.appSettings, data);
                }
            } catch (e) {
                console.error('[RBI.settings] Ошибка загрузки', e);
            }
            return true;
        },

        /**
         * Сбросить настройки к значениям по умолчанию.
         * Делегирует в window.resetSettingsToDefault (из settings.legacy.js).
         */
        reset: function () {
            if (typeof window.resetSettingsToDefault === 'function') {
                window.resetSettingsToDefault();
            } else {
                console.warn('[RBI.settings] resetSettingsToDefault недоступна');
            }
        },

        /**
         * Подписаться на изменение любой настройки.
         * callback(payload) где payload = { key, value, all }
         */
        onChange: function (callback) {
            if (typeof callback === 'function') {
                _listeners.push(callback);
            }
        },

        /**
         * Отписаться от изменений.
         */
        offChange: function (callback) {
            _listeners = _listeners.filter(function (fn) { return fn !== callback; });
        },

        /**
         * Проверить, включён ли режим синхронизации с облаком.
         */
        isSyncEnabled: function () {
            return !!(window.appSettings && window.appSettings.cloudStatus === 'online');
        },

        /**
         * Получить текущую тему (с учётом 'auto').
         */
        getResolvedTheme: function () {
            var theme = (window.appSettings && window.appSettings.theme) || 'auto';
            if (theme === 'auto') {
                return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
                    ? 'dark' : 'light';
            }
            return theme;
        }
    };

    if (window.RBI.registry) {
        window.RBI.registry.register('service.settings', window.RBI.services.settings);
    }

    console.log('[RBI Service] settings loaded');
}());
