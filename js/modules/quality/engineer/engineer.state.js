// engineer.state.js — Фаза 20: изолированное состояние модуля Engineer
//
// Изолирует let-переменные из app.js:
//   _engineerDataLoaded  →  _dataLoaded
//   currentActiveEngineerTab  →  _currentSubTab

(function () {
  function _getSetting(key) {
    if (window.RBI && window.RBI.services && window.RBI.services.settings) {
      return window.RBI.services.settings.get(key);
    }
    return window.appSettings ? window.appSettings[key] : undefined;
  }

  var _currentSubTab = 'eng-sub-tasks';
  var _dataLoaded = false;
  var _engineerName = _getSetting('engineerName') || '';

  var EngineerState = {

    getCurrentSubTab: function () {
      return _currentSubTab;
    },

    setCurrentSubTab: function (tabId) {
      _currentSubTab = tabId;
    },

    isDataLoaded: function () {
      return _dataLoaded;
    },

    setDataLoaded: function (v) {
      _dataLoaded = !!v;
    },

    getEngineerName: function () {
      return _engineerName;
    },

    /**
     * Синхронизирует _dataLoaded из window.rbi_tasksData:
     * если массив непустой — данные считаются загруженными.
     */
    syncFromLegacy: function () {
      if (typeof window !== 'undefined' && Array.isArray(window.rbi_tasksData)) {
        _dataLoaded = window.rbi_tasksData.length > 0;
      }
    }
  };

  // Реактивная подписка: обновлять _engineerName при settings:changed
  if (window.RBI && window.RBI.events && window.RBI.events.on) {
    window.RBI.events.on('settings:changed', function (payload) {
      if (payload && payload.key === 'engineerName') {
        _engineerName = payload.value || '';
      }
    });
  } else {
    document.addEventListener('rbi:ready', function () {
      if (window.RBI && window.RBI.events && window.RBI.events.on) {
        window.RBI.events.on('settings:changed', function (payload) {
          if (payload && payload.key === 'engineerName') {
            _engineerName = payload.value || '';
          }
        });
      }
    }, { once: true });
  }

  window.EngineerState = EngineerState;
})();

console.log('[EngineerState] engineer.state.js loaded');
