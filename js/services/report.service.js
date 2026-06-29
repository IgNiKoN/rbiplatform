/* Файл: js/services/report.service.js */
/* Report Service v0.1 — legacy wrapper над STORES.REPORTS */

(function () {
    'use strict';

    window.RBI = window.RBI || {};
    window.RBI.services = window.RBI.services || {};

    function getReportsStore() {
        if (typeof STORES !== 'undefined' && STORES.REPORTS) return STORES.REPORTS;
        return 'app_reports';
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function markSyncDirty() {
        if (window.RBI.services.sync && typeof window.RBI.services.sync.markDirty === 'function') {
            window.RBI.services.sync.markDirty('general');
        }
    }

    window.RBI.services.reports = {

        getAll: async function () {
            if (!window.RBI.services.storage) throw new Error('[RBI.reports] storage service недоступен');
            var arr = await window.RBI.services.storage.getAll(getReportsStore());
            return Array.isArray(arr) ? arr : [];
        },

        getActive: async function () {
            var arr = await this.getAll();
            return arr.filter(function (i) {
                return i && i._deleted !== true && i.is_deleted !== true;
            });
        },

        save: async function (report) {
            if (!window.RBI.services.storage) throw new Error('[RBI.reports] storage service недоступен');
            var now = nowIso();
            var item = Object.assign({}, report, {
                updatedAt: now,
                updated_at: now,
                source: 'local'
            });
            await window.RBI.services.storage.put(getReportsStore(), item);
            markSyncDirty();
            return item;
        },

        softDelete: async function (id) {
            if (!window.RBI.services.storage) throw new Error('[RBI.reports] storage service недоступен');
            var arr = await this.getAll();
            var item = arr.find(function (i) { return i.id === id; }) || null;
            if (!item) return false;
            var now = nowIso();
            var deleted = Object.assign({}, item, {
                _deleted: true,
                is_deleted: true,
                deleted_at: now,
                updatedAt: now,
                updated_at: now
            });
            await window.RBI.services.storage.put(getReportsStore(), deleted);
            markSyncDirty();
            return deleted;
        }
    };

    if (window.RBI.registry) {
        window.RBI.registry.register('service.reports', window.RBI.services.reports);
    }

    console.log('[RBI Service] reports loaded');
}());
