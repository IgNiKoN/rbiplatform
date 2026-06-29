/**
 * analytics.render.js
 * Рендер-диспетчер модуля Analytics.
 *
 * Делегирует вызовы в legacy-функции через window.*,
 * не дублируя HTML-логику из analytics.legacy.js.
 */

import { AnalyticsState } from './analytics.state.js';

export const AnalyticsRender = {

    /**
     * Диспетчер по текущей подвкладке.
     * Делегирует в window.renderCurrentAnalyticsTab из legacy.
     */
    render(subTab) {
        const tab = subTab || AnalyticsState.activeSubTab || 'sub-contractors';
        if (typeof window.renderCurrentAnalyticsTab === 'function') {
            window.renderCurrentAnalyticsTab(tab);
        }
    },

    /**
     * Обновить переключатель режима (local/cloud).
     */
    renderModeSwitcher() {
        if (typeof window.renderAnalyticsModeSwitcher === 'function') {
            window.renderAnalyticsModeSwitcher();
        }
    },

    /**
     * Обновить только панель фильтров без полной перерисовки.
     */
    renderFilters() {
        if (typeof window.updateAnalyticsFilters === 'function') {
            window.updateAnalyticsFilters();
        }
    }
};

if (typeof window !== 'undefined') {
    window.AnalyticsRender = AnalyticsRender;
}

console.log('[AnalyticsRender] analytics.render.js loaded');
