// ─── construction.render.js — Фаза 15: рендер-диспетчер модуля Construction
// Делегирует в window.constManager_* / window.constAcceptance_* / window.transferManager_*.
// При отсутствии legacy-функции — предупреждение, без исключений.

(function () {
  'use strict';

  var ConstructionRender = {

    render: function (subTab) {
      var tab = subTab || (window.ConstructionState ? window.ConstructionState.activeSubTab : 'defects');

      if (tab === 'defects') {
        if (typeof window.constManager_renderDefectsList === 'function') {
          window.constManager_renderDefectsList();
        } else {
          console.warn('[ConstructionRender] constManager_renderDefectsList не найдена');
        }
      } else if (tab === 'acceptance') {
        if (typeof window.constAcceptance_renderList === 'function') {
          window.constAcceptance_renderList();
        } else {
          console.warn('[ConstructionRender] constAcceptance_renderList не найдена');
        }
      } else if (tab === 'transfer') {
        if (typeof window.transferManager_renderGrid === 'function') {
          window.transferManager_renderGrid();
        } else {
          console.warn('[ConstructionRender] transferManager_renderGrid не найдена');
        }
      }
    },

    renderSelectors: function () {
      if (typeof window.constManager_renderSelectors === 'function') {
        window.constManager_renderSelectors();
      } else {
        console.warn('[ConstructionRender] constManager_renderSelectors не найдена');
      }
    },

    renderAdminPanel: function () {
      if (typeof window.constManager_renderAdminPanel === 'function') {
        window.constManager_renderAdminPanel();
      } else {
        console.warn('[ConstructionRender] constManager_renderAdminPanel не найдена');
      }
    }
  };

  window.ConstructionRender = ConstructionRender;
  console.log('[RBI Module] construction.render loaded');
}());
