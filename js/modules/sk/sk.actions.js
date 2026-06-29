/**
 * sk.actions.js
 * Бизнес-действия модуля SK (Стройконтроль).
 *
 * Вызывают sk.service.js через ctx.sk (после bindCtx),
 * с fallback на window.RBI.services.sk для обратной совместимости.
 * Обновляют SKState и эмитят события через ctx.events || window.RBI.events.
 */

import { SKState } from './sk.state.js';

function getService() {
    return window.SKActions && window.SKActions._ctx && window.SKActions._ctx.sk;
}

function emitEvent(name, payload) {
    var events = window.SKActions && window.SKActions._ctx && window.SKActions._ctx.events;
    if (events && typeof events.emit === 'function') {
        events.emit(name, payload);
    }
}

export const SKActions = {

    _ctx: null,

    bindCtx(ctx) {
        this._ctx = ctx;
    },

    /**
     * Загружает данные SK.
     *
     * Делегирует в window.sk_loadData() — legacy-функцию, которая корректно
     * применяет sk_filterRecordsByAccess() и знает формат хранения
     * volumes/contractorMap/categoryMap/mapping (ключ 'main', поле .data).
     *
     * После загрузки синхронизирует SKState с уже заполненными window.sk* переменными.
     */
    async loadData() {
        try {
            if (typeof window.sk_loadData === 'function') {
                await window.sk_loadData();
            }
            // Синхронизируем SKState с window.sk* (заполненными legacy)
            SKState.records       = window.skRecords       || [];
            SKState.volumes       = window.skVolumes       || {};
            SKState.contractorMap = window.skContractorMap || {};
            SKState.categoryMap   = window.skCategoryMap   || {};
            SKState.mapping       = window.skMapping       || null;

            emitEvent('sk:loaded', { records: SKState.records });
            console.log('[SKActions] loadData complete, records:', SKState.records.length);
        } catch (e) {
            console.error('[SKActions] ошибка loadData:', e);
        }
    },

    /**
     * Сохраняет запись СК через sk.service.js, обновляет SKState.records.
     */
    async saveRecord(data) {
        var svc = getService();
        if (!svc) { console.error('[SKActions] sk service недоступен'); return null; }

        var saved = await svc.saveSkRecord(data);

        var idx = SKState.records.findIndex(function (r) { return r.id === saved.id; });
        if (idx !== -1) {
            SKState.records[idx] = saved;
        } else {
            SKState.records.push(saved);
        }
        window.skRecords = SKState.records;

        emitEvent('sk:record:saved', { id: saved.id, record: saved });
        console.log('[SKActions] saveRecord:', saved.id);
        return saved;
    },

    /**
     * Мягкое удаление записи СК через sk.service.js, обновляет SKState.records.
     */
    async deleteRecord(id) {
        var svc = getService();
        if (!svc) { console.error('[SKActions] sk service недоступен'); return null; }

        var deleted = await svc.deleteSkRecord(id);

        SKState.setRecords(SKState.records.filter(function (r) { return r.id !== id; }));

        emitEvent('sk:record:deleted', { id: id });
        console.log('[SKActions] deleteRecord:', id);
        return deleted;
    },

    /**
     * Загружает историю ИСД.
     */
    async loadIsdHistory() {
        var svc = getService();
        if (!svc) { console.error('[SKActions] sk service недоступен'); return []; }

        try {
            var history = await svc.getIsdHistory();
            return history || [];
        } catch (e) {
            console.error('[SKActions] ошибка loadIsdHistory:', e);
            return [];
        }
    }
};

// Публикация в window для доступа из legacy-кода
if (typeof window !== 'undefined') {
    window.SKActions = SKActions;
}

console.log('[SKActions] sk.actions.js loaded');
