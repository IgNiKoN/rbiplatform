/* Файл: js/services/inspection.service.js */
/* Inspection Service v0.1 — legacy wrapper над STORES.HISTORY */

(function () {
    'use strict';

    window.RBI = window.RBI || {};
    window.RBI.services = window.RBI.services || {};

    function getHistoryStore() {
        if (typeof STORES !== 'undefined' && STORES.HISTORY) return STORES.HISTORY;
        return 'app_history';
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function markSyncDirty() {
        if (window.RBI.services.sync && typeof window.RBI.services.sync.markDirty === 'function') {
            window.RBI.services.sync.markDirty('history');
        }
    }

    window.RBI.services.inspections = {

        normalize: function (record) {
            if (!record || typeof record !== 'object') return record;

            var isDeleted = record._deleted === true || record.is_deleted === true;
            var syncStatus = record.syncStatus || record.sync_status || 'not_synced';
            var updatedAt = record.updatedAt || record.updated_at || nowIso();

            return Object.assign({}, record, {
                module: record.module || 'quality',
                entityType: record.entityType || 'inspection',
                _deleted: isDeleted,
                is_deleted: isDeleted,
                syncStatus: syncStatus,
                sync_status: syncStatus,
                updatedAt: updatedAt,
                updated_at: updatedAt
            });
        },

        getAll: async function () {
            if (!window.RBI.services.storage) throw new Error('[RBI.inspections] storage service недоступен');
            var arr = await window.RBI.services.storage.getAll(getHistoryStore());
            var self = this;
            return Array.isArray(arr) ? arr.map(function (i) { return self.normalize(i); }) : [];
        },

        getActive: async function () {
            var arr = await this.getAll();
            return arr.filter(function (i) {
                return i && i._deleted !== true && i.is_deleted !== true;
            });
        },

        getById: async function (id) {
            var arr = await this.getAll();
            return arr.find(function (i) { return i.id === id; }) || null;
        },

        save: async function (record) {
            if (!window.RBI.services.storage) throw new Error('[RBI.inspections] storage service недоступен');
            var now = nowIso();
            var normalized = this.normalize(Object.assign({}, record, {
                updatedAt: now,
                updated_at: now,
                source: 'local',
                syncStatus: 'not_synced',
                sync_status: 'not_synced'
            }));
            await window.RBI.services.storage.put(getHistoryStore(), normalized);
            markSyncDirty();
            return normalized;
        },

        softDelete: async function (id) {
            var item = await this.getById(id);
            if (!item) return false;
            var now = nowIso();
            var deleted = this.normalize(Object.assign({}, item, {
                _deleted: true,
                is_deleted: true,
                deleted_at: now,
                updatedAt: now,
                updated_at: now,
                source: 'local',
                syncStatus: 'deleted_pending_sync',
                sync_status: 'deleted_pending_sync'
            }));
            await window.RBI.services.storage.put(getHistoryStore(), deleted);
            markSyncDirty();
            return deleted;
        }
    };

    if (window.RBI.registry) {
        window.RBI.registry.register('service.inspections', window.RBI.services.inspections);
    }

    console.log('[RBI Service] inspections loaded');
}());
