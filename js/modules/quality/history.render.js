/**
 * history.render.js
 * Рендер-диспетчер модуля History.
 *
 * Делегирует вызовы в legacy-функции через window.*,
 * не дублируя HTML-логику из history.legacy.js.
 */

export const HistoryRender = {

    /**
     * Главный рендер вкладки «История».
     * Делегирует в window.renderHistoryTab из legacy.
     */
    render() {
        if (typeof window.renderHistoryTab === 'function') {
            window.renderHistoryTab();
        }
    },

    /**
     * Применить активные фильтры к списку.
     * Делегирует в window.applyHistoryFilters из legacy.
     */
    applyFilters() {
        if (typeof window.applyHistoryFilters === 'function') {
            window.applyHistoryFilters();
        }
    },

    /**
     * Обновить все динамические фильтры (подрядчики, объекты и т.д.).
     * Делегирует в window.updateAllDynamicFilters из legacy.
     */
    updateFilters() {
        if (typeof window.updateAllDynamicFilters === 'function') {
            window.updateAllDynamicFilters();
        }
    },

    /**
     * Показать детальный просмотр проверки по id.
     * Делегирует в window.showHistoryDetail из legacy.
     */
    renderDetail(id) {
        if (typeof window.showHistoryDetail === 'function') {
            window.showHistoryDetail(id);
        }
    }
};

if (typeof window !== 'undefined') {
    window.HistoryRender = HistoryRender;
}

console.log('[HistoryRender] history.render.js loaded');
