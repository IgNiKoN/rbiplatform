// game.actions.js — бизнес-действия модуля геймификации

(function () {
  function emit(eventName, detail) {
    document.dispatchEvent(new CustomEvent(eventName, { detail: detail || {} }));
    var events = GameActions._ctx && GameActions._ctx.events;
    if (events && typeof events.emit === 'function') {
      events.emit(eventName, detail || {});
    }
  }

  const GameActions = {

    _ctx: null,
    bindCtx(ctx) { this._ctx = ctx; },
    logAction(actionType, targetId) {
      if (typeof window.gameLogAction === 'function') {
        window.gameLogAction(actionType, targetId);
        emit('game:action:logged', { actionType, targetId });
      } else {
        console.warn('[GameActions] gameLogAction not found');
      }
    },

    updatePlanProgress() {
      if (typeof window.gameUpdatePlanProgress === 'function') {
        window.gameUpdatePlanProgress();
        emit('game:plan:updated');
      } else {
        console.warn('[GameActions] gameUpdatePlanProgress not found');
      }
    },

    generateAuditPlan() {
      if (typeof window.gameGenerateAuditPlan === 'function') {
        window.gameGenerateAuditPlan();
      } else {
        console.warn('[GameActions] gameGenerateAuditPlan not found');
      }
    },

    toggleAbsence() {
      if (typeof window.gameToggleAbsence === 'function') {
        window.gameToggleAbsence();
      } else {
        console.warn('[GameActions] gameToggleAbsence not found');
      }
    },

    updateEngineerName(name) {
      if (typeof window.gameUpdateEngineerName === 'function') {
        window.gameUpdateEngineerName(name);
      } else {
        console.warn('[GameActions] gameUpdateEngineerName not found');
      }
    },

    syncFromLegacy() {
      if (window.GameState) {
        window.GameState.syncFromLegacy();
      }
    }
  };

  window.GameActions = GameActions;
})();
