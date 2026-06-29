// etalon.module.js — Фаза 18: контракт платформы (ES-модуль)
//
// Стратегия фасада: etalon.js (~509 строк) остаётся как legacy-монолит.
// ES-модуль только:
//   1. Регистрирует себя в window.RBI.registry как 'module.etalon'
//   2. Синхронизирует состояние в EtalonState из window.etalonActsArray
//   3. Делегирует действия в window.*-функции из etalon.js
//
// Порядок загрузки гарантирован: etalon.js загружается как обычный <script>
// до этого ES-модуля — все window.*-функции из etalon.js уже доступны.

import './etalon.state.js';
import './etalon.actions.js';
import './etalon.render.js';

export const EtalonModule = {
  id: 'etalon',
  routes: ['/etalon', '/etalon/:id'],
  dependencies: ['storage', 'inspections', 'knowledge'],

  _syncUnsubscribe: null,

  /**
   * Инициализация: синхронизирует EtalonState из window.etalonActsArray,
   * подписывается на sync:completed.
   * Вызывается один раз при старте платформы.
   */
  async init(ctx) {
    ctx.math      = window.RBI && window.RBI.utils && window.RBI.utils.math;
    ctx.toast     = window.RBI && window.RBI.utils && window.RBI.utils.toast;
    ctx.templates = window.RBI && window.RBI.utils && window.RBI.utils.templates;
    if (window.EtalonActions) window.EtalonActions.bindCtx(ctx);

    if (window.EtalonState) window.EtalonState.syncFromLegacy();

    const events = (ctx && ctx.events) || (window.RBI && window.RBI.events);

    if (events && typeof events.on === 'function') {
      const syncHandler = function () {
        if (window.EtalonActions) window.EtalonActions.syncFromLegacy();
      };
      events.on('sync:completed', syncHandler);
      EtalonModule._syncUnsubscribe = function () {
        if (events.off) events.off('sync:completed', syncHandler);
      };
    }

    if (events && typeof events.emit === 'function') {
      events.emit('etalon:initialized', {
        acts: window.EtalonState ? window.EtalonState.getActs() : []
      });
    }

    console.log('[EtalonModule] init complete');
  },

  /**
   * Монтирование UI — открывает просмотр если передан id в ctx.
   */
  mount(container, ctx) {
    var id = ctx && ctx.id;
    if (id && window.EtalonRender) {
      window.EtalonRender.openViewer(id);
    }
  },

  /**
   * Очистка при уходе с вкладки.
   */
  unmount() {
    if (typeof EtalonModule._syncUnsubscribe === 'function') {
      EtalonModule._syncUnsubscribe();
      EtalonModule._syncUnsubscribe = null;
    }
  }
};

if (typeof window !== 'undefined' && window.RBI && window.RBI.registry) {
  window.RBI.registry.register('module.etalon', EtalonModule);
}

console.log('[EtalonModule] etalon.module.js loaded (ES module)');
