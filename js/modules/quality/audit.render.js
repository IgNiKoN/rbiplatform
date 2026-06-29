// ─── audit.render.js — Фаза 14: рендер-диспетчер аудита ─────────────────────
// Делегирует в window.* (legacy). Не содержит собственной DOM-логики.

(function () {
  'use strict';

  var AuditRender = {
    render: function () {
      if (typeof window.render === 'function') {
        window.render();
      }
    },

    renderSelector: function () {
      if (typeof window.renderSelector === 'function') {
        window.renderSelector();
      }
    },

    updateUI: function () {
      if (typeof window.updateUI === 'function') {
        window.updateUI();
      }
    },

    updateDataSummary: function () {
      if (typeof window.updateDataSummary === 'function') {
        window.updateDataSummary();
      }
    },

    updateCardDOM: function (posId) {
      if (typeof window.updateCardDOM === 'function') {
        window.updateCardDOM(posId);
      }
    },

    updateGroupCounters: function () {
      if (typeof window.updateGroupCounters === 'function') {
        window.updateGroupCounters();
      }
    }
  };

  window.AuditRender = AuditRender;
  console.log('[RBI Module] audit.render loaded');
}());
