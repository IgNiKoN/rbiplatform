// game.module.js — контракт платформы (ES-модуль)

import './game.state.js';
import './game.actions.js';
import './game.render.js';

export const GameModule = {
  id: 'game',
  routes: ['/game', '/game/:subTab', '/fmea', '/fmea/:id'],
  dependencies: ['storage', 'inspections', 'sync'],

  async init(ctx) {
    ctx.math      = window.RBI && window.RBI.utils && window.RBI.utils.math;
    ctx.toast     = window.RBI && window.RBI.utils && window.RBI.utils.toast;
    ctx.templates = window.RBI && window.RBI.utils && window.RBI.utils.templates;
    if (window.GameActions) window.GameActions.bindCtx(ctx);

    if (window.GameState) window.GameState.syncFromLegacy();

    document.addEventListener('sync:completed', function () {
      if (window.GameActions) window.GameActions.syncFromLegacy();
    });

    document.addEventListener('inspection:created', function () {
      if (window.GameActions) window.GameActions.updatePlanProgress();
    });

    ctx.events.emit('game:initialized');
  },

  mount(container, ctx) {
    if (window.GameRender) window.GameRender.renderDashboard();
  },

  unmount() {
    // Отписки при необходимости
  }
};

if (window.RBI && window.RBI.registry) {
  window.RBI.registry.register('module.game', GameModule);
}
