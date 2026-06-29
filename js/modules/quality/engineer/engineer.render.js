// engineer.render.js — Фаза 20: рендер-диспетчер модуля Engineer
//
// Диспетчер по подвкладкам Engineer-таба.
// Делегирует рендер в соответствующие legacy window.*-функции.

(function () {

  var EngineerRender = {

    /**
     * Диспетчер рендера по подвкладке.
     * eng-sub-tasks    → rbi_renderTasksList
     * eng-sub-meetings → rbi_renderMeetingTab
     * eng-sub-impact   → rbi_renderImpactTab
     * eng-sub-badges   → gameRenderDashboard
     * eng-sub-fmea     → rbi_renderFmeaHistory
     */
    render: function (subTab) {
      var tab = subTab || (window.EngineerState ? window.EngineerState.getCurrentSubTab() : 'eng-sub-tasks');

      if (tab === 'eng-sub-tasks') {
        if (typeof window.rbi_renderTasksList === 'function') {
          window.rbi_renderTasksList();
        } else {
          console.warn('[EngineerRender] rbi_renderTasksList недоступен');
        }
      } else if (tab === 'eng-sub-meetings') {
        if (typeof window.rbi_renderMeetingTab === 'function') {
          window.rbi_renderMeetingTab();
        } else {
          console.warn('[EngineerRender] rbi_renderMeetingTab недоступен');
        }
      } else if (tab === 'eng-sub-impact') {
        if (typeof window.rbi_renderImpactTab === 'function') {
          window.rbi_renderImpactTab();
        } else {
          console.warn('[EngineerRender] rbi_renderImpactTab недоступен');
        }
      } else if (tab === 'eng-sub-badges') {
        if (typeof window.gameRenderDashboard === 'function') {
          window.gameRenderDashboard();
        } else {
          console.warn('[EngineerRender] gameRenderDashboard недоступен');
        }
      } else if (tab === 'eng-sub-fmea') {
        if (typeof window.rbi_renderFmeaHistory === 'function') {
          window.rbi_renderFmeaHistory();
        } else {
          console.warn('[EngineerRender] rbi_renderFmeaHistory недоступен');
        }
      }
    },

    /**
     * Переключить и отрендерить подвкладку.
     * Делегирует в EngineerActions.switchSubTab(tabId, btnElement).
     */
    renderSubTab: function (tabId, btnElement) {
      if (window.EngineerActions) {
        window.EngineerActions.switchSubTab(tabId, btnElement);
      } else {
        console.warn('[EngineerRender] EngineerActions недоступен');
      }
    }
  };

  window.EngineerRender = EngineerRender;
})();

console.log('[EngineerRender] engineer.render.js loaded');
