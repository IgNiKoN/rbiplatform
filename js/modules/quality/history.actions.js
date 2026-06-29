/**
 * history.actions.js
 * Бизнес-действия модуля History.
 *
 * Все операции с данными — через ctx.inspections (после bindCtx),
 * с fallback на window.RBI.services.inspections для обратной совместимости.
 * Прямых вызовов dbPut / STORES нет.
 * softDeleteSelected делегирует в window.deleteSelectedHistory (legacy-прокси).
 */

import { HistoryState } from './history.state.js';
import { HistoryRender } from './history.render.js';

export const HistoryActions = {

    _ctx: null,

    bindCtx(ctx) {
        this._ctx = ctx;
    },

    /**
     * Загрузить данные через InspectionService.getActive().
     * Обновляет HistoryState и эмитит history:loaded.
     */
    async loadRecords() {
        try {
            const svc = this._ctx && this._ctx.inspections;
            if (!svc) {
                console.warn('[HistoryActions] inspection service недоступен');
                return;
            }
            const records = await svc.getActive();
            HistoryState.setRecords(records || []);

            const events = this._ctx && this._ctx.events;
            if (events && typeof events.emit === 'function') {
                events.emit('history:loaded', { count: HistoryState.allRecords.length });
            }
        } catch (e) {
            console.error('[HistoryActions] ошибка loadRecords:', e);
        }
    },

    /**
     * Мягкое удаление записей.
     * Делегирует в window.deleteSelectedHistory (legacy) для совместимости
     * с прямыми вызовами dbPut/STORES внутри history.legacy.js.
     * Полный переход на InspectionService.softDelete — следующая фаза.
     */
    async softDeleteSelected(ids) {
        try {
            if (!Array.isArray(ids) || ids.length === 0) return;
            HistoryState.setSelectedIds(ids);

            if (typeof window.deleteSelectedHistory === 'function') {
                window.deleteSelectedHistory();
            }

            const events = this._ctx && this._ctx.events;
            if (events && typeof events.emit === 'function') {
                events.emit('history:deleted', { ids });
            }
        } catch (e) {
            console.error('[HistoryActions] ошибка softDeleteSelected:', e);
        }
    },

    /**
     * Экспорт выбранных записей в CSV.
     * Делегирует в window.exportSelectedCsv (legacy).
     */
    exportSelectedCsv(ids) {
        if (typeof window.exportSelectedCsv === 'function') {
            window.exportSelectedCsv(ids);
        }
    },

    /**
     * Загрузить больше групп (пагинация).
     * Увеличивает visibleGroupCount и перерисовывает.
     */
    loadMore() {
        HistoryState.setVisibleGroupCount(HistoryState.visibleGroupCount + 15);
        HistoryRender.render();
    }
};

if (typeof window !== 'undefined') {
    window.HistoryActions = HistoryActions;
}

console.log('[HistoryActions] history.actions.js loaded');
