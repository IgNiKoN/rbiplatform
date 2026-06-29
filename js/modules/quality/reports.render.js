/**
 * reports.render.js — Фаза 16: рендер-диспетчер модуля Reports.
 *
 * Делегирует рендер в window.*-функции из export.js (legacy-монолит).
 * При отсутствии legacy-функции — console.warn (не бросает исключений).
 */

export const ReportsRender = {

    /**
     * Отрисовка списка шаблонов PDF — делегирует в window.renderPdfTemplatesList().
     */
    renderTemplatesList() {
        if (typeof window.renderPdfTemplatesList === 'function') {
            window.renderPdfTemplatesList();
        } else {
            console.warn('[ReportsRender] renderPdfTemplatesList недоступен');
        }
    },

    /**
     * Открытие модального окна шаблона — делегирует в window.openReportTemplateModal(type, mode).
     */
    openModal(type, mode) {
        if (typeof window.openReportTemplateModal === 'function') {
            window.openReportTemplateModal(type, mode);
        } else if (typeof window.openPdfTemplateModal === 'function') {
            window.openPdfTemplateModal(type, mode);
        } else {
            console.warn('[ReportsRender] openReportTemplateModal / openPdfTemplateModal недоступен');
        }
    },

    /**
     * Закрытие модального окна — делегирует в window.closePdfTemplateModal().
     */
    closeModal() {
        if (typeof window.closePdfTemplateModal === 'function') {
            window.closePdfTemplateModal();
        } else {
            console.warn('[ReportsRender] closePdfTemplateModal недоступен');
        }
    },

    /**
     * Рендер отчёта из шаблона — делегирует в window.renderReportFromTemplate(templateId, data).
     */
    renderFromTemplate(templateId, data) {
        if (typeof window.renderReportFromTemplate === 'function') {
            window.renderReportFromTemplate(templateId, data);
        } else {
            console.warn('[ReportsRender] renderReportFromTemplate недоступен');
        }
    }
};

if (typeof window !== 'undefined') {
    window.ReportsRender = ReportsRender;
}

console.log('[ReportsRender] reports.render.js loaded');
