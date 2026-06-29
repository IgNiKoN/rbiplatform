// ─── audit.actions.js — Фаза 14: бизнес-действия аудита ─────────────────────
// Делегирует в window.* (legacy). Не вызывает dbPut напрямую.
// Эмитит кастомные события для межмодульной коммуникации.

(function () {
  'use strict';

  function emit(name, detail) {
    try {
      document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
    } catch (e) {
      console.warn('[AuditActions] emit error:', e);
    }
  }

  var AuditActions = {
    _ctx: null,
    bindCtx: function (ctx) { this._ctx = ctx; },

    saveSession: function () {
      if (typeof window.saveSessionData === 'function') {
        window.saveSessionData();
        emit('audit:session:saved');
      }
    },

    scheduleSessionSave: function () {
      if (typeof window.scheduleSessionSave === 'function') {
        window.scheduleSessionSave();
      }
    },

    toggleOk: function (posId) {
      if (typeof window.toggleOk === 'function') {
        window.toggleOk(posId);
        emit('audit:state:changed', { posId: posId, action: 'ok' });
      }
    },

    toggleFail: function (posId) {
      if (typeof window.toggleFail === 'function') {
        window.toggleFail(posId);
        emit('audit:state:changed', { posId: posId, action: 'fail' });
      }
    },

    toggleEscalation: function (posId) {
      if (typeof window.toggleEscalation === 'function') {
        window.toggleEscalation(posId);
        emit('audit:state:changed', { posId: posId, action: 'escalation' });
      }
    },

    saveProductToArray: function () {
      if (typeof window.saveProductToArray === 'function') {
        window.saveProductToArray();
        emit('audit:session:saved');
      }
    },

    changeTemplate: function (key) {
      if (typeof window.changeTemplate === 'function') {
        window.changeTemplate(key);
        emit('audit:state:changed', { action: 'template', key: key });
      }
    },

    resetChecklist: function () {
      if (typeof window.resetChecklist === 'function') {
        window.resetChecklist();
        emit('audit:state:changed', { action: 'reset' });
      }
    },

    handlePhotoUpload: function (e) {
      if (typeof window.handlePhotoUpload === 'function') {
        window.handlePhotoUpload(e);
        emit('audit:state:changed', { action: 'photo' });
      }
    }
  };

  window.AuditActions = AuditActions;
  console.log('[RBI Module] audit.actions loaded');
}());
