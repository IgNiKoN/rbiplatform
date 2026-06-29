/* js/shared/math.utils.js — Math Utils v0.1 */
/* Обёртка над js/math.js — делегирует в window.getProductMetrics и др. */
/* IIFE-паттерн, без ES-импортов — совместим с текущей загрузкой */

(function () {
    'use strict';

    if (typeof window === 'undefined') return;

    window.RBI = window.RBI || {};
    window.RBI.utils = window.RBI.utils || {};

    window.RBI.utils.math = {

        /* Метрики одного осмотра (УрК): делегирует в window.getProductMetrics */
        getProductMetrics: function (productState, customChecklist) {
            if (typeof window.getProductMetrics === 'function') {
                return window.getProductMetrics(productState, customChecklist);
            }
            return null;
        },

        /* Интегральный УрК подрядчика: делегирует в window.getContractorMetrics */
        getContractorMetrics: function (customArray, userTemplatesData, useSlidingWindow) {
            if (typeof window.getContractorMetrics === 'function') {
                return window.getContractorMetrics(customArray, userTemplatesData, useSlidingWindow);
            }
            return null;
        },

        /* Плоский список позиций чек-листа: делегирует в window.getFlatList */
        getFlatList: function (checklist) {
            if (typeof window.getFlatList === 'function') {
                return window.getFlatList(checklist);
            }
            if (!checklist) return [];
            return checklist.flatMap(function (g) { return g.items; });
        },

        /* ИКО объекта: делегирует в window.getObjectIntegralMetrics */
        getObjectIntegralMetrics: function (historyArray, userTemplatesData) {
            if (typeof window.getObjectIntegralMetrics === 'function') {
                return window.getObjectIntegralMetrics(historyArray, userTemplatesData);
            }
            return null;
        },

        /* Экспертное заключение: делегирует в window.getExpertConclusion */
        getExpertConclusion: function (c, contractorName, templateTitle, count, safeId, customExpertConclusions) {
            if (typeof window.getExpertConclusion === 'function') {
                return window.getExpertConclusion(c, contractorName, templateTitle, count, safeId, customExpertConclusions);
            }
            return { uiHtml: '', pdfHtml: '' };
        },

        /* Очистить кэш метрик */
        clearCache: function () {
            if (typeof window.clearMetricsCache === 'function') {
                window.clearMetricsCache();
            }
        }
    };

    if (window.RBI.registry) {
        window.RBI.registry.register('utils.math', window.RBI.utils.math);
    }

    console.log('[RBI Utils] math loaded');
}());
