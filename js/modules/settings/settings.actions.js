/**
 * settings.actions.js
 * Фаза 38: фасад-делегатор между ctx.settings и legacy-функциями настроек.
 *
 * Получает ctx через bindCtx(ctx) из settings.module.js.
 * Делегирует CRUD в SettingsService (ctx.settings) с fallback на window.* для совместимости.
 */

(function () {
    'use strict';

    var SettingsActions = {

        _ctx: null,

        bindCtx: function (ctx) {
            this._ctx = ctx;
        },

        _getService: function () {
            return (this._ctx && this._ctx.settings) ||
                   (window.RBI && window.RBI.services && window.RBI.services.settings);
        },

        loadSettings: function () {
            var svc = this._getService();
            if (svc && typeof svc.load === 'function') {
                return svc.load();
            }
            if (typeof window.loadSettings === 'function') {
                return window.loadSettings();
            }
        },

        get: function (key) {
            var svc = this._getService();
            if (svc) { return svc.get(key); }
            return window.appSettings ? window.appSettings[key] : undefined;
        },

        set: async function (key, value) {
            var svc = this._getService();
            if (svc) { return svc.set(key, value); }
            if (window.appSettings) { window.appSettings[key] = value; }
        },

        renderTab: function () {
            if (typeof window.renderSettingsTab === 'function') {
                return window.renderSettingsTab();
            }
        },

        applyToUI: function () {
            if (typeof window.applySettingsToUI === 'function') {
                return window.applySettingsToUI();
            }
        }
    };

    window.SettingsActions = SettingsActions;

    console.log('[SettingsActions] settings.actions.js loaded');
}());
