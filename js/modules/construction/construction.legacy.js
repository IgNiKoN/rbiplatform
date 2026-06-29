/**
 * js/modules/construction/construction.legacy.js
 *
 * Пакет 14 — Construction Module
 *
 * Стратегия:
 * - Не копирует логику из constructionManager.js / transferManager.js.
 * - Регистрирует ConstManager, ConstAcceptance, TransferManager в window.RBI.registry.
 * - Устанавливает window-прокси для всех публичных методов трёх объектов.
 * - Оригиналы в constructionManager.js и transferManager.js НЕ удалены и НЕ изменены.
 * - Откат: удалить этот файл и строку <script> в index.html.
 */

(function () {
    'use strict';

    // Ждём DOMContentLoaded, чтобы все предыдущие скрипты (constructionManager.js,
    // transferManager.js) уже выполнились и объекты доступны на window.
    function _register() {

        // ── 1. Регистрация в RBI Registry ─────────────────────────────────────

        if (window.RBI && window.RBI.registry) {
            if (window.ConstManager) {
                window.RBI.registry.register('constManager', window.ConstManager);
            }
            if (window.ConstAcceptance) {
                window.RBI.registry.register('constAcceptance', window.ConstAcceptance);
            }
            if (window.TransferManager) {
                window.RBI.registry.register('transferManager', window.TransferManager);
            }
            console.log('[construction.legacy] Зарегистрировано в RBI.registry: constManager, constAcceptance, transferManager');
        }

        // ── 2. Захват оригиналов (защита от рекурсии при переопределении) ─────

        const _origCM  = window.ConstManager      ? Object.assign({}, window.ConstManager)      : null;
        const _origCA  = window.ConstAcceptance   ? Object.assign({}, window.ConstAcceptance)   : null;
        const _origTM  = window.TransferManager   ? Object.assign({}, window.TransferManager)   : null;

        // ── 3. ConstManager — window-прокси ───────────────────────────────────

        if (_origCM) {
            // Методы экземпляра, вызываемые из index.html и динамического HTML
            window.constManager_init                = function ()        { return _origCM.init.apply(window.ConstManager, arguments); };
            window.constManager_renderAdminPanel    = function ()        { return _origCM.renderAdminPanel.apply(window.ConstManager, arguments); };
            window.constManager_renderSelectors     = function ()        { return _origCM.renderSelectors.apply(window.ConstManager, arguments); };
            window.constManager_updateBuildingSelector = function ()     { return _origCM.updateBuildingSelector.apply(window.ConstManager, arguments); };
            window.constManager_updateFloorSelector = function ()        { return _origCM.updateFloorSelector.apply(window.ConstManager, arguments); };
            window.constManager_onObjectChange      = function ()        { return _origCM.onObjectChange.apply(window.ConstManager, arguments); };
            window.constManager_onBuildingChange    = function ()        { return _origCM.onBuildingChange.apply(window.ConstManager, arguments); };
            window.constManager_onFloorChange       = function ()        { return _origCM.onFloorChange.apply(window.ConstManager, arguments); };
            window.constManager_onLayerChange       = function ()        { return _origCM.onLayerChange.apply(window.ConstManager, arguments); };
            window.constManager_clearPdfView        = function ()        { return _origCM.clearPdfView.apply(window.ConstManager, arguments); };
            window.constManager_loadPdfForFloor     = function (flrId)   { return _origCM.loadPdfForFloor.apply(window.ConstManager, arguments); };
            window.constManager_switchView          = function (view)     { return _origCM.switchView.apply(window.ConstManager, arguments); };
            window.constManager_applyFilters        = function ()        { return _origCM.applyFilters.apply(window.ConstManager, arguments); };
            window.constManager_exportDefectsToExcel = function ()       { return _origCM.exportDefectsToExcel.apply(window.ConstManager, arguments); };
            window.constManager_renderDefectsList   = function ()        { return _origCM.renderDefectsList.apply(window.ConstManager, arguments); };
            window.constManager_updateStatusChips   = function ()        { return _origCM.updateStatusChips && _origCM.updateStatusChips.apply(window.ConstManager, arguments); };

            console.log('[construction.legacy] window-прокси ConstManager установлены');
        } else {
            console.warn('[construction.legacy] window.ConstManager не найден — прокси не установлены');
        }

        // ── 4. ConstAcceptance — window-прокси ────────────────────────────────

        if (_origCA) {
            window.constAcceptance_init              = function ()           { return _origCA.init.apply(window.ConstAcceptance, arguments); };
            window.constAcceptance_filter            = function (st, el)     { return _origCA.filter.apply(window.ConstAcceptance, arguments); };
            window.constAcceptance_renderList        = function ()           { return _origCA.renderList.apply(window.ConstAcceptance, arguments); };
            window.constAcceptance_openNewRequestModal = function (flId, zi, rc) { return _origCA.openNewRequestModal.apply(window.ConstAcceptance, arguments); };
            window.constAcceptance_onObjChange       = function (id, pre)    { return _origCA.onObjChange.apply(window.ConstAcceptance, arguments); };
            window.constAcceptance_onBldChange       = function (id, pre)    { return _origCA.onBldChange.apply(window.ConstAcceptance, arguments); };
            window.constAcceptance_goDrawZone        = function ()           { return _origCA.goDrawZone.apply(window.ConstAcceptance, arguments); };
            window.constAcceptance_saveNewRequest    = function ()           { return _origCA.saveNewRequest.apply(window.ConstAcceptance, arguments); };
            window.constAcceptance_openRequestDetails = function (id)        { return _origCA.openRequestDetails.apply(window.ConstAcceptance, arguments); };
            window.constAcceptance_changeStatus      = function (id, st)     { return _origCA.changeStatus.apply(window.ConstAcceptance, arguments); };
            window.constAcceptance_deleteRequest     = function (id)         { return _origCA.deleteRequest.apply(window.ConstAcceptance, arguments); };
            window.constAcceptance_focusOnZone       = function (id)         { return _origCA.focusOnZone.apply(window.ConstAcceptance, arguments); };
            window.constAcceptance_startInspection   = function (id)         { return _origCA.startInspection.apply(window.ConstAcceptance, arguments); };

            console.log('[construction.legacy] window-прокси ConstAcceptance установлены');
        } else {
            console.warn('[construction.legacy] window.ConstAcceptance не найден — прокси не установлены');
        }

        // ── 5. TransferManager — window-прокси ────────────────────────────────

        if (_origTM) {
            window.transferManager_init                  = function ()        { return _origTM.init.apply(window.TransferManager, arguments); };
            window.transferManager_renderSelectors       = function ()        { return _origTM.renderSelectors.apply(window.TransferManager, arguments); };
            window.transferManager_updateBuildingSelector = function ()       { return _origTM.updateBuildingSelector.apply(window.TransferManager, arguments); };
            window.transferManager_onObjectChange        = function ()        { return _origTM.onObjectChange.apply(window.TransferManager, arguments); };
            window.transferManager_onBuildingChange      = function ()        { return _origTM.onBuildingChange.apply(window.TransferManager, arguments); };
            window.transferManager_renderGrid            = function ()        { return _origTM.renderGrid.apply(window.TransferManager, arguments); };
            window.transferManager_generateDemoGrid      = function ()        { return _origTM.generateDemoGrid.apply(window.TransferManager, arguments); };

            console.log('[construction.legacy] window-прокси TransferManager установлены');
        } else {
            console.warn('[construction.legacy] window.TransferManager не найден — прокси не установлены');
        }

        console.log('[construction.legacy] Пакет 14 (Construction) загружен успешно.');
    }

    // Если DOM уже готов — вызываем сразу, иначе ждём события.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _register);
    } else {
        _register();
    }

})();

// ── Блок 15 — fallback-регистрация module.construction ────────────────
(function () {
  'use strict';
  if (typeof window.RBI === 'undefined' || !window.RBI.registry) return;
  if (!window.RBI.registry.get('module.construction')) {
    window.RBI.registry.register('module.construction', {
      id: 'construction',
      _isLegacyStub: true,
      routes: ['/construction', '/construction/:subTab'],
      dependencies: ['storage'],
      init() {},
      mount() {},
      unmount() {}
    });
  }
}());
