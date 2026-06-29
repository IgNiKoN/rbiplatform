// === AI Module — Фаза 19 ===
// Контракт платформы. ES-модуль (type="module").
// Загружает сторонние файлы как side-effect imports, затем регистрирует модуль.

import './ai.state.js';
import './ai.actions.js';
import './ai.render.js';

const AIModule = {
  id: 'ai',
  routes: [],
  dependencies: ['storage', 'settings'],

  async init(ctx) {
    ctx.math      = window.RBI && window.RBI.utils && window.RBI.utils.math;
    ctx.toast     = window.RBI && window.RBI.utils && window.RBI.utils.toast;
    ctx.templates = window.RBI && window.RBI.utils && window.RBI.utils.templates;
    if (window.AIActions) window.AIActions.bindCtx(ctx);

    window.AIState.syncFromLegacy();

    document.addEventListener('settings:changed', (e) => {
      if (e.detail?.key === 'aiEnabled' || e.detail?.key === 'aiAuthMode') {
        window.AIState.syncFromLegacy();
      }
    });

    ctx.events?.emit('ai:initialized', { enabled: window.AIState.isEnabled() });
  },

  mount(container, ctx) {
    // AI-модуль не монтирует собственный UI
  },

  unmount() {
    // Нет подписок для очистки
  }
};

window.RBI.registry.register('module.ai', AIModule);
export { AIModule };
