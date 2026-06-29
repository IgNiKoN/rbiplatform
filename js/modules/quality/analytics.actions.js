/**
 * analytics.actions.js
 * Бизнес-действия модуля Analytics.
 *
 * Делегирует загрузку данных в analytics.service.js,
 * управляет режимом (local/cloud) и фильтрами через AnalyticsState.
 */

import { AnalyticsState } from './analytics.state.js';

export const AnalyticsActions = {

    _ctx: null,
    bindCtx(ctx) { this._ctx = ctx; },

    /**
     * Загрузить данные аналитики через analytics.service.js.
     * Эмитит 'analytics:loaded' после успешной загрузки.
     */
    async loadData() {
        try {
            const svc = this._ctx && this._ctx.analytics;
            if (!svc) {
                console.warn('[AnalyticsActions] analytics service недоступен');
                return;
            }
            const data = svc.getFilteredAnalyticsData();
            AnalyticsState.setDataSource(data || []);

            const events = this._ctx && this._ctx.events;
            if (events && typeof events.emit === 'function') {
                events.emit('analytics:loaded', { count: AnalyticsState.dataSource.length });
            }
        } catch (e) {
            console.error('[AnalyticsActions] ошибка загрузки данных:', e);
        }
    },

    /**
     * Переключить режим источника данных (local/cloud).
     */
    setMode(mode) {
        AnalyticsState.setMode(mode);
        const svc = this._ctx && this._ctx.analytics;
        if (svc && typeof svc.setAnalyticsMode === 'function') {
            svc.setAnalyticsMode(mode);
        }
    },

    /**
     * Обновить фильтры аналитики.
     */
    setFilters(filters) {
        AnalyticsState.setFilters(filters);
        const svc = this._ctx && this._ctx.analytics;
        if (svc && typeof svc.setAnalyticsFilters === 'function') {
            svc.setAnalyticsFilters(filters);
        }
    },

    /**
     * Сбросить все фильтры аналитики к пустым значениям.
     */
    resetFilters() {
        const empty = {
            project: [],
            contractor: [],
            inspector: [],
            template: [],
            period: null
        };
        AnalyticsState.setFilters(empty);
        const svc = this._ctx && this._ctx.analytics;
        if (svc && typeof svc.setAnalyticsFilters === 'function') {
            svc.setAnalyticsFilters(empty);
        }
    }
};

if (typeof window !== 'undefined') {
    window.AnalyticsActions = AnalyticsActions;
}

console.log('[AnalyticsActions] analytics.actions.js loaded');
