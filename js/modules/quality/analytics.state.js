/**
 * analytics.state.js
 * Изолированное состояние модуля Analytics.
 *
 * Единый источник правды для данных аналитики.
 * Глобальные переменные window.analyticsDataMode, window.activeMultiFilters.analytics,
 * window.chartInstances остаются для обратной совместимости,
 * но заполняются через этот объект.
 */

export const AnalyticsState = {

    dataSource: [],
    mode: 'local',
    chartInstances: {},

    filters: {
        project: [],
        contractor: [],
        inspector: [],
        template: [],
        period: null
    },

    activeSubTab: null,

    /* ── Сеттеры ─────────────────────────────────────────────────────── */

    setDataSource(arr) {
        this.dataSource = arr || [];
    },

    setMode(mode) {
        this.mode = mode === 'cloud' ? 'cloud' : 'local';
        window.analyticsDataMode = this.mode;
    },

    setFilters(filters) {
        if (filters && typeof filters === 'object') {
            Object.assign(this.filters, filters);
        }
        if (window.activeMultiFilters && window.activeMultiFilters.analytics) {
            Object.assign(window.activeMultiFilters.analytics, this.filters);
        }
    },

    setChartInstances(instances) {
        this.chartInstances = instances || {};
        window.chartInstances = this.chartInstances;
    },

    setActiveSubTab(tab) {
        this.activeSubTab = tab || null;
        if (tab) {
            try { localStorage.setItem('rbi_active_analytics_tab', tab); } catch (_) {}
        }
    }
};

if (typeof window !== 'undefined') {
    window.AnalyticsState = AnalyticsState;
}

console.log('[AnalyticsState] analytics.state.js loaded');
