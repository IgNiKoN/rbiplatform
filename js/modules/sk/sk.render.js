/**
 * sk.render.js
 * Рендер-диспетчер модуля SK (Стройконтроль).
 *
 * Делегирует рендеринг в legacy-функции (window.sk_renderMainTab и т.д.).
 * Если legacy-функция недоступна — выводит предупреждение.
 */

export const SKRender = {

    /**
     * Диспетчер рендера по вкладке.
     * @param {string} subTab — 'dashboard' | 'records' | 'hr' | 'volumes' | 'mapping' | 'isd'
     */
    render(subTab) {
        var tab = subTab || 'dashboard';
        switch (tab) {
            case 'dashboard': return SKRender.renderDashboard();
            case 'records':   return SKRender.renderMainTab();
            case 'hr':        return SKRender.renderHrTab();
            case 'volumes':   return SKRender.renderVolumes();
            default:          return SKRender.renderMainTab();
        }
    },

    /**
     * Рендер главной вкладки СК (список замечаний).
     */
    renderMainTab() {
        if (typeof window.sk_renderMainTab === 'function') {
            window.sk_renderMainTab();
        } else {
            console.warn('[SKRender] sk_renderMainTab недоступна');
        }
    },

    /**
     * Рендер дашборда СК.
     */
    renderDashboard() {
        if (typeof window.sk_renderDashboard === 'function') {
            window.sk_renderDashboard();
        } else {
            console.warn('[SKRender] sk_renderDashboard недоступна');
        }
    },

    /**
     * Рендер вкладки HR-рейтинга подрядчиков.
     */
    renderHrTab() {
        if (typeof window.sk_renderHrTab === 'function') {
            window.sk_renderHrTab();
        } else {
            console.warn('[SKRender] sk_renderHrTab недоступна');
        }
    },

    /**
     * Рендер вкладки объёмов.
     */
    renderVolumes() {
        if (typeof window.sk_renderVolumes === 'function') {
            window.sk_renderVolumes();
        } else {
            console.warn('[SKRender] sk_renderVolumes недоступна');
        }
    }
};

// Публикация в window для доступа из legacy-кода
if (typeof window !== 'undefined') {
    window.SKRender = SKRender;
}

console.log('[SKRender] sk.render.js loaded');
