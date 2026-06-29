/* Файл: js/services/knowledge.service.js */
/* Knowledge Service v0.1 — legacy wrapper над Knowledge-сторами IndexedDB */
/* Сторы: TWI_CARDS, CUSTOM_DOCS, CUSTOM_NODES, ETALON_ACTS, ETALON_DRAFT  */

(function () {
    'use strict';

    window.RBI = window.RBI || {};
    window.RBI.services = window.RBI.services || {};

    var STORE_NAMES = {
        TWI_CARDS:   'twi_cards',
        CUSTOM_DOCS: 'custom_docs',
        CUSTOM_NODES:'custom_nodes',
        ETALON_ACTS: 'rbi_etalon_acts',
        ETALON_DRAFT:'rbi_etalon_draft'
    };

    function getStore(name) {
        if (typeof STORES !== 'undefined' && STORES[name]) return STORES[name];
        return STORE_NAMES[name] || name;
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function markDirty() {
        if (window.RBI.services.sync && typeof window.RBI.services.sync.markDirty === 'function') {
            window.RBI.services.sync.markDirty('knowledge');
        }
    }

    function requireStorage() {
        if (!window.RBI.services.storage) throw new Error('[RBI.knowledge] storage service недоступен');
    }

    function softDelete(item) {
        var now = nowIso();
        return Object.assign({}, item, {
            _deleted: true,
            is_deleted: true,
            deleted_at: now,
            updatedAt: now,
            updated_at: now,
            syncStatus: 'deleted_pending_sync',
            sync_status: 'deleted_pending_sync'
        });
    }

    window.RBI.services.knowledge = {

        /* ── TWI_CARDS ───────────────────────────────────────────────── */

        getTwiCards: async function () {
            requireStorage();
            return window.RBI.services.storage.getAll(getStore('TWI_CARDS'));
        },

        saveTwiCard: async function (card) {
            requireStorage();
            var now = nowIso();
            var toSave = Object.assign({}, card, { updatedAt: now, updated_at: now });
            await window.RBI.services.storage.put(getStore('TWI_CARDS'), toSave);
            markDirty();
            return toSave;
        },

        deleteTwiCard: async function (id) {
            requireStorage();
            var item = await window.RBI.services.storage.get(getStore('TWI_CARDS'), id);
            if (!item) return false;
            var deleted = softDelete(item);
            await window.RBI.services.storage.put(getStore('TWI_CARDS'), deleted);
            markDirty();
            return deleted;
        },

        /* ── CUSTOM_DOCS ─────────────────────────────────────────────── */

        getCustomDocs: async function () {
            requireStorage();
            return window.RBI.services.storage.getAll(getStore('CUSTOM_DOCS'));
        },

        saveCustomDoc: async function (doc) {
            requireStorage();
            var now = nowIso();
            var toSave = Object.assign({}, doc, { updatedAt: now, updated_at: now });
            await window.RBI.services.storage.put(getStore('CUSTOM_DOCS'), toSave);
            markDirty();
            return toSave;
        },

        deleteCustomDoc: async function (id) {
            requireStorage();
            var item = await window.RBI.services.storage.get(getStore('CUSTOM_DOCS'), id);
            if (!item) return false;
            var deleted = softDelete(item);
            await window.RBI.services.storage.put(getStore('CUSTOM_DOCS'), deleted);
            markDirty();
            return deleted;
        },

        /* ── CUSTOM_NODES ────────────────────────────────────────────── */

        getCustomNodes: async function () {
            requireStorage();
            return window.RBI.services.storage.getAll(getStore('CUSTOM_NODES'));
        },

        saveCustomNode: async function (node) {
            requireStorage();
            var now = nowIso();
            var toSave = Object.assign({}, node, { updatedAt: now, updated_at: now });
            await window.RBI.services.storage.put(getStore('CUSTOM_NODES'), toSave);
            markDirty();
            return toSave;
        },

        deleteCustomNode: async function (id) {
            requireStorage();
            var item = await window.RBI.services.storage.get(getStore('CUSTOM_NODES'), id);
            if (!item) return false;
            var deleted = softDelete(item);
            await window.RBI.services.storage.put(getStore('CUSTOM_NODES'), deleted);
            markDirty();
            return deleted;
        },

        /* ── ETALON_ACTS ─────────────────────────────────────────────── */

        getEtalonActs: async function () {
            requireStorage();
            return window.RBI.services.storage.getAll(getStore('ETALON_ACTS'));
        },

        saveEtalonAct: async function (act) {
            requireStorage();
            var now = nowIso();
            var toSave = Object.assign({}, act, { updatedAt: now, updated_at: now });
            await window.RBI.services.storage.put(getStore('ETALON_ACTS'), toSave);
            markDirty();
            return toSave;
        },

        deleteEtalonAct: async function (id) {
            requireStorage();
            var item = await window.RBI.services.storage.get(getStore('ETALON_ACTS'), id);
            if (!item) return false;
            var deleted = softDelete(item);
            await window.RBI.services.storage.put(getStore('ETALON_ACTS'), deleted);
            markDirty();
            return deleted;
        },

        /* ── ETALON_DRAFT ────────────────────────────────────────────── */

        getEtalonDraft: async function () {
            requireStorage();
            return window.RBI.services.storage.getAll(getStore('ETALON_DRAFT'));
        },

        saveEtalonDraft: async function (draft) {
            requireStorage();
            var now = nowIso();
            var toSave = Object.assign({}, draft, { updatedAt: now, updated_at: now });
            await window.RBI.services.storage.put(getStore('ETALON_DRAFT'), toSave);
            markDirty();
            return toSave;
        },

        /* ── SYSTEM_DOCS (статика из data/system_docs.js) ────────────── */

        getSystemDocs: function () {
            return typeof SYSTEM_DOCS !== 'undefined' ? SYSTEM_DOCS : [];
        }
    };

    if (window.RBI.registry) {
        window.RBI.registry.register('service.knowledge', window.RBI.services.knowledge);
    }

    console.log('[RBI Service] knowledge loaded');
}());
