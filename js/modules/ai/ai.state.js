// === AI State — Фаза 19 ===
// Изолированное состояние AI-модуля.
// Публикуется как window.AIState для доступа из legacy-кода и ai.module.js.

(function () {
  'use strict';

  function _getSetting(key) {
    if (window.RBI && window.RBI.services && window.RBI.services.settings) {
      return window.RBI.services.settings.get(key);
    }
    return window.appSettings ? window.appSettings[key] : undefined;
  }

  window.AIState = {
    _isEnabled: false,
    _authMode: 'corporate',
    _isProcessing: false,
    _lastError: null,

    /** Живая ссылка на флаг из appSettings */
    isEnabled() {
      return !!_getSetting('aiEnabled');
    },

    /** Живая ссылка на режим авторизации из appSettings */
    getAuthMode() {
      return _getSetting('aiAuthMode') || 'corporate';
    },

    isProcessing() {
      return this._isProcessing;
    },

    setProcessing(v) {
      this._isProcessing = !!v;
    },

    /** Снимает текущие значения из appSettings → внутренние поля */
    syncFromLegacy() {
      this._isEnabled = !!_getSetting('aiEnabled');
      this._authMode = _getSetting('aiAuthMode') || 'corporate';
    }
  };
})();
