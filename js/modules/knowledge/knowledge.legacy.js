/* =============================================================================
   js/modules/knowledge/knowledge.legacy.js
   Пакет 15 — Knowledge Module (TWI, Документы, Узлы, Эталоны, FAQ, Шаблоны)
   =============================================================================
   Порядок загрузки: ПОСЛЕ app.js, etalon.js, faq.js, templates.js, changelog.js
   Все исходные функции уже объявлены в глобальном скоупе к моменту выполнения.

   Стратегия:
   - Регистрирует ключевые объекты Knowledge-домена в window.RBI.registry.
   - Устанавливает window-прокси (knowledge_*) для всех публичных функций,
     делегируя к оригиналам через ?.() — защита от порядка загрузки.
   - Оригинальные файлы (app.js, etalon.js, faq.js, templates.js) НЕ изменены.
   - Откат: удалить <script src="js/modules/knowledge/knowledge.legacy.js"> из index.html
             и этот файл. Всё вернётся к оригиналам без изменений.
   ============================================================================= */

(function () {
    'use strict';

    function _getSetting(key) {
        if (window.RBI && window.RBI.services && window.RBI.services.settings) {
            return window.RBI.services.settings.get(key);
        }
        return window.appSettings ? window.appSettings[key] : undefined;
    }

    // Фаза 151: единая точка доступа к IndexedDB через StorageService или fallback
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

    // Фаза 151: единая точка вызова синхронизации через SyncService или fallback
    function _sync(mode) {
        if (window.RBI && window.RBI.services && window.RBI.services.sync) {
            return window.RBI.services.sync.trigger(mode || 'silent');
        }
        if (typeof triggerSync === 'function') triggerSync(mode || 'silent');
    }

    /* ------------------------------------------------------------------
       Защита: если RBI core не загружен — пропускаем регистрацию,
       прокси всё равно будут выставлены ниже.
    ------------------------------------------------------------------ */
    var _registry = (window.RBI && window.RBI.registry) ? window.RBI.registry : {
        register: function () {},
        get: function () {}
    };
    var _events = (window.RBI && window.RBI.events) ? window.RBI.events : {
        emit: function () {}
    };

    /* ==================================================================
       1. РЕГИСТРАЦИЯ В RBI.REGISTRY
    ================================================================== */

    // 1.1 SYSTEM_TEMPLATES (из templates.js)
    if (typeof SYSTEM_TEMPLATES !== 'undefined') {
        _registry.register('systemTemplates', SYSTEM_TEMPLATES);
    }

    // 1.2 FAQ_DATA (из faq.js)
    if (typeof FAQ_DATA !== 'undefined') {
        _registry.register('faqData', FAQ_DATA);
    }

    // 1.3 Etalon — агрегированный объект из etalon.js
    _registry.register('etalon', {
        openConstructor:  function() { return window.openEtalonConstructor?.apply(window, arguments); },
        closeConstructor: function() { return window.closeEtalonConstructor?.apply(window, arguments); },
        saveAct:          function() { return window.saveEtalonAct?.apply(window, arguments); },
        openViewer:       function() { return window.openEtalonViewer?.apply(window, arguments); },
        deleteAct:        function() { return window.deleteEtalonAct?.apply(window, arguments); },
        editAct:          function() { return window.editEtalonAct?.apply(window, arguments); },
        addElement:       function() { return window.addEtalonElement?.apply(window, arguments); },
        handlePdfUpload:  function() { return window.handleEtalonPdfUpload?.apply(window, arguments); },
        removePdf:        function() { return window.removeEtalonPdf?.apply(window, arguments); },
        saveMarkupPhoto:  function() { return window.saveEtalonMarkupPhoto?.apply(window, arguments); },
        removePhoto:      function() { return window.removeEtalonPhoto?.apply(window, arguments); },
        triggerPhotoUpload: function() { return window.triggerEtalonPhotoUpload?.apply(window, arguments); },
    });

    // 1.4 Knowledge-функции из app.js (TWI, Docs, Nodes)
    _registry.register('knowledge', {
        renderTwiList:      function() { return window.renderTwiList?.apply(window, arguments); },
        openTwiConstructor: function() { return window.openTwiConstructor?.apply(window, arguments); },
        saveTwiCard:        function() { return window.saveTwiCard?.apply(window, arguments); },
        renderDocsList:     function() { return window.renderDocsList?.apply(window, arguments); },
        renderNodesList:    function() { return window.renderNodesList?.apply(window, arguments); },
    });

    // 1.5 FAQ-функции из faq.js
    _registry.register('faq', {
        renderFaqList:    function() { return window.renderFaqList?.apply(window, arguments); },
        toggleFaqAnswer:  function() { return window.toggleFaqAnswer?.apply(window, arguments); },
    });

    /* ==================================================================
       2. WINDOW-ПРОКСИ — TWI
       Вызываются из index.html (inline handlers) и динамического HTML.
    ================================================================== */

    // renderTwiList — перерисовка списка TWI-карточек
    window.knowledge_renderTwiList = function () {
        if (typeof window.renderTwiList === 'function') return window.renderTwiList();
    };

    // openTwiConstructor(editId?) — открыть конструктор TWI
    window.knowledge_openTwiConstructor = function (editId) {
        if (typeof window.openTwiConstructor === 'function') return window.openTwiConstructor(editId);
    };

    // saveTwiCard — сохранить TWI-карточку (кнопка «Сохранить»)
    window.knowledge_saveTwiCard = function () {
        if (typeof window.saveTwiCard === 'function') return window.saveTwiCard();
    };

    /* ==================================================================
       3. WINDOW-ПРОКСИ — ДОКУМЕНТЫ
    ================================================================== */

    // renderDocsList — перерисовка списка нормативных документов
    window.knowledge_renderDocsList = function () {
        if (typeof window.renderDocsList === 'function') return window.renderDocsList();
    };

    /* ==================================================================
       4. WINDOW-ПРОКСИ — УЗЛЫ КОНСТРУКТИВА
    ================================================================== */

    // renderNodesList — перерисовка списка узлов
    window.knowledge_renderNodesList = function () {
        if (typeof window.renderNodesList === 'function') return window.renderNodesList();
    };

    /* ==================================================================
       5. WINDOW-ПРОКСИ — ЭТАЛОНЫ (из etalon.js)
    ================================================================== */

    // openEtalonConstructor(contractor, templateKey, templateTitle, projectName, statusKey)
    window.knowledge_openEtalonConstructor = function (contractor, templateKey, templateTitle, projectName, statusKey) {
        if (typeof window.openEtalonConstructor === 'function')
            return window.openEtalonConstructor(contractor, templateKey, templateTitle, projectName, statusKey);
    };

    // closeEtalonConstructor — закрыть конструктор
    window.knowledge_closeEtalonConstructor = function () {
        if (typeof window.closeEtalonConstructor === 'function') return window.closeEtalonConstructor();
    };

    // saveEtalonAct(printAfter?) — сохранить / сохранить+печать
    window.knowledge_saveEtalonAct = function (printAfter) {
        if (typeof window.saveEtalonAct === 'function') return window.saveEtalonAct(printAfter);
    };

    // openEtalonViewer(id) — просмотр акта
    window.knowledge_openEtalonViewer = function (id) {
        if (typeof window.openEtalonViewer === 'function') return window.openEtalonViewer(id);
    };

    // deleteEtalonAct(id) — удалить акт
    window.knowledge_deleteEtalonAct = function (id) {
        if (typeof window.deleteEtalonAct === 'function') return window.deleteEtalonAct(id);
    };

    // editEtalonAct(id) — редактировать акт
    window.knowledge_editEtalonAct = function (id) {
        if (typeof window.editEtalonAct === 'function') return window.editEtalonAct(id);
    };

    // addEtalonElement — добавить элемент в конструкторе
    window.knowledge_addEtalonElement = function () {
        if (typeof window.addEtalonElement === 'function') return window.addEtalonElement();
    };

    /* ==================================================================
       6. WINDOW-ПРОКСИ — FAQ (из faq.js)
    ================================================================== */

    // renderFaqList(searchTerm?) — отрисовка FAQ
    window.knowledge_renderFaqList = function (searchTerm) {
        if (typeof window.renderFaqList === 'function') return window.renderFaqList(searchTerm);
    };

    // toggleFaqAnswer(element) — раскрытие/закрытие ответа
    window.knowledge_toggleFaqAnswer = function (element) {
        if (typeof window.toggleFaqAnswer === 'function') return window.toggleFaqAnswer(element);
    };

    /* ==================================================================
       7. WINDOW-ПРОКСИ — ШАБЛОНЫ (из templates.js)
    ================================================================== */

    // formatNorms(text) — форматирование ссылок на нормативы
    window.knowledge_formatNorms = function (text) {
        if (typeof window.formatNorms === 'function') return window.formatNorms(text);
        return text || '';
    };

    /* ==================================================================
       8. КОПИИ ФУНКЦИЙ ИЗ app.js — перекрывают оригиналы после загрузки
          Все 5 функций вызываются из index.html напрямую (без префикса).
    ================================================================== */

    /**
     * Рендер списка TWI-карточек.
     * Перенесено из app.js (строка 6194).
     * Вызывается из index.html: oninput="renderTwiList()"
     */
    window.renderTwiList = function () {
        var container = document.getElementById('twi-cards-container');
        var searchInput = (document.getElementById('twi-search-input') && document.getElementById('twi-search-input').value.toLowerCase()) || '';
        if (!container) return;

        // --- 1. МАГИЯ TWI (ПЛАШКА) ---
        var newMagicCandidates = window.getMagicTwiCandidates ? window.getMagicTwiCandidates() : [];
        var magicTwiHtml = '';

        if (newMagicCandidates.length > 0 && !searchInput) {
            magicTwiHtml = `
            <div id="twi-magic-block" class="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-sm mb-4 text-white overflow-hidden relative magic-collapsed" style="transition: padding 0.3s ease;">
                <div onclick="document.getElementById('twi-magic-block').classList.toggle('magic-collapsed')" class="cursor-pointer p-3">
                    <button class="absolute top-3 right-3 text-white/50 hover:text-white/100 transition-colors pointer-events-none">
                        <svg class="w-5 h-5 magic-arrow transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    <div class="flex items-center gap-2 font-black uppercase tracking-widest text-[11px] drop-shadow-md">
                        <span class="text-lg animate-pulse">✨</span> Магия TWI (Найдено: ${newMagicCandidates.length})
                    </div>
                </div>
                
                <div class="magic-content-wrapper px-3">
                    <div class="magic-content">
                        <div class="text-[11px] font-medium text-indigo-100 mb-3 leading-snug">
                            Система нашла эталоны (OK) и брак (FAIL) для одних и тех же пунктов. За создание TWI-карты начислен <b class="text-yellow-300">Бонус XP!</b>
                        </div>
                        <div class="flex gap-2 overflow-x-auto no-scrollbar pb-3">
                            ${newMagicCandidates.map((m) => `
                                <div class="bg-white/10 border border-white/20 p-2.5 rounded-xl shrink-0 w-48 flex flex-col justify-between">
                                    <div class="text-[10px] font-bold leading-tight line-clamp-2 mb-3" title="${m.title}">${m.title}</div>
                                    <button onclick="window.createMagicTwi('${m.tmplKey}', '${m.itemId}', '${m.ok}', '${m.fail}', '${m.title.replace(/'/g, "\\'")}')" class="w-full bg-white text-indigo-600 py-2 rounded-lg text-[10px] font-black uppercase active:scale-95 shadow-sm transition-transform">Создать (+100 XP)</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
            <style>
                #twi-magic-block.magic-collapsed { padding-bottom: 0px; }
                #twi-magic-block.magic-collapsed .magic-arrow { transform: rotate(0deg); }
                #twi-magic-block:not(.magic-collapsed) .magic-arrow { transform: rotate(180deg); }
                .magic-content-wrapper { display: grid; grid-template-rows: 1fr; transition: grid-template-rows 0.3s ease-out; }
                #twi-magic-block.magic-collapsed .magic-content-wrapper { grid-template-rows: 0fr; }
                .magic-content { overflow: hidden; }
            </style>
        `;
        }

        // --- 2. СПИСОК КАРТОЧЕК ---
        var currentEngineer = _getSetting('engineerName') || 'Инженер';

        var filtered = customTwiCards.filter(function (card) {
            var title = String(card.title || card.name || (card.data && card.data.title) || '').toLowerCase();
            var checklistName = String(card.checklistName || card.category || (card.data && card.data.checklistName) || 'Без привязки').toLowerCase();
            var type = String(card.type || (card.data && card.data.type) || '').toLowerCase();
            var owner = card.owner || (card.data && card.data.owner) || '';

            var matchSearch =
                title.includes(searchInput) ||
                checklistName.includes(searchInput) ||
                type.includes(searchInput);

            var matchOwner =
                window.twiOwnerFilter === 'ALL' ||
                owner === currentEngineer;

            return matchSearch && matchOwner;
        });

        var html = '';

        if (filtered.length === 0) {
            html = `<div class="text-center py-10 text-slate-500 text-xs font-bold uppercase tracking-widest bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">Инструкций пока нет</div>`;
        } else {
            var grouped = {};
            filtered.forEach(function (c) {
                var groupName = c.checklistName || c.category || (c.data && c.data.checklistName) || 'Без привязки';
                if (!grouped[groupName]) grouped[groupName] = [];
                grouped[groupName].push(c);
            });

            for (var checklistName in grouped) {
                html += `
            <details class="mb-4 bg-transparent group [&_summary::-webkit-details-marker]:hidden">
                <summary class="py-3 font-black text-slate-800 dark:text-white text-[12px] uppercase tracking-wider mb-1 border-b border-slate-200 dark:border-slate-700 cursor-pointer flex justify-between items-center select-none active:opacity-70 transition-opacity">
                    <span class="truncate pr-4">${checklistName} <span class="text-[10px] text-slate-400 ml-1">(${grouped[checklistName].length})</span></span>
                    <span class="text-slate-400 shrink-0 transition-transform duration-300 group-open:rotate-180">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                    </span>
                </summary>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 py-2">
            `;

                grouped[checklistName].forEach(function (card) {
                    var typeIcon = ''; var typeText = ''; var typeColor = '';
                    if (card.type === 'INSPECTOR') {
                        typeIcon = `<svg class="w-8 h-8 opacity-40 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>`;
                        typeText = 'Технадзор'; typeColor = 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800';
                    } else if (card.type === 'WORKER') {
                        typeIcon = `<svg class="w-8 h-8 opacity-40 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path></svg>`;
                        typeText = 'Пошаговая'; typeColor = 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800';
                    } else if (card.type === 'PDF') {
                        typeIcon = `<svg class="w-8 h-8 opacity-40 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"></path></svg>`;
                        typeText = 'Регламент'; typeColor = 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800';
                    }

                    var infoText = '';
                    if (card.type === 'WORKER') infoText = 'Шагов: ' + (card.steps && card.steps.length || 0);
                    else if (card.type === 'INSPECTOR') infoText = 'Визуал';
                    else if (card.type === 'PDF') infoText = card.pdfSize || 'Файл';

                    var previewImg = null;
                    if (card.type === 'INSPECTOR') previewImg = card.photoGood || card.photoBad;
                    else if (card.type === 'WORKER' && card.steps && card.steps.length > 0) {
                        var stepWithPhoto = card.steps.find(function (s) { return s.photo; });
                        if (stepWithPhoto) previewImg = stepWithPhoto.photo;
                    }

                    var previewHtml = '';
                    if (card.type === 'PDF') {
                        previewHtml = `
                    <div class="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 relative">
                        <div class="w-10 h-12 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between p-1.5 relative overflow-hidden">
                            <div class="absolute top-0 left-0 right-0 h-3.5 bg-red-500 flex items-center justify-center"><span class="text-[7px] text-white font-black tracking-widest">PDF</span></div>
                            <div class="space-y-1 mt-4">
                                <div class="h-0.5 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                                <div class="h-0.5 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                                <div class="h-0.5 bg-slate-200 dark:bg-slate-700 rounded w-4/6"></div>
                            </div>
                        </div>
                    </div>`;
                    } else {
                        previewHtml = previewImg
                            ? `<img src="${window.getPhotoSrc(previewImg)}" class="w-full h-full object-cover">`
                            : `<div class="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 ${typeColor}">${typeIcon}</div>`;
                    }

                    var isOwner = !card.id.startsWith('sys_') && (!card.owner || card.owner === currentEngineer);
                    var isSystem = card.id.startsWith('sys_');

                    html += `
                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden flex flex-col active:scale-[0.98] transition-transform relative cursor-pointer" onclick="openTwiViewer('${card.id}')">
                    ${isSystem ? '<div class="absolute top-2 left-2 bg-indigo-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-md z-10">СИСТЕМА</div>' : ''}
                    
                    <div class="h-28 sm:h-32 border-b border-[var(--card-border)] relative">
                        ${previewHtml}
                        <button onclick="event.stopPropagation(); openUniversalActionSheet('${card.id}', 'twi', '${card.title.replace(/'/g, "\\'")}', ${isOwner})" class="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-md border border-white/20">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                        </button>
                    </div>
                    
                    <div class="p-3 flex flex-col flex-1">
                        <div class="text-[8px] font-black px-1.5 py-0.5 rounded w-fit mb-1.5 uppercase border ${typeColor} truncate max-w-full">${typeText}</div>
                        <div class="text-[12px] font-bold text-slate-800 dark:text-white leading-tight line-clamp-2 mb-2">${card.title}</div>
                        
                        <div class="mt-auto border-t border-[var(--card-border)] pt-2 flex justify-between items-center">
                            <div class="text-[9px] font-bold text-[var(--text-muted)] truncate pr-2">
                                <svg class="w-3 h-3 inline-block mr-0.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                ${card.owner ? card.owner.split(' ')[0] : 'Система'}
                            </div>
                            <div class="text-[9px] font-black text-slate-400">${infoText}</div>
                        </div>
                    </div>
                </div>`;
                });

                html += `</div></details>`;
            }
        }

        container.innerHTML = magicTwiHtml + html;
    };

    /**
     * Открывает конструктор TWI (режим создания или редактирования).
     * Перенесено из app.js (строка 6640).
     * Вызывается из index.html: onclick="openTwiConstructor()"
     */
    window.openTwiConstructor = function (editId) {
        editId = editId || null;
        if (!rbi_requireKnowledgeEditRight()) return;
        document.getElementById('twi-list-view').classList.add('hidden');
        var view = document.getElementById('twi-constructor-view');
        view.classList.remove('hidden');
        document.body.classList.add('modal-open');
        view.scrollTo(0, 0);

        var selectEl = document.getElementById('twi-checklist-select');
        var options = '<option value="" disabled selected>Выберите вид работ...</option>';

        var sysKeys = Object.keys(SYSTEM_TEMPLATES).sort(function (a, b) {
            return SYSTEM_TEMPLATES[a].title.localeCompare(SYSTEM_TEMPLATES[b].title, 'ru');
        });
        sysKeys.forEach(function (key) { options += `<option value="sys_${key}">${SYSTEM_TEMPLATES[key].title}</option>`; });

        var userKeys = Object.keys(userTemplates).sort(function (a, b) {
            return userTemplates[a].title.localeCompare(userTemplates[b].title, 'ru');
        });
        userKeys.forEach(function (key) { options += `<option value="user_${key}">${userTemplates[key].title}</option>`; });

        selectEl.innerHTML = options;

        var selectDoc = document.getElementById('twi-linked-doc-id');
        var docOptions = '<option value="">Не привязывать</option>';
        var allDocs = [
            ...(typeof SYSTEM_DOCS !== 'undefined' ? SYSTEM_DOCS : []),
            ...(typeof customDocs !== 'undefined' ? customDocs : [])
        ];
        allDocs.sort(function (a, b) { return a.code.localeCompare(b.code); }).forEach(function (doc) {
            var shortTitle = doc.title.length > 40 ? doc.title.substring(0, 40) + '...' : doc.title;
            docOptions += `<option value="${doc.id}">${doc.code} - ${shortTitle}</option>`;
        });
        selectDoc.innerHTML = docOptions;

        document.getElementById('twi-title-input').value = '';
        document.getElementById('twi-steps-container').innerHTML = '';
        document.getElementById('twi-why-input').value = '';
        document.getElementById('twi-compliance-input').value = '';
        document.getElementById('twi-preparation-input').value = '';
        document.getElementById('twi-video-link-input').value = '';
        selectNodeForTwi('', 'Не привязан');

        removeTwiGoodPhoto(); removeTwiBadPhoto(); removeTwiPdf();
        twiStepCount = 0; currentEditingTwiId = editId;

        if (editId) {
            var card = customTwiCards.find(function (c) { return c.id === editId; });
            if (card) {
                document.getElementById('twi-title-input').value = card.title;
                selectEl.value = card.checklistKey;
                document.getElementById('twi-video-link-input').value = card.videoLink || '';

                populateTwiItemSelect(card.type === 'INSPECTOR' ? card.itemId : null);
                changeTwiType(card.type || 'WORKER');
                selectDoc.value = card.linkedDocId || '';
                selectNodeForTwi(
                    card.linkedNodeId || '',
                    card.linkedNodeId
                        ? ((SYSTEM_NODES.find(function (n) { return n.id === card.linkedNodeId; }) || {}).title ||
                           (customNodes.find(function (n) { return n.id === card.linkedNodeId; }) || {}).title ||
                           'Узел')
                        : 'Не привязан'
                );
                if (card.type === 'INSPECTOR') {
                    document.getElementById('twi-why-input').value = card.whyImportant || '';

                    var comp = '', prep = '';
                    if (card.howToCheck) {
                        if (card.howToCheck.includes('[Как подготовить]')) {
                            var parts = card.howToCheck.split('[Как подготовить]\n');
                            prep = parts[1] || '';
                            comp = parts[0].replace('[Что соблюсти]\n', '').trim();
                        } else {
                            comp = card.howToCheck.replace('[Что соблюсти]\n', '').trim();
                        }
                    }
                    document.getElementById('twi-compliance-input').value = comp;
                    document.getElementById('twi-preparation-input').value = prep;

                    if (card.photoGood) renderGoodPhoto(card.photoGood);
                    if (card.photoBad) renderBadPhoto(card.photoBad);
                } else if (card.type === 'PDF') {
                    if (card.pdfData) renderPdfFile(card.pdfName, card.pdfSize, card.pdfData);
                } else {
                    card.steps.forEach(function (step) { addTwiStep(step); });
                }
            }
        } else {
            changeTwiType('INSPECTOR'); addTwiStep(); populateTwiItemSelect();
        }
    };

    /**
     * Сохраняет TWI-карточку (создание или обновление).
     * Перенесено из app.js (строка 6722).
     * Вызывается из index.html: onclick="saveTwiCard()"
     */
    window.saveTwiCard = async function () {
        if (!rbi_requireKnowledgeEditRight()) return;
        var title = document.getElementById('twi-title-input').value.trim();
        var select = document.getElementById('twi-checklist-select');
        var checklistKey = select.value;
        var checklistName = (select.options[select.selectedIndex] && select.options[select.selectedIndex].text) || 'Без привязки';

        if (!title) return showToast('⚠️ Укажите название!');
        if (currentTwiType !== 'PDF' && !checklistKey) return showToast('⚠️ Укажите привязку к чек-листу!');

        if (currentTwiType === 'INSPECTOR' && !currentEditingTwiId) {
            var itemId = document.getElementById('twi-item-select').value;
            var existingCard = customTwiCards.find(function (c) {
                return c.checklistKey === checklistKey &&
                    String(c.itemId) === String(itemId) &&
                    c.type === 'INSPECTOR' &&
                    !c._deleted;
            });
            if (existingCard) {
                return showToast('⚠️ TWI-карта для этого пункта уже создана другим инженером! Обновите базу.');
            }
        }

        var cardData = {
            id: currentEditingTwiId || 'twi_' + Date.now().toString(36),
            title: title, checklistKey: checklistKey, checklistName: checklistName, type: currentTwiType,
            owner: _getSetting('engineerName') || 'Инженер',
            linkedNodeId: document.getElementById('twi-linked-node-id').value || null,
            linkedDocId: document.getElementById('twi-linked-doc-id').value || null,
            videoLink: document.getElementById('twi-video-link-input').value.trim() || null
        };

        if (currentTwiType === 'INSPECTOR') {
            var itemId2 = document.getElementById('twi-item-select').value;
            var why = document.getElementById('twi-why-input').value.trim();
            var comp2 = document.getElementById('twi-compliance-input').value.trim();
            var prep2 = document.getElementById('twi-preparation-input').value.trim();

            if (!itemId2) return showToast('⚠️ Выберите конкретный пункт контроля!');
            if (!comp2 && !prep2) return showToast('⚠️ Заполните хотя бы одно поле: Что соблюсти или Как подготовить!');

            var how = '';
            if (comp2 && prep2) how = '[Что соблюсти]\n' + comp2 + '\n\n[Как подготовить]\n' + prep2;
            else if (comp2) how = '[Что соблюсти]\n' + comp2;
            else if (prep2) how = '[Как подготовить]\n' + prep2;

            cardData.itemId = itemId2 === 'ALL' ? 'ALL' : parseInt(itemId2);
            cardData.whyImportant = why;
            cardData.howToCheck = how;
            cardData.photoGood = document.getElementById('twi-photo-good-container').dataset.photo || null;
            cardData.photoBad = document.getElementById('twi-photo-bad-container').dataset.photo || null;

        } else if (currentTwiType === 'WORKER') {
            var stepEls = document.getElementById('twi-steps-container').querySelectorAll('.twi-step-item');
            if (stepEls.length === 0) return showToast('⚠️ Добавьте хотя бы один шаг!');

            var steps = []; var totalTime = 0; var isValid = true;
            stepEls.forEach(function (el, index) {
                var text = el.querySelector('.twi-step-text').value.trim();
                var time = parseInt(el.querySelector('.twi-step-time').value) || 0;
                var photo = el.querySelector('.twi-photo-container').dataset.photo || null;
                if (!text) isValid = false;
                totalTime += time;
                steps.push({ order: index + 1, text: text, time: time, photo: photo });
            });

            if (!isValid) return showToast('⚠️ Заполните текст во всех шагах!');
            cardData.totalTime = totalTime; cardData.steps = steps;

        } else if (currentTwiType === 'PDF') {
            var pdfData = document.getElementById('twi-pdf-container').dataset.pdf;
            if (!pdfData) return showToast('⚠️ Загрузите PDF-файл!');
            cardData.pdfData = pdfData;
            cardData.pdfName = document.getElementById('twi-pdf-name').innerText;
            cardData.pdfSize = document.getElementById('twi-pdf-size').innerText;
        }

        if (!cardData.owner) {
            cardData.owner = rbi_getCurrentUserNameSafe();
        }

        cardData.source = 'local';
        cardData.syncStatus = 'not_synced';
        cardData.sync_status = 'not_synced';
        cardData.syncBlockReason = '';
        cardData.sync_block_reason = '';
        cardData.updatedAt = new Date().toISOString();

        if (currentEditingTwiId) {
            var idx = customTwiCards.findIndex(function (c) { return c.id === currentEditingTwiId; });
            if (idx !== -1) {
                cardData.createdAt = customTwiCards[idx].createdAt || cardData.updatedAt;
                customTwiCards[idx] = cardData;
            }
        } else {
            cardData.createdAt = cardData.updatedAt;
            customTwiCards.push(cardData);
        }

        try {
            await _storage().put(_storage().stores().TWI_CARDS, cardData);
            showToast('✅ Инструкция успешно сохранена!');
            closeTwiConstructor();

            localStorage.setItem('rbi_cloud_dirty', '1');
            _sync('silent');

            if (typeof window.rbi_tasksData !== 'undefined' && typeof window.getMagicTwiCandidates === 'function') {
                var remaining = window.getMagicTwiCandidates().length;
                var magicTask = window.rbi_tasksData.find(function (t) { return t.taskType === 'Магия TWI' && t.status === 'pending'; });
                if (magicTask) {
                    magicTask.done = (magicTask.done || 0) + 1;
                    if (remaining === 0) {
                        magicTask.status = 'done';
                        magicTask.resultComment = 'Все карточки созданы';
                    } else {
                        magicTask.target = magicTask.done + remaining;
                        magicTask.resultComment = 'В процессе (' + magicTask.done + '/' + magicTask.target + ')';
                    }
                    magicTask.updatedAt = new Date().toISOString();
                    await _storage().put(_storage().stores().TASKS, magicTask);
                    if (typeof rbi_renderTasksList === 'function') rbi_renderTasksList();
                }
            }
        } catch (e) { showToast('❌ Ошибка при сохранении'); }
    };

    /**
     * Рендер списка нормативных документов.
     * Перенесено из app.js (строка 5659).
     * Вызывается из index.html: oninput="renderDocsList()"
     */
    window.renderDocsList = function () {
        var container = document.getElementById('docs-list-container');
        var searchInput = (document.getElementById('doc-search-input') && document.getElementById('doc-search-input').value.toLowerCase()) || '';
        if (!container) return;

        var filtersBlock = document.getElementById('ref-docs-filters');
        if (filtersBlock && !filtersBlock.dataset.initialized) {
            filtersBlock.dataset.initialized = 'true';
            filtersBlock.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <label class="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform">
                    <span class="text-[10px] font-black uppercase tracking-widest ${window.docOwnerFilter === 'MY' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}">Только мои</span>
                    <div class="relative">
                        <input type="checkbox" class="sr-only peer" onchange="window.docOwnerFilter = this.checked ? 'MY' : 'ALL'; renderDocsList()" ${window.docOwnerFilter === 'MY' ? 'checked' : ''}>
                        <div class="w-8 h-4 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-500"></div>
                    </div>
                </label>
                <button onclick="downloadMissingCloudFiles()" class="text-[10px] font-bold text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg active:scale-95 shadow-sm flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path><path stroke-linecap="round" stroke-linejoin="round" d="M12 11v6m0 0l-3-3m3 3l3-3"></path></svg> Скачать
                </button>
            </div>
            
            <div class="flex justify-between items-center mb-2">
                <div class="relative flex-1 mr-2">
                    <span class="absolute left-3 top-2.5 text-slate-400"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg></span>
                    <input type="text" id="doc-search-input" class="input-base pl-9 text-[11px]" placeholder="Поиск ГОСТ, СП..." oninput="renderDocsList()" value="${searchInput}">
                </div>
                <button onclick="openAiDocChat()" class="bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/40 dark:border-indigo-800 dark:text-indigo-400 px-3 py-2 rounded-lg shadow-sm active:scale-95 text-[10px] font-black uppercase whitespace-nowrap mr-2 flex items-center gap-1">
                    🤖 Спросить ИИ
                </button>
                <button onclick="openAddDocModal()" class="bg-indigo-600 text-white px-3 py-2 rounded-lg shadow-md active:scale-95 text-[10px] font-black uppercase whitespace-nowrap flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg> Свой НД
                </button>
            </div>
            
            <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1 border-t border-[var(--card-border)] pt-2" id="doc-filters-container">
                <button onclick="filterDocs('ALL', this)" class="doc-filter-btn px-3 py-1.5 rounded-lg text-[10px] font-bold ${currentDocFilter === 'ALL' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'} active:scale-95 whitespace-nowrap border">Все</button>
                <button onclick="filterDocs('СП', this)" class="doc-filter-btn px-3 py-1.5 rounded-lg text-[10px] font-bold ${currentDocFilter === 'СП' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'} active:scale-95 whitespace-nowrap border">СП</button>
                <button onclick="filterDocs('ГОСТ', this)" class="doc-filter-btn px-3 py-1.5 rounded-lg text-[10px] font-bold ${currentDocFilter === 'ГОСТ' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'} active:scale-95 whitespace-nowrap border">ГОСТ</button>
                <button onclick="filterDocs('ПРОЕКТ', this)" class="doc-filter-btn px-3 py-1.5 rounded-lg text-[10px] font-bold ${currentDocFilter === 'ПРОЕКТ' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'} active:scale-95 whitespace-nowrap border">Проект / РД</button>
            </div>
        `;
        }

        var allDocs = [
            ...(typeof SYSTEM_DOCS !== 'undefined' ? SYSTEM_DOCS : []),
            ...customDocs
        ];
        var currentEngineer = _getSetting('engineerName') || 'Инженер';

        var filtered = allDocs.filter(function (doc) {
            var code = String(doc.code || (doc.data && doc.data.code) || '').toLowerCase();
            var title = String(doc.title || doc.name || (doc.data && doc.data.title) || '').toLowerCase();
            var type = doc.type || (doc.data && doc.data.type) || '';
            var owner = doc.owner || (doc.data && doc.data.owner) || '';

            var matchSearch = code.includes(searchInput) || title.includes(searchInput);
            var matchFilter = currentDocFilter === 'ALL' || type === currentDocFilter;
            var matchOwner =
                window.docOwnerFilter === 'ALL' ||
                doc.isSystem ||
                owner === currentEngineer;

            return matchSearch && matchFilter && matchOwner;
        });

        if (filtered.length === 0) {
            container.innerHTML = `<div class="text-center py-10 text-slate-500 text-[11px] font-bold uppercase tracking-widest bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 shadow-sm">Документы не найдены</div>`;
            return;
        }

        var grouped = {};
        filtered.forEach(function (doc) {
            if (!grouped[doc.type]) grouped[doc.type] = [];
            grouped[doc.type].push(doc);
        });

        var html = '';
        Object.keys(grouped).sort().forEach(function (type) {
            html += `
        <details class="mb-4 bg-transparent group [&_summary::-webkit-details-marker]:hidden">
            <summary class="py-3 font-black text-slate-800 dark:text-white text-[12px] uppercase tracking-wider mb-1 border-b border-slate-200 dark:border-slate-700 cursor-pointer flex justify-between items-center select-none active:opacity-70 transition-opacity">
                <span class="truncate pr-4">${type} <span class="text-[10px] text-slate-400 ml-1">(${grouped[type].length})</span></span>
                <span class="text-slate-400 shrink-0 transition-transform duration-300 group-open:rotate-180">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                </span>
            </summary>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 py-2">
        `;

            grouped[type].forEach(function (doc) {
                var isSystem = String(doc.id).startsWith('sys_');
                var isOwner = !isSystem && (!doc.owner || doc.owner === currentEngineer);
                var tagColor = 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400';
                var infoText = isSystem ? 'Системный' : (doc.pdfSize ? 'PDF: ' + doc.pdfSize : 'Без файла');

                html += `
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden flex flex-col active:scale-[0.98] transition-transform relative cursor-pointer" onclick="openDocViewer('${doc.id}')">
                ${isSystem ? '<div class="absolute top-2 left-2 bg-indigo-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-md z-10">СИС</div>' : ''}
                
                <div class="h-24 border-b border-[var(--card-border)] bg-slate-50 dark:bg-slate-900 flex items-center justify-center relative">
                    <div class="w-10 h-12 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between p-1.5 relative overflow-hidden">
                        <div class="absolute top-0 left-0 right-0 h-3.5 bg-red-500 flex items-center justify-center"><span class="text-[6px] text-white font-black tracking-widest">DOC</span></div>
                        <div class="space-y-1 mt-4">
                            <div class="h-0.5 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                            <div class="h-0.5 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                            <div class="h-0.5 bg-slate-200 dark:bg-slate-700 rounded w-4/6"></div>
                        </div>
                    </div>
                    
                    ${!isSystem ? `
                    <button onclick="event.stopPropagation(); openUniversalActionSheet('${doc.id}', 'doc', '${doc.code.replace(/'/g, "\\'")}', ${isOwner})" class="absolute top-2 right-2 w-8 h-8 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-md border border-white/20 hover:bg-black/50">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                    </button>` : ''}
                </div>
                
                <div class="p-3 flex flex-col flex-1">
                    <div class="text-[8px] font-black px-1.5 py-0.5 rounded w-fit mb-1.5 uppercase border ${tagColor} truncate max-w-full">${doc.type}</div>
                    <div class="text-[12px] font-black text-slate-800 dark:text-white leading-tight mb-1 truncate">${doc.code}</div>
                    <div class="text-[10px] font-medium text-[var(--text-muted)] leading-snug line-clamp-2 mb-2">${doc.title}</div>
                    
                    <div class="mt-auto border-t border-[var(--card-border)] pt-2 flex justify-between items-center">
                        <div class="text-[9px] font-bold text-[var(--text-muted)] truncate pr-2">
                            <svg class="w-3 h-3 inline-block mr-0.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                            ${isSystem ? 'Система' : (doc.owner ? doc.owner.split(' ')[0] : 'Инженер')}
                        </div>
                        <div class="text-[9px] font-black text-slate-400">${infoText}</div>
                    </div>
                </div>
            </div>`;
            });
            html += `</div></details>`;
        });

        container.innerHTML = html;
    };

    /**
     * Рендер списка конструктивных узлов.
     * Перенесено из app.js (строка 7290).
     * Вызывается из index.html: oninput="renderNodesList()"
     */
    window.renderNodesList = function () {
        var container = document.getElementById('nodes-list-container');
        var searchInput = (document.getElementById('node-search-input') && document.getElementById('node-search-input').value.toLowerCase()) || '';
        if (!container) return;

        var filtersBlock = document.getElementById('node-filters-block');
        if (filtersBlock && !filtersBlock.innerHTML.includes('nodeOwnerFilter')) {
            var originalHtml = filtersBlock.innerHTML;
            filtersBlock.innerHTML = `
                <div class="flex justify-between items-center mb-3">
                    <label class="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform">
                        <span class="text-[10px] font-black uppercase tracking-widest ${window.nodeOwnerFilter === 'MY' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}">Только мои</span>
                        <div class="relative">
                            <input type="checkbox" class="sr-only peer" onchange="window.nodeOwnerFilter = this.checked ? 'MY' : 'ALL'; renderNodesList()" ${window.nodeOwnerFilter === 'MY' ? 'checked' : ''}>
                            <div class="w-8 h-4 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-500"></div>
                        </div>
                    </label>
                    <button onclick="downloadMissingCloudFiles()" class="text-[10px] font-bold text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg active:scale-95 shadow-sm flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path><path stroke-linecap="round" stroke-linejoin="round" d="M12 11v6m0 0l-3-3m3 3l3-3"></path></svg> Скачать
                    </button>
                </div>
            ` + originalHtml;
        }

        var allNodes = [...SYSTEM_NODES, ...customNodes];
        var currentEngineer = _getSetting('engineerName') || 'Инженер';

        var filtered = allNodes.filter(function (node) {
            var title = String(node.title || node.name || (node.data && node.data.title) || '').toLowerCase();
            var desc = String(node.desc || node.description || (node.data && node.data.desc) || (node.data && node.data.description) || '').toLowerCase();
            var category = String(node.category || (node.data && node.data.category) || '').toLowerCase();
            var owner = node.owner || (node.data && node.data.owner) || '';

            var matchSearch =
                title.includes(searchInput) ||
                desc.includes(searchInput) ||
                category.includes(searchInput);

            var isSystemNode = !customNodes.find(function (n) { return n.id === node.id; });

            var matchOwner =
                window.nodeOwnerFilter === 'ALL' ||
                isSystemNode ||
                owner === currentEngineer;

            return matchSearch && matchOwner;
        });

        if (filtered.length === 0) {
            container.innerHTML = `<div class="text-center py-10 text-slate-500 text-xs font-bold uppercase tracking-widest bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">Узлы не найдены</div>`;
            return;
        }

        var grouped = {};
        filtered.forEach(function (node) {
            var groupName = node.category || (node.data && node.data.category) || 'Без категории';
            if (!grouped[groupName]) grouped[groupName] = [];
            grouped[groupName].push(node);
        });

        var html = '';
        for (var cat in grouped) {
            html += `
        <details class="mb-4 bg-transparent group [&_summary::-webkit-details-marker]:hidden">
            <summary class="py-3 font-black text-slate-800 dark:text-white text-[12px] uppercase tracking-wider mb-1 border-b border-slate-200 dark:border-slate-700 cursor-pointer flex justify-between items-center select-none active:opacity-70 transition-opacity">
                <span class="truncate pr-4">${cat} <span class="text-[10px] text-slate-400 ml-1">(${grouped[cat].length})</span></span>
                <span class="text-slate-400 shrink-0 transition-transform duration-300 group-open:rotate-180">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                </span>
            </summary>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3 py-2">
        `;

            grouped[cat].forEach(function (node) {
                var isSystem = !customNodes.find(function (n) { return n.id === node.id; });
                var isOwner = !node.owner || node.owner === currentEngineer;

                var previewHtml = '';
                var hasPdfAttachment = node.attachments && node.attachments.length > 0 && node.attachments[0].type === 'pdf';
                var isOldPdf = node.img && node.img.includes('application/pdf');

                if (hasPdfAttachment || isOldPdf) {
                    previewHtml = `
                    <div class="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 relative p-2">
                        <div class="w-12 h-16 bg-white dark:bg-slate-800 rounded-lg shadow-md border border-red-200 dark:border-red-800 flex flex-col justify-between p-1.5 relative overflow-hidden">
                            <div class="absolute top-0 left-0 right-0 h-4 bg-red-500 flex items-center justify-center"><span class="text-[7px] text-white font-black tracking-widest">PDF</span></div>
                            <div class="space-y-1.5 mt-5">
                                <div class="h-1 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                                <div class="h-1 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                                <div class="h-1 bg-slate-200 dark:bg-slate-700 rounded w-4/6"></div>
                            </div>
                        </div>
                    </div>`;
                } else if (node.attachments && node.attachments.length > 0 && node.attachments[0].type === 'image') {
                    previewHtml = `<img src="${window.getPhotoSrc(node.attachments[0].url)}" class="w-full h-full object-contain p-2">`;
                } else if (node.img) {
                    previewHtml = `<img src="${window.getPhotoSrc(node.img)}" class="w-full h-full object-contain p-2">`;
                } else {
                    previewHtml = `<div class="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-900"><svg class="w-8 h-8 opacity-40 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"></path></svg></div>`;
                }

                html += `
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden flex flex-col active:scale-[0.98] transition-transform relative cursor-pointer" onclick="openNodeViewer('${node.id}')">
                ${isSystem ? '<div class="absolute top-2 left-2 bg-indigo-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-md z-10">СИС</div>' : ''}
                
                <div class="h-28 sm:h-32 border-b border-[var(--card-border)] bg-slate-50 dark:bg-slate-900 relative">
                    ${previewHtml}
                    ${!isSystem ? `
                    <button onclick="event.stopPropagation(); openUniversalActionSheet('${node.id}', 'node', '${String(node.title || node.name || 'Узел').replace(/'/g, "\\'")}', ${isOwner})" class="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-md border border-white/20">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                    </button>` : ''}
                </div>
                
                <div class="p-3 flex flex-col flex-1">
                    <div class="text-[8px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 px-1.5 py-0.5 rounded w-fit mb-1.5 uppercase truncate max-w-full">${node.category}</div>
                    <div class="text-[12px] font-bold text-slate-800 dark:text-white leading-tight line-clamp-2 mb-2">${node.title}</div>
                    
                    <div class="mt-auto border-t border-[var(--card-border)] pt-2 flex justify-between items-center">
                        <div class="text-[9px] font-bold text-[var(--text-muted)] truncate pr-2">
                            <svg class="w-3 h-3 inline-block mr-0.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                            ${isSystem ? 'Система' : (node.owner ? node.owner.split(' ')[0] : 'Инженер')}
                        </div>
                    </div>
                </div>
            </div>`;
            });

            html += `</div></details>`;
        }

        container.innerHTML = html;
    };

    /* ==================================================================
       9. Публикация метки о загрузке модуля
    ================================================================== */

    _registry.register('knowledgeLegacyLoaded', true);
    _events.emit('module:loaded', { name: 'knowledge.legacy' });

    /* ------------------------------------------------------------------
       Блок 9.1 — регистрация module.knowledge (совместимость с платформой)
       knowledge.module.js регистрирует себя как ES-модуль; этот блок
       обеспечивает fallback для случая, когда ES-модуль ещё не загружен.
    ------------------------------------------------------------------ */
    if (!_registry.get('module.knowledge')) {
        _registry.register('module.knowledge', {
            id: 'knowledge',
            _legacyStub: true
        });
    }

    /* ------------------------------------------------------------------
       Блок 9.3 — ОТКЛЮЧЁН (хотфикс 9.5)

       Делегирование renderTwiList/renderDocsList/renderNodesList → KnowledgeRender
       было отключено, так как KnowledgeRender — ES-модуль (type="module"),
       который загружается с defer ПОСЛЕ DOMContentLoaded. В момент первого
       вызова renderTwiList() при старте страницы KnowledgeRender ещё не
       существует, и все три функции падали в fallback на пустой оригинал.

       Оригинальные legacy-рендеры (строки 189, 598, 740 этого файла) работают
       напрямую с window.customTwiCards / customDocs / customNodes — надёжно
       и без зависимости от порядка загрузки ES-модулей.

       KnowledgeRender остаётся доступен как window.KnowledgeRender для
       прямых вызовов из кода, но НЕ перехватывает глобальные window.render*.
    ------------------------------------------------------------------ */

    /* ------------------------------------------------------------------
       Блок 9.4 — регистрация KnowledgeActions в реестре (без делегирования)

       ВАЖНО: window.saveTwiCard / saveCustomDoc / saveCustomNode НЕ
       перехватываются — они определены выше в этом файле (строки 466/...)
       и работают напрямую с IndexedDB через app.js-паттерн.

       KnowledgeActions.saveTwiCard(data) ожидает готовый объект data,
       тогда как UI-функции читают данные из форм сами — несовместимо.
       Делегирование через KnowledgeActions здесь НАМЕРЕННО ОТКЛЮЧЕНО.
    ------------------------------------------------------------------ */
    // KnowledgeActions публикуется в window самим knowledge.actions.js
    // — он доступен для API-вызовов, но UI-сохранение идёт через оригиналы.

    /* ------------------------------------------------------------------
       Блок 9.5 — синхронизация KnowledgeState из window.* (хотфикс)

       Рендер теперь идёт через legacy-функции (Блок 9.3 отключён).
       Этот блок только поддерживает KnowledgeState в актуальном состоянии
       для API-вызовов и будущего использования KnowledgeRender/KnowledgeActions.

       После каждого вызова rbi_reloadReferenceMemory (и при старте страницы)
       копируем window.customTwiCards / customDocs / customNodes → KnowledgeState.
    ------------------------------------------------------------------ */
    function _syncKnowledgeState() {
        if (!window.KnowledgeState) return;
        if (Array.isArray(window.customTwiCards)) {
            window.KnowledgeState.setTwiCards(window.customTwiCards);
        }
        if (Array.isArray(window.customDocs)) {
            window.KnowledgeState.setDocs(window.customDocs);
        }
        if (Array.isArray(window.customNodes)) {
            window.KnowledgeState.setNodes(window.customNodes);
        }
    }

    // Keepalive sync: после rbi_reloadReferenceMemory — обновить KnowledgeState
    var _b95_origReload = window.rbi_reloadReferenceMemory;
    window.rbi_reloadReferenceMemory = function () {
        var result = _b95_origReload && _b95_origReload.apply(this, arguments);
        Promise.resolve(result).then(function () {
            _syncKnowledgeState();
        });
        return result;
    };

    // Boot sync: когда ES-модуль knowledge.state.js опубликует window.KnowledgeState —
    // сразу заполнить его уже загруженными данными из window.customTwiCards и т.д.
    (function () {
        var _b95_ksValue = window.KnowledgeState;
        Object.defineProperty(window, 'KnowledgeState', {
            configurable: true,
            enumerable:   true,
            get: function () { return _b95_ksValue; },
            set: function (val) {
                _b95_ksValue = val;
                if (val) {
                    Promise.resolve().then(function () {
                        _syncKnowledgeState();
                        console.log('[knowledge.legacy] ✅ Блок 9.5 boot sync: KnowledgeState заполнен');
                    });
                }
            }
        });
    }());

    console.log('[knowledge.legacy] ✅ Knowledge Module зарегистрирован v0.5.3 (Блок 9.3 отключён, legacy-рендер восстановлен)');

})();
