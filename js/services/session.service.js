// session.service.js — Фаза 25: AuditSessionService (16-й инфраструктурный сервис)
//
// Фасад над window.state / window.details / window.photos / window.currentTemplateKey /
// window.currentChecklist. Полная обратная совместимость — не заменяет хранилище,
// только предоставляет API для новых модулей через ctx.session.

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  var SessionService = {
    // Живые ссылки — не копии
    getState: function () { return window.state; },
    getDetails: function () { return window.details; },
    getPhotos: function () { return window.photos; },
    getTemplateKey: function () { return window.currentTemplateKey; },
    getChecklist: function () { return window.currentChecklist; },

    // Сеттеры — мутируют существующие объекты (обратная совместимость)
    setState: function (key, val) {
      if (window.state && typeof window.state === 'object') window.state[key] = val;
    },
    setDetail: function (key, val) {
      if (window.details && typeof window.details === 'object') window.details[key] = val;
    },
    addPhoto: function (posKey, src) {
      if (window.photos) {
        if (!window.photos[posKey]) window.photos[posKey] = [];
        window.photos[posKey].push(src);
      }
    },
    removePhoto: function (posKey, idx) {
      if (window.photos && window.photos[posKey]) {
        window.photos[posKey].splice(idx, 1);
      }
    },
    setTemplateKey: function (key) {
      window.currentTemplateKey = key;
    },
    setChecklist: function (groups) {
      window.currentChecklist = groups;
    },

    // Утилиты
    isSessionEmpty: function () {
      return !window.state || Object.keys(window.state).length === 0;
    },
    getSessionSnapshot: function () {
      return {
        state: JSON.parse(JSON.stringify(window.state || {})),
        details: JSON.parse(JSON.stringify(window.details || {})),
        photosCount: Object.keys(window.photos || {}).reduce(function (acc, k) {
          return acc + (window.photos[k] ? window.photos[k].length : 0);
        }, 0),
        templateKey: window.currentTemplateKey || null,
      };
    },
    reset: function () {
      if (window.state) Object.keys(window.state).forEach(function (k) { delete window.state[k]; });
      if (window.details) Object.keys(window.details).forEach(function (k) { delete window.details[k]; });
      if (window.photos) Object.keys(window.photos).forEach(function (k) { delete window.photos[k]; });
      window.currentTemplateKey = '';
      window.currentChecklist = [];
    },
  };

  window.RBI = window.RBI || {};
  window.RBI.services = window.RBI.services || {};
  window.RBI.services.session = SessionService;
  if (window.RBI.registry && window.RBI.registry.register) {
    window.RBI.registry.register('service.session', SessionService);
  }

  console.log('[SessionService] session.service.js loaded');
}());
