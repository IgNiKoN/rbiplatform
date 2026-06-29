// ─── audit.module.js — Фаза 14: контракт платформы для модуля Аудит ─────────
// ES-модуль. Зависит от audit.state.js / audit.actions.js / audit.render.js,
// которые загружаются раньше через <script> (не ES-import).

import './audit.state.js';
import './audit.actions.js';
import './audit.render.js';

var _listeners = [];

function on(target, event, handler) {
  target.addEventListener(event, handler);
  _listeners.push({ target: target, event: event, handler: handler });
}

function off() {
  _listeners.forEach(function (l) {
    l.target.removeEventListener(l.event, l.handler);
  });
  _listeners = [];
}

var AuditModule = {
  id: 'audit',
  routes: ['/audit', '/audit/:id'],
  dependencies: ['storage', 'inspections'],

  init: function (ctx) {
    // Синхронизация AuditState с уже живущими window.* объектами из app.js.
    // Геттеры в audit.state.js читают window.* по ссылке — дополнительная
    // синхронизация нужна только если нужно убедиться, что объекты уже есть.
    if (!window.state)   window.state   = {};
    if (!window.details) window.details = {};
    if (!window.photos)  window.photos  = {};

    // Подключить SessionService через ctx
    ctx.session = window.RBI && window.RBI.services && window.RBI.services.session
      ? window.RBI.services.session
      : null;

    ctx.math      = window.RBI && window.RBI.utils && window.RBI.utils.math;
    ctx.toast     = window.RBI && window.RBI.utils && window.RBI.utils.toast;
    ctx.templates = window.RBI && window.RBI.utils && window.RBI.utils.templates;
    if (window.AuditActions) window.AuditActions.bindCtx(ctx);

    // sync:completed → автосохранение сеанса
    on(document, 'sync:completed', function () {
      if (window.AuditActions) {
        window.AuditActions.scheduleSessionSave();
      }
    });

    // inspection:created → обновить рендер
    on(document, 'inspection:created', function (e) {
      if (window.AuditRender) {
        window.AuditRender.updateUI();
      }
    });

    document.dispatchEvent(new CustomEvent('audit:initialized'));
    document.dispatchEvent(new CustomEvent('session:initialized'));
    console.log('[RBI Module] audit.module initialized');
  },

  mount: function (container, ctx) {
    if (window.AuditRender) {
      window.AuditRender.render();
    }
  },

  unmount: function () {
    off();
  }
};

// Регистрация: перезапишет legacy stub, зарегистрированный в audit.legacy.js
if (window.RBI && window.RBI.registry) {
  window.RBI.registry.register('module.audit', AuditModule);
} else {
  document.addEventListener('rbi:ready', function () {
    if (window.RBI && window.RBI.registry) {
      window.RBI.registry.register('module.audit', AuditModule);
    }
  }, { once: true });
}

window.AuditModule = AuditModule;
export default AuditModule;
