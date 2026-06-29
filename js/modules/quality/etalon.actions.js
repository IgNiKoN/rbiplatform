// etalon.actions.js — Фаза 18: бизнес-действия модуля Etalon
//
// Делегирует все действия в window.*-функции из etalon.js (legacy-монолит).
// etalon.js не переписывается — ES-обёртка только предоставляет
// типизированный фасад с событиями.
//
// Эмитит: etalon:act:saved, etalon:act:deleted, etalon:initialized

(function () {
  function emit(eventName, detail) {
    document.dispatchEvent(new CustomEvent(eventName, { detail: detail || {} }));
    var events = EtalonActions._ctx && EtalonActions._ctx.events;
    if (events && typeof events.emit === 'function') {
      events.emit(eventName, detail || {});
    }
  }

  const EtalonActions = {

    _ctx: null,
    bindCtx(ctx) { this._ctx = ctx; },

    /**
     * Открыть конструктор эталона.
     * Делегирует в window.openEtalonConstructor().
     */
    openConstructor(contractor, templateKey, templateTitle, projectName, statusKey) {
      if (typeof window.openEtalonConstructor === 'function') {
        window.openEtalonConstructor(contractor, templateKey, templateTitle, projectName, statusKey);
      } else {
        console.warn('[EtalonActions] openEtalonConstructor недоступен');
      }
    },

    /**
     * Закрыть конструктор.
     * Делегирует в window.closeEtalonConstructor().
     */
    closeConstructor() {
      if (typeof window.closeEtalonConstructor === 'function') {
        window.closeEtalonConstructor();
      } else {
        console.warn('[EtalonActions] closeEtalonConstructor недоступен');
      }
    },

    /**
     * Сохранить акт-эталон в IndexedDB.
     * Делегирует в window.saveEtalonAct(printAfter).
     */
    saveAct(printAfter) {
      if (typeof window.saveEtalonAct === 'function') {
        window.saveEtalonAct(printAfter);
        emit('etalon:act:saved', { printAfter: !!printAfter });
      } else {
        console.warn('[EtalonActions] saveEtalonAct недоступен');
      }
    },

    /**
     * Открыть просмотр акта.
     * Делегирует в window.openEtalonViewer(id).
     */
    openViewer(id) {
      if (typeof window.openEtalonViewer === 'function') {
        window.openEtalonViewer(id);
      } else {
        console.warn('[EtalonActions] openEtalonViewer недоступен');
      }
    },

    /**
     * Удалить акт-эталон.
     * Делегирует в window.deleteEtalonAct(id).
     */
    deleteAct(id) {
      if (typeof window.deleteEtalonAct === 'function') {
        window.deleteEtalonAct(id);
        emit('etalon:act:deleted', { id: id });
      } else {
        console.warn('[EtalonActions] deleteEtalonAct недоступен');
      }
    },

    /**
     * Редактировать акт-эталон.
     * Делегирует в window.editEtalonAct(id).
     */
    editAct(id) {
      if (typeof window.editEtalonAct === 'function') {
        window.editEtalonAct(id);
      } else {
        console.warn('[EtalonActions] editEtalonAct недоступен');
      }
    },

    /**
     * Синхронизирует состояние из legacy-переменных.
     */
    syncFromLegacy() {
      if (window.EtalonState) {
        window.EtalonState.syncFromLegacy();
      }
    }
  };

  window.EtalonActions = EtalonActions;
})();

console.log('[EtalonActions] etalon.actions.js loaded');
