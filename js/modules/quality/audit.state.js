// ─── audit.state.js — Фаза 14: изолированное состояние сеанса аудита ───────────
// Читает window.state / window.details / window.photos по ссылке (не копирует).
// Сеттеры мутируют существующие объекты и синхронизируют window.* для обратной
// совместимости с app.js и export.js.

(function () {
  'use strict';

  var AuditState = {
    // Прямые ссылки на объекты, объявленные в app.js (строки 4–6).
    // Не создаём новые объекты — читаем из window.* после инициализации.
    get state() { return window.state; },
    get details() { return window.details; },
    get photos() { return window.photos; },
    get currentTemplateKey() { return window.currentTemplateKey; },
    get currentChecklist() { return window.currentChecklist; },
    get inspectorName() { return window.inspectorName; },
    get contractorName() { return window.contractorName; },
    get location() { return window.location_ !== undefined ? window.location_ : window.location; },
    get isDirty() { return window.isDirty; },

    setState: function (key, val) {
      if (window.state && typeof window.state === 'object') {
        window.state[key] = val;
      }
    },

    setDetail: function (key, val) {
      if (window.details && typeof window.details === 'object') {
        window.details[key] = val;
      }
    },

    setPhoto: function (key, src) {
      if (window.photos && typeof window.photos === 'object') {
        if (!window.photos[key]) window.photos[key] = [];
        window.photos[key].push(src);
      }
    },

    removePhoto: function (key, index) {
      if (window.photos && window.photos[key]) {
        window.photos[key].splice(index, 1);
      }
    },

    setTemplate: function (key) {
      window.currentTemplateKey = key;
    },

    setChecklist: function (data) {
      window.currentChecklist = data;
    },

    resetSession: function () {
      // Очистка через мутацию существующих объектов (не замену ссылок)
      if (window.state && typeof window.state === 'object') {
        Object.keys(window.state).forEach(function (k) { delete window.state[k]; });
      }
      if (window.details && typeof window.details === 'object') {
        Object.keys(window.details).forEach(function (k) { delete window.details[k]; });
      }
      if (window.photos && typeof window.photos === 'object') {
        Object.keys(window.photos).forEach(function (k) { delete window.photos[k]; });
      }
      window.isDirty = false;
    },

    // Копия логики getSessionPhotosForSync из legacy
    getSessionPhotosForSync: function () {
      var result = [];
      var photos = window.photos;
      if (!photos || typeof photos !== 'object') return result;
      Object.keys(photos).forEach(function (posId) {
        var arr = photos[posId];
        if (Array.isArray(arr)) {
          arr.forEach(function (src) {
            result.push({ posId: posId, src: src });
          });
        }
      });
      return result;
    }
  };

  window.AuditState = AuditState;
  console.log('[RBI Module] audit.state loaded');
}());
