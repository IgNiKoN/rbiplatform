// === AI Render — Фаза 19 ===
// Тонкий рендер-диспетчер для AI-модуля.
// ai.js не содержит отдельных render-функций — UI встроен в async-функции
// через DOM-манипуляции. Этот файл предоставляет минимальный публичный API.
// Публикуется как window.AIRender.

(function () {
  'use strict';

  window.AIRender = {
    openDocChat() {
      return window.AIActions && window.AIActions.openDocChat();
    },
    closeDocChat() {
      return window.AIActions && window.AIActions.closeDocChat();
    }
  };
})();
