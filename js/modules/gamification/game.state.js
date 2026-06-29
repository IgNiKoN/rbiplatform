// game.state.js — изолированное состояние модуля геймификации

(function () {
  function _getSetting(key) {
    if (window.RBI && window.RBI.services && window.RBI.services.settings) {
      return window.RBI.services.settings.get(key);
    }
    return window.appSettings ? window.appSettings[key] : undefined;
  }

  let _gameActionLogs = [];
  let _profiles = [];
  let _currentEngineerName = '';
  let _isManagerPanelOpen = false;

  const GameState = {
    getGameActionLogs() {
      return window.gameActionLogs || _gameActionLogs;
    },

    getProfiles() {
      return _profiles;
    },

    getCurrentEngineerName() {
      return _currentEngineerName;
    },

    isManagerPanelOpen() {
      return _isManagerPanelOpen;
    },

    setManagerPanelOpen(val) {
      _isManagerPanelOpen = !!val;
    },

    syncFromLegacy() {
      if (Array.isArray(window.gameActionLogs)) {
        _gameActionLogs = window.gameActionLogs.slice();
      }
      var _name = _getSetting('engineerName');
      if (_name !== undefined) {
        _currentEngineerName = _name;
      }
      if (typeof window.gameCalculateAllProfiles === 'function') {
        try {
          _profiles = window.gameCalculateAllProfiles() || [];
        } catch (e) {
          console.warn('[GameState] gameCalculateAllProfiles failed:', e);
          _profiles = [];
        }
      }
    }
  };

  window.GameState = GameState;
})();
