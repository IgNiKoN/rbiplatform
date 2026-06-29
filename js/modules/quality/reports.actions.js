/**
 * reports.actions.js — Фаза 16: бизнес-действия модуля Reports.
 *
 * Делегирует все действия в window.*-функции из export.js (legacy-монолит).
 * export.js не переписывается — ES-обёртка только предоставляет
 * типизированный фасад с событиями.
 *
 * Эмитит: reports:generation:started, reports:generation:completed
 */

import { ReportsState } from './reports.state.js';

function emitEvent(name, payload) {
    var events = ReportsActions._ctx && ReportsActions._ctx.events;
    if (events && typeof events.emit === 'function') {
        events.emit(name, payload || {});
    }
}

export const ReportsActions = {

    _ctx: null,
    bindCtx(ctx) { this._ctx = ctx; },

    /**
     * Основная точка входа для генерации отчётов.
     * Делегирует в window.handleFabExportAction(actionType, mode).
     */
    generateReport(actionType, mode) {
        emitEvent('reports:generation:started', { actionType: actionType, mode: mode });
        ReportsState.setGenerating(true);
        try {
            if (typeof window.handleFabExportAction === 'function') {
                window.handleFabExportAction(actionType, mode);
            } else {
                console.warn('[ReportsActions] handleFabExportAction недоступен');
            }
        } finally {
            ReportsState.setGenerating(false);
            emitEvent('reports:generation:completed', { actionType: actionType, mode: mode });
        }
    },

    /**
     * Экспорт в CSV — делегирует в window.exportFilteredCsv().
     */
    exportCsv() {
        if (typeof window.exportFilteredCsv === 'function') {
            window.exportFilteredCsv();
        } else {
            console.warn('[ReportsActions] exportFilteredCsv недоступен');
        }
    },

    /**
     * Персональный отчёт по подрядчику — делегирует в window.exportPersonalContractorReport(name).
     */
    exportPersonalReport(name) {
        if (typeof window.exportPersonalContractorReport === 'function') {
            window.exportPersonalContractorReport(name);
        } else {
            console.warn('[ReportsActions] exportPersonalContractorReport недоступен');
        }
    },

    /**
     * Печать эталонного акта — делегирует в window.printEtalonAct(historyId, mode).
     */
    printEtalon(historyId, mode) {
        if (typeof window.printEtalonAct === 'function') {
            window.printEtalonAct(historyId, mode);
        } else {
            console.warn('[ReportsActions] printEtalonAct недоступен');
        }
    },

    /**
     * Печать протокола совещания — делегирует в window.rbi_printMeetingPdf(id, mode).
     */
    printMeeting(id, mode) {
        if (typeof window.rbi_printMeetingPdf === 'function') {
            window.rbi_printMeetingPdf(id, mode);
        } else {
            console.warn('[ReportsActions] rbi_printMeetingPdf недоступен');
        }
    },

    /**
     * Печать FMEA — делегирует в window.rbi_printFmeaPdf(id, mode).
     */
    printFmea(id, mode) {
        if (typeof window.rbi_printFmeaPdf === 'function') {
            window.rbi_printFmeaPdf(id, mode);
        } else {
            console.warn('[ReportsActions] rbi_printFmeaPdf недоступен');
        }
    },

    /**
     * Открыть модальное окно шаблонов PDF — делегирует в window.openPdfTemplateModal().
     */
    openTemplateModal(type, mode) {
        if (typeof window.openPdfTemplateModal === 'function') {
            window.openPdfTemplateModal(type, mode);
        } else {
            console.warn('[ReportsActions] openPdfTemplateModal недоступен');
        }
    },

    /**
     * Экспорт расписания (schedule) в PDF — делегирует в window.exportPdfSchedule(mode).
     */
    exportSchedulePdf(mode) {
        if (typeof window.exportPdfSchedule === 'function') {
            window.exportPdfSchedule(mode || 'script');
        } else {
            console.warn('[ReportsActions] exportPdfSchedule недоступен');
        }
    },

    /**
     * Экспорт СК-отчёта в PDF — делегирует в window.exportPdfSK(mode).
     */
    exportSkPdf(mode) {
        if (typeof window.exportPdfSK === 'function') {
            window.exportPdfSK(mode || 'script');
        } else {
            console.warn('[ReportsActions] exportPdfSK недоступен');
        }
    },

    /**
     * Печать TWI-карты — делегирует в window.printCurrentTwi(mode).
     */
    printTwi(mode) {
        if (typeof window.printCurrentTwi === 'function') {
            window.printCurrentTwi(mode || 'browser');
        } else {
            console.warn('[ReportsActions] printCurrentTwi недоступен');
        }
    },

    /**
     * Печать практики — делегирует в window.rbi_printPracticePdf(id, mode).
     */
    printPractice(id, mode) {
        if (typeof window.rbi_printPracticePdf === 'function') {
            window.rbi_printPracticePdf(id, mode || 'browser');
        } else {
            console.warn('[ReportsActions] rbi_printPracticePdf недоступен');
        }
    },

    /**
     * Печать воркшопа — делегирует в window.rbi_printWorkshop(taskId, mode).
     */
    printWorkshop(taskId, mode) {
        if (typeof window.rbi_printWorkshop === 'function') {
            window.rbi_printWorkshop(taskId, mode || 'browser');
        } else {
            console.warn('[ReportsActions] rbi_printWorkshop недоступен');
        }
    },

    /**
     * Печать вводного инструктажа — делегирует в window.rbi_printIntroBriefing(taskId, mode).
     */
    printIntroBriefing(taskId, mode) {
        if (typeof window.rbi_printIntroBriefing === 'function') {
            window.rbi_printIntroBriefing(taskId, mode || 'browser');
        } else {
            console.warn('[ReportsActions] rbi_printIntroBriefing недоступен');
        }
    },

    /**
     * Печать финальной приёмки — делегирует в window.rbi_printFinalAcceptance(taskId).
     */
    printFinalAcceptance(taskId) {
        if (typeof window.rbi_printFinalAcceptance === 'function') {
            window.rbi_printFinalAcceptance(taskId);
        } else {
            console.warn('[ReportsActions] rbi_printFinalAcceptance недоступен');
        }
    },

    /**
     * Отчёт по Quality Day — делегирует в window.rbi_generateQualityDayReport(taskId).
     */
    generateQualityDayReport(taskId) {
        if (typeof window.rbi_generateQualityDayReport === 'function') {
            window.rbi_generateQualityDayReport(taskId);
        } else {
            console.warn('[ReportsActions] rbi_generateQualityDayReport недоступен');
        }
    },

    /**
     * Экспорт данных (backup) — делегирует в window.handleDataExport(type, mode, silent).
     */
    exportData(type, mode, silent) {
        if (typeof window.handleDataExport === 'function') {
            window.handleDataExport(type, mode || 'full', silent || false);
        } else {
            console.warn('[ReportsActions] handleDataExport недоступен');
        }
    },

    /**
     * Поделиться backup через API — делегирует в window.shareBackupViaApi(mode, silent).
     */
    shareBackup(mode, silent) {
        if (typeof window.shareBackupViaApi === 'function') {
            window.shareBackupViaApi(mode || 'full', silent || false);
        } else {
            console.warn('[ReportsActions] shareBackupViaApi недоступен');
        }
    },

    /**
     * Открыть модал шеринга — делегирует в window.openShareModal().
     */
    openShareModal() {
        if (typeof window.openShareModal === 'function') {
            window.openShareModal();
        } else {
            console.warn('[ReportsActions] openShareModal недоступен');
        }
    },

    /**
     * Запустить импорт данных — делегирует в window.triggerDataImport(file).
     */
    importData(file) {
        if (typeof window.triggerDataImport === 'function') {
            window.triggerDataImport(file);
        } else {
            console.warn('[ReportsActions] triggerDataImport недоступен');
        }
    },

    /**
     * Создать новый шаблон PDF — делегирует в window.createNewPdfTemplate().
     */
    createPdfTemplate() {
        if (typeof window.createNewPdfTemplate === 'function') {
            window.createNewPdfTemplate();
        } else {
            console.warn('[ReportsActions] createNewPdfTemplate недоступен');
        }
    },

    /**
     * Редактировать шаблон PDF — делегирует в window.editPdfTemplate(id).
     */
    editPdfTemplate(id) {
        if (typeof window.editPdfTemplate === 'function') {
            window.editPdfTemplate(id);
        } else {
            console.warn('[ReportsActions] editPdfTemplate недоступен');
        }
    },

    /**
     * Сохранить шаблон PDF — делегирует в window.savePdfTemplate().
     */
    savePdfTemplate() {
        if (typeof window.savePdfTemplate === 'function') {
            window.savePdfTemplate();
        } else {
            console.warn('[ReportsActions] savePdfTemplate недоступен');
        }
    },

    /**
     * Удалить шаблон PDF — делегирует в window.deletePdfTemplate(id).
     */
    deletePdfTemplate(id) {
        if (typeof window.deletePdfTemplate === 'function') {
            window.deletePdfTemplate(id);
        } else {
            console.warn('[ReportsActions] deletePdfTemplate недоступен');
        }
    },

    /**
     * Отменить редактирование шаблона PDF — делегирует в window.cancelPdfTemplateEdit().
     */
    cancelPdfTemplateEdit() {
        if (typeof window.cancelPdfTemplateEdit === 'function') {
            window.cancelPdfTemplateEdit();
        } else {
            console.warn('[ReportsActions] cancelPdfTemplateEdit недоступен');
        }
    },

    /**
     * Синхронизирует состояние из legacy-переменных.
     */
    syncFromLegacy() {
        ReportsState.syncFromLegacy();
    }
};

if (typeof window !== 'undefined') {
    window.ReportsActions = ReportsActions;
}

console.log('[ReportsActions] reports.actions.js loaded');
