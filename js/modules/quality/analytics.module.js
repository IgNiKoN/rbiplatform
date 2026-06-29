/**
 * analytics.module.js
 * Модуль аналитики — контракт платформы (id / routes / dependencies / init / mount / unmount).
 *
 * Оркестратор: синхронизирует начальное состояние из window.*,
 * подписывается на sync:completed → перезагружает данные,
 * эмитит analytics:initialized.
 *
 * Зависимости: window.RBI.services.analytics, window.RBI.services.storage
 */

import { AnalyticsState }   from './analytics.state.js';
import { AnalyticsActions } from './analytics.actions.js';
import { AnalyticsRender }  from './analytics.render.js';

export const AnalyticsModule = {
    id: 'analytics',
    routes: ['/analytics', '/analytics/:subTab'],
    dependencies: ['storage', 'analytics'],

    _syncUnsubscribe: null,

    async init(ctx) {
        AnalyticsActions.bindCtx(ctx);

        // 1. Синхронизировать начальное состояние через ctx.analytics
        const currentMode = (ctx.analytics && typeof ctx.analytics.getAnalyticsMode === 'function')
            ? ctx.analytics.getAnalyticsMode()
            : 'local';
        AnalyticsState.setMode(currentMode);

        const currentFilters = (ctx.analytics && typeof ctx.analytics.getAnalyticsFilters === 'function')
            ? ctx.analytics.getAnalyticsFilters()
            : null;
        if (currentFilters) AnalyticsState.setFilters(currentFilters);

        // 2. Восстановить активную подвкладку из localStorage
        try {
            const savedTab = localStorage.getItem('rbi_active_analytics_tab');
            if (savedTab) AnalyticsState.setActiveSubTab(savedTab);
        } catch (_) {}

        // 3. Подписаться на sync:completed → перезагрузить данные
        const events = ctx && ctx.events;
        if (events && typeof events.on === 'function') {
            const handler = async () => {
                await AnalyticsActions.loadData();
                AnalyticsRender.render();
            };
            events.on('sync:completed', handler);
            AnalyticsModule._syncUnsubscribe = () => events.off && events.off('sync:completed', handler);
        }

        // 4. Эмитировать analytics:initialized
        if (events && typeof events.emit === 'function') {
            events.emit('analytics:initialized', { mode: AnalyticsState.mode });
        }

        console.log('[AnalyticsModule] init complete');
    },

    mount(container, ctx) {
        const subTab = (ctx && ctx.subTab) || AnalyticsState.activeSubTab;
        AnalyticsRender.render(subTab);
    },

    unmount() {
        // Уничтожить Chart.js-инстансы, чтобы не утекала память
        Object.values(AnalyticsState.chartInstances || {}).forEach(function (ch) {
            try { if (ch && typeof ch.destroy === 'function') ch.destroy(); } catch (_) {}
        });
        AnalyticsState.setChartInstances({});

        if (typeof AnalyticsModule._syncUnsubscribe === 'function') {
            AnalyticsModule._syncUnsubscribe();
            AnalyticsModule._syncUnsubscribe = null;
        }
    }
};

if (typeof window !== 'undefined' && window.RBI && window.RBI.registry) {
    window.RBI.registry.register('module.analytics', AnalyticsModule);
}

console.log('[AnalyticsModule] analytics.module.js loaded (ES module)');
