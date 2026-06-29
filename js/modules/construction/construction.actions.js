// ─── construction.actions.js — Фаза 15: бизнес-действия модуля Construction
// Делегирует в window.ConstManager / window.ConstAcceptance / window.TransferManager.
// Эмитит кастомные события через window.RBI.events.

(function () {
  'use strict';

  function emit(name, detail) {
    try {
      var events = ConstructionActions._ctx && ConstructionActions._ctx.events;
      if (events && typeof events.emit === 'function') {
        events.emit(name, detail || {});
      }
      document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
    } catch (e) {
      console.warn('[ConstructionActions] emit error:', e);
    }
  }

  var ConstructionActions = {

    _ctx: null,
    bindCtx: function (ctx) { this._ctx = ctx; },

    init: function () {
      if (window.ConstManager && typeof window.ConstManager.init === 'function') {
        window.ConstManager.init();
      }
      if (window.ConstructionState && typeof window.ConstructionState.syncFromLegacy === 'function') {
        window.ConstructionState.syncFromLegacy();
      }
      emit('construction:initialized');
    },

    initAcceptance: function () {
      if (window.ConstAcceptance && typeof window.ConstAcceptance.init === 'function') {
        window.ConstAcceptance.init();
      }
    },

    initTransfer: function () {
      if (window.TransferManager && typeof window.TransferManager.init === 'function') {
        window.TransferManager.init();
      }
    },

    applyFilters: function () {
      if (typeof window.constManager_applyFilters === 'function') {
        window.constManager_applyFilters();
        emit('construction:state:changed', { action: 'filters' });
      }
    },

    switchView: function (view) {
      if (typeof window.constManager_switchView === 'function') {
        window.constManager_switchView(view);
        emit('construction:state:changed', { action: 'switchView', view: view });
      }
    },

    exportToExcel: function () {
      if (typeof window.constManager_exportDefectsToExcel === 'function') {
        window.constManager_exportDefectsToExcel();
      }
    }
  };

  window.ConstructionActions = ConstructionActions;
  console.log('[RBI Module] construction.actions loaded');
}());
