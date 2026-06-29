/* Файл: js/modules/quality/audit.legacy.js */
/* Audit Module v1.2 — текущий осмотр (Quality Audit) */
/* Полный код функций аудита, скопированных из js/app.js.              */
/* js/app.js — не удалён, оба файла работают параллельно.              */
/* Этот файл загружается ПОСЛЕ app.js и переопределяет window.* через  */
/* window-прокси в конце IIFE.                                          */
/* Зависимости (остаются глобальными из app.js):                        */
/*   state, details, photos, currentTemplateKey, currentChecklist,      */
/*   assignPhotosMap, contractorArray, SYSTEM_TEMPLATES, userTemplates, */
/*   appSettings, isDemoMode, dbPut, STORES, getProductMetrics,         */
/*   getContractorMetrics, getFlatList, showToast, switchTab,           */
/*   updateSmartInputCache, applySmartLocks, PhotoManager,              */
/*   ObjectDirectory, ContractorDirectory, SyncQueueManager,            */
/*   gameLogAction, gameGenerateWeeklyPlan, gameUpdatePlanProgress,     */
/*   triggerSync, syncConfig, initSwipes, audioOk, audioFail,          */
/*   customTwiCards, auditOriginalData, openPhotoViewer,                */
/*   syncPhotoTargetId, resolvePhotoTargetId, editorImgElement,         */
/*   initPhotoEditor, saveEtalonMarkupPhoto, saveEditedPhoto            */

