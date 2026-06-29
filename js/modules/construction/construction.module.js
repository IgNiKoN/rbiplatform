// ─── construction.module.js — Фаза 15: контракт платформы для модуля Construction
// ES-модуль. Зависит от construction.state.js / construction.actions.js / construction.render.js,
// которые загружаются как обычные <script> до этого файла через construction.legacy.js.

import './construction.state.js';
import './construction.actions.js';
import './construction.render.js';

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

export var ConstructionModule = {
  id: 'construction',
  routes: ['/construction', '/construction/:subTab'],
  dependencies: ['storage', 'constManager', 'constAcceptance', 'transferManager'],

  init: function (ctx) {
    ctx.math      = window.RBI && window.RBI.utils && window.RBI.utils.math;
    ctx.toast     = window.RBI && window.RBI.utils && window.RBI.utils.toast;
    ctx.templates = window.RBI && window.RBI.utils && window.RBI.utils.templates;
    if (window.ConstructionActions) window.ConstructionActions.bindCtx(ctx);

    // Синхронизация ConstructionState из window.ConstManager.*
    if (window.ConstructionState && typeof window.ConstructionState.syncFromLegacy === 'function') {
      window.ConstructionState.syncFromLegacy();
    }

    // sync:completed → переинициализировать и обновить состояние
    on(document, 'sync:completed', function () {
      if (window.ConstructionActions) {
        window.ConstructionActions.init();
      }
      if (window.ConstructionState && typeof window.ConstructionState.syncFromLegacy === 'function') {
        window.ConstructionState.syncFromLegacy();
      }
    });

    document.dispatchEvent(new CustomEvent('construction:initialized'));
    console.log('[RBI Module] construction.module initialized');
  },

  mount: function (container, ctx) {
    var subTab = (ctx && ctx.subTab) ||
                 (window.ConstructionState ? window.ConstructionState.activeSubTab : 'defects');
    if (window.ConstructionRender) {
      window.ConstructionRender.render(subTab);
    }
  },

  unmount: function () {
    off();
  }
};

// Регистрация: перезапишет legacy stub, зарегистрированный в construction.legacy.js
if (window.RBI && window.RBI.registry) {
  window.RBI.registry.register('module.construction', ConstructionModule);
} else {
  document.addEventListener('rbi:ready', function () {
    if (window.RBI && window.RBI.registry) {
      window.RBI.registry.register('module.construction', ConstructionModule);
    }
  }, { once: true });
}

window.ConstructionModule = ConstructionModule;
export default ConstructionModule;
