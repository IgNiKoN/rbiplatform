// game.render.js — рендер-диспетчер модуля геймификации

(function () {
  const GameRender = {
    renderDashboard() {
      if (typeof window.gameRenderDashboard === 'function') {
        window.gameRenderDashboard();
      } else {
        console.warn('[GameRender] gameRenderDashboard not found');
      }
    },

    renderRadarChart() {
      if (typeof window.renderRadarChart === 'function') {
        window.renderRadarChart();
      } else {
        console.warn('[GameRender] renderRadarChart not found');
      }
    },

    renderStatsCharts() {
      if (typeof window.renderStatsCharts === 'function') {
        window.renderStatsCharts();
      } else {
        console.warn('[GameRender] renderStatsCharts not found');
      }
    },

    renderFmeaHistory() {
      if (typeof window.rbi_renderFmeaHistory === 'function') {
        window.rbi_renderFmeaHistory();
      } else {
        console.warn('[GameRender] rbi_renderFmeaHistory not found');
      }
    },

    renderFmeaRegistry() {
      if (typeof window.rbi_renderFmeaRegistry === 'function') {
        window.rbi_renderFmeaRegistry();
      } else {
        console.warn('[GameRender] rbi_renderFmeaRegistry not found');
      }
    },

    openManagerPanel() {
      if (typeof window.gameOpenManagerPanelAuth === 'function') {
        window.gameOpenManagerPanelAuth();
      } else {
        console.warn('[GameRender] gameOpenManagerPanelAuth not found');
      }
    },

    showLevelsModal() {
      if (typeof window.gameShowLevelsModal === 'function') {
        window.gameShowLevelsModal();
      } else {
        console.warn('[GameRender] gameShowLevelsModal not found');
      }
    }
  };

  window.GameRender = GameRender;
})();
