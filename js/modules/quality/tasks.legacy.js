/* Файл: js/modules/quality/tasks.legacy.js */
/* Tasks Module v2.0 — управление задачами (CRUD, статусы, soft-delete, синхр.)  */
/* Реальный код функций скопирован из js/task.js напрямую внутрь IIFE.           */
/* Оригиналы в task.js и app.js НЕ удалены и НЕ изменены.                       */
/*                                                                                */
/* window-прокси устанавливаются ПОСЛЕ определения внутренних функций.           */
/* Это позволяет inline-handlers в index.html и динамическому HTML работать      */
/* без каких-либо изменений.                                                     */

(function () {
    'use strict';

    // Фаза 52: единая точка доступа к настройкам через SettingsService с fallback
    function _getSetting(key) {
        if (window.RBI && window.RBI.services && window.RBI.services.settings) {
            return window.RBI.services.settings.get(key);
        }
        return window.appSettings ? window.appSettings[key] : undefined;
    }

    // Фаза 59: изоляция isDemoMode через AppModeService с fallback
    function _isDemoMode() {
        if (window.RBI && window.RBI.services && window.RBI.services.appMode) {
            return window.RBI.services.appMode.isDemo();
        }
        return typeof window.isDemoMode !== 'undefined' ? window.isDemoMode : false;
    }

    // Фаза 67: изоляция SyncQueueManager через SyncService с fallback
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

    // Фаза 83: единая точка доступа к данным проверок через HistoryState или fallback contractorArray
    function _inspections() {
        if (window.HistoryState && Array.isArray(window.HistoryState.allRecords)) {
            return window.HistoryState.allRecords;
        }
        if (Array.isArray(window.contractorArray)) return window.contractorArray;
        return [];
    }

    // Фаза 102: единая точка доступа к IndexedDB через StorageService или fallback
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

    // Фаза 124: единая точка доступа к syncConfig через SyncService или fallback
    function _syncConfig() {
        if (window.RBI && window.RBI.services && window.RBI.services.sync) {
            return window.RBI.services.sync.getConfig();
        }
        return window.syncConfig || {};
    }

    // Фаза 124: единая точка вызова синхронизации через SyncService или fallback
    function _sync(mode) {
        var m = mode || 'silent';
        if (window.RBI && window.RBI.services && window.RBI.services.sync) {
            return window.RBI.services.sync.trigger(m);
        }
        if (typeof triggerSync === 'function') return triggerSync(m);
        return Promise.resolve(false);
    }

    // Фаза 75: изоляция userTemplates через TemplateService с fallback
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

    window.RBI = window.RBI || {};

    // =========================================================================
    // ИКОНКИ ЗАДАЧ (константа)
    // =========================================================================
    var RBI_TASK_ICONS = {
        'ППР': `<svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>`,
        'Инструктаж': `<svg class="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`,
        'Эталон': `<svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>`,
        'Контроль': `<svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>`,
        'Совещание': `<svg class="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>`,
        'Развитие': `<svg class="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>`,
        'Отчет': `<svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>`
    };

    // =========================================================================
    // ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ МОДУЛЯ
    // (window.rbi_tasksData и window.rbi_scheduleData определены в task.js —
    //  здесь только гарантируем наличие, если task.js загрузился раньше)
    // =========================================================================
    window.rbi_tasksData    = window.rbi_tasksData    || [];
    window.rbi_scheduleData = window.rbi_scheduleData || [];

    // Контекст текущей открытой задачи (модалка)
    var currentTaskContext = null;

    // Флаг блокировки параллельных вызовов планировщика
    window.isPlanGenerating = window.isPlanGenerating || false;

    // Состояние календаря
    var currentCalendarDate = new Date();

    // =========================================================================
    // 1. УПРАВЛЕНИЕ РУЧНЫМИ ЗАДАЧАМИ
    // =========================================================================

    function _openTaskModal() {
        const _allInspections = _inspections();
        var cSelect = document.getElementById('manual-task-contractor');
        if (cSelect) {
            var uniqueContrs = Array.from(new Set(_allInspections.map(function(c){ return c.contractorName; }).filter(Boolean))).sort();
            cSelect.innerHTML = '<option value="">-- Общая задача --</option>' + uniqueContrs.map(function(c){ return '<option value="' + c.replace(/"/g, '&quot;') + '">' + c + '</option>'; }).join('');
        }

        var eSelect = document.getElementById('manual-task-engineer');
        if (eSelect) {
            var currentEng = (document.getElementById('inp-inspector') ? document.getElementById('inp-inspector').value.trim() : null) || _getSetting('engineerName') || 'Инженер';
            var allNames = _allInspections.map(function(c){ return c.inspectorName; }).filter(Boolean);
            if (window.serverGlobalRating) {
                allNames = allNames.concat(window.serverGlobalRating.map(function(r){ return r.name; }));
            }
            var uniqueEngs = Array.from(new Set(allNames)).sort();
            if (!uniqueEngs.includes(currentEng)) uniqueEngs.unshift(currentEng);
            eSelect.innerHTML = uniqueEngs.map(function(e){ return '<option value="' + e.replace(/"/g, '&quot;') + '"' + (e === currentEng ? ' selected' : '') + '>' + e + '</option>'; }).join('');

            var currentRole = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
            if (['manager', 'deputy_manager'].includes(currentRole)) {
                eSelect.removeAttribute('disabled');
                eSelect.classList.remove('opacity-60', 'cursor-not-allowed');
            } else {
                eSelect.setAttribute('disabled', 'true');
                eSelect.classList.add('opacity-60', 'cursor-not-allowed');
            }
        }

        document.getElementById('manual-task-title').value = '';
        document.getElementById('manual-task-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('manual-task-modal').style.display = 'flex';
        document.body.classList.add('modal-open');
    }

    function _closeTaskModal() {
        document.getElementById('manual-task-modal').style.display = 'none';
        document.body.classList.remove('modal-open');
    }

    async function _saveManualTask() {
        if (_isDemoMode()) return showToast("В демо-режиме сохранение отключено");

        var title    = document.getElementById('manual-task-title').value.trim();
        var promptText = document.getElementById('manual-task-prompt').value.trim();
        var urgencyVal = document.getElementById('manual-task-urgency').value;
        var dateStr  = document.getElementById('manual-task-date').value;
        var assignee = (document.getElementById('manual-task-engineer') ? document.getElementById('manual-task-engineer').value : null) || 'Инженер';

        if (!title) return showToast("⚠️ Укажите название задачи!");

        var tDate = dateStr ? new Date(dateStr) : null;
        if (tDate) tDate.setHours(12, 0, 0, 0);

        var newTask = {
            id: 'task_man_' + Date.now().toString(36),
            type: 'manual',
            taskType: 'Поручение',
            category: 'other',
            icon: 'Отчет',
            contractor: "Поручение",
            title: title,
            prompt: promptText || 'Без описания',
            urgency: urgencyVal,
            engineerName: assignee,
            inspectorName: assignee,
            status: 'pending',
            priorityLvl: 2,
            date: tDate ? tDate.toISOString() : null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: 'local',
            syncStatus: 'not_synced',
            sync_status: 'not_synced',
            _deleted: false
        };

        window.rbi_tasksData.unshift(newTask);
        await _storage().put(_storage().stores().TASKS, newTask);
        if (!_isDemoMode()) {
            _syncEnqueue('SAVE_TASK', newTask);
        }
        localStorage.setItem('rbi_cloud_dirty', '1');
        _sync('silent');
        showToast("✅ Поручение создано!");
        _closeTaskModal();
        _renderTasksList();
    }

    // =========================================================================
    // 2. АВТОМАТИЧЕСКИЙ ПЛАНИРОВЩИК
    // =========================================================================

    async function _gameForceUpdatePlan(silent) {
        if (typeof silent === 'undefined') silent = false;
        if (!silent) showToast("🧠 ИИ зачищает дубликаты и перестраивает план...");

        var uniqueKeys = new Set();
        window.rbi_tasksData.sort(function(a, b){ return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0); });

        for (var i = 0; i < window.rbi_tasksData.length; i++) {
            var t = window.rbi_tasksData[i];
            if (!t._deleted) {
                if (t.taskType === 'Эталон' || t.title.includes('Эталон')) {
                    t.target = 1;
                }

                var key = '';
                var engKey = t.engineerName || 'NoName';
                if (t.contractor === 'Системная' && t.status === 'pending') {
                    key = 'SYSTEMIC_' + engKey + '_' + t.title;
                } else if (t.status === 'pending' || t.status === 'paused') {
                    key = 'ACTIVE_' + engKey + '_' + t.contractor + '_' + (t.templateKey || 'NO_TMPL') + '_' + t.taskType;
                } else {
                    var tDate = new Date(t.createdAt || t.date || Date.now());
                    var weekStr = getWeekId(tDate);
                    key = 'ARCHIVE_' + engKey + '_' + t.contractor + '_' + (t.templateKey || 'NO_TMPL') + '_' + t.taskType + '_' + weekStr;
                }

                if (uniqueKeys.has(key)) {
                    t._deleted = true;
                    t.updatedAt = new Date().toISOString();
                    await _storage().put(_storage().stores().TASKS, t);
                } else {
                    uniqueKeys.add(key);
                    if (t.taskType === 'Эталон') {
                        await _storage().put(_storage().stores().TASKS, t);
                    }
                }
            }
        }

        window.rbi_tasksData = window.rbi_tasksData.filter(function(t){ return !t._deleted; });

        await _gameGenerateWeeklyPlan(true);

        localStorage.setItem('rbi_cloud_dirty', '1');
        _sync('silent');

        if (!silent) setTimeout(function(){ showToast("✨ База очищена, дубликаты инспекций удалены!"); }, 500);
    }

    async function _gameGenerateWeeklyPlan(force) {
        const _allInspections = _inspections();
        if (typeof force === 'undefined') force = false;
        if (window.isPlanGenerating) return;
        window.isPlanGenerating = true;

        try {
            var currentRole = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
            if (['guest', 'contractor'].includes(currentRole)) {
                window.isPlanGenerating = false;
                return;
            }

            var myName = window.RbiRoles ? window.RbiRoles.getCurrentEngineerName() : (_getSetting('engineerName') || 'Инженер');
            if (typeof engineerAbsence !== 'undefined' && engineerAbsence.isActive) return;

            var now = new Date();
            var currentWeekId = getWeekId(now);
            var startOfThisWeek = getStartOfWeek(now);

            if (weeklyPlanData.weekId && weeklyPlanData.weekId !== currentWeekId) force = true;

            if (force) {
                var nowTime = new Date().setHours(0, 0, 0, 0);
                window.rbi_tasksData.forEach(function(t) {
                    if (t.status === 'pending') {
                        var tDate = new Date(t.date).setHours(0, 0, 0, 0);
                        if (tDate < nowTime && t.type === 'auto') {
                            t.carryOverCount = (t.carryOverCount || 0) + 1;
                        }
                    }
                });
            }

            var newTasksCount = 0;

            var engineersToProcess = [myName];
            if (window.RbiRoles && window.RbiRoles.isAdmin()) {
                var allEngs = Array.from(new Set(_allInspections.map(function(c){ return c.inspectorName; }).filter(Boolean)));
                if (allEngs.length > 0) engineersToProcess = allEngs;
                if (!engineersToProcess.includes(myName)) engineersToProcess.push(myName);
            } else if (currentRole === 'project_manager') {
                var allEngs2 = Array.from(new Set(_allInspections.map(function(c){ return c.inspectorName; }).filter(Boolean)));
                engineersToProcess = allEngs2;
            }

            for (var ei = 0; ei < engineersToProcess.length; ei++) {
                var targetEngineer = engineersToProcess[ei];
                if (!targetEngineer || targetEngineer === 'Неизвестный инспектор') continue;

                var addTask = function(idSuffix, cat, icon, title, workTitle, contractor, prompt, lvl, tDate, tmplKey, taskType, targetCount) {
                    if (typeof tmplKey === 'undefined') tmplKey = '';
                    if (typeof taskType === 'undefined') taskType = '';
                    if (typeof targetCount === 'undefined') targetCount = 1;
                    var eng = targetEngineer;

                    var existingTask = window.rbi_tasksData.find(function(t) {
                        if (t._deleted) return false;
                        var taskEng = t.engineerName || t.inspectorName || '';
                        if (contractor !== 'Системная' && taskEng !== eng) return false;
                        if (contractor === 'Системная' && taskEng !== eng) return false;

                        if (t.status === 'pending' || t.status === 'paused') {
                            if (contractor === 'Системная') return t.title === title;
                            return t.contractor === contractor && t.templateKey === tmplKey && t.taskType === taskType;
                        }

                        var taskWeek = getWeekId(new Date(t.createdAt || t.date || Date.now()));
                        if (taskWeek === currentWeekId) {
                            if (contractor === 'Системная') return t.title === title;
                            return t.contractor === contractor && t.templateKey === tmplKey && t.taskType === taskType;
                        }
                        return false;
                    });

                    if (existingTask) {
                        if (force && existingTask.status === 'pending') {
                            if (taskType === 'Аудит') {
                                var deficit = existingTask.target - (existingTask.done || 0);
                                if (deficit > 0) {
                                    existingTask.target = deficit + targetCount;
                                    existingTask.date = tDate.toISOString();
                                    _storage().put(_storage().stores().TASKS, existingTask);
                                }
                            } else {
                                existingTask.date = tDate.toISOString();
                                _storage().put(_storage().stores().TASKS, existingTask);
                            }
                        }
                        return;
                    }

                    var projName = "Все";
                    if (contractor !== 'Системная') {
                        var sampleCheck = _allInspections.find(function(c){ return c.inspectorName === eng && c.contractorName === contractor && c.templateKey === tmplKey; });
                        if (sampleCheck) projName = sampleCheck.project_display_name || sampleCheck.projectName || "Все";
                    }

                    var task = {
                        id: 'tsk_' + Date.now().toString(36) + idSuffix + Math.floor(Math.random() * 1000),
                        source: 'ai', type: 'auto', category: cat, icon: icon, taskType: taskType,
                        contractor: contractor, project: projName,
                        project_canonical_key: projName === 'Все' ? '' : projName,
                        project_display_name: projName,
                        engineerName: eng, inspectorName: eng,
                        templateKey: tmplKey, workTitle: workTitle,
                        title: title, prompt: prompt,
                        status: 'pending', priorityLvl: lvl, date: tDate.toISOString(),
                        target: targetCount, done: 0, carryOverCount: 0,
                        history: ['[' + new Date().toLocaleDateString('ru-RU') + '] Задача создана системой.'],
                        updatedAt: new Date().toISOString(),
                        createdAt: new Date().toISOString(),
                        _deleted: false
                    };
                    window.rbi_tasksData.push(task);
                    _storage().put(_storage().stores().TASKS, task);
                    newTasksCount++;
                };

                var allMyChecks = _allInspections.filter(function(c){ return c.inspectorName === targetEngineer; });
                var pairMap = {};

                allMyChecks.forEach(function(c) {
                    if (c.templateKey === 'sys_etalon_act') return;
                    var key = c.projectName + '::' + c.contractorName + '::' + c.templateKey;
                    if (!pairMap[key]) {
                        pairMap[key] = { project: c.projectName, contractor: c.contractorName, templateKey: c.templateKey, templateTitle: c.templateTitle, checks: [], allTimeCount: 0, checksThisWeek: 0, lastCheckDate: new Date(0) };
                    }
                    pairMap[key].checks.push(c);
                    pairMap[key].allTimeCount++;
                    var cDate = new Date(c.date);
                    if (cDate > pairMap[key].lastCheckDate) pairMap[key].lastCheckDate = cDate;
                    if (cDate >= startOfThisWeek) pairMap[key].checksThisWeek++;
                });

                for (var pkey in pairMap) {
                    var pair = pairMap[pkey];

                    var hasEtalon = (typeof etalonActsArray !== 'undefined') && etalonActsArray.some(function(c){
                        return (c.inspectorName === targetEngineer || c.owner === targetEngineer) &&
                            c.contractorName === pair.contractor &&
                            c.templateKey === 'sys_etalon_act' &&
                            c.templateTitle === pair.templateTitle;
                    });

                    if (!hasEtalon) {
                        addTask('etalon', 'control', 'Эталон', 'Приемка Эталона', pair.templateTitle, pair.contractor, 'Отсутствует Акт-Эталон. Перед массовым контролям проведите совместную приемку эталонного узла.', 4, now, pair.templateKey, 'Эталон');
                    }

                    var m = pair.allTimeCount > 0 ? getContractorMetrics(pair.checks, _templates().getUserTemplates()) : null;
                    var targetCount = 1;
                    var promptText = "🟢 Плановый поддерживающий контроль (Зеленая зона). Подрядчик работает стабильно, достаточно 1 инспекции в неделю.";
                    var lvl = 1;
                    var deadlineDays = 7;

                    if (pair.allTimeCount < 7) {
                        targetCount = 7; deadlineDays = 14;
                        promptText = "🔵 Новый подрядчик (Сбор данных). В базе менее 7 проверок. Необходимо набрать базу для расчета достоверного рейтинга.";
                        lvl = 3;
                    } else if (m && (m.finalC < 70 || m.n_изделий_с_B3 > 0)) {
                        targetCount = 5; deadlineDays = 7;
                        promptText = "🔴 Подрядчик в красной зоне (или допустил дефект B3). Требуется усиленный контроль: минимум 5 проверок на этой неделе.";
                        lvl = 4;
                    } else if (m && m.finalC >= 70 && m.finalC <= 84) {
                        targetCount = 2; deadlineDays = 7;
                        promptText = "🟡 Подрядчик в желтой зоне (Системный брак). Необходимо провести 2 проверки контроля ранее выданных предписаний.";
                        lvl = 3;
                    }

                    var daysSinceLastCheck = pair.lastCheckDate.getTime() > 0 ? (now - pair.lastCheckDate) / (1000 * 60 * 60 * 24) : 0;
                    if (pair.allTimeCount >= 7 && daysSinceLastCheck > 14) {
                        promptText = '⚠️ ПОДРЯДЧИК ЗАБРОШЕН! Последняя проверка была ' + Math.floor(daysSinceLastCheck) + ' дней назад. Срочно проведите внеплановый аудит.';
                        lvl = 4;
                        targetCount = Math.max(targetCount, 2);
                        deadlineDays = 2;
                    }

                    var validChecksDone = 0;
                    if (targetCount >= 7) {
                        validChecksDone = pair.checks.filter(function(c){ return c.metrics && c.metrics.checkedCount >= 3; }).length;
                    } else {
                        validChecksDone = pair.checks.filter(function(c){ return c.metrics && c.metrics.checkedCount >= 3 && new Date(c.date) >= startOfThisWeek; }).length;
                    }

                    var deficit = targetCount - validChecksDone;
                    var activeAuditTask = window.rbi_tasksData.find(function(t){
                        return t.engineerName === targetEngineer && t.contractor === pair.contractor && t.templateKey === pair.templateKey && t.taskType === 'Аудит' && (t.status === 'pending' || t.status === 'paused');
                    });

                    if (deficit > 0 && !activeAuditTask && targetCount > 0) {
                        var taskDate = new Date(now); taskDate.setDate(now.getDate() + deadlineDays);
                        addTask('aud_multi', 'control', 'Контроль', 'Инспекция: ' + pair.contractor, pair.templateTitle, pair.contractor, promptText, lvl, taskDate, pair.templateKey, 'Аудит', targetCount);
                    } else if (deficit > 0 && activeAuditTask && activeAuditTask.target !== targetCount) {
                        activeAuditTask.target = targetCount;
                        _storage().put(_storage().stores().TASKS, activeAuditTask);
                    }

                    if (m) {
                        if (m.n_изделий_с_B3 > 2) addTask('def_meet', 'meeting', 'Совещание', 'Разбор критического брака', pair.templateTitle, pair.contractor, 'Зафиксировано ' + m.n_изделий_с_B3 + ' дефектов B3. Срочно соберите штаб.', 4, now, pair.templateKey, 'Совещание');
                        if (m.maxFailRate >= 20 && pair.allTimeCount >= 5) {
                            addTask('workshop', 'dev', 'Развитие', 'Воркшоп с бригадой', pair.templateTitle, pair.contractor, 'Системный брак B2 повторяется часто. Проведите обучение на объекте.', 3, now, pair.templateKey, 'Воркшоп');
                        }
                    }
                }

                if (targetEngineer === myName && typeof window.getMagicTwiCandidates === 'function') {
                    var magicCandidates = window.getMagicTwiCandidates();
                    if (magicCandidates.length > 0) {
                        var existingMagicTask = window.rbi_tasksData.find(function(t){ return t.engineerName === myName && t.taskType === 'Магия TWI' && t.status === 'pending'; });
                        if (existingMagicTask) {
                            existingMagicTask.target = existingMagicTask.done + magicCandidates.length;
                            _storage().put(_storage().stores().TASKS, existingMagicTask);
                        } else {
                            addTask('magic', 'method', 'Развитие', 'Создать карту TWI', 'База Знаний', 'Системная', 'Система нашла пару OK и FAIL. Подключите ИИ и закончите формирование карточки.', 3, now, '', 'Магия TWI', magicCandidates.length);
                        }
                    }
                }

                var getNextTargetDate = function(targetDayNumStr) {
                    var targetDay = parseInt(targetDayNumStr) === 0 ? 7 : parseInt(targetDayNumStr);
                    var d = new Date(now);
                    var currentDay = d.getDay() === 0 ? 7 : d.getDay();
                    var diff = targetDay - currentDay;
                    if (diff < 0) diff += 7;
                    d.setDate(d.getDate() + diff);
                    d.setHours(12, 0, 0, 0);
                    return d;
                };

                var fmeaDate = getNextTargetDate(_getSetting('taskFmeaDay') || '5');
                var recentFmeaChecks = _allInspections.filter(function(c){ return c.inspectorName === targetEngineer && new Date(c.date) >= startOfThisWeek; });
                var defectCounts = {};

                recentFmeaChecks.forEach(function(c) {
                    if (c.state) {
                        Object.keys(c.state).forEach(function(id) {
                            if (c.state[id] === 'fail' || c.state[id] === 'fail_escalated') {
                                var tType = c.templateKey ? c.templateKey.split('_')[0] : '';
                                var tKey = c.templateKey ? c.templateKey.replace(tType + '_', '') : '';
                                var cl = tType === 'sys' && typeof SYSTEM_TEMPLATES !== 'undefined' && SYSTEM_TEMPLATES[tKey] ? SYSTEM_TEMPLATES[tKey].groups : (_templates().getUserTemplates()[tKey] ? _templates().getUserTemplates()[tKey].groups : []);
                                var item = getFlatList(cl).find(function(x){ return String(x.id) === String(id); });
                                if (item && (item.w === 3 || item.w === 2 || c.state[id] === 'fail_escalated')) {
                                    var dKey = c.contractorName + '_' + item.n;
                                    defectCounts[dKey] = (defectCounts[dKey] || 0) + 1;
                                }
                            }
                        });
                    }
                });

                var needsFmea = false;
                for (var k in defectCounts) {
                    if (defectCounts[k] >= 3) {
                        var isAnalyzed = typeof window.rbi_fmeaRecords !== 'undefined' && window.rbi_fmeaRecords.some(function(f){ return f.author === targetEngineer && f.defects && f.defects.some(function(d){ return d.contractor + '_' + d.defectName === k; }); });
                        if (!isAnalyzed) { needsFmea = true; break; }
                    }
                }

                if (needsFmea) addTask('fmea_w', 'method', 'ППР', 'Заполнить FMEA таблицу', 'Аналитика', 'Системная', 'Накопились системные дефекты (>3 повторений), требующие анализа коренных причин.', 3, fmeaDate, '', 'Отчет');

                var posterDate = getNextTargetDate(_getSetting('taskFmeaDay') || '5');
                addTask('post_w', 'report', 'Отчет', 'Распечатать Плакат качества', 'Отчетность', 'Системная', 'Сформируйте плакат А3 и повесьте в штабе подрядчиков.', 2, posterDate, '', 'Отчет');

                var meetingDate = getNextTargetDate(_getSetting('taskMeetingDay') || '1');
                addTask('meet_w', 'meeting', 'Совещание', 'Еженедельный разбор качества', 'Коммуникация', 'Системная', 'Откройте вкладку Совещания. Система уже собрала повестку.', 4, meetingDate, '', 'Совещание');

                var reportDay = parseInt(_getSetting('taskMonthReportDay') || '1');
                var monthlyReportDate = new Date(now.getFullYear(), now.getMonth(), reportDay, 12, 0, 0, 0);
                if (now > monthlyReportDate) monthlyReportDate.setMonth(monthlyReportDate.getMonth() + 1);
                addTask('op_m', 'report', 'Отчет', 'Ежемесячный One-Pager', 'Отчетность', 'Системная', 'Отправьте руководителю выгрузку Сводного статуса.', 3, monthlyReportDate, '', 'Отчет');

                var skDay1 = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0, 0);
                var skDay2 = new Date(now.getFullYear(), now.getMonth(), 15, 12, 0, 0, 0);
                var nextSkDate = now < skDay1 ? skDay1 : (now < skDay2 ? skDay2 : new Date(now.getFullYear(), now.getMonth() + 1, 1, 12, 0, 0, 0));
                addTask('sk_imp', 'method', 'ППР', 'Загрузить выгрузку ПК СК', 'Аналитика СК', 'Системная', 'Регулярная сверка: скачайте свежий Excel из Стройконтроля и загрузите в систему.', 3, nextSkDate, '', 'Отчет');

                var daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                var qDayDate = new Date(now.getFullYear(), now.getMonth(), daysInMonth - 2, 12, 0, 0, 0);
                if (now > qDayDate) {
                    var daysInNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate();
                    qDayDate = new Date(now.getFullYear(), now.getMonth() + 1, daysInNextMonth - 2, 12, 0, 0, 0);
                }
                addTask('qd_m', 'report', 'Отчет', 'Отчет: День Качества', 'Аналитика', 'Системная', 'Приближается дата Дня Качества. Система сгенерирует мега-отчет за месяц.', 4, qDayDate, '', 'Отчет');
            }

            weeklyPlanData = { weekId: currentWeekId, tasks: window.rbi_tasksData, completed: false };
            if (typeof saveWeeklyPlan === 'function') saveWeeklyPlan();
            if (typeof gameUpdatePlanProgress === 'function') gameUpdatePlanProgress();

            if (newTasksCount > 0) _renderTasksList();

        } catch (err) {
            console.error("Ошибка при генерации плана:", err);
        } finally {
            window.isPlanGenerating = false;
        }
    }

    // =========================================================================
    // 3. UI РЕНДЕР: вкладка «Задачи»
    // =========================================================================

    async function _renderTasksList() {
        var container = document.getElementById('rbi-tasks-container');
        if (!container) return;

        var tasksTab = document.getElementById('eng-sub-tasks');
        if (tasksTab && tasksTab.classList.contains('hidden')) return;

        var activeTasks = window.rbi_tasksData;
        var currentRole = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
        var currentEng = (document.getElementById('inp-inspector') ? document.getElementById('inp-inspector').value.trim() : null) || 'Инженер';
        var assignedProjects = window.RbiRoles ? window.RbiRoles.getAssignedProjects() : [];

        if (['guest', 'contractor'].includes(currentRole)) {
            container.innerHTML = '<div class="text-center py-10 bg-[var(--card-bg)] rounded-xl border border-dashed border-[var(--card-border)] text-[var(--text-muted)] font-bold text-[11px] uppercase shadow-sm">План недоступен для вашей роли</div>';
            return;
        }

        if (window.RbiRoles && window.RbiRoles.isLeadership()) {
            if (currentRole === 'project_manager' && assignedProjects.length > 0) {
                activeTasks = activeTasks.filter(function(t){ return assignedProjects.includes(t.project_canonical_key || t.project); });
            }
        } else {
            activeTasks = activeTasks.filter(function(t){ return (t.engineerName || t.inspectorName) === currentEng || t.contractor === 'Системная'; });
        }

        if (window.selectedCalendarDate) {
            activeTasks = activeTasks.filter(function(t){ return t.date && t.date.split('T')[0] === window.selectedCalendarDate; });
        }

        var allEngsInTasks = Array.from(new Set(activeTasks.map(function(t){ return t.engineerName || t.inspectorName; }).filter(Boolean))).sort();
        var allProjs = Array.from(new Set(activeTasks.map(function(t){ return t.project_canonical_key || t.project || t.projectName; }).filter(Boolean))).sort();
        var allContrs = Array.from(new Set(activeTasks.map(function(t){ return t.contractor || t.contractorName; }).filter(Boolean))).sort();
        var allTypes = Array.from(new Set(activeTasks.map(function(t){ return t.taskType || t.category || t.icon; }).filter(Boolean))).sort();

        if (typeof window.taskEngineerFilter === 'undefined') window.taskEngineerFilter = 'ALL';
        window.taskTypeFilter = window.taskTypeFilter || 'ALL';
        window.taskStatusFilter = window.taskStatusFilter || 'ACTIVE';
        window.taskProjectFilter = window.taskProjectFilter || 'ALL';
        window.taskContractorFilter = window.taskContractorFilter || 'ALL';

        if (window.taskEngineerFilter !== 'ALL') activeTasks = activeTasks.filter(function(t){ return (t.engineerName || t.inspectorName) === window.taskEngineerFilter; });
        if (window.taskTypeFilter !== 'ALL') activeTasks = activeTasks.filter(function(t){ return (t.taskType || t.category || t.icon) === window.taskTypeFilter; });
        if (window.taskProjectFilter !== 'ALL') activeTasks = activeTasks.filter(function(t){ return (t.project_canonical_key || t.project || t.projectName || '') === window.taskProjectFilter; });
        if (window.taskContractorFilter !== 'ALL') activeTasks = activeTasks.filter(function(t){ return (t.contractor || t.contractorName || '') === window.taskContractorFilter; });

        if (window.taskStatusFilter !== 'ALL') {
            var todayStart = new Date(); todayStart.setHours(0,0,0,0);
            if (window.taskStatusFilter === 'DONE') activeTasks = activeTasks.filter(function(t){ return t.status === 'done'; });
            else if (window.taskStatusFilter === 'PENDING') activeTasks = activeTasks.filter(function(t){ return t.status === 'pending'; });
            else if (window.taskStatusFilter === 'OVERDUE') activeTasks = activeTasks.filter(function(t){ return t.status !== 'done' && t.date && new Date(t.date) < todayStart; });
        }

        activeTasks = activeTasks.slice().sort(function(a, b) {
            if (b.priorityLvl !== a.priorityLvl) return b.priorityLvl - a.priorityLvl;
            return new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
        });

        var managerFilterHtml = '\n        <div class="mb-4 bg-[var(--card-bg)] border border-[var(--card-border)] p-3 rounded-xl shadow-sm flex flex-col gap-2">\n            <div class="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest flex items-center gap-1.5">\n                <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg> \n                ' + (window.RbiRoles && window.RbiRoles.isLeadership() ? 'Панель Руководителя (Фильтры)' : 'Мои Фильтры Задач') + '\n            </div>\n            <div class="grid grid-cols-2 gap-2">\n                ' + (window.RbiRoles && window.RbiRoles.isLeadership() ? '<select class="input-base !py-1.5 text-[10px] font-bold bg-[var(--hover-bg)]" onchange="window.taskEngineerFilter = this.value; rbi_renderTasksList()"><option value="ALL" ' + (window.taskEngineerFilter === 'ALL' ? 'selected' : '') + '>👤 Все инженеры</option>' + allEngsInTasks.map(function(e){ return '<option value="' + e.replace(/"/g, '&quot;') + '" ' + (window.taskEngineerFilter === e ? 'selected' : '') + '>' + e + '</option>'; }).join('') + '</select>' : '') + '\n                <select class="input-base !py-1.5 text-[10px] font-bold bg-[var(--hover-bg)]" onchange="window.taskTypeFilter = this.value; rbi_renderTasksList()"><option value="ALL" ' + (window.taskTypeFilter === 'ALL' ? 'selected' : '') + '>📋 Все типы</option>' + allTypes.map(function(t){ return '<option value="' + t.replace(/"/g, '&quot;') + '" ' + (window.taskTypeFilter === t ? 'selected' : '') + '>' + t + '</option>'; }).join('') + '</select>\n                <select class="input-base !py-1.5 text-[10px] font-bold bg-[var(--hover-bg)]" onchange="window.taskStatusFilter = this.value; rbi_renderTasksList()"><option value="ALL" ' + (window.taskStatusFilter === 'ALL' ? 'selected' : '') + '>📌 Все статусы</option><option value="ACTIVE" ' + (window.taskStatusFilter === 'ACTIVE' ? 'selected' : '') + '>🕒 В работе</option><option value="OVERDUE" ' + (window.taskStatusFilter === 'OVERDUE' ? 'selected' : '') + '>🚨 Просрочка</option><option value="DONE" ' + (window.taskStatusFilter === 'DONE' ? 'selected' : '') + '>✅ Выполнено</option></select>\n                <select class="input-base !py-1.5 text-[10px] font-bold bg-[var(--hover-bg)]" onchange="window.taskProjectFilter = this.value; rbi_renderTasksList()"><option value="ALL" ' + (window.taskProjectFilter === 'ALL' ? 'selected' : '') + '>🏢 Все объекты</option>' + allProjs.map(function(p){ return '<option value="' + p.replace(/"/g, '&quot;') + '" ' + (window.taskProjectFilter === p ? 'selected' : '') + '>' + p + '</option>'; }).join('') + '</select>\n                <select class="input-base !py-1.5 text-[10px] font-bold bg-[var(--hover-bg)]" onchange="window.taskContractorFilter = this.value; rbi_renderTasksList()"><option value="ALL" ' + (window.taskContractorFilter === 'ALL' ? 'selected' : '') + '>👷 Все подрядчики</option>' + allContrs.map(function(c){ return '<option value="' + c.replace(/"/g, '&quot;') + '" ' + (window.taskContractorFilter === c ? 'selected' : '') + '>' + c + '</option>'; }).join('') + '</select>\n            </div>\n        </div>\n    ';

        var today = new Date(); today.setHours(0, 0, 0, 0);
        var startW = getStartOfWeek(today);
        var endW = new Date(startW); endW.setDate(startW.getDate() + 6); endW.setHours(23, 59, 59, 999);

        var weekNumEl = document.getElementById('rbi-week-number');
        var weekDatesEl = document.getElementById('rbi-week-dates');
        if (weekNumEl) weekNumEl.innerText = getWeekNumber(today);
        if (weekDatesEl) weekDatesEl.innerText = startW.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + ' — ' + endW.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });

        var globalActionsHtml = '\n        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">\n            <button onclick="gameForceUpdatePlan()" class="bg-indigo-50 text-indigo-700 border border-indigo-200 py-3 rounded-xl font-bold text-[10px] uppercase active:scale-95 shadow-sm flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Синхронизировать</button>\n            <button onclick="rbi_openTaskModal()" class="bg-indigo-50 text-indigo-700 border border-indigo-200 py-3 rounded-xl font-bold text-[10px] uppercase active:scale-95 shadow-sm flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"></path></svg> Новое поручение</button>\n            <button onclick="rbi_openCalendarModal()" class="bg-indigo-50 text-indigo-700 border border-indigo-200 py-3 rounded-xl font-bold text-[10px] uppercase active:scale-95 shadow-sm flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> Календарь</button>\n            <button onclick="gameToggleAbsence()" class="bg-slate-50 text-slate-700 border border-slate-200 py-3 rounded-xl font-bold text-[10px] uppercase active:scale-95 shadow-sm flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> Статус / Отпуск</button>\n        </div>\n    ';

        if (typeof engineerAbsence !== 'undefined' && engineerAbsence.isActive) {
            container.innerHTML = globalActionsHtml + '<div class="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-600 shadow-sm"><div class="font-black uppercase mb-1 text-lg flex items-center justify-center gap-2"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"></path></svg> Режим: ' + engineerAbsence.reason + '</div>Инспекции приостановлены.</div>';
            return;
        }

        var overdue = [], todayTasks = [], weekTasks = [], monthTasks = [], archiveTasks = [];
        var weekTotal = 0, weekDone = 0;
        window.rbiCalendarDates = {};

        activeTasks.forEach(function(t) {
            if (t.status === 'done' || t.status === 'blocked') {
                archiveTasks.push(t);
                var tDt = t.date ? new Date(t.date) : new Date(); tDt.setHours(0,0,0,0);
                if (t.status === 'done' && tDt.getTime() >= startW.getTime() && tDt.getTime() <= endW.getTime()) { weekTotal++; weekDone++; }
                return;
            }
            if (t.status === 'paused') { monthTasks.push(t); weekTotal++; return; }
            if (t.type === 'manual' && t.urgency) {
                if (t.urgency === 'planned') { weekTasks.push(t); weekTotal++; return; }
                else if (t.urgency === 'future') { monthTasks.push(t); weekTotal++; return; }
            }
            if (!t.date) { weekTasks.push(t); weekTotal++; return; }
            var tDt2 = new Date(t.date); tDt2.setHours(0,0,0,0);
            if (tDt2.getTime() < today.getTime()) { overdue.push(t); weekTotal++; }
            else if (tDt2.getTime() === today.getTime()) { todayTasks.push(t); weekTotal++; }
            else if (tDt2.getTime() > today.getTime() && tDt2.getTime() <= endW.getTime()) { weekTasks.push(t); weekTotal++; }
            else if (tDt2.getTime() > endW.getTime()) { monthTasks.push(t); weekTotal++; }
        });

        var progText = document.getElementById('rbi-tasks-progress-text');
        var progBar = document.getElementById('rbi-tasks-progress-bar');
        if (progText) progText.innerText = weekDone + '/' + weekTotal;
        if (progBar) progBar.style.width = weekTotal > 0 ? ((weekDone / weekTotal) * 100) + '%' : '0%';

        var renderCard = function(t, isOverdue, isArchive) {
            if (typeof isArchive === 'undefined') isArchive = false;
            var itemCategory = t.taskType === 'Эталон' ? 'etalon' : (t.category || 'other');
            var icon = t.icon ? (RBI_TASK_ICONS[t.icon] || RBI_TASK_ICONS['Контроль']) : RBI_TASK_ICONS['Контроль'];
            var dateStr = t.date ? new Date(t.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : 'Без даты';
            var borderClass = isOverdue ? 'border-red-300 dark:border-red-800' : 'border-[var(--card-border)]';
            var bgClass = isOverdue && !isArchive ? 'bg-red-50/30 dark:bg-red-900/10' : 'bg-[var(--card-bg)]';
            var opacityClass = isArchive ? 'opacity-60 grayscale' : '';
            var priorityColor = 'text-green-600 bg-green-50 border-green-200', priorityText = 'Низкий';
            if (t.priorityLvl === 4) { priorityColor = 'text-red-600 bg-red-50 border-red-200'; priorityText = 'Крит.'; }
            if (t.priorityLvl === 3) { priorityColor = 'text-orange-600 bg-orange-50 border-orange-200'; priorityText = 'Средн.'; }
            var progressHtml = '';
            if (t.target > 1) {
                var isDone = t.done >= t.target;
                progressHtml = '<div class="text-[9px] font-black ' + (isDone ? 'text-green-600' : 'text-indigo-600') + ' bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded shadow-sm border border-slate-200 dark:border-slate-700">' + t.done + ' / ' + t.target + '</div>';
            }
            var assigneeBadge = '';
            if (t.engineerName && t.engineerName !== currentEng && t.engineerName !== 'Система' && t.contractor !== 'Системная') {
                assigneeBadge = '<div class="text-[8px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 uppercase font-black tracking-widest mt-1 w-fit flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg> ' + t.engineerName.split(' ')[0] + '</div>';
            }
            var debtBadge = '';
            if (t.carryOverCount && t.carryOverCount > 0 && !isArchive) {
                debtBadge = '<div class="absolute -top-2 -right-2 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-md uppercase tracking-widest animate-pulse border border-white dark:border-slate-800">Долг: ' + t.carryOverCount + ' нед.</div>';
            }
            return '\n        <div data-category="' + itemCategory + '" onclick="rbi_openTaskAction(\'' + t.id + '\')" class="task-card-item cursor-pointer w-full ' + bgClass + ' border ' + borderClass + ' rounded-2xl p-3 flex flex-col justify-between relative shadow-sm transition-transform active:scale-[0.98] hover:border-indigo-300 dark:hover:border-indigo-600 ' + opacityClass + '">\n            ' + debtBadge + '\n            <div>\n                <div class="flex items-start justify-between gap-3 mb-2">\n                    <div class="w-8 h-8 rounded-lg bg-[var(--hover-bg)] text-slate-500 flex items-center justify-center border border-[var(--card-border)] shrink-0">' + icon + '</div>\n                    <div class="flex-1 min-w-0">\n                        <div class="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-0.5">' + (t.taskType || t.title) + '</div>\n                        <div class="text-[13px] font-black text-slate-800 dark:text-white leading-tight truncate">' + t.contractor + '</div>\n                        <div class="text-[10px] font-bold text-[var(--text-muted)] truncate">' + (t.workTitle || t.templateTitle || '') + '</div>\n                    </div>\n                </div>\n                <div class="text-[10px] text-slate-600 dark:text-slate-400 leading-snug line-clamp-3 font-medium mb-1">' + t.prompt + '</div>\n                ' + assigneeBadge + '\n            </div>\n            <div class="mt-3 pt-2 border-t border-[var(--card-border)] flex justify-between items-center">\n                <div class="flex items-center gap-1.5">\n                    <span class="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ' + priorityColor + '">' + priorityText + '</span>\n                    ' + progressHtml + '\n                </div>\n                <div class="text-[9px] font-bold ' + (isOverdue && !isArchive ? 'text-red-500' : 'text-slate-400') + '">' + (isOverdue && !isArchive ? 'Просрочено: ' : 'До: ') + dateStr + '</div>\n            </div>\n        </div>';
        };

        var filterHtml = '\n        <div class="flex gap-1.5 mb-4 pb-1 overflow-x-auto no-scrollbar" id="hub-filters">\n            <button onclick="rbi_filterTaskHub(\'all\', this)" class="hub-filter-btn px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-sm transition-colors shrink-0">Все</button>\n            <button onclick="rbi_filterTaskHub(\'control\', this)" class="hub-filter-btn px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shrink-0">Аудиты</button>\n            <button onclick="rbi_filterTaskHub(\'etalon\', this)" class="hub-filter-btn px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shrink-0">Эталоны</button>\n            <button onclick="rbi_filterTaskHub(\'meeting\', this)" class="hub-filter-btn px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shrink-0">Планерки</button>\n            <button onclick="rbi_filterTaskHub(\'report\', this)" class="hub-filter-btn px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shrink-0">Отчеты / FMEA</button>\n            <button onclick="rbi_filterTaskHub(\'method\', this)" class="hub-filter-btn px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shrink-0">ППР / TWI</button>\n            <button onclick="rbi_filterTaskHub(\'dev\', this)" class="hub-filter-btn px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shrink-0">Обучение</button>\n            <button onclick="rbi_filterTaskHub(\'other\', this)" class="hub-filter-btn px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shrink-0">Ручные</button>\n        </div>\n    ';

        var accordionsHtml = '';
        var gridClass = "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 pb-2";

        var activeToday = overdue.map(function(t){ return renderCard(t, true); }).concat(todayTasks.map(function(t){ return renderCard(t, false); }));

        if (activeToday.length > 0) accordionsHtml += '<details class="mb-4 group [&_summary::-webkit-details-marker]:hidden" open><summary class="cursor-pointer flex justify-between items-center mb-3 select-none border-b border-[var(--card-border)] pb-2"><span class="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-1.5"><svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Сегодня (' + activeToday.length + ')</span><span class="text-slate-400 transition-transform duration-300 group-open:rotate-180"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg></span></summary><div class="' + gridClass + '">' + activeToday.join('') + '</div></details>';

        if (weekTasks.length > 0) accordionsHtml += '<details class="mb-4 group [&_summary::-webkit-details-marker]:hidden" open><summary class="cursor-pointer flex justify-between items-center mb-3 select-none border-b border-[var(--card-border)] pb-2"><span class="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest flex items-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> Плановые задачи (' + weekTasks.length + ')</span><span class="text-slate-400 transition-transform duration-300 group-open:rotate-180"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg></span></summary><div class="' + gridClass + '">' + weekTasks.map(function(t){ return renderCard(t, false); }).join('') + '</div></details>';

        if (monthTasks.length > 0) accordionsHtml += '<details class="mb-4 group [&_summary::-webkit-details-marker]:hidden"><summary class="cursor-pointer flex justify-between items-center mb-3 select-none border-b border-[var(--card-border)] pb-2"><span class="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"></path></svg> Будущие задачи (' + monthTasks.length + ')</span><span class="text-slate-400 transition-transform duration-300 group-open:rotate-180"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg></span></summary><div class="' + gridClass + '">' + monthTasks.map(function(t){ return renderCard(t, false); }).join('') + '</div></details>';

        if (archiveTasks.length > 0) {
            var recentArchive = archiveTasks.slice().sort(function(a, b){ return new Date(b.updatedAt || b.date) - new Date(a.updatedAt || a.date); }).slice(0, 15);
            accordionsHtml += '<details class="mb-4 group [&_summary::-webkit-details-marker]:hidden"><summary class="cursor-pointer flex justify-between items-center mb-3 select-none border-b border-[var(--card-border)] pb-2"><span class="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg> Архив: Недавно завершенные (' + archiveTasks.length + ')</span><span class="text-slate-400 transition-transform duration-300 group-open:rotate-180"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg></span></summary><div class="' + gridClass + '">' + recentArchive.map(function(t){ return renderCard(t, false, true); }).join('') + '</div></details>';
        }

        if (activeToday.length === 0 && weekTasks.length === 0 && monthTasks.length === 0 && archiveTasks.length === 0) {
            container.innerHTML = globalActionsHtml + managerFilterHtml + filterHtml + '<div class="bg-[var(--card-bg)] border border-dashed border-[var(--card-border)] rounded-2xl p-8 text-center shadow-sm mt-4"><div class="text-[14px] font-black text-slate-400 uppercase tracking-wider mb-2">План чист</div><div class="text-[11px] text-slate-500 font-medium">Нет задач по выбранным фильтрам.</div></div>';
            return;
        }

        container.innerHTML = globalActionsHtml + managerFilterHtml + filterHtml + accordionsHtml;
    }

    // =========================================================================
    // 4. ФИЛЬТР ХАБ
    // =========================================================================

    function _filterTaskHub(category, btnElement) {
        var container = document.getElementById('hub-filters');
        if (container) {
            container.querySelectorAll('.hub-filter-btn').forEach(function(btn) {
                btn.className = "hub-filter-btn px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 transition-colors shrink-0";
            });
        }
        if (btnElement) {
            btnElement.className = "hub-filter-btn px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-sm transition-colors shrink-0";
        }
        var cards = document.querySelectorAll('.task-card-item');
        cards.forEach(function(card) {
            if (category === 'all' || card.dataset.category === category) card.style.display = 'flex';
            else card.style.display = 'none';
        });
    }

    // =========================================================================
    // 5. ДЕТАЛИЗАЦИЯ И УПРАВЛЕНИЕ СТАТУСАМИ
    // =========================================================================

    async function _openTaskAction(taskId) {
        var task = window.rbi_tasksData.find(function(t){ return t.id === taskId; });
        if (!task) return;

        currentTaskContext = task;
        document.getElementById('task-details-header-title').innerHTML = '\n        <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 012-2h2a2 2 0 012 2"></path></svg>\n        Детали Задачи\n    ';

        var body = document.getElementById('task-details-body');
        var footer = document.getElementById('task-details-footer');

        var logicTitle = "", logicColor = "", logicDesc = "";
        if (task.taskType === 'Эталон') {
            logicTitle = "Новый вид работ / Подрядчик"; logicColor = "text-blue-600 bg-blue-50 border-blue-200";
            logicDesc = "Перед началом массового контроля требуется провести совместную приемку и зафиксировать эталонный образец работ.";
        } else if (task.priorityLvl === 4) {
            logicTitle = "Красная зона (Высокий риск)"; logicColor = "text-red-600 bg-red-50 border-red-200";
            logicDesc = "Подрядчик допускает много брака или недавно совершил критический дефект (B3). Требуется жесткий контроль и остановка приемки.";
        } else if (task.priorityLvl === 3 && task.taskType === 'Аудит') {
            logicTitle = "Сбор данных (Новичок)"; logicColor = "text-indigo-600 bg-indigo-50 border-indigo-200";
            logicDesc = "В базе менее 7 проверок по этому подрядчику. Необходимо набрать базу для расчета достоверного рейтинга надежности.";
        } else if (task.priorityLvl === 2) {
            logicTitle = "Желтая зона (Нестабильно)"; logicColor = "text-orange-600 bg-orange-50 border-orange-200";
            logicDesc = "Выявлен систематический брак категории B2. Качество нестабильно. Требуется усиление операционного контроля.";
        } else if (task.priorityLvl === 1) {
            logicTitle = "Зеленая зона (Стабильно)"; logicColor = "text-green-600 bg-green-50 border-green-200";
            logicDesc = "Высокое качество работ (УрК > 85%). Назначен плановый профилактический осмотр.";
        } else {
            logicTitle = "Системная задача"; logicColor = "text-slate-600 bg-slate-100 border-slate-300";
            logicDesc = "Регламентное мероприятие (Отчетность, Совещание, База Знаний).";
        }

        var safeContractor  = (task.contractor || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        var safeStatusKeyForHtml = (task.statusKey || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        var safeProject     = (task.project || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        var safeWorkTitle   = (task.workTitle || task.templateTitle || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

        body.innerHTML = '\n        <div class="mb-4">\n            <div class="text-[16px] font-black text-slate-800 dark:text-white leading-tight mb-1">' + (task.contractor || 'Без подрядчика') + '</div>\n            <div class="text-[11px] font-bold text-slate-500 uppercase tracking-widest">' + (task.templateTitle || task.workTitle || task.taskType || 'Поручение') + '</div>\n        </div>\n        <div class="bg-[var(--hover-bg)] border border-[var(--card-border)] rounded-2xl p-4 mb-4 shadow-sm">\n            <div class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-1.5"><svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Суть задачи</div>\n            <div class="text-[12px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed">' + (task.prompt || 'Описание отсутствует') + '</div>\n        </div>\n        <div class="flex gap-2 mb-4">\n            <div class="flex-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 shadow-sm text-center">\n                <div class="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Прогресс</div>\n                <div class="text-[16px] font-black text-slate-800 dark:text-white"><span class="' + ((task.done || 0) >= (task.target || 1) ? 'text-green-500' : 'text-indigo-600') + '">' + (task.done || 0) + '</span> из ' + (task.target || 1) + '</div>\n            </div>\n            <div class="flex-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 shadow-sm text-center">\n                <div class="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Дедлайн</div>\n                <div class="text-[16px] font-black ' + (new Date(task.date) < new Date() && task.status !== 'done' ? 'text-red-500' : 'text-slate-800 dark:text-white') + '">' + (task.date ? new Date(task.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : 'Без срока') + '</div>\n            </div>\n        </div>\n        ' + (task.type === 'manual' ? '' : '<div class="border border-[var(--card-border)] bg-[var(--card-bg)] rounded-2xl p-4 mb-2 shadow-sm"><div class="text-[10px] font-black px-2 py-1 rounded border uppercase w-fit mb-2 ' + logicColor + '">' + logicTitle + '</div><div class="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">' + logicDesc + '</div></div>') + '\n    ';

        var actionButtonsHtml = '';

        if (task.status !== 'pending') {
            var historyHtml = task.history ? '<div class="text-[10px] text-slate-500 mt-2 text-left bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 max-h-24 overflow-y-auto font-medium">' + task.history.join('<br>') + '</div>' : '';
            actionButtonsHtml = '\n            <div class="text-[11px] text-slate-600 dark:text-slate-300 font-bold mb-2 text-center w-full uppercase tracking-widest">Статус: <span class="' + (task.status === 'done' ? 'text-green-600' : 'text-orange-500') + '">' + task.status + '</span></div>\n            <div class="text-[10px] text-slate-500 text-center mb-3">' + (task.resultComment || '') + '</div>\n            ' + historyHtml + '\n            <button onclick="rbi_resumeTask(\'' + task.id + '\')" class="w-full mt-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-transform border border-slate-300 dark:border-slate-600 shadow-sm flex justify-center items-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Возобновить задачу</button>\n        ';
        } else {
            if (task.type === 'manual') {
                var photoPreviewHtml = task.completionPhoto
                    ? '<div class="mt-2 relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 shadow-sm"><img src="' + window.getPhotoSrc(task.completionPhoto) + '" class="w-full h-full object-cover"></div>'
                    : '<div id="task-photo-preview" class="hidden mt-2 relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 shadow-sm" data-photo=""></div>';
                actionButtonsHtml += '\n                <div class="mb-3"><button onclick="document.getElementById(\'task-photo-upload\').click(); window.currentTaskPhotoId=\'' + task.id + '\';" class="w-full bg-indigo-50 dark:bg-slate-800 border border-dashed border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 py-3 rounded-xl font-bold text-[10px] uppercase shadow-sm active:scale-95 flex items-center justify-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg> Прикрепить фото (Опционально)</button>' + photoPreviewHtml + '</div>\n                <button onclick="rbi_markTaskDone(\'' + task.id + '\');" class="w-full bg-green-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2 mb-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg> Отметить выполненной</button>';
            } else if (task.taskType === 'ППР') {
                actionButtonsHtml += '<div class="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 p-3 rounded-xl mb-3 text-center"><div class="text-[10px] font-black text-blue-700 uppercase mb-2">Проверка нормативной базы</div><button onclick="document.getElementById(\'task-details-modal\').style.display=\'none\'; document.body.classList.remove(\'modal-open\'); rbi_markTaskDone(\'' + task.id + '\', true); switchTab(\'tab-reference\'); setTimeout(() => { const btns = document.querySelectorAll(\'.sub-tab-btn\'); if (btns[1]) switchReferenceSubTab(\'ref-sub-docs\', btns[1]); const s = document.getElementById(\'doc-search-input\'); if(s) {s.value=\'' + safeWorkTitle + '\'; renderDocsList();} }, 300);" class="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg> Открыть базу НД</button></div>';
            } else if (task.taskType === 'Инструктаж') {
                actionButtonsHtml += '<div class="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 p-3 rounded-xl mb-3"><div class="flex justify-between items-center mb-2"><div class="text-[10px] font-black text-blue-700 uppercase">Подготовка материалов</div><button onclick="rbi_generateIntroBriefing(\'' + task.id + '\')" id="btn-gen-intro" class="bg-blue-600 text-white px-3 py-1.5 rounded text-[9px] font-black uppercase active:scale-95 shadow-sm flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Собрать базу (AI)</button></div><div id="intro-result-box" class="hidden"><div class="text-[10px] text-blue-800 dark:text-blue-300 mb-2 font-medium">Система сформировала речь, собрала допуски и подтянула TWI-карты.</div><div class="flex gap-2 mb-2"><button onclick="rbi_printIntroBriefing(\'' + task.id + '\')" class="w-1/2 bg-white text-blue-700 border border-blue-200 py-3 rounded-xl text-[10px] font-black uppercase active:scale-95 shadow-sm flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg> В PDF</button><button onclick="rbi_markTaskDone(\'' + task.id + '\');" class="w-1/2 bg-blue-600 text-white py-3 rounded-xl text-[10px] font-black uppercase active:scale-95 shadow-md flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg> Проведено</button></div></div></div>';
            } else if (task.taskType === 'Финал') {
                actionButtonsHtml += '<div class="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 p-3 rounded-xl mb-3"><div class="flex justify-between items-center mb-2"><div class="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">Справка для КС-2</div><button onclick="rbi_generateFinalAcceptance(\'' + task.id + '\')" id="btn-gen-final" class="bg-slate-700 text-white px-3 py-1.5 rounded text-[9px] font-black uppercase active:scale-95 shadow-sm flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Анализ (AI)</button></div><div id="final-result-box" class="hidden"><textarea id="final-ai-text" class="w-full h-40 text-[11px] p-2 rounded-lg border border-slate-300 dark:border-slate-600 resize-none outline-none leading-relaxed text-slate-800 dark:text-white bg-white dark:bg-slate-900 shadow-inner mb-2" placeholder="Здесь будет справка..."></textarea><div class="flex gap-2"><button onclick="rbi_printFinalAcceptance(\'' + task.id + '\')" class="w-1/2 bg-white dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-500 py-3 rounded-xl text-[10px] font-black uppercase active:scale-95 shadow-sm flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg> Скачать</button><button onclick="rbi_saveFinalAndClose(\'' + task.id + '\')" class="w-1/2 bg-slate-800 text-white py-3 rounded-xl text-[10px] font-black uppercase active:scale-95 shadow-md flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg> Сохранить</button></div></div></div>';
            } else if (task.taskType === 'Воркшоп') {
                actionButtonsHtml += '<div class="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 p-3 rounded-xl mb-3"><div class="flex justify-between items-center mb-2"><div class="text-[10px] font-black text-purple-700 uppercase">AI-Сценарий Воркшопа</div><button onclick="rbi_generateWorkshop(\'' + task.id + '\')" id="btn-gen-workshop" class="bg-purple-600 text-white px-3 py-1.5 rounded text-[9px] font-black uppercase active:scale-95 shadow-sm flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Сгенерировать</button></div><textarea id="workshop-ai-scenario" class="hidden w-full min-h-[200px] max-h-[50vh] overflow-y-auto custom-scrollbar text-[11px] p-2 rounded-lg border border-purple-200 resize-none outline-none leading-relaxed text-slate-800 dark:text-white bg-white dark:bg-slate-800 shadow-inner mb-2" placeholder="..."></textarea><div id="workshop-actions" class="hidden"><div class="mb-3"><button onclick="document.getElementById(\'task-photo-upload\').click(); window.currentTaskPhotoId=\'' + task.id + '\';" class="w-full bg-white dark:bg-slate-800 border border-dashed border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-400 py-3 rounded-xl font-bold text-[10px] uppercase shadow-sm active:scale-95 flex items-center justify-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg> Добавить фото (для отчета)</button><div id="task-photo-preview" class="hidden mt-2 relative w-full h-24 rounded-xl overflow-hidden border border-slate-200 shadow-sm" data-photo=""></div></div><div class="flex gap-2"><button onclick="rbi_printWorkshop(\'' + task.id + '\', \'script\')" class="w-1/2 bg-white text-purple-700 border border-purple-200 py-3.5 rounded-xl text-[11px] font-black uppercase active:scale-95 shadow-sm flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> PDF</button><button onclick="rbi_printWorkshop(\'' + task.id + '\', \'browser\')" class="w-1/2 bg-white text-purple-700 border border-purple-200 py-3.5 rounded-xl text-[11px] font-black uppercase active:scale-95 shadow-sm flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg> Печать</button><button onclick="rbi_finishWorkshop(\'' + task.id + '\')" class="w-full bg-purple-600 text-white py-3.5 rounded-xl text-[11px] font-black uppercase active:scale-95 shadow-md flex items-center justify-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg> Завершить</button></div></div></div>';
            } else if (task.taskType === 'Эталон') {
                actionButtonsHtml += '<button onclick="document.getElementById(\'task-details-modal\').style.display=\'none\'; document.body.classList.remove(\'modal-open\'); window.activeTaskId = \'' + task.id + '\'; openEtalonConstructor(\'' + safeContractor + '\', \'' + task.templateKey + '\', \'' + safeWorkTitle + '\', \'' + safeProject + '\', \'' + safeStatusKeyForHtml + '\');" class="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg> Снять Эталон</button>';
            } else if (task.taskType === 'Совещание' || task.title.includes('Еженедельный разбор')) {
                actionButtonsHtml += '<button onclick="document.getElementById(\'task-details-modal\').style.display=\'none\'; document.body.classList.remove(\'modal-open\'); window.activeTaskId = \'' + task.id + '\'; rbi_openReportSettingsModal(\'full_report\', \'browser\', \'' + task.id + '\', false);" class="w-full bg-blue-50 text-blue-700 border border-blue-200 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-sm active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg> 1. Подготовить отчет (PDF)</button><button onclick="document.getElementById(\'task-details-modal\').style.display=\'none\'; document.body.classList.remove(\'modal-open\'); window.activeTaskId = \'' + task.id + '\'; rbi_openMeetingSetupModal(\'' + task.id + '\');" class="w-full bg-orange-500 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg> 2. Открыть Протокол (Мемо)</button><div class="text-[9px] text-slate-500 text-center mb-2 leading-tight">Сначала скачайте отчет, затем проведите встречу и зафиксируйте протокол.</div>';
            } else if (task.title.includes('Разбор критического брака')) {
                actionButtonsHtml += '<button onclick="document.getElementById(\'task-details-modal\').style.display=\'none\'; document.body.classList.remove(\'modal-open\'); window.activeTaskId = \'' + task.id + '\'; rbi_createMeeting([{contractorName: \'' + safeContractor + '\'}]);" class="w-full bg-red-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> Открыть Протокол (Мемо)</button><div class="text-[9px] text-slate-500 text-center mb-2 leading-tight">Откроется протокол только по этому подрядчику.</div>';
            } else if (task.taskType === 'Аналитика СК') {
                actionButtonsHtml += '<button onclick="document.getElementById(\'task-details-modal\').style.display=\'none\'; document.body.classList.remove(\'modal-open\'); window.activeTaskId = \'' + task.id + '\'; rbi_createMeeting();" class="w-full bg-orange-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> Провести разбор (Протокол)</button>';
            } else if (task.taskType === 'Отчет' && task.title.includes('День Качества')) {
                actionButtonsHtml += '<button onclick="document.getElementById(\'task-details-modal\').style.display=\'none\'; document.body.classList.remove(\'modal-open\'); rbi_openQualityDaySettings(\'' + task.id + '\');" class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Собрать Отчет (AI)</button>';
            } else if (task.taskType === 'Отчет' && task.title.includes('Плакат')) {
                actionButtonsHtml += '<button onclick="document.getElementById(\'task-details-modal\').style.display=\'none\'; document.body.classList.remove(\'modal-open\'); window.activeTaskId = \'' + task.id + '\'; rbi_openReportSettingsModal(\'poster\', \'browser\', \'' + task.id + '\', true);" class="w-full bg-orange-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg> Сгенерировать Плакат</button>';
            } else if (task.taskType === 'Отчет' && task.title.includes('One-Pager')) {
                actionButtonsHtml += '<button onclick="document.getElementById(\'task-details-modal\').style.display=\'none\'; document.body.classList.remove(\'modal-open\'); window.activeTaskId = \'' + task.id + '\'; rbi_openReportSettingsModal(\'global_onepager\', \'script\', \'' + task.id + '\', true);" class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Скачать One-Pager</button>';
            } else if (task.taskType === 'Отчет' && task.title.includes('Загрузить выгрузку')) {
                actionButtonsHtml += '<div class="bg-blue-50 border border-blue-200 p-3 rounded-xl mb-3 text-center"><div class="text-[10px] font-black text-blue-700 uppercase mb-2">Сверка с базой</div><button onclick="document.getElementById(\'task-details-modal\').style.display=\'none\'; document.body.classList.remove(\'modal-open\'); switchTab(\'tab-analytics\'); setTimeout(() => { const btns = document.querySelectorAll(\'#analytics-subtabs-block .sub-tab-btn\'); if (btns[3]) switchAnalyticsSubTab(\'sub-sk\', btns[3]); }, 300);" class="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Открыть модуль ПК СК</button><div class="text-[9px] text-slate-500 mt-2">Задача закроется автоматически при импорте файла.</div></div>';
            } else if (task.taskType === 'Отчет' && task.title.includes('FMEA')) {
                actionButtonsHtml += '<button onclick="document.getElementById(\'task-details-modal\').style.display=\'none\'; document.body.classList.remove(\'modal-open\'); switchTab(\'tab-engineer\'); setTimeout(() => { const btns = document.querySelectorAll(\'#engineer-subtabs-block .sub-tab-btn\'); if (btns[4]) rbi_switchEngineerSubTab(\'eng-sub-fmea\', btns[4]); }, 300);" class="w-full bg-slate-700 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg> Перейти к FMEA</button>';
            } else if (task.taskType === 'Аудит' || task.taskType === 'Плановая' || task.taskType === 'Старт') {
                actionButtonsHtml += '<button onclick="document.getElementById(\'task-details-modal\').style.display=\'none\'; document.body.classList.remove(\'modal-open\'); window.activeTaskId = \'' + task.id + '\'; startInspectionWithValues(\'' + safeContractor + '\', \'' + task.templateKey + '\', null, \'' + safeProject + '\');" class="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"></path></svg> Провести аудит</button>';
            } else if (task.taskType === 'Магия TWI') {
                actionButtonsHtml += '<button onclick="document.getElementById(\'task-details-modal\').style.display=\'none\'; document.body.classList.remove(\'modal-open\'); switchTab(\'tab-reference\'); setTimeout(() => { const btns = document.querySelectorAll(\'#reference-subtabs-block .sub-tab-btn\'); if (btns[2]) switchReferenceSubTab(\'ref-sub-twi\', btns[2]); const magicBlock = document.getElementById(\'twi-magic-block\'); if(magicBlock) magicBlock.classList.remove(\'magic-collapsed\'); }, 300);" class="w-full bg-purple-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 mb-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Сделать сейчас</button>';
            } else {
                actionButtonsHtml += '<button onclick="rbi_markTaskDone(\'' + task.id + '\');" class="w-full bg-green-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase tracking-widest shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2 mb-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg> Отметить выполненной</button>';
            }

            var postponeCountHtml = task.postponeCount > 0 ? '<span class="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-black">' + task.postponeCount + '</span>' : '';
            actionButtonsHtml += '\n            <div class="grid grid-cols-3 gap-2 w-full mt-2 pt-2 border-t border-[var(--card-border)]">\n                <button onclick="rbi_postponeTask(\'' + task.id + '\')" class="relative flex flex-col justify-center items-center p-2 rounded-xl bg-[var(--card-bg)] text-slate-600 dark:text-slate-300 font-bold text-[9px] uppercase active:scale-95 border border-[var(--card-border)] hover:bg-[var(--hover-bg)] transition-colors"><svg class="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg> Сдвинуть' + postponeCountHtml + '</button>\n                <button onclick="rbi_pauseTask(\'' + task.id + '\')" class="flex flex-col justify-center items-center p-2 rounded-xl bg-[var(--card-bg)] text-slate-600 dark:text-slate-300 font-bold text-[9px] uppercase active:scale-95 border border-[var(--card-border)] hover:bg-[var(--hover-bg)] transition-colors"><svg class="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Пауза</button>\n                <button onclick="rbi_cancelTask(\'' + task.id + '\')" class="flex flex-col justify-center items-center p-2 rounded-xl bg-[var(--card-bg)] text-red-500 dark:text-red-400 font-bold text-[9px] uppercase active:scale-95 border border-[var(--card-border)] hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><svg class="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg> Отменить</button>\n            </div>\n        ';
        }

        var canEditTasks = window.RbiRoles ? window.RbiRoles.canCreate() : true;
        if (!canEditTasks) {
            actionButtonsHtml = '<div class="text-[11px] text-slate-500 font-bold text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 mt-2">У вашей роли нет прав для выполнения и изменения задач.</div>';
        }

        footer.innerHTML = actionButtonsHtml;
        document.getElementById('task-details-modal').style.display = 'flex';
        document.body.classList.add('modal-open');
    }

    // =========================================================================
    // 6. СМЕНА СТАТУСОВ
    // =========================================================================

    async function _markTaskDone(taskId, silent) {
        if (typeof silent === 'undefined') silent = false;
        var task = window.rbi_tasksData.find(function(t){ return t.id === taskId; });
        if (task) {
            task.status = 'done';
            task.resultComment = 'Выполнено инженером вручную';
            task.updatedAt = new Date().toISOString();
            await _storage().put(_storage().stores().TASKS, task);
            if (!_isDemoMode()) {
                _syncEnqueue('UPDATE_TASK_STATUS', { taskId: task.id, status: 'done' });
            }
            document.getElementById('task-details-modal').style.display = 'none';
            document.body.classList.remove('modal-open');
            localStorage.setItem('rbi_cloud_dirty', '1');
            _sync('silent');
            if (!silent) {
                showToast("✅ Задача выполнена и перенесена в Архив!");
                _renderTasksList();
            }
        }
    }

    async function _resumeTask(taskId) {
        var task = window.rbi_tasksData.find(function(t){ return t.id === taskId; });
        if (!task) return;
        task.status = 'pending'; task.resultComment = '';
        if (!task.history) task.history = [];
        task.history.unshift('[' + new Date().toLocaleDateString('ru-RU') + '] Возобновлена инженером.');
        task.updatedAt = new Date().toISOString();
        await _storage().put(_storage().stores().TASKS, task);
        showToast("🔄 Задача снова активна");
        document.getElementById('task-details-modal').style.display = 'none';
        document.body.classList.remove('modal-open');
        _renderTasksList();
    }

    async function _pauseTask(taskId) {
        var task = window.rbi_tasksData.find(function(t){ return t.id === taskId; });
        if (!task) return;
        var reason = prompt("Укажите причину паузы:");
        if (reason === null) return;
        if (reason.trim() === "") return showToast("⚠️ Причина обязательна!");
        task.status = 'paused'; task.resultComment = 'На паузе: ' + reason;
        if (!task.history) task.history = [];
        task.history.unshift('[' + new Date().toLocaleDateString('ru-RU') + '] Пауза: ' + reason);
        task.updatedAt = new Date().toISOString();
        await _storage().put(_storage().stores().TASKS, task);
        localStorage.setItem('rbi_cloud_dirty', '1');
        _sync('silent');
        showToast("⏸ Задача скрыта в архив (Пауза)");
        document.getElementById('task-details-modal').style.display = 'none';
        document.body.classList.remove('modal-open');
        _renderTasksList();
    }

    async function _cancelTask(taskId) {
        var task = window.rbi_tasksData.find(function(t){ return t.id === taskId; });
        if (!task) return;
        if (!window.RbiRoles.canDelete(task.engineerName || task.inspectorName || '')) {
            return showToast("⚠️ Нет прав на отмену чужой задачи!");
        }
        var reason = prompt("Укажите причину отмены задачи:");
        if (reason === null) return;
        if (reason.trim() === "") return showToast("⚠️ Причина обязательна!");
        task.status = 'blocked'; task.resultComment = 'Отменена: ' + reason;
        if (!task.history) task.history = [];
        task.history.unshift('[' + new Date().toLocaleDateString('ru-RU') + '] Отменена: ' + reason);
        task.updatedAt = new Date().toISOString();
        await _storage().put(_storage().stores().TASKS, task);
        localStorage.setItem('rbi_cloud_dirty', '1');
        _sync('silent');
        showToast("🚫 Задача отменена");
        document.getElementById('task-details-modal').style.display = 'none';
        document.body.classList.remove('modal-open');
        _renderTasksList();
    }

    async function _postponeTask(taskId) {
        var task = window.rbi_tasksData.find(function(t){ return t.id === taskId; });
        if (!task) return;
        var days = prompt("На сколько дней перенести задачу? (введите число)", "1");
        if (days === null) return;
        var daysNum = parseInt(days);
        if (isNaN(daysNum) || daysNum <= 0) return showToast("⚠️ Введите корректное число дней!");
        var oldDateStr = new Date(task.date).toLocaleDateString('ru-RU');
        var newDate = new Date(task.date);
        newDate.setDate(newDate.getDate() + daysNum);
        task.date = newDate.toISOString();
        task.postponeCount = (task.postponeCount || 0) + 1;
        if (!task.history) task.history = [];
        task.history.unshift('[' + new Date().toLocaleDateString('ru-RU') + '] Перенос с ' + oldDateStr + ' на ' + daysNum + ' дн.');
        if (task.postponeCount > 2) {
            task.priorityLvl = 4;
            task.history.unshift('[СИСТЕМА] Приоритет повышен до критического из-за частых переносов!');
            showToast("⚠️ Приоритет повышен до Критического!");
        } else {
            showToast('➡️ Задача перенесена на ' + newDate.toLocaleDateString('ru-RU'));
        }
        task.updatedAt = new Date().toISOString();
        await _storage().put(_storage().stores().TASKS, task);
        localStorage.setItem('rbi_cloud_dirty', '1');
        _sync('silent');
        document.getElementById('task-details-modal').style.display = 'none';
        document.body.classList.remove('modal-open');
        _renderTasksList();
    }

    // =========================================================================
    // 7. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    // =========================================================================

    async function _generateTaskScenario() {
        if (!_getSetting('aiEnabled')) return showToast("Включите AI-ассистента!");
        var t = currentTaskContext;
        var txtArea = document.getElementById('task-ai-scenario');
        txtArea.classList.remove('hidden');
        txtArea.value = "⏳ ИИ пишет сценарий...";
        var relatedTwi = typeof customTwiCards !== 'undefined' ? customTwiCards.find(function(c){ return c.checklistKey === t.templateKey; }) : null;
        var twiContext = relatedTwi ? 'Упомяни, что мы разберем TWI-инструкцию "' + relatedTwi.title + '".' : '';
        var promptSystem = 'Ты — старший инженер стройконтроля. Напиши сценарий для жесткой 5-минутной планерки с бригадой (toolbox talk). \n    ЗАПРЕЩЕНО писать про каски, СИЗ и ТБ! Говорим ТОЛЬКО про технологию работ и качество!\n    1. 🎯 Цель: [Обозначить проблему качества].\n    2. ⚠️ Суть ошибки: [Как они косячат технологически].\n    3. 🛠 Как правильно: [Допуски из ГОСТ/СНиП].\n    4. 💡 Итог: Мотивация.';
        try {
            var res = await window.callAI([{ role: 'system', content: promptSystem }, { role: 'user', content: 'Подрядчик: ' + t.contractor + '. Работа: ' + t.templateTitle + '. ' + twiContext }], { temperature: 0.3, max_tokens: 500 });
            txtArea.value = res;
        } catch (e) { txtArea.value = "❌ Ошибка ИИ."; }
    }

    function _printTaskScenario() {
        var scenario = document.getElementById('task-ai-scenario') ? document.getElementById('task-ai-scenario').value : null;
        if (!scenario || scenario.includes('⏳')) return showToast("Сгенерируйте сценарий!");
        var t = currentTaskContext;
        var relatedTwi = typeof customTwiCards !== 'undefined' ? customTwiCards.find(function(c){ return c.checklistKey === t.templateKey; }) : null;
        var content = '<div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 20px;"><h2 style="color: #4f46e5; margin: 0 0 10px 0; font-size: 16px; text-transform: uppercase;">Сценарий планерки (Toolbox Talk)</h2><div style="font-size: 12px; font-weight: bold; color: #64748b; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Подрядчик: ' + t.contractor + ' | Вид работ: ' + t.templateTitle + '</div><div style="font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">' + scenario.replace(/\n/g, '<br>') + '</div></div>';
        if (relatedTwi && relatedTwi.type === 'INSPECTOR') {
            content += '<div style="page-break-before: always; margin-top: 20px;"><h2 style="font-size: 18px; text-align: center; text-transform: uppercase; color: #0f172a; margin-bottom: 20px;">ВИЗУАЛЬНЫЙ СТАНДАРТ: ' + relatedTwi.title + '</h2><table class="no-break" style="width: 100%; border-spacing: 15px 0; border-collapse: separate; table-layout: fixed; margin-left: -15px; margin-bottom: 20px;"><tr><td style="width: 50%; border: 3px solid #22c55e; padding: 10px; border-radius: 12px; text-align: center; background: #f0fdf4; vertical-align: top;"><h2 style="color: #166534; font-size: 14px; text-transform: uppercase;">✅ ЭТАЛОН</h2>' + (relatedTwi.photoGood ? '<img src="' + window.getPhotoSrc(relatedTwi.photoGood) + '" style="width: 100%; height: 250px; object-fit: contain;">' : 'Нет фото') + '</td><td style="width: 50%; border: 3px solid #ef4444; padding: 10px; border-radius: 12px; text-align: center; background: #fef2f2; vertical-align: top;"><h2 style="color: #991b1b; font-size: 14px; text-transform: uppercase;">❌ БРАК</h2>' + (relatedTwi.photoBad ? '<img src="' + window.getPhotoSrc(relatedTwi.photoBad) + '" style="width: 100%; height: 250px; object-fit: contain;">' : 'Нет фото') + '</td></tr></table></div>';
        }
        if (typeof printPdfShell === 'function') printPdfShell('Воркшоп: ' + t.contractor, content, "A4", "portrait", "browser");
    }

    async function _saveFinalAndClose(taskId) {
        var task = window.rbi_tasksData.find(function(t){ return t.id === taskId; });
        var text = document.getElementById('final-ai-text').value;
        task.aiData = { finalReport: text };
        task.status = 'done';
        task.resultComment = 'Справка КС-2 сохранена';
        task.updatedAt = new Date().toISOString();
        await _storage().put(_storage().stores().TASKS, task);
        document.getElementById('task-details-modal').style.display = 'none';
        document.body.classList.remove('modal-open');
        showToast("✅ Задача финальной приемки закрыта!");
        _renderTasksList();
    }

    function _handleTaskCompletionPhoto(event) {
        var file = event.target.files[0];
        if (!file) return;
        showToast("⚙️ Прикрепляю фото факта проведения...");
        compressImageToBase64(file, 1000, 0.8, async function(base64) {
            var localUrl = await PhotoManager.saveLocal(base64, 'task');
            var taskId = window.currentTaskPhotoId;
            var task = window.rbi_tasksData.find(function(t){ return t.id === taskId; });
            if (task) {
                task.completionPhoto = localUrl;
                await _storage().put(_storage().stores().TASKS, task);
            }
            var box = document.getElementById('task-photo-preview');
            box.dataset.photo = localUrl;
            box.classList.remove('hidden');
            box.innerHTML = '<img src="' + window.getPhotoSrc(localUrl) + '" class="w-full h-full object-cover"><div onclick="event.stopPropagation(); document.getElementById(\'task-photo-preview\').dataset.photo=\'\'; document.getElementById(\'task-photo-preview\').classList.add(\'hidden\');" class="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-black shadow-md cursor-pointer">✕</div>';
            event.target.value = '';
        });
    }

    async function _finishWorkshop(taskId) {
        const _allInspections = _inspections();
        var task = window.rbi_tasksData.find(function(t){ return t.id === taskId; });
        if (!task) return;
        var cChecks = _allInspections.filter(function(c){ return c.contractorName === task.contractor && c.templateKey === task.templateKey; });
        var m = cChecks.length > 0 ? getContractorMetrics(cChecks, _templates().getUserTemplates()) : null;
        var baseUrkVal = m ? m.finalC : 0;
        var myName = document.getElementById('inp-inspector') ? document.getElementById('inp-inspector').value.trim() : '';
        if (typeof window.rbi_interventionsData !== 'undefined') {
            var item = {
                id: 'int_' + Date.now().toString(36),
                date: new Date().toISOString(),
                inspector: myName,
                contractor: task.contractor,
                templateKey: task.templateKey,
                templateTitle: task.templateTitle || 'Вид работ',
                typeText: 'Разбор с бригадой (TWI-сессия)',
                typeCoef: 1.5,
                comment: 'Проведен воркшоп из планировщика задач',
                baseUrk: baseUrkVal
            };
            window.rbi_interventionsData.push(item);
            await _storage().put(_storage().stores().INTERVENTIONS, item);
        }
        _markTaskDone(taskId);
    }

    // =========================================================================
    // 8. ОТЧЁТ ИЗ ЗАДАЧИ
    // =========================================================================

    function _openReportSettingsModal(actionType, mode, taskId, closeTask) {
        const _allInspections = _inspections();
        if (typeof closeTask === 'undefined') closeTask = true;
        var modal = document.getElementById('modal-overlay');
        var uniqueProjects = Array.from(new Set(_allInspections.map(function(c){ return c.projectName; }).filter(Boolean))).sort();
        var projOptions = '<option value="ALL">Все объекты компании (Глобально)</option>';
        uniqueProjects.forEach(function(p) { projOptions += '<option value="' + p.replace(/"/g, '&quot;') + '">' + p + '</option>'; });
        document.getElementById('modal-icon').innerHTML = '<div class="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-2 border border-indigo-200">⚙️</div>';
        document.getElementById('modal-title').innerHTML = '<div class="text-center font-black uppercase text-lg">Настройки Отчета</div>';
        var taskInfoText = closeTask
            ? "Выберите параметры для формирования выгрузки. Система автоматически закроет эту задачу после скачивания файла."
            : "Выберите объект и период для формирования презентации. После скачивания вернитесь в задачу для заполнения протокола.";
        document.getElementById('modal-body').innerHTML = '<div class="text-center text-[12px] text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">' + taskInfoText + '</div><div class="space-y-3 mb-6"><div><label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Объект</label><select id="task-rep-project" class="w-full bg-[var(--hover-bg)] border border-[var(--card-border)] rounded-xl p-3 text-[12px] font-bold text-slate-800 dark:text-white outline-none">' + projOptions + '</select></div><div><label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Период Анализа</label><select id="task-rep-period" class="w-full bg-[var(--hover-bg)] border border-[var(--card-border)] rounded-xl p-3 text-[12px] font-bold text-slate-800 dark:text-white outline-none"><option value="WEEK">За последние 7 дней (Неделя)</option><option value="MONTH">За последние 30 дней (Месяц)</option><option value="ALL">За всё время</option></select></div></div><div class="flex gap-2"><button onclick="closeModal()" class="flex-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 py-3.5 rounded-xl font-bold text-[11px] uppercase active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700">Отмена</button><button onclick="closeModal(); rbi_executeTaskReport(\'' + actionType + '\', \'' + mode + '\', \'' + taskId + '\', ' + closeTask + ')" class="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase shadow-md active:scale-95 flex items-center justify-center gap-2">🚀 Скачать PDF</button></div>';
        document.body.classList.add('modal-open');
        modal.style.display = 'flex';
    }

    function _executeTaskReport(actionType, mode, taskId, closeTask) {
        var proj = document.getElementById('task-rep-project').value;
        var period = document.getElementById('task-rep-period').value;
        if (proj === 'ALL') {
            activeMultiFilters.analytics.project = [];
        } else {
            activeMultiFilters.analytics.project = [proj];
        }
        var periodSelect = document.getElementById('global-filter-period');
        if (periodSelect) {
            periodSelect.value = period;
            var periodLabel = document.getElementById('btn-ana-period-label');
            if (periodLabel) {
                periodLabel.querySelector('.truncate').innerText = periodSelect.options[periodSelect.selectedIndex].text;
            }
        }
        setTimeout(function() { handleFabExportAction(actionType, mode); }, 300);
    }

    // =========================================================================
    // 9. ГЕНЕРАТОР АВТОЗАДАЧ ИЗ ГРАФИКА (SMART SYNC)
    // =========================================================================

    async function _generateAutoTasks(silent) {
        if (typeof silent === 'undefined') silent = false;
        if (!silent) showToast("🧠 Синхронизация задач с графиком...");

        var generatedCount = 0, updatedCount = 0, deletedCount = 0;
        var now = new Date(); now.setHours(0, 0, 0, 0);
        var scheduleTasks = window.rbi_tasksData.filter(function(t){ return t.source === 'schedule' && !t._deleted; });

        window.rbi_scheduleData.forEach(function(stage) {
            if (stage._deleted) return;
            var startD = new Date(stage.startDate);
            var endD = new Date(stage.endDate);

            var addTaskOrUpdate = function(daysOffset, typeName, title, desc, iconName, catName) {
                var tDate = new Date(startD);
                tDate.setDate(tDate.getDate() + daysOffset);
                if (tDate < now && typeName !== 'Финал') return;

                var existingTask = scheduleTasks.find(function(t){ return t.stageId === stage.id && t.taskType === typeName; });
                if (!existingTask) {
                    existingTask = scheduleTasks.find(function(t){ return t.contractor === stage.contractor && t.templateKey === stage.templateKey && t.taskType === typeName; });
                }

                if (existingTask) {
                    existingTask.stageId = stage.id;
                    if (existingTask.status === 'pending' || existingTask.status === 'paused') {
                        var oldDate = new Date(existingTask.date).getTime();
                        if (oldDate !== tDate.getTime()) {
                            existingTask.date = tDate.toISOString();
                            existingTask.updatedAt = new Date().toISOString();
                            updatedCount++;
                        }
                    }
                } else {
                    if (typeName === 'Эталон') {
                        var hasEtalonInDb = (typeof etalonActsArray !== 'undefined') && etalonActsArray.some(function(e){ return e.contractorName === stage.contractor && e.templateKey === stage.templateKey; });
                        if (hasEtalonInDb) return;
                    }
                    var task = {
                        id: 'tsk_sch_' + Date.now().toString(36) + Math.floor(Math.random() * 1000),
                        source: 'schedule',
                        engineerName: document.getElementById('inp-inspector') ? document.getElementById('inp-inspector').value.trim() : 'Инженер',
                        stageId: stage.id,
                        type: 'auto', category: catName, icon: iconName, taskType: typeName,
                        title: title, prompt: desc,
                        workTitle: stage.workTitle, templateKey: stage.templateKey, contractor: stage.contractor,
                        date: tDate.toISOString(), status: 'pending', priorityLvl: 3, target: 1, done: 0, carryOverCount: 0,
                        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
                    };
                    window.rbi_tasksData.push(task);
                    generatedCount++;
                }
            };

            addTaskOrUpdate(-14, 'ППР', 'Проверить ППР и ТК', 'Проверить наличие и утверждение технологической карты до выхода подрядчика.', 'ППР', 'method');
            addTaskOrUpdate(-7, 'Инструктаж', 'Вводный инструктаж', 'Собрать бригадиров, провести инструктаж по допускам и качеству.', 'Инструктаж', 'method');
            addTaskOrUpdate(-3, 'Эталон', 'Приемка Эталона', 'Зафиксировать эталонный участок работ с фотофиксацией.', 'Эталон', 'control');
            addTaskOrUpdate(0, 'Старт', 'Контроль старта работ', 'Первая проверка на объекте в день начала этапа.', 'Контроль', 'control');

            var finalDiff = Math.round((endD - startD) / (1000 * 60 * 60 * 24)) - 3;
            if (finalDiff > 0) addTaskOrUpdate(finalDiff, 'Финал', 'Финальная приемка', 'Итоговая проверка перед подписанием КС.', 'Отчет', 'report');
        });

        var activeStageIds = window.rbi_scheduleData.filter(function(s){ return !s._deleted; }).map(function(s){ return s.id; });
        window.rbi_tasksData.forEach(function(t) {
            if (t.source === 'schedule' && t.stageId && !t._deleted) {
                if (!activeStageIds.includes(t.stageId)) {
                    if (t.status === 'pending' || t.status === 'paused') {
                        t._deleted = true; t.updatedAt = new Date().toISOString(); deletedCount++;
                    }
                }
            }
        });

        for (var i = 0; i < window.rbi_tasksData.length; i++) {
            await _storage().put(_storage().stores().TASKS, window.rbi_tasksData[i]);
        }

        if (generatedCount > 0 || updatedCount > 0 || deletedCount > 0) {
            localStorage.setItem('rbi_cloud_dirty', '1');
            _sync('silent');
        }

        setTimeout(function() {
            if (!silent && (generatedCount > 0 || updatedCount > 0 || deletedCount > 0)) {
                showToast('✅ Задачи обновлены! Новых: ' + generatedCount + ', Сдвинуто: ' + updatedCount + ', Удалено: ' + deletedCount);
                if (typeof rbi_renderScheduleTab === 'function') rbi_renderScheduleTab(true);
            } else if (!silent) {
                showToast('✅ Задачи синхронизированы с графиком');
                if (typeof rbi_renderScheduleTab === 'function') rbi_renderScheduleTab(true);
            }
            _renderTasksList();
        }, 500);
    }

    // =========================================================================
    // 10. КАЛЕНДАРЬ ЗАДАЧ
    // =========================================================================

    function _openCalendarModal() {
        var modal = document.getElementById('task-calendar-modal');
        currentCalendarDate = new Date();
        _renderCalendarGrid();
        document.getElementById('calendar-tasks-list').innerHTML = '<div class="text-center py-6 text-slate-400 text-[11px] font-bold uppercase border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-sm">Кликните на число в календаре</div>';
        document.getElementById('calendar-selected-date-label').innerText = 'Выберите дату';
        _renderNoDateTasks();
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        setTimeout(function(){ modal.classList.remove('opacity-0'); }, 10);
    }

    function _closeCalendarModal() {
        var modal = document.getElementById('task-calendar-modal');
        modal.classList.add('opacity-0');
        setTimeout(function() {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }, 300);
    }

    function _changeCalendarMonth(offset) {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
        _renderCalendarGrid();
    }

    function _renderCalendarGrid() {
        var year = currentCalendarDate.getFullYear();
        var month = currentCalendarDate.getMonth();
        var monthNames = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
        document.getElementById('calendar-month-label').innerText = monthNames[month] + ' ' + year;
        var grid = document.getElementById('calendar-grid');
        grid.innerHTML = '';
        var firstDay = new Date(year, month, 1).getDay();
        var startOffset = firstDay === 0 ? 6 : firstDay - 1;
        var daysInMonth = new Date(year, month + 1, 0).getDate();
        var taskDates = {};
        window.rbi_tasksData.forEach(function(t) {
            if (!t._deleted && t.status !== 'done' && t.status !== 'blocked' && t.date) {
                var dateStr = t.date.split('T')[0];
                taskDates[dateStr] = (taskDates[dateStr] || 0) + 1;
            }
        });
        var todayStr = new Date().toISOString().split('T')[0];
        var html = '';
        for (var i = 0; i < startOffset; i++) html += '<div></div>';
        for (var d = 1; d <= daysInMonth; d++) {
            var dIso = new Date(Date.UTC(year, month, d)).toISOString().split('T')[0];
            var isToday = dIso === todayStr;
            var taskCount = taskDates[dIso] || 0;
            var bgClass = isToday ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-700';
            var dotHtml = taskCount > 0 ? '<div class="w-1.5 h-1.5 rounded-full ' + (isToday ? 'bg-white' : 'bg-red-500') + ' absolute bottom-1.5 left-1/2 -translate-x-1/2"></div>' : '';
            html += '<div onclick="rbi_showTasksForDate(\'' + dIso + '\')" class="relative flex flex-col items-center justify-center h-12 sm:h-14 rounded-xl cursor-pointer active:scale-90 transition-transform ' + bgClass + '"><div class="text-[14px] sm:text-[16px] font-black leading-none">' + d + '</div>' + dotHtml + '</div>';
        }
        grid.innerHTML = html;
    }

    function _renderCalendarTaskCard(t) {
        var icon = t.icon ? (RBI_TASK_ICONS[t.icon] || RBI_TASK_ICONS['Контроль']) : RBI_TASK_ICONS['Контроль'];
        var priorityColor = t.priorityLvl === 4 ? 'text-red-600 bg-red-50 border-red-200' : 'text-green-600 bg-green-50 border-green-200';
        var priorityText = t.priorityLvl === 4 ? 'Крит.' : 'Обычная';
        return '<div onclick="rbi_closeCalendarModal(); setTimeout(()=>rbi_openTaskAction(\'' + t.id + '\'),300)" class="cursor-pointer w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col relative shadow-sm active:scale-[0.98] hover:border-indigo-400 transition-all"><div class="flex items-start justify-between gap-3 mb-2"><div class="w-8 h-8 rounded-lg bg-[var(--hover-bg)] text-slate-500 flex items-center justify-center border border-[var(--card-border)] shrink-0">' + icon + '</div><div class="flex-1 min-w-0"><div class="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-0.5">' + (t.taskType || t.title) + '</div><div class="text-[13px] font-black text-slate-800 dark:text-white leading-tight truncate">' + (t.contractor || 'Без подрядчика') + '</div></div></div><div class="text-[11px] text-slate-600 dark:text-slate-400 leading-snug line-clamp-2 font-medium mb-3">' + (t.prompt || 'Без описания') + '</div><div class="border-t border-slate-100 dark:border-slate-700 pt-2 flex justify-between items-center"><span class="text-[8px] font-black uppercase px-2 py-1 rounded border ' + priorityColor + '">' + priorityText + '</span><span class="text-[10px] font-bold text-slate-400">' + (t.engineerName || 'Инженер') + '</span></div></div>';
    }

    function _showTasksForDate(dateStr) {
        document.getElementById('calendar-selected-date-label').innerText = 'Задачи на: ' + new Date(dateStr).toLocaleDateString('ru-RU');
        var list = document.getElementById('calendar-tasks-list');
        var tasks = window.rbi_tasksData.filter(function(t){ return !t._deleted && t.status !== 'done' && t.status !== 'blocked' && t.date && t.date.split('T')[0] === dateStr; });
        if (tasks.length === 0) {
            list.innerHTML = '<div class="text-center py-6 text-slate-400 text-[11px] font-bold uppercase border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">На этот день задач нет</div>';
        } else {
            list.innerHTML = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' + tasks.map(_renderCalendarTaskCard).join('') + '</div>';
        }
    }

    function _renderNoDateTasks() {
        var list = document.getElementById('calendar-nodate-list');
        var tasks = window.rbi_tasksData.filter(function(t){ return !t._deleted && t.status !== 'done' && t.status !== 'blocked' && !t.date; });
        if (tasks.length === 0) {
            list.innerHTML = '<div class="text-center py-4 text-slate-400 text-[10px] font-bold uppercase">Все задачи привязаны к датам</div>';
        } else {
            list.innerHTML = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' + tasks.map(_renderCalendarTaskCard).join('') + '</div>';
        }
    }

    // =========================================================================
    // ШАГ 2: МОДУЛЬ — методы указывают на внутренние функции
    // =========================================================================
    var tasksModule = {
        _ctx: null,
        _mounted: false,

        init: function (ctx) {
            this._ctx = ctx || {};
            console.log('[RBI Module] quality.tasks v2.0 loaded (full code)');
        },

        mount: function (root, params) {
            this._mounted = true;
            _renderTasksList();
        },

        unmount: function () {
            this._mounted = false;
        },

        openTaskModal:        function () { _openTaskModal(); },
        closeTaskModal:       function () { _closeTaskModal(); },
        saveManualTask:       function () { return _saveManualTask(); },
        forceUpdatePlan:      function (silent) { return _gameForceUpdatePlan(silent); },
        generateWeeklyPlan:   function (force) { return _gameGenerateWeeklyPlan(force); },
        renderTasksList:      function () { return _renderTasksList(); },
        filterTaskHub:        function (category, btnEl) { return _filterTaskHub(category, btnEl); },
        openTaskAction:       function (taskId) { return _openTaskAction(taskId); },
        markTaskDone:         function (taskId, silent) { return _markTaskDone(taskId, silent); },
        resumeTask:           function (taskId) { return _resumeTask(taskId); },
        pauseTask:            function (taskId) { return _pauseTask(taskId); },
        cancelTask:           function (taskId) { return _cancelTask(taskId); },
        postponeTask:         function (taskId) { return _postponeTask(taskId); },
        saveFinalAndClose:    function (taskId) { return _saveFinalAndClose(taskId); },
        finishWorkshop:       function (taskId) { return _finishWorkshop(taskId); },
        handleTaskCompletionPhoto: function (event) { return _handleTaskCompletionPhoto(event); },
        generateTaskScenario: function () { return _generateTaskScenario(); },
        printTaskScenario:    function () { _printTaskScenario(); },
        openReportSettingsModal:  function (actionType, mode, taskId, closeTask) { _openReportSettingsModal(actionType, mode, taskId, closeTask); },
        executeTaskReport:    function (actionType, mode, taskId, closeTask) { _executeTaskReport(actionType, mode, taskId, closeTask); },
        generateAutoTasks:    function (silent) { return _generateAutoTasks(silent); },
        openCalendarModal:    function () { _openCalendarModal(); },
        closeCalendarModal:   function () { _closeCalendarModal(); },
        changeCalendarMonth:  function (offset) { _changeCalendarMonth(offset); },
        renderCalendarGrid:   function () { _renderCalendarGrid(); },
        showTasksForDate:     function (dateStr) { _showTasksForDate(dateStr); },
        renderNoDateTasks:    function () { _renderNoDateTasks(); },

        // Делегаты к app.js (за рамками task.js)
        loadData: function () {
            if (typeof rbi_loadData === 'function') return rbi_loadData();
        },
        renderEngineerTab: function () {
            if (typeof rbi_renderEngineerTab === 'function') return rbi_renderEngineerTab();
        },
        switchEngineerSubTab: function (tabId, btnElement) {
            if (typeof rbi_switchEngineerSubTab === 'function') return rbi_switchEngineerSubTab(tabId, btnElement);
        },
    };

    // =========================================================================
    // ШАГ 3: РЕГИСТРАЦИЯ В RBI.registry
    // =========================================================================
    if (window.RBI && window.RBI.registry) {
        window.RBI.registry.register('quality.tasks', tasksModule);
    } else {
        console.warn('[quality.tasks] RBI.registry недоступен — модуль работает автономно');
    }
    console.log('[RBI Module] quality.tasks v2.0 loaded (full code)');

    // =========================================================================
    // ШАГ 4: WINDOW-ПРОКСИ
    // Все прокси указывают на ВНУТРЕННИЕ функции (_*).
    // Оригинальные функции из task.js остаются нетронутыми.
    // =========================================================================

    window.rbi_openTaskModal        = function () { return _openTaskModal.apply(this, arguments); };
    window.rbi_closeTaskModal       = function () { return _closeTaskModal.apply(this, arguments); };
    window.rbi_saveManualTask       = function () { return _saveManualTask.apply(this, arguments); };

    window.gameForceUpdatePlan      = function () { return _gameForceUpdatePlan.apply(this, arguments); };
    window.gameGenerateWeeklyPlan   = function () { return _gameGenerateWeeklyPlan.apply(this, arguments); };

    window.rbi_renderTasksList      = function () { return _renderTasksList.apply(this, arguments); };
    window.rbi_filterTaskHub        = function () { return _filterTaskHub.apply(this, arguments); };
    window.rbi_openTaskAction       = function () { return _openTaskAction.apply(this, arguments); };

    window.rbi_markTaskDone         = function () { return _markTaskDone.apply(this, arguments); };
    window.rbi_resumeTask           = function () { return _resumeTask.apply(this, arguments); };
    window.rbi_pauseTask            = function () { return _pauseTask.apply(this, arguments); };
    window.rbi_cancelTask           = function () { return _cancelTask.apply(this, arguments); };
    window.rbi_postponeTask         = function () { return _postponeTask.apply(this, arguments); };

    window.rbi_saveFinalAndClose    = function () { return _saveFinalAndClose.apply(this, arguments); };
    window.rbi_finishWorkshop       = function () { return _finishWorkshop.apply(this, arguments); };
    window.rbi_handleTaskCompletionPhoto = function () { return _handleTaskCompletionPhoto.apply(this, arguments); };
    window.rbi_generateTaskScenario = function () { return _generateTaskScenario.apply(this, arguments); };
    window.rbi_printTaskScenario    = function () { return _printTaskScenario.apply(this, arguments); };
    window.rbi_openReportSettingsModal = function () { return _openReportSettingsModal.apply(this, arguments); };
    window.rbi_executeTaskReport    = function () { return _executeTaskReport.apply(this, arguments); };

    window.rbi_generateAutoTasks    = function () { return _generateAutoTasks.apply(this, arguments); };

    window.rbi_openCalendarModal    = function () { return _openCalendarModal.apply(this, arguments); };
    window.rbi_closeCalendarModal   = function () { return _closeCalendarModal.apply(this, arguments); };
    window.rbi_changeCalendarMonth  = function () { return _changeCalendarMonth.apply(this, arguments); };
    window.rbi_renderCalendarGrid   = function () { return _renderCalendarGrid.apply(this, arguments); };
    window.rbi_showTasksForDate     = function () { return _showTasksForDate.apply(this, arguments); };
    window.rbi_renderNoDateTasks    = function () { return _renderNoDateTasks.apply(this, arguments); };

    // executeRenderTasks — алиас, используется внутри task.js
    window.executeRenderTasks = function () { return _renderTasksList(); };

    console.log('[quality.tasks] window-proxies installed (v2.0)');

})();

/* === Блок 10: интеграция с ES-модулем (tasks.module.js) === */
(function() {
  // Fallback-регистрация на случай, если ES-модуль загрузился позже
  if (window.RBI && window.RBI.registry && !window.RBI.registry.get('module.tasks')) {
    window.RBI.registry.register('module.tasks', {
      id: 'tasks',
      _isLegacyStub: true,
      mount: function() { window.loadTasks && window.loadTasks(); }
    });
  }

  // Делегировать window.loadTasks → TasksActions (если ES-модуль готов)
  var _origLoadTasks = window.loadTasks;
  window.loadTasks = function() {
    if (window.TasksActions && typeof window.TasksActions.loadTasks === 'function') {
      window.TasksActions.loadTasks();
    } else if (_origLoadTasks) {
      _origLoadTasks.apply(this, arguments);
    }
  };
})();