(function () {
    'use strict';

    window.RBI = window.RBI || {};

    // Фаза 50-B: единая точка доступа к настройкам через SettingsService с fallback
    function _getSetting(key) {
        if (window.RBI && window.RBI.services && window.RBI.services.settings) {
            return window.RBI.services.settings.get(key);
        }
        return window.appSettings ? window.appSettings[key] : undefined;
    }

    // Фаза 131: единая точка записи настроек через SettingsService или fallback
    function _setSetting(key, value) {
        if (window.RBI && window.RBI.services && window.RBI.services.settings) {
            return window.RBI.services.settings.set(key, value);
        }
        if (window.appSettings) window.appSettings[key] = value;
        return Promise.resolve();
    }

    // Фаза 59: изоляция isDemoMode через AppModeService с fallback
    function _isDemoMode() {
        if (window.RBI && window.RBI.services && window.RBI.services.appMode) {
            return window.RBI.services.appMode.isDemo();
        }
        return typeof window.isDemoMode !== 'undefined' ? window.isDemoMode : false;
    }

    // Фаза 65: изоляция SyncQueueManager через SyncService с fallback
    function _syncEnqueue(action, payload) {
        if (window.RBI && window.RBI.services && window.RBI.services.sync &&
            typeof window.RBI.services.sync.enqueue === 'function') {
            window.RBI.services.sync.enqueue(action, payload);
            return;
        }
        if (window.SyncQueueManager && typeof window.SyncQueueManager.enqueue === 'function') {
            window.SyncQueueManager.enqueue(action, payload);
        }
    }

    // Фаза 73: изоляция записей state/details/photos через SessionService с fallback
    function _session() {
        if (window.RBI && window.RBI.services && window.RBI.services.session) {
            return window.RBI.services.session;
        }
        return {
            getState: function () { return window.state; },
            getDetails: function () { return window.details; },
            getPhotos: function () { return window.photos; },
            setState: function (k, v) { if (window.state) window.state[k] = v; },
            setDetail: function (k, v) { if (window.details) window.details[k] = v; },
            addPhoto: function (k, s) {
                if (window.photos) {
                    if (!window.photos[k]) window.photos[k] = [];
                    window.photos[k].push(s);
                }
            }
        };
    }

    // Фаза 74: изоляция userTemplates через TemplateService с fallback
    function _templates() {
        if (window.RBI && window.RBI.services && window.RBI.services.templates) {
            return window.RBI.services.templates;
        }
        return {
            getUserTemplates: function () {
                return typeof window.userTemplates !== 'undefined' ? window.userTemplates : {};
            },
            getByKey: function (key) {
                var ut = typeof window.userTemplates !== 'undefined' ? window.userTemplates : {};
                return ut[key] || null;
            }
        };
    }

    // Фаза 82: единая точка доступа к данным проверок через HistoryState или fallback contractorArray
    function _inspections() {
        if (window.HistoryState && Array.isArray(window.HistoryState.allRecords)) {
            return window.HistoryState.allRecords;
        }
        if (Array.isArray(window.contractorArray)) return window.contractorArray;
        return [];
    }

    // Фаза 88: единая точка доступа к syncConfig через SyncService или fallback
    function _syncConfig() {
        if (window.RBI && window.RBI.services && window.RBI.services.sync &&
            typeof window.RBI.services.sync.getConfig === 'function') {
            return window.RBI.services.sync.getConfig();
        }
        return window.syncConfig || {};
    }

    // Фаза 101: единая точка доступа к IndexedDB через StorageService или fallback
    function _storage() {
        if (window.RBI && window.RBI.services && window.RBI.services.storage) {
            return window.RBI.services.storage;
        }
        return {
            stores: function() { return typeof STORES !== 'undefined' ? STORES : {}; },
            get: function(store, key) { return dbGet(store, key); },
            getAll: function(store) { return dbGetAll(store); },
            put: function(store, data) { return dbPut(store, data); },
            delete: function(store, key) { return dbDelete(store, key); }
        };
    }

    // Фаза 122: единая точка вызова синхронизации через SyncService или fallback
    function _sync(mode) {
        var m = mode || 'silent';
        if (window.RBI && window.RBI.services && window.RBI.services.sync) {
            return window.RBI.services.sync.trigger(m);
        }
        if (typeof triggerSync === 'function') return triggerSync(m);
        return Promise.resolve(false);
    }

    // Константа причин дефектов (копия из app.js)
    window._AUDIT_DEFECT_CAUSES = [
        { code: 'C01', name: 'Нарушение технологии (ППР)', group: 'Технология' },
        { code: 'C02', name: 'Отклонение от проекта/РД', group: 'Проект' },
        { code: 'C03', name: 'Некачественный материал', group: 'Материалы' },
        { code: 'C04', name: 'Низкая квалификация рабочих', group: 'Персонал' },
        { code: 'C05', name: 'Отсутствие контроля (ИТР)', group: 'Организация' },
        { code: 'C06', name: 'Спешка / Нарушение сроков', group: 'Организация' },
        { code: 'C07', name: 'Погодные условия', group: 'Внешние факторы' },
        { code: 'C00', name: 'Иное (указать в комментарии)', group: 'Другое' }
    ];

    // Внутренний ID текущего комментария (изолирован в модуле)
    window._auditCurrentCommentId = null;

    var auditModule = {
        _ctx: null,
        _mounted: false,

        init: function (ctx) {
            this._ctx = ctx || {};
            console.log('[quality.audit] init');
        },

        mount: function (root, params) {
            this._mounted = true;
            console.log('[quality.audit] mount', params || {});
        },

        unmount: function () {
            this._mounted = false;
            console.log('[quality.audit] unmount');
        },

        // =====================================================================
        // АВТОСОХРАНЕНИЕ ЧЕРНОВИКА
        // Перенесено из app.js (строка 437).
        // Зависимости: __saveSessionTimer (глобальный), saveSessionData, localStorage
        // =====================================================================
        scheduleSessionSave: function () {
            localStorage.setItem('rbi_cloud_dirty', '1');
            clearTimeout(window.__saveSessionTimer);
            window.__saveSessionTimer = setTimeout(function () {
                saveSessionData();
            }, 500);
        },

        // =====================================================================
        // СОХРАНЕНИЕ СЕССИИ В IndexedDB
        // Перенесено из app.js (строка 457).
        // Зависимости: isDemoMode, dbPut, STORES, currentTemplateKey, state, details,
        //              photos, customExpertConclusions, getSessionPhotosForSync, showToast
        // =====================================================================
        saveSessionData: async function () {
            if (_isDemoMode()) return;
            try {
                await _storage().put(_storage().stores().STATE, {
                    key: 'current_session',
                    timestamp: Date.now(),
                    templateKey: currentTemplateKey,
                    project: document.getElementById('inp-project') ? document.getElementById('inp-project').value : '',
                    inspector: document.getElementById('inp-inspector') ? document.getElementById('inp-inspector').value : '',
                    contractor: document.getElementById('inp-contractor') ? document.getElementById('inp-contractor').value : '',
                    location: document.getElementById('inp-location') ? document.getElementById('inp-location').value : '',
                    state, details, photos: getSessionPhotosForSync(),
                    customExpertConclusions
                });
            } catch (e) {
                console.error('Ошибка сохранения в IndexedDB:', e);
                showToast('⚠️ Ошибка автосохранения!');
            }
        },

        // =====================================================================
        // СМЕНА ШАБЛОНА (ВИДА РАБОТ)
        // Перенесено из app.js (строка 2742).
        // Зависимости: currentTemplateKey, currentChecklist, state, details, photos,
        //              assignPhotosMap, SYSTEM_TEMPLATES, userTemplates, saveSessionData,
        //              updateDataSummary, switchTab, ObjectDirectory, render, updateUI
        // Вызывается из index.html: onchange="changeTemplate(this.value)"
        // =====================================================================
        changeTemplate: function (val) {
            if (val === 'HOME') {
                currentTemplateKey = '';
                if (document.getElementById('checklist-selector')) document.getElementById('checklist-selector').value = '';
                state = {}; details = {}; assignPhotosMap({});

                const pInp = document.getElementById('inp-project');
                const cInp = document.getElementById('inp-contractor');
                if (pInp && !pInp.hasAttribute('readonly') && !pInp.disabled) pInp.value = '';
                if (cInp && !cInp.hasAttribute('readonly')) cInp.value = '';
                if (document.getElementById('inp-location')) document.getElementById('inp-location').value = '';

                switchTab('tab-audit');
                document.getElementById('empty-checklist-state').style.display = 'block';
                document.getElementById('audit-items').style.display = 'none';
                document.getElementById('audit-actions').style.display = 'none';

                const nav = document.getElementById('audit-group-nav');
                if (nav) { nav.innerHTML = ''; nav.classList.add('hidden'); }

                document.getElementById('data-block-summary')?.classList.add('hidden');
                if (document.getElementById('current-checklist-label')) document.getElementById('current-checklist-label').innerText = 'Вид работ не выбран';

                saveSessionData();
                if (typeof ObjectDirectory !== 'undefined') ObjectDirectory.initUI();
                return;
            }

            if (val === 'UPLOAD') {
                document.getElementById('json-input').click();
                document.getElementById('checklist-selector').value = currentTemplateKey || "";
                return;
            }

            currentTemplateKey = val;
            const type = val.split('_')[0];
            const key = val.replace(type + '_', '');

            if (type === 'sys' && SYSTEM_TEMPLATES[key]) currentChecklist = SYSTEM_TEMPLATES[key].groups;
            else if (type === 'user' && _templates().getUserTemplates()[key]) currentChecklist = _templates().getUserTemplates()[key].groups;

            state = {}; details = {}; assignPhotosMap({});

            const pInp2 = document.getElementById('inp-project');
            const cInp2 = document.getElementById('inp-contractor');
            if (pInp2 && !pInp2.hasAttribute('readonly') && !pInp2.disabled) pInp2.value = '';
            if (cInp2 && !cInp2.hasAttribute('readonly')) cInp2.value = '';
            if (document.getElementById('inp-location')) document.getElementById('inp-location').value = '';

            saveSessionData();

            if (document.getElementById('checklist-selector')) {
                document.getElementById('checklist-selector').value = val;
            }
            updateDataSummary();

            document.getElementById('empty-checklist-state').style.display = 'none';
            document.getElementById('audit-items').style.display = 'block';
            document.getElementById('audit-actions').style.display = 'grid';

            if (document.getElementById('tab-audit').classList.contains('active')) { render(); updateUI(); }
            if (typeof ObjectDirectory !== 'undefined') ObjectDirectory.initUI();
        },

        // =====================================================================
        // ОБНОВЛЕНИЕ СТРОКИ-СВОДКИ ДАННЫХ
        // Перенесено из app.js (строка 2812).
        // Зависимости: DOM IDs: inp-project, inp-contractor, inp-location,
        //              checklist-selector, data-block-summary, current-checklist-label
        // =====================================================================
        updateDataSummary: function () {
            const proj = document.getElementById('inp-project')?.value.trim() || 'Объект';
            const contr = document.getElementById('inp-contractor')?.value.trim() || 'Подрядчик';
            const loc = document.getElementById('inp-location')?.value.trim() || 'Локация';

            const selectEl = document.getElementById('checklist-selector');
            const clName = selectEl?.options[selectEl.selectedIndex]?.text.replace('▼', '').trim() || 'Чек-лист не выбран';

            const summary = document.getElementById('data-block-summary');
            if (summary) summary.innerText = `✏️ ${clName} | ${proj} | ${contr} | ${loc}`;

            const labelEl = document.getElementById('current-checklist-label');
            if (labelEl) labelEl.innerText = clName;
        },

        // =====================================================================
        // СВОРАЧИВАНИЕ/РАЗВОРАЧИВАНИЕ БЛОКА ДАННЫХ
        // Перенесено из app.js (строка 2827).
        // Зависимости: DOM IDs: data-block-content, data-block-summary, data-toggle-icon
        //              updateDataSummary
        // =====================================================================
        toggleDataBlock: function (forceOpen) {
            const content = document.getElementById('data-block-content');
            const summary = document.getElementById('data-block-summary');
            const icon = document.getElementById('data-toggle-icon');
            if (!content || !summary) return;

            if (forceOpen || content.style.display === 'none') {
                content.style.display = 'grid'; summary.classList.add('hidden'); icon.innerText = 'СВЕРНУТЬ ▲';
            } else {
                updateDataSummary(); content.style.display = 'none'; summary.classList.remove('hidden'); icon.innerText = 'РАЗВЕРНУТЬ ▼';
            }
        },

        // =====================================================================
        // ПЕРЕКЛЮЧЕНИЕ СТАТУСА OK
        // Перенесено из app.js (строка 2841).
        // Зависимости: state, photos, details, updateCardDOM, updateUI, scheduleSessionSave
        // Вызывается из динамически генерируемого HTML: onclick="toggleOk(id)"
        // =====================================================================
        toggleOk: function (id) {
            if (state[id] === 'ok') {
                state[id] = null; delete photos[id]; delete details[id];
            } else {
                state[id] = 'ok'; delete details[id];
            }
            updateCardDOM(id); updateUI(); scheduleSessionSave();
        },

        // =====================================================================
        // ПЕРЕКЛЮЧЕНИЕ СТАТУСА FAIL
        // Перенесено из app.js (строка 2850).
        // Зависимости: state, photos, details, updateCardDOM, updateUI, scheduleSessionSave
        // Вызывается из динамически генерируемого HTML: onclick="toggleFail(id)"
        // =====================================================================
        toggleFail: function (id) {
            if (state[id] === 'fail' || state[id] === 'fail_escalated') {
                state[id] = null; delete photos[id]; delete details[id];
            } else {
                state[id] = 'fail'; delete details[id];
            }
            updateCardDOM(id); updateUI(); scheduleSessionSave();
        },

        // =====================================================================
        // ПЕРЕКЛЮЧЕНИЕ ЭСКАЛАЦИИ (B2 → B3)
        // Перенесено из app.js (строка 2859).
        // Зависимости: state, updateCardDOM, updateUI, scheduleSessionSave
        // Вызывается из динамически генерируемого HTML: onclick="toggleEscalation(id)"
        // =====================================================================
        toggleEscalation: function (id) {
            if (state[id] === 'fail_escalated') state[id] = 'fail';
            else if (state[id] === 'fail') state[id] = 'fail_escalated';
            updateCardDOM(id); updateUI(); scheduleSessionSave();
        },

        // =====================================================================
        // РЕНДЕР ЧЕКЛИСТА
        // Перенесено из app.js (строка 2866).
        // Зависимости: currentTemplateKey, currentChecklist, appSettings,
        //              DOM IDs: audit-items, audit-group-nav,
        //              updateCardDOM, initSwipes, updateGroupCounters
        // =====================================================================
        render: function () {
            if (!currentTemplateKey) return;
            const root = document.getElementById('audit-items');
            const navRoot = document.getElementById('audit-group-nav');
            if (!root) return;

            let html = ""; let navHtml = "";

            currentChecklist.forEach(function (g, gIndex) {
                navHtml += `<button id="nav-btn-${gIndex}" onclick="scrollToGroup(${gIndex})" class="inline-block px-3 py-1.5 min-w-fit text-[10px] font-bold uppercase rounded-xl bg-[var(--hover-bg)] text-[var(--text-muted)] border border-[var(--card-border)] transition-colors active:scale-95 shrink-0">${g.group || g.title}</button>`;

                const isCollapsed = _getSetting('defaultGroupsCollapsed');
                const arrow = isCollapsed ? '▶' : '▼';
                const displayStyle = isCollapsed ? 'display: none;' : 'display: block;';

                html += `<div class="block-title flex justify-between items-center cursor-pointer select-none rounded-lg px-2 mt-4" onclick="toggleGroup(${gIndex})">
            <span id="group-title-${gIndex}">${arrow} ${g.group || g.title}</span>
            <span id="group-counter-${gIndex}" class="text-[10px] bg-[var(--card-border)] px-2 py-0.5 rounded text-[var(--text-muted)]">0/${g.items.length}</span>
        </div><div id="group_content_${gIndex}" class="transition-all origin-top" style="${displayStyle}">`;

                let itemsToRender = [...g.items];
                itemsToRender.forEach(function (i) { html += `<div id="card_wrapper_${i.id}"></div>`; });
                html += `</div>`;
            });

            root.innerHTML = html;
            if (navRoot) { navRoot.innerHTML = navHtml; navRoot.classList.remove('hidden'); }

            currentChecklist.forEach(function (g) {
                g.items.forEach(function (i) { updateCardDOM(i.id, i); });
            });

            if (_getSetting('swipeEnabled')) initSwipes();
            updateGroupCounters();
        },

        // =====================================================================
        // СВОРАЧИВАНИЕ/РАЗВОРАЧИВАНИЕ ГРУППЫ ПУНКТОВ
        // Перенесено из app.js (строка 2906).
        // Вызывается из динамически генерируемого HTML: onclick="toggleGroup(index)"
        // =====================================================================
        toggleGroup: function (index) {
            const content = document.getElementById(`group_content_${index}`);
            const title = document.getElementById(`group-title-${index}`);
            if (!content || !title) return;

            if (content.style.display === 'none') {
                content.style.display = 'block';
                title.innerText = title.innerText.replace('▶', '▼');
            } else {
                content.style.display = 'none';
                title.innerText = title.innerText.replace('▼', '▶');
            }
        },

        // =====================================================================
        // ПРОКРУТКА К ГРУППЕ ПО НАВИГАЦИИ
        // Перенесено из app.js (строка 2920).
        // Вызывается из динамически генерируемого HTML: onclick="scrollToGroup(index)"
        // =====================================================================
        scrollToGroup: function (index) {
            const content = document.getElementById(`group_content_${index}`);
            if (content && content.previousElementSibling) {
                const headerEl = document.getElementById('main-header');
                const headerOffset = headerEl ? headerEl.offsetHeight + 10 : 120;

                const elementPosition = content.previousElementSibling.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                window.scrollTo({ top: offsetPosition, behavior: "smooth" });
            }
        },

        // =====================================================================
        // ОБНОВЛЕНИЕ СЧЁТЧИКОВ ГРУПП + ЦВЕТОВАЯ ИНДИКАЦИЯ НАВИГАЦИИ
        // Перенесено из app.js (строка 2934).
        // Зависимости: currentTemplateKey, currentChecklist, state, getProductMetrics
        // =====================================================================
        updateGroupCounters: function () {
            if (!currentTemplateKey) return;

            currentChecklist.forEach(function (g, gIndex) {
                let answered = 0;
                let stageState = {};

                g.items.forEach(function (i) {
                    if (state[i.id]) {
                        answered++;
                        stageState[i.id] = state[i.id];
                    }
                });

                const counterEl = document.getElementById(`group-counter-${gIndex}`);
                const navBtnEl = document.getElementById(`nav-btn-${gIndex}`);

                if (counterEl) counterEl.innerText = `${answered}/${g.items.length}`;

                if (navBtnEl) {
                    if (answered === 0) {
                        navBtnEl.className = `inline-block px-3 py-2 mr-2 text-[10px] font-bold uppercase rounded-xl bg-[var(--hover-bg)] text-[var(--text-muted)] border border-[var(--card-border)] transition-colors active:scale-95`;
                    } else {
                        const stageMetrics = getProductMetrics(stageState, [g]);
                        const f = stageMetrics.final;

                        if (f < 70 || stageMetrics.isDanger) {
                            navBtnEl.className = `inline-block px-3 py-2 mr-2 text-[10px] font-bold uppercase rounded-xl border transition-all shadow-sm bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400 active:scale-95`;
                        } else if (f < 85) {
                            navBtnEl.className = `inline-block px-3 py-2 mr-2 text-[10px] font-bold uppercase rounded-xl border transition-all shadow-sm bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400 active:scale-95`;
                        } else {
                            navBtnEl.className = `inline-block px-3 py-2 mr-2 text-[10px] font-bold uppercase rounded-xl border transition-all shadow-sm bg-green-50 text-green-600 border-green-200 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400 active:scale-95`;
                        }
                    }
                }
            });
        },

        // =====================================================================
        // ПРИНУДИТЕЛЬНОЕ РАЗВОРАЧИВАНИЕ КАРТОЧКИ
        // Перенесено из app.js (строка 2976).
        // Вызывается из динамически генерируемого HTML: onclick="expandCard(id, event)"
        // =====================================================================
        expandCard: function (id, event) {
            if (event) event.stopPropagation();
            const flatList = getFlatList(currentChecklist);
            const itemData = flatList.find(function (x) { return x.id === id; });
            if (itemData) {
                itemData._forceExpand = true;
                updateCardDOM(id, itemData);
            }
        },

        // =====================================================================
        // РЕНДЕР КАРТОЧКИ ПУНКТА ЧЕКЛИСТА В DOM
        // Перенесено из app.js (строка 2986).
        // Зависимости: currentChecklist, state, details, photos, appSettings,
        //              auditOriginalData, customTwiCards, currentTemplateKey,
        //              getFlatList, getPhotoSrc, openPhotoViewer, audioOk, audioFail
        // =====================================================================
        updateCardDOM: function (id, itemData) {
            if (itemData === undefined) itemData = null;
            const wrapper = document.getElementById(`card_wrapper_${id}`);
            if (!wrapper) return;

            if (!itemData) {
                const flat = getFlatList(currentChecklist);
                itemData = flat.find(function (x) { return x.id === id; });
            }
            if (!itemData) return;

            const s = state[id];
            const i = itemData;

            let isEscalated = s === 'fail_escalated';
            let failActive = s === 'fail' || s === 'fail_escalated';
            let okActive = s === 'ok';

            let cardBgClass = failActive ? 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800' : (okActive ? 'bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800' : '');
            let indicatorClass = `indicator-${s ? (okActive ? 'ok' : (isEscalated ? 3 : i.w)) : i.w}`;

            let collapseClass = '';
            if (okActive && _getSetting('autoCollapseOk') && !itemData._forceExpand) {
                collapseClass = 'card-collapsed';
                cardBgClass = '';
            }

            if (_getSetting('soundEnabled') && state[id] && !itemData._justRendered) {
                if (state[id] === 'ok') audioOk.play().catch(function () { });
                else audioFail.play().catch(function () { });
            }
            itemData._justRendered = true;

            const inspectorCard = customTwiCards.find(function (c) { return c.type === 'INSPECTOR' && String(c.itemId) === String(id); });
            const workerCard = customTwiCards.find(function (c) { return c.type === 'WORKER' && c.checklistKey === currentTemplateKey && (String(c.itemId) === String(id) || c.itemId === 'ALL'); });
            const pdfCard = customTwiCards.find(function (c) { return c.type === 'PDF' && c.checklistKey === currentTemplateKey && (String(c.itemId) === String(id) || c.itemId === 'ALL'); });

            const hasAnyHelp = inspectorCard || workerCard || pdfCard;

            let helpBtnHtml = '';
            if (hasAnyHelp) {
                let btnClass = 'text-slate-600 bg-slate-100 border-slate-300 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600';

                if (inspectorCard && workerCard) {
                    btnClass = 'text-purple-600 bg-purple-100 border-purple-300 dark:bg-purple-900/50 dark:text-purple-400 dark:border-purple-800';
                } else if (inspectorCard) {
                    btnClass = 'text-blue-600 bg-blue-100 border-blue-300 dark:bg-blue-900/50 dark:text-blue-400 dark:border-blue-800';
                } else if (workerCard) {
                    btnClass = 'text-green-600 bg-green-100 border-green-300 dark:bg-green-900/50 dark:text-green-400 dark:border-green-800';
                }

                helpBtnHtml = `
            <button onclick="openItemHelpMenu(${id}, event)" class="btn-status ${btnClass} !w-11 !h-11 !rounded-[12px] relative shadow-sm shrink-0" title="Инструкции и Справка">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"></path></svg>
            </button>
        `;
            } else {
                helpBtnHtml = `
            <button onclick="showToast('К этому пункту пока не привязаны инструкции')" class="btn-status text-slate-300 bg-transparent border-dashed border-slate-200 dark:text-slate-600 dark:border-slate-700 !w-11 !h-11 !rounded-[12px] shadow-sm shrink-0" title="Нет инструкций">
                <svg class="w-6 h-6 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"></path></svg>
            </button>
        `;
            }

            let mainBtnsHtml = `
        <button onclick="toggleOk(${id})" class="btn-status ${okActive ? 'bg-green-500 text-white border-green-500' : ''} !w-11 !h-11 shrink-0 shadow-sm transition-transform active:scale-90">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M20 6L9 17l-5-5"/></svg>
        </button>
        <button onclick="toggleFail(${id})" class="btn-status ${failActive ? 'bg-red-500 text-white border-red-500' : ''} !w-11 !h-11 shrink-0 shadow-sm transition-transform active:scale-90">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
    `;

            let auditHtml = '';

            if (auditOriginalData) {
                const origState = auditOriginalData.state[id];
                const origPhoto = auditOriginalData.photos ? auditOriginalData.photos[id] : null;

                if (origState) {
                    if (auditOriginalData.isCrossAudit) {
                        const badgeColor = origState === 'ok' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200';
                        const badgeText = origState === 'ok' ? 'OK' : 'FAIL';
                        const photoBlock = origPhoto ? `<img src="${window.getPhotoSrc(origPhoto)}" class="w-8 h-8 object-cover rounded cursor-pointer border border-slate-300" onclick="openPhotoViewer('${origPhoto}')">` : '';

                        auditHtml = `
                    <div class="mt-2 bg-slate-100 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 p-2 rounded-lg flex justify-between items-center w-full">
                        <div>
                            <div class="text-[8px] font-black uppercase text-slate-400 mb-0.5">Оценка инженера (${auditOriginalData.inspector})</div>
                            <span class="text-[9px] font-black px-1.5 py-0.5 rounded border ${badgeColor}">${badgeText}</span>
                        </div>
                        ${photoBlock}
                    </div>
                `;
                    } else if (auditOriginalData.isEtalonCompare && (origState === 'fail' || origState === 'fail_escalated')) {
                        if (origPhoto) {
                            auditHtml = `
                        <div class="mt-2 bg-orange-50 dark:bg-orange-900/10 border border-dashed border-orange-200 dark:border-orange-800 p-2 rounded-lg flex items-center gap-3 w-full">
                            <img src="${window.getPhotoSrc(origPhoto)}" class="w-12 h-12 object-cover rounded cursor-pointer border border-orange-300" onclick="openPhotoViewer('${origPhoto}')">
                            <div>
                                <div class="text-[9px] font-black uppercase text-orange-600 mb-0.5">📸 Было (Брак)</div>
                                <div class="text-[9px] font-bold text-orange-800 dark:text-orange-400 leading-tight">Прикрепите новое фото "СТАЛО", чтобы зафиксировать исправление эталона.</div>
                            </div>
                        </div>
                    `;
                        }
                    }
                }
            }

            let contentHtml = '';

            if (failActive) {
                let hasComment = details[id] && details[id].comment && details[id].comment.trim() !== "";

                let commBtn = hasComment ?
                    `<div class="relative shrink-0"><button onclick="toggleCommentField(${id})" class="btn-status text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800 !w-11 !h-11 !rounded-[12px] shadow-sm"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg></button><div onclick="deleteComment(${id}, event)" class="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[12px] font-bold cursor-pointer shadow-md border border-white z-10">✕</div></div>` :
                    `<button onclick="toggleCommentField(${id})" class="btn-status !w-11 !h-11 !rounded-[12px] shrink-0 shadow-sm"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg></button>`;

                let photoBtn = photos[id] ?
                    `<div class="relative shrink-0"><img src="${window.getPhotoSrc(photos[id])}" class="photo-thumb !w-11 !h-11 !rounded-[12px] border border-indigo-200 dark:border-indigo-800 shadow-sm object-cover" onclick="openPhotoViewer('${photos[id]}')"><div onclick="removePhoto(${id}, event)" class="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[12px] font-bold cursor-pointer shadow-md border border-white z-10">✕</div></div>` :
                    `<button onclick="triggerPhotoInput(${id})" class="btn-status !w-11 !h-11 !rounded-[12px] shrink-0 shadow-sm"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><circle cx="12" cy="13" r="3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></circle></svg></button>`;
                let escBtn = (i.w === 2) ? `<button onclick="toggleEscalation(${id})" class="btn-status ${isEscalated ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400' : 'text-orange-500 bg-orange-50 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400'} !w-11 !h-11 !rounded-[12px] transition-all shrink-0 shadow-sm"><span class="text-[13px] font-bold">>1.5</span></button>` : '';

                let visualIndicatorHtml = isEscalated ? `<div class="text-[10px] font-black text-white bg-red-600 px-2 py-0.5 rounded w-fit mt-1 shadow-sm">Дефект учтен как B3</div>` : '';
                let commentBlockHtml = hasComment ? `<div class="mt-2 text-[12px] font-semibold text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-red-100 dark:border-red-800 shadow-sm leading-snug break-words w-full">💬 ${details[id].comment}</div>` : '';

                contentHtml = `
            <div class="flex flex-col w-full">
                <div class="w-full pointer-events-none mb-2">
                    <div class="text-[13px] font-bold leading-snug card-title-text text-slate-800 dark:text-white">
                        <span class="weight-tag wt-${i.w}">B${i.w}</span> ${i.n}
                    </div>
                    ${visualIndicatorHtml}
                    ${commentBlockHtml}
                </div>
                
                <div class="flex justify-end items-center flex-wrap gap-1.5 w-full mt-1 border-t border-red-100 dark:border-red-800 pt-3">
                    ${escBtn}
                    ${commBtn}
                    ${photoBtn}
                    ${helpBtnHtml}
                    ${mainBtnsHtml}
                </div>
            </div>
        `;
            } else if (okActive) {
                let photoBtnOk = photos[id] ?
                    `<div class="relative shrink-0"><img src="${window.getPhotoSrc(photos[id])}" class="photo-thumb !w-11 !h-11 !rounded-[12px] border border-green-300 shadow-sm object-cover" onclick="openPhotoViewer('${photos[id]}')"><div onclick="removePhoto(${id}, event)" class="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[12px] font-bold cursor-pointer shadow-md border border-white z-10">✕</div></div>` :
                    `<button onclick="triggerPhotoInput(${id})" class="btn-status !w-11 !h-11 !rounded-[12px] shrink-0 shadow-sm text-green-600 bg-green-50 border-green-200" title="Добавить фото эталона"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><circle cx="12" cy="13" r="3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></circle></svg></button>`;
                contentHtml = `
            <div class="flex justify-between items-center w-full min-h-[44px]">
                <div class="flex-1 mr-3 min-w-0 pointer-events-none">
                    <div class="text-[13px] font-bold leading-snug card-title-text text-slate-800 dark:text-white">
                        <span class="weight-tag wt-${i.w}">B${i.w}</span> ${i.n}
                    </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    ${photoBtnOk}
                    ${helpBtnHtml}
                    ${mainBtnsHtml}
                </div>
            </div>
        `;
            } else {
                contentHtml = `
            <div class="flex justify-between items-center w-full min-h-[44px]">
                <div class="flex-1 mr-3 min-w-0 pointer-events-none">
                    <div class="text-[13px] font-bold leading-snug mb-1 card-title-text text-slate-800 dark:text-white">
                        <span class="weight-tag wt-${i.w}">B${i.w}</span> ${i.n}
                    </div>
                    <div class="text-[11px] text-[var(--text-muted)] leading-snug norm-desc-text">${i.t}</div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    ${helpBtnHtml}
                    ${mainBtnsHtml}
                </div>
            </div>
        `;
            }

            const cardHtml = `
    <div class="card-audit swipe-container ${indicatorClass} ${cardBgClass} ${collapseClass}" data-id="${id}" onclick="if(this.classList.contains('card-collapsed')) expandCard(${id}, event)">
        <div class="swipe-actions-bg swipe-bg-ok"><span class="ml-4">OK</span></div>
        <div class="swipe-actions-bg swipe-bg-fail"><span class="mr-4">FAIL</span></div>
        <div class="swipe-content p-2.5 bg-inherit border-inherit rounded-inherit h-full w-full bg-[var(--card-bg)] dark:bg-slate-800 transition-colors">
            ${contentHtml}
        </div>
    </div>`;

            wrapper.innerHTML = cardHtml;
        },

        // =====================================================================
        // ОБНОВЛЕНИЕ МИНИ-ДАШБОРДА (метрики текущего осмотра)
        // Перенесено из app.js (строка 3270).
        // Зависимости: currentTemplateKey, state, currentChecklist, contractorArray,
        //              appSettings, getProductMetrics, getContractorMetrics, userTemplates
        // =====================================================================
        updateUI: function () {
            const p = currentTemplateKey ? getProductMetrics(state, currentChecklist) : null;
            const getTextColor = function (val, isDanger) {
                if (isDanger || val < 70) return 'text-white drop-shadow-md';
                if (val < 85) return 'text-slate-900';
                return 'text-white drop-shadow-md';
            };

            if (!p) {
                if (document.getElementById('dash-p-text')) document.getElementById('dash-p-text').innerText = "0/0";
                if (document.getElementById('dash-p-bar')) document.getElementById('dash-p-bar').style.width = "0%";
                if (document.getElementById('dash-p-percent')) document.getElementById('dash-p-percent').innerText = "--%";
                ['dash-p-kc', 'dash-p-kcrit', 'dash-p-b2', 'dash-p-b3'].forEach(function (id) { if (document.getElementById(id)) document.getElementById(id).innerText = "-"; });
            } else {
                if (document.getElementById('dash-p-text')) document.getElementById('dash-p-text').innerText = `${p.checkedCount}/${p.totalCount}`;
                if (document.getElementById('dash-p-bar')) {
                    document.getElementById('dash-p-bar').style.width = `${p.final}%`;
                    document.getElementById('dash-p-bar').className = `absolute top-0 left-0 h-full transition-all duration-500 ${p.isDanger ? 'bg-red-500' : (p.final < 85 ? 'bg-yellow-400' : 'bg-green-500')}`;
                }
                if (document.getElementById('dash-p-percent')) {
                    document.getElementById('dash-p-percent').innerText = `${p.final}%`;
                    document.getElementById('dash-p-percent').className = `absolute inset-0 flex items-center justify-center text-[11px] font-black z-10 ${getTextColor(p.final, p.isDanger)}`;
                }
                if (document.getElementById('dash-p-kc')) document.getElementById('dash-p-kc').innerText = p.kc.toFixed(2);
                if (document.getElementById('dash-p-kcrit')) document.getElementById('dash-p-kcrit').innerText = p.kcrit.toFixed(2);
                if (document.getElementById('dash-p-b2')) document.getElementById('dash-p-b2').innerText = p.n_B2_fail;
                if (document.getElementById('dash-p-b3')) document.getElementById('dash-p-b3').innerText = p.n_B3_fail;
            }

            const currentContr = document.getElementById('inp-contractor') && document.getElementById('inp-contractor').value.trim();
            const _inspections = (window.HistoryState && window.HistoryState.allRecords) || [];
            const filteredArr = currentContr ? _inspections.filter(function (i) { return i.contractorName === currentContr && i.templateKey === currentTemplateKey; }) : [];

            if (filteredArr.length < 7) {
                if (document.getElementById('dash-c-text')) document.getElementById('dash-c-text').innerText = `${filteredArr.length}/7 пров.`;
                if (document.getElementById('dash-c-bar')) document.getElementById('dash-c-bar').style.width = "0%";
                if (document.getElementById('dash-c-percent')) document.getElementById('dash-c-percent').innerText = "СБОР";
                ['dash-c-ks', 'dash-c-kcrit', 'dash-c-b3'].forEach(function (id) { if (document.getElementById(id)) document.getElementById(id).innerText = "-"; });
            } else {
                const c = getContractorMetrics(filteredArr, _templates().getUserTemplates());
                if (c) {
                    if (document.getElementById('dash-c-text')) document.getElementById('dash-c-text').innerText = `${c.count} пров.`;
                    if (document.getElementById('dash-c-bar')) {
                        document.getElementById('dash-c-bar').style.width = `${c.finalC}%`;
                        document.getElementById('dash-c-bar').className = `absolute top-0 left-0 h-full transition-all duration-500 ${c.isRedZone ? 'bg-red-500' : (c.finalC < 85 ? 'bg-yellow-400' : 'bg-green-500')}`;
                    }
                    if (document.getElementById('dash-c-percent')) {
                        document.getElementById('dash-c-percent').innerText = `${c.finalC}%`;
                        document.getElementById('dash-c-percent').className = `absolute inset-0 flex items-center justify-center text-[11px] font-black z-10 ${getTextColor(c.finalC, c.isRedZone)}`;
                    }
                    if (document.getElementById('dash-c-ks')) {
                        const ksEl = document.getElementById('dash-c-ks');
                        ksEl.innerText = c.ks.toFixed(2);
                        ksEl.className = `font-black ${c.ks < 1 ? 'text-red-500' : 'text-green-600'}`;
                    }
                    if (document.getElementById('dash-c-kcrit')) {
                        const kcritEl = document.getElementById('dash-c-kcrit');
                        kcritEl.innerText = c.kcritC.toFixed(2);
                        kcritEl.className = `font-black ${c.kcritC < 1 ? 'text-red-500' : 'text-green-600'}`;
                    }
                    if (document.getElementById('dash-c-b3')) document.getElementById('dash-c-b3').innerText = c.n_изделий_с_B3;
                }
            }

            const selectEl = document.getElementById('checklist-selector');
            const clName = selectEl && selectEl.options[selectEl.selectedIndex] ? selectEl.options[selectEl.selectedIndex].text.replace('▼', '').trim() : 'Вид работ не выбран';
            const labelEl = document.getElementById('current-checklist-label');
            if (labelEl) labelEl.innerText = clName;

            updateGroupCounters();
        },

        // =====================================================================
        // СОХРАНЕНИЕ ПРОВЕРКИ В ИСТОРИЮ
        // Перенесено из app.js (строка 3347).
        // Зависимости: RbiRoles, appSettings, contractorArray, currentTemplateKey,
        //              currentChecklist, state, details, photos, PhotoManager,
        //              ObjectDirectory, ContractorDirectory, dbPut, STORES,
        //              SyncQueueManager, ConstManager, ConstAcceptance,
        //              getProductMetrics, getFlatList, assignPhotosMap,
        //              gameLogAction, gameGenerateWeeklyPlan, gameUpdatePlanProgress,
        //              triggerSync, syncConfig, render, updateUI, showToast,
        //              scheduleSessionSave, updateSmartInputCache, applySmartLocks
        // Вызывается из index.html: onclick="saveProductToArray()"
        // =====================================================================
        saveProductToArray: async function () {
            if (window.RbiRoles && !window.RbiRoles.canCreate()) {
                return showToast("⛔ Ваша роль не позволяет создавать проверки");
            }
            const projInput = document.getElementById('inp-project');
            const inspInput = document.getElementById('inp-inspector');
            const contrInput = document.getElementById('inp-contractor');
            const secInput = document.getElementById('inp-section');
            const floorInput = document.getElementById('inp-floor');
            const roomInput = document.getElementById('inp-room');
            const locHidden = document.getElementById('inp-location');

            if (_getSetting('engineerName')) {
                if (inspInput) inspInput.value = _getSetting('engineerName');
            }

            if (!inspInput || !inspInput.value.trim()) {
                return showToast('⚠️ Укажите ваше Имя во вкладке "Инженер -> Профиль" перед сохранением!');
            }

            let hasError = false;

            [projInput, contrInput, secInput].forEach(function (el) {
                if (el && !el.value.trim()) {
                    el.classList.add('border-red-500', 'bg-red-50');
                    setTimeout(function () { el.classList.remove('border-red-500', 'bg-red-50'); }, 3000);
                    hasError = true;
                }
            });

            if (hasError) {
                showToast('⚠️ Заполните все поля со звездочкой (Объект, Подрядчик, Секция)!');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            const isCloudConnected = _syncConfig().enabled && _syncConfig().projectCode;
            const currentRole = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';

            if (isCloudConnected && currentRole === 'engineer' && projInput.tagName.toLowerCase() === 'input') {
                const newObjName = projInput.value.trim();

                if (!_getSetting('pendingAssignedProjects')) _setSetting('pendingAssignedProjects', []);
                const exists = (_getSetting('pendingAssignedProjects') || []).some(function (p) { return p.raw_name === newObjName; });

                if (!exists) {
                    var _pap = _getSetting('pendingAssignedProjects') || [];
                    _pap.push({
                        raw_name: newObjName,
                        status: 'pending',
                        created_at: new Date().toISOString()
                    });
                    _setSetting('pendingAssignedProjects', _pap);

                    if (window.supabaseClient) {
                        const stableInspectorId = `${_syncConfig().projectCode}_${_getSetting('engineerName')}`.replace(/\s+/g, '_');
                        window.supabaseClient.from('rbi_engineer_profiles').select('settings').eq('inspector_id', stableInspectorId).single().then(function ({ data }) {
                            if (data) {
                                const s = data.settings || {};
                                const reqs = s.requestedProjects || [];
                                if (!reqs.some(function (r) { return r.raw_name === newObjName; })) {
                                    reqs.push({ raw_name: newObjName, status: 'pending', created_at: new Date().toISOString() });
                                    s.requestedProjects = reqs;
                                    window.supabaseClient.from('rbi_engineer_profiles').update({ settings: s }).eq('inspector_id', stableInspectorId).then();
                                }
                            }
                        });
                    }
                    showToast(`🏢 Объект "${newObjName}" отправлен на согласование руководителю.`);
                }
            }

            const locVal = locHidden.value.trim();
            const projVal = projInput.value.trim();
            const contrVal = contrInput.value.trim();

            const _inspections = (window.HistoryState && window.HistoryState.allRecords) || [];
            const isDuplicate = _inspections.some(function (item) {
                return item.projectName === projVal &&
                    item.contractorName === contrVal &&
                    item.templateKey === currentTemplateKey &&
                    item.location === locVal;
            });

            if (isDuplicate) {
                return showToast('⚠️ Проверка с такой локацией уже существует в Истории!');
            }

            let settingsChanged = false;
            if (!_getSetting('defaultProject') && projInput.value.trim()) {
                _setSetting('defaultProject', projInput.value.trim());
                settingsChanged = true;
            }
            if (settingsChanged && !_isDemoMode()) {
                applySmartLocks();
            }

            let mergedState = {};
            let mergedDetails = {};
            let mergedPhotos = {};
            let checkedStageNames = [];
            let stagesToMetric = [];

            currentChecklist.forEach(function (group) {
                let hasAnswersInStage = false;
                group.items.forEach(function (item) {
                    if (state[item.id]) {
                        mergedState[item.id] = state[item.id];
                        if (details[item.id]) mergedDetails[item.id] = details[item.id];
                        if (photos[item.id]) mergedPhotos[item.id] = photos[item.id];
                        hasAnswersInStage = true;
                    }
                });

                if (hasAnswersInStage) {
                    checkedStageNames.push(group.group || group.title);
                    stagesToMetric.push(group);
                }
            });

            if (checkedStageNames.length === 0) {
                return showToast('⚠️ Чек-лист пуст. Заполните хотя бы один пункт.');
            }

            const finalMetrics = getProductMetrics(mergedState, stagesToMetric);
            const isFullCheck = checkedStageNames.length === currentChecklist.length;
            const stageNameLabel = isFullCheck ? 'Полная проверка' : 'Частичная проверка';

            if (finalMetrics.escalated_found && typeof gameLogAction === 'function') {
                gameLogAction('escalation_bonus', 'esc');
            }
            if (currentTemplateKey === 'sys_etalon_act' && Object.keys(mergedPhotos).length > 0 && typeof gameLogAction === 'function') {
                gameLogAction('etalon_accepted', 'etalon');
            }

            const selectEl = document.getElementById('checklist-selector');
            const tTitle = selectEl.options[selectEl.selectedIndex].text.replace('▼', '').trim();

            let instanceId = "default";
            if (secInput.value && floorInput.value) instanceId = `${secInput.value.replace(/[^\d-]/g, '')}_${floorInput.value.replace(/[^\d-]/g, '')}`;

            let dbPhotos = {};
            for (let photoId in mergedPhotos) {
                const photoData = mergedPhotos[photoId];
                if (photoData.startsWith('data:image')) {
                    dbPhotos[photoId] = await PhotoManager.saveLocal(photoData, 'hist');
                } else {
                    dbPhotos[photoId] = photoData;
                }
            }

            const rawProjectValue = projInput.value.trim();
            const rawProjectName = (projInput.dataset && projInput.dataset.displayName) ? projInput.dataset.displayName : rawProjectValue;

            let projectCanonicalKey = rawProjectValue;
            let projectDisplayName = rawProjectName;

            if (typeof ObjectDirectory !== 'undefined' && Array.isArray(ObjectDirectory.objects)) {
                const clean = ObjectDirectory.cleanString
                    ? ObjectDirectory.cleanString(rawProjectName)
                    : rawProjectName.toLowerCase().trim();

                const foundObj = ObjectDirectory.objects.find(function (o) {
                    const displayClean = ObjectDirectory.cleanString ? ObjectDirectory.cleanString(o.display_name || '') : String(o.display_name || '').toLowerCase().trim();
                    const keyClean = ObjectDirectory.cleanString ? ObjectDirectory.cleanString(o.canonical_key || '') : String(o.canonical_key || '').toLowerCase().trim();

                    const synonymMatch = Array.isArray(o.synonyms)
                        ? o.synonyms.some(function (syn) {
                            const synClean = ObjectDirectory.cleanString ? ObjectDirectory.cleanString(syn) : String(syn).toLowerCase().trim();
                            return synClean === clean;
                        })
                        : false;

                    return displayClean === clean || keyClean === clean || synonymMatch;
                });

                if (foundObj) {
                    projectCanonicalKey = foundObj.canonical_key || '';
                    projectDisplayName = foundObj.display_name || rawProjectName;
                }
            }

            if (!projectCanonicalKey) {
                projectCanonicalKey = rawProjectValue || rawProjectName;
            }

            const contractorNormalized = typeof window.normalizeInspectionContractorBeforeSave === 'function'
                ? await window.normalizeInspectionContractorBeforeSave()
                : {
                    contractor_raw_name: contrInput.value.trim(),
                    contractor_name: contrInput.value.trim(),
                    contractor_canonical_key: '',
                    contractor_normalization_status: 'pending'
                };

            const _appMode = (window.RBI && window.RBI.services && window.RBI.services.appMode)
                ? window.RBI.services.appMode.getMode()
                : (window.AppModeManager ? window.AppModeManager.currentMode : 'quality');
            const isConstructionMode = (_appMode === 'construction') || window.activeAcceptanceRequestId;
            const inspType = isConstructionMode ? 'sk_acceptance' : 'rbi_audit';

            const initialSyncStatus = isConstructionMode ? 'blocked' : 'not_synced';
            const initialSyncReason = isConstructionMode ? 'Модуль СК временно отключен от облака' : '';

            const newItem = {
                id: String(Date.now() + Math.floor(Math.random() * 1000)),
                date: new Date().toISOString(),
                projectName: projectDisplayName,
                project_canonical_key: projectCanonicalKey,
                project_display_name: projectDisplayName,
                inspectorName: inspInput.value.trim(),
                contractorName: contractorNormalized.contractor_name || contrInput.value.trim(),
                contractor_name: contractorNormalized.contractor_name || contrInput.value.trim(),
                contractor_raw_name: contractorNormalized.contractor_raw_name || contrInput.value.trim(),
                contractor_canonical_key: contractorNormalized.contractor_canonical_key || '',
                contractor_normalization_status: contractorNormalized.contractor_normalization_status || 'pending',
                templateKey: currentTemplateKey,
                templateTitle: tTitle,
                section: secInput.value.trim(),
                floor: floorInput.value.trim(),
                room: roomInput.value.trim(),
                location: locHidden.value.trim(),
                instanceId: instanceId,
                stageId: 0,
                stageName: stageNameLabel,
                checkedStagesInfo: checkedStageNames,
                isCompleted: isFullCheck,
                state: JSON.parse(JSON.stringify(mergedState)),
                details: JSON.parse(JSON.stringify(mergedDetails)),
                photos: dbPhotos,
                metrics: finalMetrics,
                inspection_type: inspType,
                source: 'local',
                syncStatus: initialSyncStatus,
                sync_status: initialSyncStatus,
                syncBlockReason: initialSyncReason,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (window.HistoryState && window.HistoryState.allRecords) {
                window.HistoryState.allRecords.push(newItem);
            }
            if (!_isDemoMode()) {
                await _storage().put(_storage().stores().HISTORY, newItem);
                _syncEnqueue('SAVE_INSPECTION', newItem);
            }

            if (isConstructionMode && typeof window.ConstManager !== 'undefined') {
                let defectsCreated = 0;

                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + 14);
                const defaultDeadline = futureDate.toISOString().split('T')[0];

                for (let itemId in mergedState) {
                    const stateVal = mergedState[itemId];
                    if (stateVal === 'fail' || stateVal === 'fail_escalated') {
                        const flatList = getFlatList(currentChecklist);
                        const itemInfo = flatList.find(function (x) { return String(x.id) === String(itemId); });
                        if (!itemInfo) continue;

                        let cleanNorm = itemInfo.t ? itemInfo.t.replace(/<\/?[^>]+(>|$)/g, "").replace(/<br>/g, " ") : "";
                        let desc = `Нарушение: ${itemInfo.n}.`;
                        if (cleanNorm && cleanNorm !== 'Без норматива') desc += ` Требования: ${cleanNorm}`;

                        if (mergedDetails[itemId] && mergedDetails[itemId].comment) {
                            desc += `\nУточнение инженера: ${mergedDetails[itemId].comment}`;
                        }

                        let category = 'B2';
                        if (stateVal === 'fail_escalated' || itemInfo.w === 3) category = 'B3';
                        else if (itemInfo.w === 1) category = 'B1';

                        const newDefectId = 'def_auto_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);

                        let defectPhoto = mergedPhotos[itemId] || null;
                        if (defectPhoto && window.photos) {
                            window.photos[newDefectId] = defectPhoto;
                        }

                        const newDefect = {
                            id: newDefectId,
                            floorId: window.ConstManager.currentFlrId || null,
                            x: 50, y: 50,
                            templateKey: currentTemplateKey,
                            itemId: String(itemId),
                            itemName: itemInfo.n,
                            normText: itemInfo.t,
                            text: itemInfo.n,
                            category: category,
                            deadline: defaultDeadline,
                            contractor: contractorNormalized.contractor_name || contrInput.value.trim(),
                            description: desc,
                            photo: defectPhoto,
                            status: 'issued',
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            created_by: inspInput.value.trim() || 'Инженер',
                            locationDesc: locHidden.value.trim()
                        };

                        window.ConstManager.defects.push(newDefect);
                        if (typeof dbPut === 'function' && typeof STORES !== 'undefined' && STORES.CONST_DEFECTS) {
                            await _storage().put(_storage().stores().CONST_DEFECTS, newDefect);
                        }
                        defectsCreated++;
                    }
                }

                if (defectsCreated > 0) {
                    setTimeout(function () {
                        showToast(`🏗️ В реестр Стройконтроля автоматически добавлено ${defectsCreated} дефектов!`);
                        if (window.ConstManager.currentView === 'list') {
                            window.ConstManager.renderDefectsList();
                        }
                    }, 1000);
                }
            }

            updateSmartInputCache('projectName', projInput.value.trim());
            updateSmartInputCache('contractorName', contractorNormalized.contractor_name || contrInput.value.trim());
            updateSmartInputCache('section', secInput.value.trim());
            updateSmartInputCache('floor', floorInput.value.trim());
            updateSmartInputCache('room', roomInput.value.trim());

            const _inspectionsForPast = (window.HistoryState && window.HistoryState.allRecords) || [];
            const pastChecks = _inspectionsForPast.filter(function (c) {
                return c.contractorName === (contractorNormalized.contractor_name || contrInput.value.trim()) &&
                    c.templateKey === currentTemplateKey;
            });
            if (pastChecks.length === 1 && typeof gameGenerateWeeklyPlan === 'function') {
                gameGenerateWeeklyPlan(true);
            } else if (typeof gameUpdatePlanProgress === 'function') {
                gameUpdatePlanProgress();
            }

            if (window.activeTaskId) {
                const task = window.rbi_tasksData && window.rbi_tasksData.find(function (t) { return t.id === window.activeTaskId; });
                if (task) {
                    task.done = (task.done || 0) + 1;
                    task.updatedAt = new Date().toISOString();

                    if (task.done >= task.target) {
                        task.status = 'done';
                        task.resultComment = `Выполнено (${task.done}/${task.target})`;
                    } else {
                        task.resultComment = `В процессе (${task.done}/${task.target})`;
                    }
                    _storage().put(_storage().stores().TASKS, task);
                }
                window.activeTaskId = null;
            }

            if (window.activeAcceptanceRequestId && window.ConstAcceptance) {
                const req = window.ConstAcceptance.requests.find(function (r) { return r.id === window.activeAcceptanceRequestId; });
                if (req) {
                    if (finalMetrics.isDanger || finalMetrics.final < 85) {
                        req.status = 'rejected';
                        showToast("❌ Работы отклонены по результатам чек-листа");
                    } else {
                        req.status = 'accepted';
                        showToast("✅ Работы успешно приняты!");
                    }
                    _storage().put(_storage().stores().CONST_ACCEPTANCE, req);
                    if (window.ConstAcceptance.renderList) window.ConstAcceptance.renderList();
                }
                window.activeAcceptanceRequestId = null;
            }

            state = {}; details = {}; assignPhotosMap({});
            secInput.value = ''; floorInput.value = ''; roomInput.value = ''; locHidden.value = '';

            scheduleSessionSave();

            window.scrollTo({ top: 0, behavior: "smooth" });
            showToast(`✅ Сохранено в Историю!`);

            render();
            updateUI();
            localStorage.setItem('rbi_cloud_dirty', '1');

            if (_syncConfig().enabled) {
                _sync('silent');
            }
        },

        // =====================================================================
        // ОТКРЫТИЕ МОДАЛА ВЫБОРА ИСТОЧНИКА ФОТО
        // Перенесено из app.js (строка 4288).
        // Зависимости: syncPhotoTargetId, DOM ID: photo-source-modal
        // Вызывается из динамически генерируемого HTML: onclick="triggerPhotoInput(id)"
        // =====================================================================
        triggerPhotoInput: function (id) {
            syncPhotoTargetId(id);
            document.getElementById('photo-source-modal').style.display = 'flex';
        },

        // =====================================================================
        // ОБРАБОТКА ЗАГРУЗКИ ФОТО ИЗ ФАЙЛОВОГО ИНПУТА
        // Перенесено из app.js (строка 4353).
        // Зависимости: resolvePhotoTargetId, syncPhotoTargetId, activePhotoContext,
        //              editorImgElement, initPhotoEditor, saveEtalonMarkupPhoto,
        //              saveEditedPhoto, DOM ID: photo-editor-overlay
        // Вызывается из index.html: onchange="handlePhotoUpload(event)"
        // =====================================================================
        handlePhotoUpload: function (event) {
            const file = event.target.files[0];
            if (!file) return;

            const photoId = resolvePhotoTargetId();
            if (window.activePhotoContext !== 'etalon' && !photoId) return;
            syncPhotoTargetId(photoId);

            const reader = new FileReader();
            reader.onload = function (e) {
                editorImgElement = new Image();
                editorImgElement.onload = function () {
                    document.getElementById('photo-editor-overlay').style.display = 'flex';
                    document.body.classList.add('modal-open');

                    initPhotoEditor();

                    const saveBtn = document.querySelector('#photo-editor-overlay button.text-green-400');
                    if (window.activePhotoContext === 'etalon') {
                        saveBtn.onclick = saveEtalonMarkupPhoto;
                    } else {
                        saveBtn.onclick = saveEditedPhoto;
                    }
                };
                editorImgElement.src = e.target.result;
            };
            reader.readAsDataURL(file);
            event.target.value = '';
        },

        // =====================================================================
        // ПОЛУЧЕНИЕ ФОТО СЕССИИ БЕЗ ФОТО ДЕФЕКТОВ СК
        // Перенесено из app.js (строка 448).
        // Зависимости: photos
        // =====================================================================
        getSessionPhotosForSync: function () {
            var sessionPhotos = {};
            Object.keys(photos || {}).forEach(function (key) {
                if (String(key).startsWith('def_')) return;
                sessionPhotos[key] = photos[key];
            });
            return sessionPhotos;
        },

        // =====================================================================
        // УДАЛЕНИЕ ФОТО
        // Перенесено из app.js (строка 4293).
        // Зависимости: photos, updateCardDOM, saveSessionData
        // Вызывается из динамически генерируемого HTML: onclick="removePhoto(id, event)"
        // =====================================================================
        removePhoto: function (id, e) {
            if (e) e.stopPropagation();
            if (!confirm('Удалить фото?')) return;
            delete photos[id];
            updateCardDOM(id);
            saveSessionData();
        },

        // =====================================================================
        // ОТКРЫТИЕ МОДАЛА КОММЕНТАРИЯ/ПРИЧИНЫ ДЕФЕКТА
        // Перенесено из app.js (строка 4209).
        // Зависимости: DEFECT_CAUSES, details, DOM IDs: modal-cause-checkboxes,
        //              modal-cause-comment, ai-hint-block, comment-modal-overlay
        // Вызывается из динамически генерируемого HTML: onclick="toggleCommentField(id)"
        // =====================================================================
        toggleCommentField: function (id) {
            window._auditCurrentCommentId = id;
            var container = document.getElementById('modal-cause-checkboxes');
            var textarea = document.getElementById('modal-cause-comment');

            var currentData = details[id] || {};
            var savedCodes = currentData.causeCode ? currentData.causeCode.split(',') : [];

            var DEFECT_CAUSES = window._AUDIT_DEFECT_CAUSES || [];
            var html = '';
            DEFECT_CAUSES.forEach(function (c) {
                var isChecked = savedCodes.includes(c.code) ? 'checked' : '';
                html += '<label class="flex items-center gap-2 cursor-pointer text-[11px] font-bold text-slate-700 dark:text-slate-300"><input type="checkbox" value="' + c.code + '" class="cause-checkbox w-4 h-4 accent-indigo-600 rounded cursor-pointer" ' + isChecked + '> ' + c.name + '</label>';
            });
            if (container) container.innerHTML = html;

            var pureComment = currentData.comment || '';
            if (pureComment.startsWith('[')) {
                pureComment = pureComment.replace(/^\[.*?\]\s*/, '');
            }
            if (textarea) textarea.value = pureComment;

            var aiHint = document.getElementById('ai-hint-block');
            if (aiHint) { aiHint.innerHTML = ''; aiHint.classList.add('hidden'); }
            var overlay = document.getElementById('comment-modal-overlay');
            if (overlay) { overlay.style.display = 'flex'; document.body.classList.add('modal-open'); }
        },

        // =====================================================================
        // ЗАКРЫТИЕ МОДАЛА КОММЕНТАРИЯ
        // Перенесено из app.js (строка 4238).
        // Вызывается из index.html: onclick="closeCommentModal()"
        // =====================================================================
        closeCommentModal: function () {
            var overlay = document.getElementById('comment-modal-overlay');
            if (overlay) overlay.style.display = 'none';
            document.body.classList.remove('modal-open');
            window._auditCurrentCommentId = null;
        },

        // =====================================================================
        // СОХРАНЕНИЕ КОММЕНТАРИЯ ИЗ МОДАЛА
        // Перенесено из app.js (строка 4244).
        // Зависимости: DEFECT_CAUSES, details, updateCardDOM, saveSessionData, gameLogAction
        // Вызывается из index.html: onclick="saveCommentModal()"
        // =====================================================================
        saveCommentModal: function () {
            var id = window._auditCurrentCommentId;
            if (!id) return;

            var DEFECT_CAUSES = window._AUDIT_DEFECT_CAUSES || [];
            var checkboxes = document.querySelectorAll('.cause-checkbox:checked');
            var checkedCodes = Array.from(checkboxes).map(function (cb) { return cb.value; });
            var code = checkedCodes.join(',');

            var textarea = document.getElementById('modal-cause-comment');
            var text = textarea ? textarea.value.trim() : '';

            details[id] = details[id] || {};
            details[id].causeCode = code;

            var causeNames = checkedCodes.map(function (cCode) {
                var found = DEFECT_CAUSES.find(function (c) { return c.code === cCode; });
                return found ? found.name : null;
            }).filter(Boolean).join(', ');

            var finalComment = text;
            if (causeNames) {
                finalComment = text ? '[' + causeNames + '] ' + text : '[' + causeNames + ']';
            }
            details[id].comment = finalComment;

            updateCardDOM(id);
            saveSessionData();

            if (typeof gameLogAction === 'function' && text.length > 15) {
                gameLogAction('comment_written', id);
            }
            window.closeCommentModal();
        },

        // =====================================================================
        // УДАЛЕНИЕ КОММЕНТАРИЯ
        // Перенесено из app.js (строка 4279).
        // Зависимости: details, updateCardDOM, saveSessionData
        // Вызывается из динамически генерируемого HTML: onclick="deleteComment(id, event)"
        // =====================================================================
        deleteComment: function (id, e) {
            if (e) e.stopPropagation();
            if (details[id]) {
                details[id].comment = '';
                details[id].causeCode = '';
            }
            updateCardDOM(id);
            saveSessionData();
        },

        // =====================================================================
        // СБРОС ТЕКУЩЕГО ЧЕКЛИСТА
        // Перенесено из app.js (строка 3779).
        // Зависимости: state, details, photos, assignPhotosMap, saveSessionData, render, updateUI
        // Вызывается из index.html: onclick="resetChecklist()"
        // =====================================================================
        resetChecklist: function () {
            if (!confirm('Очистить только текущий чек-лист?')) return;
            state = {}; details = {}; assignPhotosMap({}); document.getElementById('inp-location').value = '';
            saveSessionData(); render(); updateUI();
        },

        // =====================================================================
        // РЕНДЕР СЕЛЕКТОРА ШАБЛОНОВ (ВИДА РАБОТ)
        // Перенесено из app.js (строка 2699).
        // Зависимости: SYSTEM_TEMPLATES, userTemplates, currentTemplateKey,
        //              DOM IDs: system-group, user-group, ref-system-group, ref-user-group,
        //              fake-system-group, fake-user-group, checklist-selector
        // Вызывается при инициализации и при обновлении списка шаблонов.
        // =====================================================================
        renderSelector: function () {
            const sysGroup = document.getElementById('system-group');
            const userGroup = document.getElementById('user-group');

            const refSysGroup = document.getElementById('ref-system-group');
            const refUserGroup = document.getElementById('ref-user-group');

            const fakeSysGroup = document.getElementById('fake-system-group');
            const fakeUserGroup = document.getElementById('fake-user-group');

            const sysKeys = Object.keys(SYSTEM_TEMPLATES).sort(function (a, b) {
                return SYSTEM_TEMPLATES[a].title.localeCompare(SYSTEM_TEMPLATES[b].title, 'ru');
            });
            const sysHtml = sysKeys.map(function (key) {
                return '<option value="sys_' + key + '">' + SYSTEM_TEMPLATES[key].title + '</option>';
            }).join('');

            const _ut = _templates().getUserTemplates();
            const userKeys = Object.keys(_ut).sort(function (a, b) {
                return _ut[a].title.localeCompare(_ut[b].title, 'ru');
            });
            const userHtml = userKeys.length > 0
                ? userKeys.map(function (key) {
                    return '<option value="user_' + key + '">' + _ut[key].title + '</option>';
                }).join('')
                : '<option disabled>Своих шаблонов нет</option>';

            if (sysGroup) sysGroup.innerHTML = sysHtml;
            if (userGroup) userGroup.innerHTML = userHtml;

            if (refSysGroup) refSysGroup.innerHTML = sysHtml;
            if (refUserGroup) refUserGroup.innerHTML = userHtml;

            if (fakeSysGroup) fakeSysGroup.innerHTML = sysHtml;
            if (fakeUserGroup) fakeUserGroup.innerHTML = userHtml;

            if (currentTemplateKey) {
                const sel = document.getElementById('checklist-selector');
                if (sel) sel.value = currentTemplateKey;
            }
        }
    };

    if (window.RBI.registry) {
        window.RBI.registry.register('quality.audit', auditModule);
    }

    // =========================================================================
    // WINDOW-ПРОКСИ
    // Переопределяем глобальные функции версиями из модуля.
    // audit.legacy.js загружается после app.js — переопределение гарантировано.
    // Функции, вызываемые из index.html (inline handlers) и динамического HTML:
    // =========================================================================
    window.scheduleSessionSave = auditModule.scheduleSessionSave.bind(auditModule);
    window.saveSessionData = auditModule.saveSessionData.bind(auditModule);
    window.getSessionPhotosForSync = auditModule.getSessionPhotosForSync.bind(auditModule);
    window.changeTemplate = auditModule.changeTemplate.bind(auditModule);
    window.updateDataSummary = auditModule.updateDataSummary.bind(auditModule);
    window.toggleDataBlock = auditModule.toggleDataBlock.bind(auditModule);
    window.toggleOk = auditModule.toggleOk.bind(auditModule);
    window.toggleFail = auditModule.toggleFail.bind(auditModule);
    window.toggleEscalation = auditModule.toggleEscalation.bind(auditModule);
    window.render = auditModule.render.bind(auditModule);
    window.toggleGroup = auditModule.toggleGroup.bind(auditModule);
    window.scrollToGroup = auditModule.scrollToGroup.bind(auditModule);
    window.updateGroupCounters = auditModule.updateGroupCounters.bind(auditModule);
    window.expandCard = auditModule.expandCard.bind(auditModule);
    window.updateCardDOM = auditModule.updateCardDOM.bind(auditModule);
    window.updateUI = auditModule.updateUI.bind(auditModule);
    window.saveProductToArray = auditModule.saveProductToArray.bind(auditModule);
    window.triggerPhotoInput = auditModule.triggerPhotoInput.bind(auditModule);
    window.handlePhotoUpload = auditModule.handlePhotoUpload.bind(auditModule);
    window.removePhoto = auditModule.removePhoto.bind(auditModule);
    window.toggleCommentField = auditModule.toggleCommentField.bind(auditModule);
    window.closeCommentModal = auditModule.closeCommentModal.bind(auditModule);
    window.saveCommentModal = auditModule.saveCommentModal.bind(auditModule);
    window.deleteComment = auditModule.deleteComment.bind(auditModule);
    window.resetChecklist = auditModule.resetChecklist.bind(auditModule);
    window.renderSelector = auditModule.renderSelector.bind(auditModule);

    console.log('[RBI Module] quality.audit v1.2 loaded (full code + comment/photo functions)');
}());

// ─── Блок 14: Integration (добавлен вне IIFE) ───────────────────────────────
(function () {
  'use strict';
  if (window.RBI && window.RBI.registry && !window.RBI.registry.get('module.audit')) {
    window.RBI.registry.register('module.audit', {
      _isLegacyStub: true,
      id: 'audit',
      init: function () {},
      mount: function () { if (window.render) window.render(); },
      unmount: function () {}
    });
  }
}());
