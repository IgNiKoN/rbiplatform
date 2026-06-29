/* Файл: js/modules/sk/sk.legacy.js */
/* SK Module v2.0 — ПК Стройконтроль (полноценный модуль)                       */
/* Все функции из js/sk.js скопированы напрямую в этот файл.                    */
/* js/sk.js НЕ УДАЛЁН — оба файла работают параллельно.                         */
/* При загрузке sk.legacy.js ПОСЛЕ sk.js функции переопределяются идентично.    */
/* Зависимости: window.contractorArray, dbGet/dbPut/dbGetAll, dbPutBatch,       */
/*              STORES, triggerSync, showToast, closeModal,                      */
/*              window.RbiRoles, window.ObjectDirectory,                         */
/*              window.ContractorDirectory, SYSTEM_TEMPLATES, userTemplates,    */
/*              window.syncConfig, appSettings, XLSX, Chart                     */

(function () {
    'use strict';

    window.RBI = window.RBI || {};

    // Фаза 53: единая точка доступа к настройкам через SettingsService с fallback
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

    // Фаза 84: единая точка доступа к данным проверок через HistoryState или fallback contractorArray
    function _inspections() {
        if (window.HistoryState && Array.isArray(window.HistoryState.allRecords)) {
            return window.HistoryState.allRecords;
        }
        if (Array.isArray(window.contractorArray)) return window.contractorArray;
        return [];
    }

    // Фаза 89: единая точка доступа к syncConfig через SyncService или fallback
    function _syncConfig() {
        if (window.RBI && window.RBI.services && window.RBI.services.sync &&
            typeof window.RBI.services.sync.getConfig === 'function') {
            return window.RBI.services.sync.getConfig();
        }
        return window.syncConfig || {};
    }

    // Фаза 111: единая точка доступа к IndexedDB через StorageService или fallback
    function _storage() {
        if (window.RBI && window.RBI.services && window.RBI.services.storage) {
            return window.RBI.services.storage;
        }
        return {
            stores: function() { return typeof STORES !== 'undefined' ? STORES : {}; },
            get: function(store, key) { return dbGet(store, key); },
            getAll: function(store) { return dbGetAll(store); },
            put: function(store, data) { return dbPut(store, data); },
            putBatch: function(store, items) {
                if (typeof dbPutBatch === 'function') return dbPutBatch(store, items);
                return Promise.all(items.map(function(item) { return dbPut(store, item); }));
            },
            delete: function(store, key) { return dbDelete(store, key); }
        };
    }

    // Фаза 125: единая точка вызова синхронизации через SyncService или fallback
    function _sync(mode) {
        var m = mode || 'silent';
        if (window.RBI && window.RBI.services && window.RBI.services.sync) {
            return window.RBI.services.sync.trigger(m);
        }
        if (typeof triggerSync === 'function') return triggerSync(m);
        return Promise.resolve(false);
    }

    // =========================================================================
    // ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ МОДУЛЯ
    // =========================================================================
    window.skRecords = window.skRecords || [];
    window.skVolumes = window.skVolumes || {};
    window.skMapping = window.skMapping || null;
    window.skContractorMap = window.skContractorMap || {};
    window.skCategoryMap = window.skCategoryMap || {};
    window.skCurrentSubTab = window.skCurrentSubTab || 'dashboard';
    window.skCurrentPeriodFilter = window.skCurrentPeriodFilter || 'ALL';
    window.skHrSortBy = window.skHrSortBy || 'kpi';
    window.skHrSortDesc = (typeof window.skHrSortDesc !== 'undefined') ? window.skHrSortDesc : true;

    var skAiRunning = false;

    var SK_FIELDS = [
        { id: 'row_number', name: '№ п/п' },
        { id: 'number', name: '№ замечания' },
        { id: 'text', name: 'Замечание' },
        { id: 'category', name: 'Категория замечания' },
        { id: 'date_issued', name: 'Дата выдачи' },
        { id: 'contractor', name: 'Ответственная организация' },
        { id: 'contractor_representative', name: 'Представитель ответственной организации' },
        { id: 'deadline', name: 'Требуемый срок устранения' },
        { id: 'status', name: 'Отметка об устранении' },
        { id: 'date_resolved', name: 'Фактическая дата устранения' },
        { id: 'inspector', name: 'Представитель организации выдавший предписание' },
        { id: 'closed_by', name: 'Представитель организации снявший предписание' },
        { id: 'structure', name: 'Элемент структуры' },
        { id: 'project_loc', name: 'Расположение в проекте' }
    ];

    // =========================================================================
    // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (не экспортируемые)
    // =========================================================================

    function sk_getCurrentUserName() {
        var candidates = [
            _syncConfig().engineerName,
            _syncConfig().inspectorName,
            _getSetting('engineerName'),
            _getSetting('inspectorName'),
            _getSetting('userName'),
            document.getElementById('inp-inspector') && document.getElementById('inp-inspector').value && document.getElementById('inp-inspector').value.trim(),
            document.getElementById('sync-engineer-name') && document.getElementById('sync-engineer-name').value && document.getElementById('sync-engineer-name').value.trim(),
            document.getElementById('cloud-engineer-name') && document.getElementById('cloud-engineer-name').value && document.getElementById('cloud-engineer-name').value.trim()
        ];

        for (var i = 0; i < candidates.length; i++) {
            var clean = String(candidates[i] || '').trim();
            if (clean && clean !== 'Инженер' && clean !== 'undefined' && clean !== 'null') {
                return clean;
            }
        }

        try {
            var saved = JSON.parse(localStorage.getItem('rbi_sync_config') || '{}');
            var savedName = String(saved.engineerName || saved.inspectorName || '').trim();
            if (savedName && savedName !== 'Инженер') return savedName;
        } catch (e) {}

        return 'Не указан';
    }

    function sk_getCurrentRole() {
        return window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
    }

    function sk_canUploadRecords() {
        return window.RbiRoles ? window.RbiRoles.canManageSK() : false;
    }

    function sk_canDeleteRecord(record) {
        if (!record) return false;
        if (window.RbiRoles && window.RbiRoles.isAdmin()) return true;
        var role = sk_getCurrentRole();
        if (role !== 'engineer') return false;
        var currentUser = sk_getCurrentUserName();
        var uploadedBy = record.uploaded_by || record.sk_uploaded_by || record.imported_by || '';
        return uploadedBy === currentUser;
    }

    function sk_filterRecordsByAccess(records) {
        if (!Array.isArray(records)) return [];

        var role = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
        var assignedProjects = window.RbiRoles
            ? window.RbiRoles.getAssignedProjects()
            : (_getSetting('assignedProjects') || []);
        var currentEngineer = window.RbiRoles
            ? window.RbiRoles.getCurrentEngineerName()
            : (_getSetting('engineerName') || '');
        var assignedContractor = window.RbiRoles
            ? window.RbiRoles.getAssignedContractor()
            : (_getSetting('contractorName') || _getSetting('assignedContractor') || '');

        if (window.RbiRoles && window.RbiRoles.isLeadership() && role !== 'project_manager') return records;

        if (role === 'project_manager') {
            if (!assignedProjects || assignedProjects.length === 0) return [];
            return records.filter(function (r) {
                var recProject = r.project_canonical_key || r.canonical_key || r.projectName || r.project || '';
                return assignedProjects.includes(recProject);
            });
        }

        if (role === 'engineer') {
            return records.filter(function (r) {
                var recProject = r.project_canonical_key || r.canonical_key || r.projectName || r.project || '';
                var uploadedBy = r.uploaded_by || r.sk_uploaded_by || r.imported_by || '';
                var isUnassignedProject = recProject === 'unknown' || recProject === '';
                if (!assignedProjects || assignedProjects.length === 0) {
                    return isUnassignedProject && uploadedBy === currentEngineer;
                }
                if (assignedProjects.includes(recProject)) return true;
                if (isUnassignedProject && uploadedBy === currentEngineer) return true;
                return false;
            });
        }

        if (role === 'contractor') {
            if (!assignedContractor) return [];
            var assignedContractorValue = String(assignedContractor || '').trim();
            return records.filter(function (r) {
                var recContractorKey = r.contractor_canonical_key || '';
                var recContractorName = r.contractor || r.contractorName || r.contractor_name || '';
                var recProject = r.project_canonical_key || r.canonical_key || r.projectName || r.project || '';
                var contractorOk = recContractorKey === assignedContractorValue || recContractorName === assignedContractorValue;
                var projectOk = !assignedProjects || assignedProjects.length === 0 || assignedProjects.includes(recProject);
                return contractorOk && projectOk;
            });
        }

        return [];
    }

    async function sk_getPendingContractorsQueue() {
        try {
            var queue = await _storage().getAll(_storage().stores().CONTRACTOR_QUEUE) || [];
            var pending = queue.filter(function (q) {
                return q && q.status !== 'linked' && q.status !== 'resolved' && q.status !== 'rejected';
            });
            var map = new Map();
            pending.forEach(function (item) {
                var key = String(item.raw_name || '').trim().toLowerCase();
                if (key && !map.has(key)) map.set(key, item);
            });
            return Array.from(map.values());
        } catch (e) {
            console.warn('[ПК СК] Не удалось прочитать очередь подрядчиков:', e);
            return [];
        }
    }

    function sk_cleanIssueNumber(value) {
        if (value === undefined || value === null) return '';
        return String(value).trim().replace(/\s+/g, '').replace(/[^\dA-Za-zА-Яа-яЁё_-]/g, '');
    }

    function sk_makeUniqueKey(projectCode, skNumber) {
        var pCode = String(projectCode || 'LOCAL').trim() || 'LOCAL';
        var n = sk_cleanIssueNumber(skNumber);
        return pCode + '_' + n;
    }

    function sk_normalizeStatus(rawStatus) {
        var raw = String(rawStatus || '').trim();
        var s = raw.toLowerCase();
        if (s === 'проверено') return { raw: raw, normalized: 'verified', analytical: 'verified_closed', isClosed: true };
        if (s === 'устранено') return { raw: raw, normalized: 'fixed_claimed', analytical: 'fixed_not_verified', isClosed: false };
        if (s === 'не устранено' || s.includes('не устран')) return { raw: raw, normalized: 'open', analytical: 'open', isClosed: false };
        if (!s) return { raw: '', normalized: 'open', analytical: 'open', isClosed: false };
        return { raw: raw, normalized: 'unknown', analytical: 'unknown', isClosed: false };
    }

    function sk_needsAiCategoryMapping(record) {
        if (!record) return false;
        var category = String(record.category || record.ai_category || record.category_corrected || '').trim();
        if (!category) return true;
        if (category.toLowerCase() === 'без категории') return true;
        if (/^\d+$/.test(category)) return true;
        return false;
    }

    function sk_hasAiRelevantChange(existing, record) {
        if (!record) return false;
        if (!existing) return sk_needsAiCategoryMapping(record);
        var oldText = String(existing.text || '').trim();
        var newText = String(record.text || '').trim();
        var oldCategory = String(existing.category || '').trim();
        var newCategory = String(record.category || '').trim();
        return oldText !== newText || oldCategory !== newCategory;
    }

    function sk_makeContractorCanonicalKey(name) {
        var clean = sk_cleanContractorName(name || '');
        return clean.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'unknown_contractor';
    }

    function sk_parseExcelDate(val) {
        if (val === undefined || val === null || val === '') return null;
        if (typeof val === 'number') return new Date((val - 25569) * 86400 * 1000).toISOString();
        if (typeof val === 'string') {
            var cleanVal = val.trim();
            var parts = cleanVal.split(/[.,/ -]/);
            if (parts.length === 3) {
                var day = parts[0].padStart(2, '0');
                var month = parts[1].padStart(2, '0');
                var year = parts[2];
                if (year.length === 2) year = '20' + year;
                var isoString = year + '-' + month + '-' + day + 'T12:00:00Z';
                var d = new Date(isoString);
                return isNaN(d.getTime()) ? null : d.toISOString();
            }
            var d2 = new Date(cleanVal);
            return isNaN(d2.getTime()) ? null : d2.toISOString();
        }
        return null;
    }

    function sk_cleanContractorName(name) {
        if (!name) return 'Неизвестно';
        var clean = name.toLowerCase();
        clean = clean.replace(/\b(ооо|ао|зао|пао|ип|ск|ук|гк)\b/gi, '');
        clean = clean.replace(/["'«»]/g, '');
        clean = clean.replace(/[^a-zа-яё0-9\s]/gi, '').trim().replace(/\s+/g, ' ');
        return clean.charAt(0).toUpperCase() + clean.slice(1);
    }

    async function sk_parseLocation(rawStr) {
        var rawPath = rawStr ? String(rawStr).trim() : '';
        if (!rawPath) {
            return { raw_path: '', raw_name: '', canonical_key: '', display_name: 'Не указан', block: 'Общее', floor: '', normalization_status: 'empty' };
        }
        var parts = rawPath.split('/').map(function (s) { return String(s || '').trim(); }).filter(Boolean);
        var rawProject = parts.length > 1 ? parts[1] : parts[0];
        var block = parts.length > 2 ? parts[2] : 'Общее';
        var floor = '';
        if (parts.length > 3) {
            var floorPart = parts[3];
            var floorMatch = floorPart.match(/-?\d+/);
            floor = floorMatch ? floorMatch[0] : floorPart;
        }
        var result = { raw_path: rawPath, raw_name: rawProject, canonical_key: '', display_name: rawProject || 'Не указан', block: block, floor: floor, normalization_status: 'pending' };
        if (rawProject && typeof ObjectDirectory !== 'undefined' && typeof ObjectDirectory.normalizeProjectName === 'function') {
            try {
                var match = await ObjectDirectory.normalizeProjectName(rawProject, true);
                result.canonical_key = match.canonical_key || '';
                result.display_name = match.display_name || rawProject;
                result.normalization_status = (match.status && match.status.includes('matched')) ? 'matched' : 'pending';
            } catch (e) {
                console.warn('[ПК СК] Не удалось нормализовать объект:', rawProject, e);
            }
        }
        return result;
    }

    function sk_similarity(s1, s2) {
        if (!s1 || !s2) return 0;
        var longer = s1.toLowerCase();
        var shorter = s2.toLowerCase();
        if (s1.length < s2.length) { longer = s2.toLowerCase(); shorter = s1.toLowerCase(); }
        var longerLength = longer.length;
        if (longerLength === 0) return 1.0;
        var costs = [];
        for (var i = 0; i <= shorter.length; i++) costs[i] = i;
        for (var i = 1; i <= longer.length; i++) {
            var costsTemp = costs[0]; costs[0] = i; var nw = i - 1;
            for (var j = 1; j <= shorter.length; j++) {
                var cj = Math.min(1 + Math.min(costs[j], costs[j - 1]), shorter[j - 1] === longer[i - 1] ? nw : nw + 1);
                nw = costs[j]; costs[j] = cj;
            }
        }
        return (longerLength - costs[shorter.length]) / parseFloat(longerLength);
    }

    function sk_getCleanCategoryName(rawCat) {
        if (!rawCat) return 'Без категории';
        var raw = String(rawCat).toLowerCase().trim();
        if (raw.includes('электр') || raw.includes('вентил') || raw.includes('отоплен') || raw.includes('водоснаб') || raw.includes('канализ') || raw.includes('слаботоч') || raw.includes('сеть') || raw.includes('сети')) return 'Инженерные сети (ПК СК)';
        if (raw.includes('охрана труда') || raw.includes('безопасност') || raw.includes('тб') || raw.includes('пожар')) return 'Охрана труда и ПБ (ПК СК)';
        if (raw.includes('эколог') || raw.includes('мусор') || raw.includes('бытов')) return 'Организация стройплощадки (ПК СК)';

        var bestMatch = null;
        var highestScore = 0;
        if (typeof SYSTEM_TEMPLATES !== 'undefined') {
            var allTemplates = Object.assign({}, SYSTEM_TEMPLATES);
            Object.values(allTemplates).forEach(function (tmpl) {
                var score = sk_similarity(raw, tmpl.title.toLowerCase());
                if (score > highestScore) { highestScore = score; bestMatch = tmpl.title; }
            });
        }
        if (highestScore > 0.55) return bestMatch;
        return 'Без категории';
    }

    function sk_extractStandards(text) {
        if (!text) return [];
        var regex = /(СП\s*\d+(\.\d+)*|ГОСТ\s*[Р]?\s*\d+(-\d+)?|СНиП\s*\d+(\.\d+)*(-\d+)?)/gi;
        var matches = text.match(regex);
        if (!matches) return [];
        var unique = [...new Set(matches.map(function (m) { return m.replace(/\s+/g, ' ').toUpperCase(); }))];
        return unique;
    }

    function sk_canApproveContractorLink() {
        return window.RbiRoles ? window.RbiRoles.isAdmin() : false;
    }

    // =========================================================================
    // ГЛОБАЛЬНЫЕ ФУНКЦИИ (ПУБЛИЧНЫЙ API)
    // =========================================================================

    // Публикуем sk_extractStandards глобально — нужна sync.js при восстановлении
    // записей из Supabase (строка: standards: sk_extractStandards(row.text))
    window.sk_extractStandards = sk_extractStandards;

    window.sk_normalizeCategoryKey = function (value) {
        return String(value || '')
            .replace(/^\d+[\.,]\s*/, '')
            .trim()
            .toLowerCase()
            .replace(/ё/g, 'е')
            .replace(/\s+/g, ' ');
    };

    window.sk_sortHrTable = function (column) {
        if (window.skHrSortBy === column) {
            window.skHrSortDesc = !window.skHrSortDesc;
        } else {
            window.skHrSortBy = column;
            window.skHrSortDesc = true;
        }
        sk_renderHrTab();
    };

    window.sk_loadData = async function () {
        if (_isDemoMode()) return;
        try {
            var records = await _storage().getAll(_storage().stores().SK_RECORDS);
            if (records) {
                var activeRecords = records.filter(function (r) { return !r._deleted && !r.is_deleted; });
                // Восстанавливаем standards на лету для записей без этого поля
                // (записи из Supabase-синхронизации могут не иметь standards)
                activeRecords.forEach(function (r) {
                    if (!r.standards || !Array.isArray(r.standards) || r.standards.length === 0) {
                        r.standards = sk_extractStandards(r.text || '');
                    }
                });
                window.skRecords = sk_filterRecordsByAccess(activeRecords);
            } else {
                window.skRecords = [];
            }
            var volumes = await _storage().get(_storage().stores().SK_VOLUMES, 'main');
            if (volumes && volumes.data) window.skVolumes = volumes.data;
            var mapping = await _storage().get(_storage().stores().SK_MAPPING, 'main');
            if (mapping && mapping.data) window.skMapping = mapping.data;
            var cmap = await _storage().get(_storage().stores().SK_CONTRACTOR_MAP, 'main');
            if (cmap && cmap.data) window.skContractorMap = cmap.data;
            var catMap = await _storage().get(_storage().stores().SK_CATEGORY_MAP, 'main');
            if (catMap && catMap.data) window.skCategoryMap = catMap.data;
            if (window.ContractorDirectory && typeof window.ContractorDirectory.init === 'function') {
                await window.ContractorDirectory.init();
            }
        } catch (e) { console.error('Ошибка загрузки данных ПК СК', e); }
    };

    window.sk_renderContractorQueueBanner = async function () {
        var banner = document.getElementById('sk-contractor-queue-banner');
        if (!banner) return;
        var queue = await sk_getPendingContractorsQueue();
        if (!queue.length) {
            banner.innerHTML = '';
            banner.classList.add('hidden');
            return;
        }
        banner.classList.remove('hidden');
        banner.innerHTML = `
        <div class="mb-4 p-3 rounded-2xl border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 shadow-sm">
            <div class="flex items-start justify-between gap-3">
                <div>
                    <div class="text-[12px] font-black uppercase text-yellow-800 dark:text-yellow-300">
                        Найдены неподтверждённые подрядчики
                    </div>
                    <div class="text-[10px] font-bold text-yellow-700 dark:text-yellow-400 mt-1 leading-snug">
                        Система нашла ${queue.length} названий подрядчиков из ПК СК, которые нужно связать со справочником.
                        После связи они будут распознаваться автоматически.
                    </div>
                </div>
                <button onclick="sk_openContractorLinkModal()"
                    class="shrink-0 bg-yellow-500 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase shadow active:scale-95">
                    Связать
                </button>
            </div>
        </div>
    `;
    };

    window.sk_renderMainTab = async function () {
        var container = document.getElementById('sk-main-container');
        if (!container) return;

        if ((!window.skRecords || window.skRecords.length === 0) && !document.getElementById('sk-view-dashboard')) {
            container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20">
                <svg class="animate-spin h-8 w-8 text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Чтение базы Стройконтроля...</div>
            </div>`;
            await sk_loadData();
        }

        var minD = null, maxD = null;
        window.skRecords.forEach(function (r) {
            if (r.date_issued) {
                var d = new Date(r.date_issued);
                if (!minD || d < minD) minD = d;
                if (!maxD || d > maxD) maxD = d;
            }
        });
        var periodStr = (minD && maxD) ? ('с ' + minD.toLocaleDateString('ru-RU') + ' по ' + maxD.toLocaleDateString('ru-RU')) : 'Не определен';

        var role = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
        var canSeeHr = role !== 'guest';
        var canUploadSk = window.RbiRoles ? window.RbiRoles.canManageSK() : false;

        var hrBtnHtml = canSeeHr ? `<button onclick="sk_switchView('hr')" id="sk-btn-hr" class="shrink-0 px-4 bg-[var(--card-bg)] text-slate-600 dark:text-slate-300 border border-[var(--card-border)] py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95 transition-colors shadow-sm flex items-center gap-1.5"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg> Инженеры СК</button>` : '';

        var needsFullRender = !document.getElementById('sk-view-dashboard');

        if (needsFullRender) {
            var html = `
            <div id="sk-contractor-queue-banner" class="hidden"></div>
            <div class="bg-[var(--card-bg)] p-4 rounded-2xl border border-[var(--card-border)] shadow-sm mb-4">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h2 class="text-[13px] font-bold uppercase tracking-tight text-slate-800 dark:text-white flex items-center gap-1.5">
                            <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            Данные ПК Стройконтроль
                        </h2>
                        <p class="text-[10px] text-slate-500 font-bold mt-1">Всего в базе: <b id="sk-total-count" class="text-indigo-600">${window.skRecords.length}</b> позиций</p>
                        <p id="sk-period-text" class="text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-widest">Период: ${periodStr}</p>
                    </div>
                    <div class="flex gap-2">
                    ${canUploadSk ? `
                        <button onclick="sk_clearData()" class="w-10 h-10 bg-red-50 text-red-600 border border-red-200 rounded-xl flex items-center justify-center shadow-sm active:scale-90 transition-transform" title="Очистить базу СК">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                        <button onclick="document.getElementById('sk-excel-input').click()" class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[11px] font-bold uppercase shadow-md active:scale-95 flex items-center gap-1.5 h-10">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"></path></svg> Импорт
                        </button>
                    ` : `
                        <div class="text-[9px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl border border-[var(--card-border)]">
                        Только просмотр
                        </div>
                    `}
                    </div>
                </div>
                <div class="flex items-center gap-2 border-t border-[var(--card-border)] pt-3">
                    <span class="text-[9px] font-bold uppercase tracking-widest text-slate-400">Фильтр:</span>
                    <select id="sk-period-filter" class="input-base !py-1 !text-[10px] font-bold flex-1" onchange="window.skCurrentPeriodFilter = this.value; sk_renderDashboard();">
                        <option value="ALL" ${window.skCurrentPeriodFilter === 'ALL' ? 'selected' : ''}>Анализировать всё время</option>
                        <option value="14" ${window.skCurrentPeriodFilter === '14' ? 'selected' : ''}>За последние 14 дней</option>
                        <option value="30" ${window.skCurrentPeriodFilter === '30' ? 'selected' : ''}>За последние 30 дней</option>
                    </select>
                </div>
            </div>

            <div class="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar pb-1">
                <button onclick="sk_switchView('dashboard')" id="sk-btn-dashboard" class="shrink-0 px-4 bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400 py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95 transition-colors shadow-sm flex items-center gap-1.5"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"></path></svg> Дашборд</button>
                <button onclick="sk_switchView('volumes')" id="sk-btn-volumes" class="shrink-0 px-4 bg-[var(--card-bg)] text-slate-600 dark:text-slate-300 border border-[var(--card-border)] py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95 transition-colors shadow-sm flex items-center gap-1.5"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg> Объемы</button>
                ${hrBtnHtml}
            </div>

            <div id="sk-view-dashboard" class="block"></div>
            <div id="sk-view-volumes" class="hidden"></div>
            <div id="sk-view-hr" class="hidden"></div>
        `;
            container.innerHTML = html;
        } else {
            var countEl = document.getElementById('sk-total-count');
            var periodEl = document.getElementById('sk-period-text');
            if (countEl) countEl.innerText = window.skRecords.length;
            if (periodEl) periodEl.innerText = 'Период: ' + periodStr;
        }

        if (typeof sk_renderContractorQueueBanner === 'function') {
            sk_renderContractorQueueBanner().catch(function (e) { console.warn(e); });
        }

        var targetTab = window.skCurrentSubTab || 'dashboard';
        if (typeof sk_renderVolumes === 'function') sk_renderVolumes();
        if (typeof sk_renderDashboard === 'function') sk_renderDashboard();
        if (targetTab === 'hr' && typeof sk_renderHrTab === 'function') sk_renderHrTab();
        if (typeof sk_switchView === 'function') sk_switchView(targetTab);
    };

    window.sk_clearData = async function () {
        var role = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
        var canManage = window.RbiRoles ? window.RbiRoles.canManageSK() : false;
        if (!canManage) return showToast('⛔ У вашей роли нет прав для очистки базы ПК СК');

        var isManager = window.RbiRoles ? window.RbiRoles.isAdmin() : false;
        var confirmText = isManager
            ? 'Удалить ВСЕ загруженные замечания Стройконтроля? (Справочник объемов сохранится)'
            : 'Удалить ВСЕ ВАШИ загруженные замечания Стройконтроля? (Чужие записи останутся)';
        if (!confirm(confirmText)) return;

        var deletedCount = 0;
        var currentUser = sk_getCurrentUserName();
        for (var i = 0; i < window.skRecords.length; i++) {
            var rec = window.skRecords[i];
            var owner = rec.uploaded_by || rec.sk_uploaded_by || rec.imported_by || '';
            if (isManager || owner === currentUser) {
                var nowIso = new Date().toISOString();
                rec._deleted = true; rec.is_deleted = true;
                rec.deleted_at = nowIso; rec._deletedAt = nowIso;
                rec._updatedAt = nowIso; rec.updated_at = nowIso; rec.updatedAt = nowIso;
                rec.source = 'local'; rec.syncStatus = 'not_synced'; rec.sync_status = 'not_synced';
                rec.syncBlockReason = ''; rec.sync_block_reason = '';
                await _storage().put(_storage().stores().SK_RECORDS, rec);
                deletedCount++;
            }
        }
        if (deletedCount > 0) {
            window.skRecords = window.skRecords.filter(function (r) { return !r._deleted; });
            localStorage.setItem('rbi_cloud_dirty', '1');
            _sync('silent');
            showToast('🗑️ Удалено замечаний: ' + deletedCount);
            sk_renderMainTab();
        } else {
            showToast('⚠️ Нет замечаний для удаления (или нет прав на удаление чужих).');
        }
    };

    window.sk_switchView = function (view) {
        window.skCurrentSubTab = view;
        var vDash = document.getElementById('sk-view-dashboard');
        var vVol = document.getElementById('sk-view-volumes');
        var vHr = document.getElementById('sk-view-hr');
        if (vDash) vDash.classList.add('hidden');
        if (vVol) vVol.classList.add('hidden');
        if (vHr) vHr.classList.add('hidden');

        var defaultBtnClass = 'shrink-0 px-4 bg-[var(--card-bg)] text-slate-600 dark:text-slate-300 border border-[var(--card-border)] py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95 transition-colors shadow-sm flex items-center gap-1.5';
        var activeBtnClass = 'shrink-0 px-4 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95 transition-colors shadow-sm flex items-center gap-1.5';

        var btnDash = document.getElementById('sk-btn-dashboard');
        var btnVol = document.getElementById('sk-btn-volumes');
        var btnHr = document.getElementById('sk-btn-hr');
        if (btnDash) btnDash.className = defaultBtnClass;
        if (btnVol) btnVol.className = defaultBtnClass;
        if (btnHr) btnHr.className = defaultBtnClass;

        var viewEl = document.getElementById('sk-view-' + view);
        var btnEl = document.getElementById('sk-btn-' + view);
        if (viewEl) viewEl.classList.remove('hidden');
        if (btnEl) btnEl.className = activeBtnClass;

        if (view === 'hr') sk_renderHrTab();
    };

    window.sk_renderVolumes = function () {
        var container = document.getElementById('sk-view-volumes');
        if (!container) return;
        var rowsHtml = '';
        for (var workType in window.skVolumes) {
            var v = window.skVolumes[workType];
            rowsHtml += `
            <div class="flex items-center gap-2 mb-2 bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)]">
                <div class="flex-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">${workType}</div>
                <div class="w-16 text-center text-[10px] font-black bg-[var(--card-bg)] border border-[var(--card-border)] py-1 rounded shadow-inner">${v.amount} ${v.unit}</div>
                <button onclick="sk_deleteVolume('${workType}')" class="text-red-500 bg-red-50 border border-red-200 w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-transform"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>`;
        }
        if (!rowsHtml) rowsHtml = `<div class="text-[10px] text-slate-400 text-center py-4 uppercase font-bold">Справочник пуст. Укажите объемы, чтобы система рассчитывала ИСД.</div>`;
        container.innerHTML = `
        <div class="bg-[var(--card-bg)] p-4 rounded-xl border border-[var(--card-border)] shadow-sm">
            <h3 class="text-[12px] font-black uppercase mb-3 text-slate-800 dark:text-white border-b border-[var(--card-border)] pb-2">Добавить объем</h3>
            <div class="space-y-3 mb-4">
                <input type="text" id="sk-vol-name" class="input-base text-[11px]" placeholder="Вид работ (например: Окна ПВХ)">
                <div class="flex gap-2">
                    <input type="number" id="sk-vol-amount" class="input-base text-[11px] flex-1" placeholder="Кол-во (напр: 280)">
                    <input type="text" id="sk-vol-unit" class="input-base text-[11px] w-20 text-center" placeholder="Ед. (шт)">
                </div>
                <button onclick="sk_addVolume()" class="w-full bg-green-50 text-green-700 border border-green-200 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest active:scale-95 shadow-sm transition-transform">Сохранить</button>
            </div>
            <h3 class="text-[12px] font-black uppercase mb-3 text-slate-800 dark:text-white border-b border-[var(--card-border)] pb-2 mt-4">Текущий справочник</h3>
            <div>${rowsHtml}</div>
        </div>`;
    };

    window.sk_addVolume = async function () {
        var nameInput = document.getElementById('sk-vol-name');
        var amountInput = document.getElementById('sk-vol-amount');
        var unitInput = document.getElementById('sk-vol-unit');
        var name = nameInput.value.trim();
        var amount = parseFloat(amountInput.value.replace(/\s/g, ''));
        var unit = unitInput.value.trim();
        if (!name) return showToast('⚠️ Укажите вид работ!');
        if (isNaN(amount) || amount <= 0) return showToast('⚠️ Укажите корректное количество (число)!');
        if (!unit) return showToast('⚠️ Укажите единицу измерения!');
        window.skVolumes[name] = { amount: amount, unit: unit };
        await _storage().put(_storage().stores().SK_VOLUMES, { id: 'main', data: window.skVolumes });
        nameInput.value = ''; amountInput.value = ''; unitInput.value = '';
        showToast('✅ Объем добавлен в справочник!');
        sk_renderVolumes();
        sk_renderDashboard();
    };

    window.sk_deleteVolume = async function (name) {
        delete window.skVolumes[name];
        await _storage().put(_storage().stores().SK_VOLUMES, { id: 'main', data: window.skVolumes });
        sk_renderVolumes();
        sk_renderDashboard();
    };

    window.sk_handleExcelImport = async function (event) {
        var file = event.target.files[0];
        if (!sk_canUploadRecords()) {
            event.target.value = '';
            return showToast('⛔ Загружать ПК СК могут только инженер, заместитель или администратор');
        }
        if (!file) return;
        showToast('⚙️ Читаем Excel файл...');
        var reader = new FileReader();
        reader.onload = async function (e) {
            try {
                var data = new Uint8Array(e.target.result);
                var workbook = XLSX.read(data, { type: 'array' });
                var firstSheetName = workbook.SheetNames[0];
                var worksheet = workbook.Sheets[firstSheetName];
                var rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                if (rows.length < 2) throw new Error('Файл пуст или не содержит данных');
                var headers = rows[0].map(function (h) { return h ? h.toString().trim() : ''; });
                window.skTempRawHeaders = headers;
                window.skTempRawRows = rows;
                sk_showMappingModal(headers, rows[1] || []);
            } catch (err) {
                console.error(err);
                alert('Ошибка чтения Excel: ' + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
        event.target.value = '';
    };

    window.sk_showMappingModal = function (fileHeaders, sampleRow) {
        var modal = document.getElementById('modal-overlay');
        var cleanHeader = function (str) {
            if (!str) return '';
            return str.toLowerCase().replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
        };
        var exactMatch = {
            'row_number': '№ п/п', 'number': '№ замечания', 'text': 'замечание',
            'category': 'категория замечания', 'date_issued': 'дата выдачи',
            'contractor': 'ответственная организация',
            'contractor_representative': 'представитель ответственной организации',
            'deadline': 'требуемый срок устранения', 'status': 'отметка об устранении',
            'date_resolved': 'фактическая дата устранения',
            'inspector': 'представитель организации выдавший предписание',
            'closed_by': 'представитель организации снявший предписание',
            'structure': 'элемент структуры', 'project_loc': 'расположение в проекте'
        };
        var currentMapping = {};
        var allFound = true;
        var mappingHtml = SK_FIELDS.map(function (field) {
            var bestMatchIdx = -1;
            var targetStr = exactMatch[field.id];
            bestMatchIdx = fileHeaders.findIndex(function (h) { return cleanHeader(h) === targetStr; });
            currentMapping[field.id] = bestMatchIdx;
            if (bestMatchIdx === -1) { allFound = false; console.warn('[Маппинг] Не найдена колонка: "' + targetStr + '"'); }
            var options = '<option value="-1">-- Пропустить (Не загружать) --</option>';
            fileHeaders.forEach(function (h, idx) {
                if (!h) return;
                var sampleText = sampleRow[idx] ? ' (напр: ' + String(sampleRow[idx]).substring(0, 15) + ')' : '';
                var selected = (idx === bestMatchIdx) ? 'selected' : '';
                options += '<option value="' + idx + '" ' + selected + '>' + h + sampleText + '</option>';
            });
            return `
            <div class="mb-3 bg-[var(--hover-bg)] p-2 rounded-lg border border-[var(--card-border)] shadow-sm">
                <div class="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase mb-1">${field.name}</div>
                <select class="sk-mapping-select input-base !py-1.5 text-[11px]" data-field="${field.id}">${options}</select>
            </div>`;
        }).join('');

        if (allFound) {
            showToast('✨ Стандартный файл распознан! Начинаем загрузку...');
            window.skMapping = currentMapping;
            setTimeout(function () { sk_executeImport(currentMapping); }, 300);
            return;
        }

        document.getElementById('modal-icon').innerHTML = `<div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-2xl mx-auto mb-2 border border-indigo-200">🔗</div>`;
        document.getElementById('modal-title').innerHTML = `<div class="text-center font-black uppercase text-lg">Связь колонок</div>`;
        document.getElementById('modal-body').innerHTML = `
        <div class="text-center text-[10px] text-slate-500 mb-2 leading-relaxed">Система не смогла автоматически распознать все колонки. Проверьте связь вручную.</div>
        <button onclick="sk_aiMapColumns()" id="btn-ai-mapping" class="w-full bg-slate-100 text-indigo-600 border border-indigo-200 py-2 rounded-lg font-bold text-[10px] uppercase mb-4 active:scale-95 transition-colors flex justify-center items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Угадать через ИИ (DeepSeek)
        </button>
        <div class="max-h-[40vh] overflow-y-auto custom-scrollbar pr-1 mb-4">${mappingHtml}</div>
        <div class="flex gap-2">
            <button onclick="closeModal()" class="flex-1 bg-slate-100 text-slate-600 py-3.5 rounded-xl font-bold text-[11px] uppercase active:scale-95 border">Отмена</button>
            <button onclick="sk_executeImport()" class="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase shadow-md active:scale-95">▶ Загрузить</button>
        </div>
    `;
        document.body.classList.add('modal-open');
        modal.style.display = 'flex';
    };

    window.sk_executeImport = async function (autoMapping) {
        var _allInspections = _inspections();
        if (autoMapping === undefined) autoMapping = null;
        var currentMapping = autoMapping;
        if (!currentMapping) {
            currentMapping = {};
            document.querySelectorAll('.sk-mapping-select').forEach(function (select) {
                currentMapping[select.dataset.field] = parseInt(select.value);
            });
        }
        var criticalFields = ['number', 'contractor', 'status', 'date_issued'];
        var hasError = false;
        criticalFields.forEach(function (field) {
            if (currentMapping[field] === -1 || isNaN(currentMapping[field])) hasError = true;
        });
        if (hasError) return showToast("⛔ ОШИБКА: Колонки '№ замечания', 'Ответственная организация', 'Дата выдачи' и 'Отметка об устранении' ОБЯЗАТЕЛЬНЫ! Назначьте их.");

        window.skMapping = currentMapping;
        await _storage().put(_storage().stores().SK_MAPPING, { id: 'main', data: currentMapping });

        var rows = window.skTempRawRows;
        var contrIdx = currentMapping['contractor'];
        var rawContractorsInFile = new Set();
        for (var i = 1; i < rows.length; i++) {
            if (rows[i] && rows[i][contrIdx]) rawContractorsInFile.add(String(rows[i][contrIdx]).trim());
        }

        var rbiContractors = [...new Set(_allInspections.map(function (c) { return c.contractorName; }))].filter(Boolean);
        var pairsToConfirm = [];
        window.skTempContractorMatches = {};

        rawContractorsInFile.forEach(function (rawName) {
            var cleanName = sk_cleanContractorName(rawName);
            if (window.skContractorMap[rawName]) {
                window.skTempContractorMatches[rawName] = window.skContractorMap[rawName];
                return;
            }
            var bestMatch = null;
            var highestScore = 0;
            rbiContractors.forEach(function (rbiName) {
                var cleanRbi = sk_cleanContractorName(rbiName);
                var score = sk_similarity(cleanName, cleanRbi);
                if (score > highestScore) { highestScore = score; bestMatch = rbiName; }
            });
            if (highestScore >= 0.85) {
                window.skTempContractorMatches[rawName] = bestMatch;
                window.skContractorMap[rawName] = bestMatch;
            } else if (highestScore >= 0.60 && highestScore < 0.85) {
                pairsToConfirm.push({ raw: rawName, target: bestMatch, score: Math.round(highestScore * 100) });
            } else {
                window.skTempContractorMatches[rawName] = rawName;
            }
        });

        if (pairsToConfirm.length > 0) {
            window.skTempPairsToConfirm = pairsToConfirm;
            sk_showNormalizationModal();
        } else {
            sk_finalizeImport();
        }
    };

    window.sk_showNormalizationModal = function () {
        var modal = document.getElementById('modal-overlay');
        var pairsHtml = window.skTempPairsToConfirm.map(function (pair, idx) {
            return `
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-sm mb-3" id="norm-pair-${idx}">
            <div class="text-[10px] font-bold text-slate-500 uppercase mb-2 text-center">Сходство: ${pair.score}%</div>
            <div class="flex justify-between items-center gap-2 mb-3">
                <div class="flex-1 bg-red-50 dark:bg-red-900/10 p-2 rounded border border-red-200 text-center">
                    <div class="text-[8px] uppercase text-red-500 font-bold mb-0.5">Новое из Excel:</div>
                    <div class="text-[11px] font-black text-slate-800 dark:text-white leading-tight">${pair.raw}</div>
                </div>
                <div class="text-slate-400">➡️</div>
                <div class="flex-1 bg-green-50 dark:bg-green-900/10 p-2 rounded border border-green-200 text-center">
                    <div class="text-[8px] uppercase text-green-600 font-bold mb-0.5">В базе RBI:</div>
                    <div class="text-[11px] font-black text-slate-800 dark:text-white leading-tight">${pair.target}</div>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="sk_resolvePair(${idx}, false)" class="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95 border border-slate-200">Разные</button>
                <button onclick="sk_resolvePair(${idx}, true)" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-[10px] font-bold uppercase active:scale-95 shadow-sm">Объединить</button>
            </div>
        </div>`;
        }).join('');
        document.getElementById('modal-icon').innerHTML = `<div class="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center text-2xl mx-auto mb-2 border border-orange-200">🤝</div>`;
        document.getElementById('modal-title').innerHTML = `<div class="text-center font-black uppercase text-lg">Одинаковые организации?</div>`;
        document.getElementById('modal-body').innerHTML = `
        <div class="text-center text-[10px] text-slate-500 mb-4 leading-relaxed">
            Система нашла похожие названия компаний. Подтвердите, чтобы в отчетах они не разваливались на две разные строки.
        </div>
        <div class="max-h-[50vh] overflow-y-auto custom-scrollbar pr-1 mb-4" id="norm-pairs-container">
            ${pairsHtml}
        </div>`;
        document.body.classList.add('modal-open');
        modal.style.display = 'flex';
    };

    window.sk_resolvePair = function (idx, isMatch) {
        var pair = window.skTempPairsToConfirm[idx];
        if (isMatch) {
            window.skTempContractorMatches[pair.raw] = pair.target;
            window.skContractorMap[pair.raw] = pair.target;
        } else {
            window.skTempContractorMatches[pair.raw] = pair.raw;
        }
        document.getElementById('norm-pair-' + idx).style.display = 'none';
        var container = document.getElementById('norm-pairs-container');
        var remaining = container.querySelectorAll('div[id^="norm-pair-"]:not([style*="display: none"])');
        if (remaining.length === 0) {
            closeModal();
            sk_finalizeImport();
        }
    };

    window.sk_finalizeImport = async function () {
        showToast('⏳ Формируем единый реестр ПК СК без дублей...');
        await _storage().put(_storage().stores().SK_CONTRACTOR_MAP, { id: 'main', data: window.skContractorMap });

        var rows = window.skTempRawRows || [];
        var projectCode = _syncConfig().projectCode || 'LOCAL';
        var currentUser = sk_getCurrentUserName();
        var nowIso = new Date().toISOString();
        var importBatchId = 'sk_batch_' + Date.now().toString(36);
        var newRecordsCount = 0, updatedRecordsCount = 0, skippedRecordsCount = 0, aiCandidateCount = 0;
        var recordsToSaveBatch = [];
        var pendingProjectRequestsMap = new Map();

        var allExistingRecords = (await _storage().getAll(_storage().stores().SK_RECORDS)) || [];
        var activeExistingRecords = allExistingRecords.filter(function (r) { return !r._deleted && !r.is_deleted; });
        var existingMap = new Map();
        activeExistingRecords.forEach(function (r) {
            var key = r.sk_unique_key || (r.project_code && r.sk_number ? sk_makeUniqueKey(r.project_code, r.sk_number) : '') || r.id;
            if (key) existingMap.set(String(key), r);
        });

        for (var i = 1; i < rows.length; i++) {
            var row = rows[i];
            if (!row || row.length === 0) continue;
            var getVal = (function (r) {
                return function (field) {
                    var idx = window.skMapping ? window.skMapping[field] : -1;
                    if (idx === -1 || idx === undefined || r[idx] === undefined) return '';
                    return r[idx];
                };
            })(row);

            var skNumber = sk_cleanIssueNumber(getVal('number'));
            if (!skNumber) { skippedRecordsCount++; continue; }

            var skUniqueKey = sk_makeUniqueKey(projectCode, skNumber);
            var stableId = 'sk_' + skUniqueKey;
            var rawContractor = getVal('contractor') ? String(getVal('contractor')).trim() : 'Неизвестно';
            var contractorMatch = null;
            if (window.ContractorDirectory && typeof window.ContractorDirectory.normalizeContractorName === 'function') {
                contractorMatch = await window.ContractorDirectory.normalizeContractorName(rawContractor);
            }
            var cleanContractor = (contractorMatch && contractorMatch.display_name) || sk_cleanContractorName(rawContractor);
            var contractorKey = (contractorMatch && contractorMatch.canonical_key) || '';
            var contractorNormStatus = (contractorMatch && contractorMatch.status && contractorMatch.status.includes('matched')) ? 'matched' : 'pending';

            var rawStructure = getVal('structure') ? String(getVal('structure')).trim() : '';
            var rawProjectLoc = getVal('project_loc') ? String(getVal('project_loc')).trim() : '';
            if (!rawProjectLoc && rawStructure) rawProjectLoc = rawStructure;

            var parsedLoc = await sk_parseLocation(rawProjectLoc);
            if (parsedLoc && parsedLoc.raw_name && (parsedLoc.normalization_status === 'pending' || parsedLoc.normalization_status === 'not_found' || parsedLoc.normalization_status === 'unknown' || !parsedLoc.canonical_key || parsedLoc.canonical_key === 'unknown')) {
                var rawProjectName = String(parsedLoc.raw_name || '').trim();
                if (rawProjectName) {
                    var requestKey = rawProjectName.toLowerCase();
                    if (!pendingProjectRequestsMap.has(requestKey)) {
                        pendingProjectRequestsMap.set(requestKey, { raw_name: rawProjectName, canonical_key: '', display_name: parsedLoc.display_name || rawProjectName, status: 'pending', source: 'sk_import', created_at: nowIso });
                    }
                }
            }

            var rawText = getVal('text') ? String(getVal('text')).trim() : '';
            var extractedStandards = sk_extractStandards(rawText);
            var statusInfo = sk_normalizeStatus(getVal('status'));
            var existing = existingMap.get(skUniqueKey);

            var record = {
                id: (existing && existing.id) || stableId,
                project_code: projectCode,
                number: skNumber, sk_number: skNumber, sk_unique_key: skUniqueKey,
                row_number: getVal('row_number') ? String(getVal('row_number')).trim() : String(i),
                text: rawText,
                category: getVal('category') ? sk_getCleanCategoryName(getVal('category')) : 'Без категории',
                date_issued: sk_parseExcelDate(getVal('date_issued')),
                contractor: cleanContractor, contractorName: cleanContractor, contractor_name: cleanContractor,
                raw_contractor: rawContractor, contractor_raw: rawContractor,
                contractor_canonical_key: contractorKey, contractor_normalization_status: contractorNormStatus,
                contractor_representative: getVal('contractor_representative') ? String(getVal('contractor_representative')).trim() : '',
                deadline: sk_parseExcelDate(getVal('deadline')),
                status: statusInfo.raw, status_raw: statusInfo.raw, status_normalized: statusInfo.normalized,
                status_analytical: statusInfo.analytical, is_verified_closed: statusInfo.isClosed,
                date_resolved: sk_parseExcelDate(getVal('date_resolved')),
                inspector: getVal('inspector') ? String(getVal('inspector')).trim() : 'Неизвестно',
                issued_by: getVal('inspector') ? String(getVal('inspector')).trim() : 'Неизвестно',
                closed_by: getVal('closed_by') ? String(getVal('closed_by')).trim() : '',
                standards: extractedStandards,
                structure: rawStructure, raw_location: rawStructure, project_loc: rawProjectLoc,
                project_raw_path: parsedLoc.raw_path, project_raw_name: parsedLoc.raw_name,
                canonical_key: parsedLoc.canonical_key || 'unknown',
                display_name: parsedLoc.display_name || parsedLoc.raw_name || 'Не указан',
                block: parsedLoc.block || 'Общее', floor: parsedLoc.floor || '',
                project_canonical_key: parsedLoc.canonical_key || '',
                project_display_name: parsedLoc.display_name || parsedLoc.raw_name || 'Не указан',
                project_block: parsedLoc.block || 'Общее', project_floor: parsedLoc.floor || '',
                project_normalization_status: parsedLoc.normalization_status || 'pending',
                uploaded_by: (existing && existing.uploaded_by && existing.uploaded_by !== 'Инженер') ? existing.uploaded_by : currentUser,
                sk_uploaded_by: (existing && existing.sk_uploaded_by && existing.sk_uploaded_by !== 'Инженер') ? existing.sk_uploaded_by : currentUser,
                imported_by: currentUser,
                first_uploaded_by: (existing && existing.first_uploaded_by && existing.first_uploaded_by !== 'Инженер') ? existing.first_uploaded_by : currentUser,
                last_uploaded_by: currentUser,
                import_batch_id: importBatchId,
                import_count: ((existing && existing.import_count) || 0) + 1,
                first_imported_at: (existing && existing.first_imported_at) || nowIso,
                last_imported_at: nowIso,
                source: 'local', syncStatus: 'not_synced', sync_status: 'not_synced',
                syncBlockReason: '', sync_block_reason: '',
                updated_at: nowIso, updatedAt: nowIso, _updatedAt: nowIso,
                created_at: (existing && existing.created_at) || nowIso,
                createdAt: (existing && (existing.createdAt || existing.created_at)) || nowIso,
                _deleted: false, is_deleted: false
            };

            if (existing) {
                record.ai_category = existing.ai_category;
                record.category_corrected = existing.category_corrected;
                record.predicted_risk = existing.predicted_risk;
                if (existing.category_corrected || existing.ai_category) record.category = existing.category;
                var skRole = sk_getCurrentRole();
                var isAdminSk = ['manager', 'deputy_manager'].includes(skRole);
                var existingOwner = existing.uploaded_by || existing.sk_uploaded_by || '';
                if (!isAdminSk && existingOwner && existingOwner !== currentUser) { skippedRecordsCount++; continue; }
                updatedRecordsCount++;
            } else {
                newRecordsCount++;
            }

            var needsAiCategory = sk_needsAiCategoryMapping(record);
            var aiRelevantChanged = sk_hasAiRelevantChange(existing, record);
            if (needsAiCategory && aiRelevantChanged) { record.needs_ai_category = true; aiCandidateCount++; }
            else { record.needs_ai_category = false; }

            existingMap.set(skUniqueKey, record);
            recordsToSaveBatch.push(record);
        }

        if (pendingProjectRequestsMap.size > 0 && typeof window.pushObjectRequestToCloud === 'function') {
            var uniqueRequests = Array.from(pendingProjectRequestsMap.values());
            for (var req of uniqueRequests) {
                try { await window.pushObjectRequestToCloud(req); }
                catch (e) { console.warn('[ПК СК] Не удалось отправить заявку на объект:', req, e); localStorage.setItem('rbi_cloud_dirty', '1'); }
            }
        }

        if (recordsToSaveBatch.length > 0) {
            await _storage().putBatch(_storage().stores().SK_RECORDS, recordsToSaveBatch);
        }

        var importLog = {
            id: importBatchId, project_code: projectCode, uploaded_by: currentUser,
            uploaded_at: nowIso, date: nowIso,
            records_total: Math.max(rows.length - 1, 0), records_created: newRecordsCount,
            records_updated: updatedRecordsCount, records_skipped: skippedRecordsCount,
            added: newRecordsCount, updated: updatedRecordsCount, skipped: skippedRecordsCount,
            status: 'completed', source: 'local', syncStatus: 'not_synced', sync_status: 'not_synced',
            syncBlockReason: '', sync_block_reason: ''
        };

        if (_storage().stores().SK_IMPORT_BATCHES) await _storage().put(_storage().stores().SK_IMPORT_BATCHES, importLog);
        await _storage().put(_storage().stores().SK_IMPORTS, importLog);

        var freshRecords = (await _storage().getAll(_storage().stores().SK_RECORDS)) || [];
        window.skRecords = sk_filterRecordsByAccess(freshRecords.filter(function (r) { return !r._deleted && !r.is_deleted; }));

        if (typeof gameLogAction === 'function') gameLogAction('sk_import_done', importLog.id);

        if (typeof window.rbi_tasksData !== 'undefined') {
            var skTask = window.rbi_tasksData.find(function (t) { return t.title === 'Загрузить выгрузку ПК СК' && t.status === 'pending'; });
            if (skTask) {
                skTask.status = 'done'; skTask.done = 1; skTask.resultComment = 'Файл ПК СК загружен';
                skTask.updatedAt = nowIso;
                _storage().put(_storage().stores().TASKS, skTask);
            }
        }

        localStorage.setItem('rbi_cloud_dirty', '1');
        showToast('✅ ПК СК: новых ' + newRecordsCount + ', обновлено ' + updatedRecordsCount + ', пропущено ' + skippedRecordsCount + ', для AI: ' + aiCandidateCount);

        setTimeout(function () { _sync('manual'); }, 500);

        if (aiCandidateCount > 0 && typeof sk_autoMapCategories === 'function' && !skAiRunning) {
            skAiRunning = true;
            sk_autoMapCategories(false).finally(function () {
                skAiRunning = false;
                localStorage.setItem('rbi_cloud_dirty', '1');
                setTimeout(function () { _sync('silent'); }, 1000);
                sk_renderDashboard();
            });
        }

        closeModal();
        sk_renderDashboard();
    };

    window.sk_renderDashboard = function () {
        var _allInspections = _inspections();
        var container = document.getElementById('sk-view-dashboard');
        if (!container) return;

        if (window.skRecords.length === 0) {
            container.innerHTML = `<div class="text-center py-10 bg-[var(--card-bg)] rounded-xl border border-dashed border-slate-300 text-slate-400 text-[11px] font-bold uppercase tracking-widest shadow-sm">Нет данных. Загрузите файл Excel.</div>`;
            return;
        }

        var activeRecords = window.skRecords;
        if (window.analyticsDataMode === 'cloud') {
            activeRecords = activeRecords.filter(function (r) { return r.source === 'cloud' || r.syncStatus === 'synced' || r.sync_status === 'synced'; });
        }

        var selPeriod = document.getElementById('global-filter-period') && document.getElementById('global-filter-period').value || 'ALL';
        var now = new Date();
        if (selPeriod === 'DAY') {
            activeRecords = activeRecords.filter(function (r) { return r.date_issued && new Date(r.date_issued).toDateString() === now.toDateString(); });
        } else if (selPeriod === 'WEEK') {
            var w = new Date(); w.setDate(now.getDate() - 7);
            activeRecords = activeRecords.filter(function (r) { return r.date_issued && new Date(r.date_issued) >= w; });
        } else if (selPeriod === 'MONTH') {
            var m = new Date(); m.setDate(now.getDate() - 30);
            activeRecords = activeRecords.filter(function (r) { return r.date_issued && new Date(r.date_issued) >= m; });
        } else if (selPeriod === 'CUSTOM') {
            var dFrom = document.getElementById('filter-date-from') && document.getElementById('filter-date-from').value;
            var dTo = document.getElementById('filter-date-to') && document.getElementById('filter-date-to').value;
            if (dFrom) activeRecords = activeRecords.filter(function (r) { return r.date_issued && new Date(r.date_issued) >= new Date(dFrom); });
            if (dTo) { var tDate = new Date(dTo); tDate.setHours(23, 59, 59, 999); activeRecords = activeRecords.filter(function (r) { return r.date_issued && new Date(r.date_issued) <= tDate; }); }
        }

        if (window.skCurrentPeriodFilter !== 'ALL') {
            var days = parseInt(window.skCurrentPeriodFilter);
            var cutoffDate = new Date(); cutoffDate.setDate(cutoffDate.getDate() - days); cutoffDate.setHours(0, 0, 0, 0);
            activeRecords = activeRecords.filter(function (r) {
                var isIssuedRecently = r.date_issued && new Date(r.date_issued) >= cutoffDate;
                var isResolvedRecently = r.date_resolved && new Date(r.date_resolved) >= cutoffDate;
                var isOpen = !(r.is_verified_closed === true || r.status_normalized === 'verified' || String(r.status || '').toLowerCase().trim() === 'проверено');
                return isIssuedRecently || isResolvedRecently || isOpen;
            });
        }

        if (typeof activeMultiFilters !== 'undefined' && activeMultiFilters.analytics.project.length > 0) {
            var fProj = activeMultiFilters.analytics.project;
            activeRecords = activeRecords.filter(function (r) { return fProj.includes(r.project_display_name) || fProj.includes(r.project_canonical_key) || fProj.includes(r.display_name); });
        }
        if (typeof activeMultiFilters !== 'undefined' && activeMultiFilters.analytics.contractor.length > 0) {
            var fContr = activeMultiFilters.analytics.contractor;
            activeRecords = activeRecords.filter(function (r) { return fContr.includes(r.contractor_name) || fContr.includes(r.contractor_canonical_key) || fContr.includes(r.contractor); });
        }
        if (typeof activeMultiFilters !== 'undefined' && activeMultiFilters.analytics.inspector.length > 0) {
            var fInsp = activeMultiFilters.analytics.inspector;
            activeRecords = activeRecords.filter(function (r) { return fInsp.includes(r.issued_by) || fInsp.includes(r.inspector); });
        }
        if (typeof activeMultiFilters !== 'undefined' && activeMultiFilters.analytics.template.length > 0) {
            var fTmpl = activeMultiFilters.analytics.template.map(function (t) { return t.toLowerCase(); });
            activeRecords = activeRecords.filter(function (r) { return fTmpl.includes((r.category || '').toLowerCase()); });
        }

        if (activeRecords.length === 0) {
            container.innerHTML = `<div class="text-center py-10 bg-[var(--card-bg)] rounded-xl border border-dashed border-slate-300 text-slate-400 text-[11px] font-bold uppercase tracking-widest shadow-sm">За выбранный период и фильтрам замечаний нет.</div>`;
            return;
        }

        var rbiContractors = [...new Set(_allInspections.map(function (c) { return c.contractorName ? c.contractorName.toLowerCase().trim() : ''; }))];
        var rbiDefectRatesCache = {};
        var getRbiDefectRate = function (contractor, cleanCategory) {
            var cacheKey = contractor + '_||_' + cleanCategory;
            if (rbiDefectRatesCache[cacheKey] !== undefined) return rbiDefectRatesCache[cacheKey];
            var relevantChecks = _allInspections.filter(function (c) { return c.contractorName === contractor && c.templateTitle === cleanCategory; });
            if (relevantChecks.length === 0) { rbiDefectRatesCache[cacheKey] = 0.05; return 0.05; }
            var totalItemsChecked = 0, totalDefectsFound = 0;
            relevantChecks.forEach(function (c) {
                if (c.metrics) { totalItemsChecked += c.metrics.checkedCount || 10; totalDefectsFound += (c.metrics.n_B2_fail + c.metrics.n_B3_fail); }
            });
            var rate = totalItemsChecked === 0 ? 0.05 : (totalDefectsFound / totalItemsChecked);
            rbiDefectRatesCache[cacheKey] = rate;
            return rate;
        };

        var contrMap = {}, matrixMap = {}, totalIssues = 0, totalOpen = 0, standardsMap = {};
        var skIssues = { isd: [], open: [], cmi: [] };

        var isIssueOpen = function (record) {
            if (record.is_verified_closed === true) return false;
            var normalized = record.status_normalized || '';
            if (normalized === 'verified') return false;
            var s = String(record.status || record.status_raw || '').toLowerCase().trim();
            if (s === 'проверено') return false;
            return true;
        };

        activeRecords.forEach(function (r) {
            if (r.standards && Array.isArray(r.standards)) {
                r.standards.forEach(function (std) { standardsMap[std] = (standardsMap[std] || 0) + 1; });
            }
            var c = r.contractor;
            totalIssues++;
            var isOpen = isIssueOpen(r);
            if (isOpen) totalOpen++;
            var effectiveCategory = r.category_corrected && r.ai_category ? r.ai_category : r.category;
            var rawCats = effectiveCategory ? effectiveCategory.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : ['Без категории'];
            rawCats.forEach(function (raw) {
                var strippedRaw = raw.replace(/^\d+[\.,]\s*/, '').trim();
                var catKey = window.sk_normalizeCategoryKey(raw);
                var cleanCat = window.skCategoryMap[catKey] || strippedRaw;
                if (cleanCat.trim() === '') cleanCat = 'Без категории';
                var matrixKey = c + '_||_' + cleanCat;
                if (!matrixMap[matrixKey]) {
                    matrixMap[matrixKey] = { contractor: c, category: cleanCat, total: 0, open: 0, overdue: 0, closingDays: [], projectName: r.project_display_name || r.projectName || r.project_canonical_key || 'Объект не определен' };
                }
                matrixMap[matrixKey].total++;
                if (isOpen) matrixMap[matrixKey].open++;
                var issued = r.date_issued ? new Date(r.date_issued) : null;
                var deadline = r.deadline ? new Date(r.deadline) : null;
                var resolved = r.date_resolved ? new Date(r.date_resolved) : null;
                var nowD = new Date();
                if (deadline) {
                    if (isOpen && nowD > deadline) matrixMap[matrixKey].overdue++;
                    else if (!isOpen && resolved && resolved > deadline) matrixMap[matrixKey].overdue++;
                }
                if (!isOpen && issued && resolved) {
                    var daysToClose = Math.ceil((resolved - issued) / (1000 * 60 * 60 * 24));
                    if (daysToClose >= 0) matrixMap[matrixKey].closingDays.push(daysToClose);
                }
            });
            if (!contrMap[c]) contrMap[c] = { total: 0, open: 0, overdueCount: 0, closingTimes: [], defects: {}, overdueDaysArr: [], closedCount: 0, closedOnTimeCount: 0 };
            var data = contrMap[c];
            data.total++;
            if (isOpen) data.open++;
            if (r.text) {
                var cleanText = r.text.toLowerCase().trim();
                cleanText = cleanText.replace(/(в осях|оси|отм\.|на отметке|кв\.|квартира)[\s\dа-яa-z\.\-\,\+]+/g, '');
                cleanText = cleanText.replace(/\d+[\.,]\d+[\.,]\d+/g, '').replace(/\d+/g, '');
                cleanText = cleanText.replace(/согласно ппр|согласно рд|по проекту|нарушение/g, '').trim();
                if (cleanText.length < 5) cleanText = r.text.substring(0, 100);
                cleanText = cleanText.charAt(0).toUpperCase() + cleanText.slice(1, 120) + (cleanText.length > 120 ? '...' : '');
                data.defects[cleanText] = (data.defects[cleanText] || 0) + 1;
            }
            var issued2 = r.date_issued ? new Date(r.date_issued) : null;
            var deadline2 = r.deadline ? new Date(r.deadline) : null;
            var resolved2 = r.date_resolved ? new Date(r.date_resolved) : null;
            var nowD2 = new Date();
            if (resolved2 && !isOpen) data.closedCount++;
            if (deadline2) {
                if (isOpen && nowD2 > deadline2) { data.overdueCount++; data.overdueDaysArr.push(Math.floor((nowD2 - deadline2) / (1000 * 60 * 60 * 24))); }
                else if (!isOpen && resolved2) {
                    if (resolved2 > deadline2) { data.overdueCount++; data.overdueDaysArr.push(Math.floor((resolved2 - deadline2) / (1000 * 60 * 60 * 24))); }
                    else { data.closedOnTimeCount++; }
                }
            }
            if (!isOpen && issued2 && resolved2) {
                var daysToClose2 = Math.ceil((resolved2 - issued2) / (1000 * 60 * 60 * 24));
                if (daysToClose2 >= 0) data.closingTimes.push(daysToClose2);
            }
        });

        var matrixByProject = {};
        Object.keys(matrixMap).forEach(function (key) {
            var mData = matrixMap[key];
            var pName = mData.projectName;
            if (!matrixByProject[pName]) matrixByProject[pName] = {};
            if (!matrixByProject[pName][mData.contractor]) matrixByProject[pName][mData.contractor] = [];
            matrixByProject[pName][mData.contractor].push(mData);
        });

        var matrixRows = '';
        Object.keys(matrixByProject).sort().forEach(function (projName) {
            matrixRows += `
            <details class="bg-white dark:bg-slate-800 mb-3 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm group/matrix [&_summary::-webkit-details-marker]:hidden">
                <summary class="p-3 bg-indigo-50 dark:bg-indigo-900/30 cursor-pointer font-black text-[12px] uppercase tracking-widest text-indigo-700 dark:text-indigo-400 flex justify-between items-center select-none group-open/matrix:border-b border-indigo-200 dark:border-indigo-800">
                    <span class="flex items-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg> Объект: ${projName}</span>
                    <span class="transition-transform duration-300 group-open/matrix:rotate-180 text-indigo-500">▼</span>
                </summary>
                <div class="overflow-x-auto custom-scrollbar">
                    <table class="w-full text-left whitespace-nowrap">
                        <thead class="bg-slate-50 dark:bg-slate-900 text-[9px] text-[var(--text-muted)] uppercase shadow-sm font-bold">
                            <tr>
                                <th class="p-2.5 pl-4 border-b border-[var(--card-border)]">Подрядчик / Вид работ</th>
                                <th class="p-2.5 text-center border-b border-[var(--card-border)]" title="Сколько выдали СК / Сколько ожидаем по статистике">Факт / Ожидание</th>
                                <th class="p-2.5 text-center border-b border-[var(--card-border)]">ИСД</th>
                                <th class="p-2.5 text-center border-b border-[var(--card-border)]">Вывод</th>
                                <th class="p-2.5 text-center border-b border-[var(--card-border)]" title="О: Открыто | П: Просрочено | С: Ср.дней закрытия">Статус исполнения</th>
                            </tr>
                        </thead>
                        <tbody>`;

            var projContractors = matrixByProject[projName];
            Object.keys(projContractors).sort().forEach(function (contrName) {
                matrixRows += `<tr class="bg-[var(--hover-bg)] border-b border-[var(--card-border)]"><td colspan="5" class="p-2 pl-3 text-[11px] font-black text-slate-800 dark:text-white uppercase">${contrName}</td></tr>`;
                var isLinkedContr = rbiContractors.includes(contrName.toLowerCase().trim()) || Object.values(window.skContractorMap).map(function (v) { return v.toLowerCase().trim(); }).includes(contrName.toLowerCase().trim());
                projContractors[contrName].sort(function (a, b) { return b.total - a.total; }).forEach(function (mData) {
                    var isdHtml = '<span class="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">Объем не задан</span>';
                    var statusBadge = '<span class="text-slate-400 text-[10px] font-bold">Недостаточно данных</span>';
                    var expectedHtml = '<span class="text-slate-400">-</span>';
                    if (mData.category !== 'Без категории') {
                        if (!isLinkedContr) {
                            isdHtml = '<span class="text-[9px] text-slate-400 font-bold uppercase border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded bg-white dark:bg-slate-800">Нет базы RBI</span>';
                            statusBadge = '<span class="text-slate-400 text-[10px] font-bold">Не связан</span>';
                        } else if (window.skVolumes) {
                            var volKey = Object.keys(window.skVolumes).find(function (k) { return k.toLowerCase().trim() === mData.category.toLowerCase().trim(); });
                            if (volKey) {
                                var vol = window.skVolumes[volKey].amount;
                                var rbiRate = getRbiDefectRate(mData.contractor, mData.category);
                                var expected = Math.round(vol * rbiRate);
                                if (expected < 1) expected = 1;
                                expectedHtml = '<span class="text-slate-700 dark:text-slate-300 font-black">' + expected + '</span>';
                                var isd = Math.round((mData.total / expected) * 100);
                                var colorClass = 'text-green-600 bg-green-50 border-green-200';
                                statusBadge = '<span class="text-green-600 font-bold text-[9px] uppercase flex items-center justify-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> Прозрачно</span>';
                                if (isd < 20) {
                                    colorClass = 'text-red-600 bg-red-50 border-red-200';
                                    statusBadge = '<span class="text-red-600 font-bold text-[9px] uppercase flex items-center justify-center gap-1 animate-pulse"><span class="w-1.5 h-1.5 rounded-full bg-red-500"></span> Скрывают брак</span>';
                                    skIssues.isd.push(mData.contractor + ' (' + mData.category + ')');
                                } else if (isd < 60) {
                                    colorClass = 'text-orange-500 bg-orange-50 border-orange-200';
                                    statusBadge = '<span class="text-orange-500 font-bold text-[9px] uppercase flex items-center justify-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Подозрительно</span>';
                                }
                                isdHtml = isd > 100 ? '<span class="font-black ' + colorClass + ' px-2 py-0.5 rounded border text-[11px]">100% <span class="text-[8px] opacity-70">(Избыточно)</span></span>' : '<span class="font-black ' + colorClass + ' px-2 py-0.5 rounded border text-[12px]">' + isd + '%</span>';
                            }
                        }
                    }
                    var avgClose = mData.closingDays.length > 0 ? Math.round(mData.closingDays.reduce(function (a, b) { return a + b; }, 0) / mData.closingDays.length) : 0;
                    var overColor = mData.overdue > 0 ? 'text-red-600' : 'text-slate-500';
                    var avgColor = avgClose > 14 ? 'text-orange-500' : 'text-slate-500';
                    var groupRecords = activeRecords.filter(function (r) { return r.contractor === mData.contractor && r.category === mData.category && r.predicted_risk; });
                    var aiBadge = '';
                    if (groupRecords.length > 0) {
                        if (groupRecords.some(function (r) { return r.predicted_risk === 'High'; })) aiBadge = `<span class="bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded text-[8px] font-black uppercase shadow-sm ml-1" title="ИИ прогнозирует срыв сроков">🔮 Риск</span>`;
                        else if (groupRecords.some(function (r) { return r.predicted_risk === 'Medium'; })) aiBadge = `<span class="bg-yellow-100 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded text-[8px] font-black uppercase shadow-sm ml-1">🔮 Внимание</span>`;
                    }
                    matrixRows += `
                    <tr class="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50">
                        <td class="p-2.5 pl-4 text-[10px] font-bold ${mData.category === 'Без категории' ? 'text-slate-400 italic' : 'text-slate-600 dark:text-slate-300'} truncate max-w-[150px]" title="${mData.category}">
                            <div class="flex items-center gap-1.5">
                                <span class="truncate">↳ ${mData.category}</span>
                                ${!isLinkedContr || mData.category === 'Без категории' ? '' : `<button onclick="sk_openCategoryLinkModal('${mData.category.replace(/'/g, "\\'")}')" class="text-indigo-400 hover:text-indigo-600" title="Привязать к другому виду работ">🔗</button>`}
                                ${aiBadge}
                            </div>
                        </td>
                        <td class="p-2.5 text-center text-[10px]"><span class="font-black text-indigo-600">${mData.total}</span> / ${expectedHtml}</td>
                        <td class="p-2.5 text-center align-middle">${isdHtml}</td>
                        <td class="p-2.5 text-center align-middle">${statusBadge}</td>
                        <td class="p-2.5 text-center text-[10px] font-bold align-middle whitespace-nowrap">
                            <span class="text-slate-500" title="Открыто">О: ${mData.open}</span> | 
                            <span class="${overColor}" title="Просрочено">П: ${mData.overdue}</span> | 
                            <span class="${avgColor}" title="Ср. дней на закрытие">С: ${avgClose}</span>
                        </td>
                    </tr>`;
                });
            });
            matrixRows += '</tbody></table></div></details>';
        });

        var linkedHtml = '', unlinkedHtml = '';
        var sortedContrs = Object.keys(contrMap).sort(function (a, b) { return contrMap[b].total - contrMap[a].total; });
        sortedContrs.forEach(function (cName) {
            var data = contrMap[cName];
            var isLinked = rbiContractors.includes(cName.toLowerCase().trim()) || Object.values(window.skContractorMap).includes(cName);
            var linkBadge = isLinked
                ? `<span class="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest shadow-sm flex items-center gap-1 w-fit"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"></path></svg> Связан с RBI</span>`
                : `<span class="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 w-fit"><svg class="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg> Без связи</span>`;
            var overduePerc = data.total > 0 ? Math.round((data.overdueCount / data.total) * 100) : 0;
            var avgOverdueDepth = data.overdueDaysArr.length > 0 ? Math.round(data.overdueDaysArr.reduce(function (a, b) { return a + b; }, 0) / data.overdueDaysArr.length) : 0;
            var onTimePerc = data.closedCount > 0 ? Math.round((data.closedOnTimeCount / data.closedCount) * 100) : 100;
            var cmi = 0;
            if (data.total > 0) {
                cmi = Math.round((onTimePerc * 0.6) + ((100 - overduePerc) * 0.4) - Math.min(avgOverdueDepth, 30));
                cmi = Math.max(0, Math.min(100, cmi));
                if (data.closedCount === 0 && data.overdueCount === 0) cmi = 100;
            }
            if (isLinked) {
                if (data.open > 5) skIssues.open.push(cName);
                if (cmi < 40 && data.total > 5) skIssues.cmi.push(cName);
            }
            var cmiColor = cmi >= 70 ? 'text-green-600' : (cmi >= 40 ? 'text-orange-500' : 'text-red-600');
            var overdueColor = overduePerc > 30 ? 'text-red-600' : (overduePerc > 10 ? 'text-orange-500' : 'text-green-600');
            var topDefects = Object.keys(data.defects).map(function (text) { return { text: text, count: data.defects[text] }; }).sort(function (a, b) { return b.count - a.count; }).slice(0, 3);
            var topDefectsHtml = topDefects.length > 0 && topDefects[0].count > 1
                ? topDefects.filter(function (d) { return d.count > 1; }).map(function (d) {
                    var recMatch = activeRecords.find(function (r) { return r.contractor === cName && r.text && r.text.toLowerCase().includes(d.text.replace('...', '').toLowerCase()); });
                    var stdBadge = (recMatch && recMatch.standards && recMatch.standards.length > 0) ? '<div class="text-[8px] font-black text-blue-600 bg-blue-50 border border-blue-200 px-1 py-0.5 rounded w-fit mt-1">' + recMatch.standards.join(', ') + '</div>' : '';
                    return '<div class="flex items-start gap-2 mb-1.5 border-b border-slate-100 dark:border-slate-700 pb-1.5"><span class="bg-orange-100 text-orange-700 px-1.5 rounded text-[9px] font-black shrink-0 mt-0.5">' + d.count + ' раз</span><div class="flex-1 min-w-0"><span class="text-[10px] text-slate-700 dark:text-slate-300 leading-snug">' + d.text + '</span>' + stdBadge + '</div></div>';
                }).join('')
                : '<div class="text-[10px] text-slate-400 font-bold">Явно выраженных повторений нет</div>';
            var safeId = cName.replace(/[^a-zA-Zа-яА-Я0-9]/g, '');
            var safeCName = cName.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            var cardHtml = `
            <details class="bg-white dark:bg-slate-800 border ${isLinked ? 'border-indigo-200 dark:border-indigo-800' : 'border-[var(--card-border)]'} rounded-xl shadow-sm mb-3 group [&_summary::-webkit-details-marker]:hidden">
                <summary class="p-3 cursor-pointer flex justify-between items-center transition-colors select-none">
                    <div class="flex-1 min-w-0 pr-3">
                        <div class="mb-1.5">${linkBadge}</div>
                        <div class="text-[12px] font-black text-slate-800 dark:text-white truncate mb-1">${cName}</div>
                        <div class="flex gap-2 text-[9px] font-bold">
                            <span class="text-slate-500 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">Всего: ${data.total}</span>
                            <span class="text-red-600 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800">Открыто: ${data.open}</span>
                        </div>
                    </div>
                    <div class="text-right shrink-0 flex flex-col items-end">
                        <div class="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Просрочка</div>
                        <div class="text-[16px] font-black ${overdueColor}">${overduePerc}%</div>
                    </div>
                </summary>
                <div class="p-3 border-t border-[var(--card-border)] bg-slate-50 dark:bg-slate-900/50">
                    <div class="grid grid-cols-3 gap-2 mb-3">
                        <div class="bg-white dark:bg-slate-800 p-2 rounded-lg border border-[var(--card-border)] shadow-sm text-center">
                            <div class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1 cursor-pointer" onclick="sk_showInfoModal('cmi')">Индекс CMI ❓</div>
                            <div class="text-[16px] font-black ${cmiColor}">${cmi}</div>
                        </div>
                        <div class="bg-white dark:bg-slate-800 p-2 rounded-lg border border-[var(--card-border)] shadow-sm text-center">
                            <div class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1" title="% закрытых вовремя">В срок</div>
                            <div class="text-[16px] font-black text-slate-700 dark:text-slate-300">${onTimePerc}%</div>
                        </div>
                        <div class="bg-white dark:bg-slate-800 p-2 rounded-lg border border-[var(--card-border)] shadow-sm text-center">
                            <div class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1" title="Средняя задержка в днях">Глубина</div>
                            <div class="text-[16px] font-black ${avgOverdueDepth > 5 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}">${avgOverdueDepth} дн.</div>
                        </div>
                    </div>
                    <div class="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/50 p-2.5 rounded-lg shadow-sm mb-3">
                        <div class="text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-2">🔄 Типовые дефекты (Из Excel)</div>
                        ${topDefectsHtml}
                    </div>
                    <button onclick="sk_generateContractorAiSummary('${safeCName}', '${safeId}')" id="btn-sk-ai-${safeId}" class="w-full bg-indigo-600 text-white py-3 rounded-xl text-[10px] font-black uppercase active:scale-95 transition-transform shadow-md flex items-center justify-center gap-2">
                        🤖 AI-Анализ и Письмо прорабу
                    </button>
                    <div id="sk-ai-res-${safeId}" class="hidden mt-3 p-3 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-xl text-[11px] leading-relaxed text-slate-800 dark:text-slate-200 shadow-inner"></div>
                </div>
            </details>`;
            if (isLinked) linkedHtml += cardHtml; else unlinkedHtml += cardHtml;
        });

        var spatialMap = {};
        activeRecords.forEach(function (r) {
            if (!r.block || !r.floor || r.canonical_key === 'unknown') return;
            var objKey = r.display_name;
            if (!spatialMap[objKey]) spatialMap[objKey] = {};
            if (!spatialMap[objKey][r.block]) spatialMap[objKey][r.block] = {};
            if (!spatialMap[objKey][r.block][r.floor]) spatialMap[objKey][r.block][r.floor] = { total: 0, open: 0, overdue: 0 };
            var cell = spatialMap[objKey][r.block][r.floor];
            cell.total++;
            if (isIssueOpen(r)) cell.open++;
            var deadline = r.deadline ? new Date(r.deadline) : null;
            if (deadline && isIssueOpen(r) && new Date() > deadline) cell.overdue++;
        });

        var spatialHtml = '';
        Object.keys(spatialMap).forEach(function (objKey) {
            spatialHtml += `
            <details class="bg-white dark:bg-slate-800 mb-3 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm group/space [&_summary::-webkit-details-marker]:hidden">
                <summary class="p-3 bg-indigo-50 dark:bg-indigo-900/30 cursor-pointer font-black text-[12px] uppercase tracking-widest text-indigo-700 dark:text-indigo-400 flex justify-between items-center select-none group-open/space:border-b border-indigo-200 dark:border-indigo-800">
                    <span class="flex items-center gap-2">🏢 Объект: ${objKey}</span>
                    <span class="transition-transform duration-300 group-open/space:rotate-180 text-indigo-500">▼</span>
                </summary>
                <div class="p-3 bg-slate-50 dark:bg-slate-900/50">`;
            Object.keys(spatialMap[objKey]).sort().forEach(function (blockName) {
                var blockData = spatialMap[objKey][blockName];
                var floors = Object.keys(blockData).sort(function (a, b) { var nA = parseInt(a), nB = parseInt(b); return (!isNaN(nA) && !isNaN(nB)) ? nB - nA : a.localeCompare(b); });
                var tableRows = '';
                floors.forEach(function (floor) {
                    var cell = blockData[floor];
                    var bgColor = 'bg-green-50 text-green-700';
                    if (cell.total > 15) bgColor = 'bg-red-100 text-red-800 font-black';
                    else if (cell.total > 5) bgColor = 'bg-yellow-50 text-yellow-700 font-bold';
                    tableRows += `<tr class="border-b border-slate-100 dark:border-slate-800 hover:bg-[var(--hover-bg)]"><td class="p-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800 text-center w-16">Эт. ${floor}</td><td class="p-2 text-center text-[11px] ${bgColor}">${cell.total}</td><td class="p-2 text-center text-[10px] font-bold text-slate-500">О: ${cell.open} | <span class="${cell.overdue > 0 ? 'text-red-500' : 'text-slate-400'}">П: ${cell.overdue}</span></td></tr>`;
                });
                spatialHtml += `
                <div class="mb-3 bg-white dark:bg-slate-800 border border-[var(--card-border)] rounded-xl shadow-sm overflow-hidden">
                    <div class="bg-[var(--hover-bg)] p-2 text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 border-b border-[var(--card-border)]">${blockName}</div>
                    <div class="overflow-x-auto"><table class="w-full text-left whitespace-nowrap"><thead class="bg-slate-50 dark:bg-slate-900/50 text-[9px] text-slate-400 uppercase"><tr><th class="p-2 text-center border-r border-slate-100 dark:border-slate-800">Уровень</th><th class="p-2 text-center">Всего замечаний</th><th class="p-2 text-center">Открыто / Просрочено</th></tr></thead><tbody>${tableRows}</tbody></table></div>
                </div>`;
            });
            spatialHtml += '</div></details>';
        });
        if (!spatialHtml) spatialHtml = '<div class="text-center py-4 text-slate-400 text-[10px] font-bold uppercase">Данные о расположении отсутствуют. При импорте убедитесь, что колонка "Элемент структуры" связана корректно.</div>';

        container.innerHTML = `
        <div class="grid grid-cols-2 gap-2 mb-4">
            <div class="bg-[var(--card-bg)] border border-[var(--card-border)] p-3 rounded-xl shadow-sm text-center">
                <div class="text-[9px] font-bold uppercase text-slate-400 tracking-widest mb-1">Всего замечаний СК</div>
                <div class="text-2xl font-black text-slate-800 dark:text-white">${totalIssues}</div>
            </div>
            <div class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 p-3 rounded-xl shadow-sm text-center">
                <div class="text-[9px] font-bold uppercase text-red-600 dark:text-red-400 tracking-widest mb-1">Открыто сейчас</div>
                <div class="text-2xl font-black text-red-600 dark:text-red-400">${totalOpen}</div>
            </div>
        </div>
        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden mb-4 p-4">
            <h3 class="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5"><svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg> Самые нарушаемые нормативы</h3>
            <div class="flex flex-wrap gap-2">
                ${Object.keys(standardsMap).length > 0
            ? Object.keys(standardsMap).sort(function (a, b) { return standardsMap[b] - standardsMap[a]; }).slice(0, 8).map(function (std) { return '<div class="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-2 py-1 rounded-lg cursor-pointer active:scale-95 transition-transform" onclick="switchTab(\'tab-reference\'); setTimeout(() => { const btns = document.querySelectorAll(\'.sub-tab-btn\'); if (btns[1]) switchReferenceSubTab(\'ref-sub-docs\', btns[1]); const s = document.getElementById(\'doc-search-input\'); if(s) {s.value=\'' + std + '\'; renderDocsList();} }, 300);"><span class="text-[11px] font-black text-blue-700 dark:text-blue-400">' + std + '</span><span class="text-[9px] font-bold bg-white dark:bg-slate-800 text-slate-500 px-1.5 rounded-md shadow-sm border border-blue-100 dark:border-blue-900">' + standardsMap[std] + '</span></div>'; }).join('')
            : '<div class="text-[10px] font-bold text-slate-400">В текстах замечаний нет ссылок на ГОСТ/СП.</div>'}
            </div>
        </div>
        <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden mb-4 group [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3.5 bg-[var(--hover-bg)] cursor-pointer flex justify-between items-center transition-colors select-none group-open:border-b border-[var(--card-border)]">
                <span class="font-bold text-[11px] uppercase tracking-widest text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"></path></svg> Матрица Рисков (ИСД) <button onclick="event.stopPropagation(); sk_showInfoModal('isd')" class="text-indigo-400 hover:text-indigo-600 active:scale-95 transition-transform ml-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></button></span>
                <span class="text-slate-400 transition-transform duration-300 group-open:rotate-180"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg></span>
            </summary>
            <div class="p-3 bg-slate-50 dark:bg-slate-900/50">
                ${(window.RbiRoles && window.RbiRoles.isAdmin()) ? `<div class="flex justify-end gap-2 mb-3"><button onclick="sk_autoMapCategories(false, true)" class="bg-white text-indigo-600 border border-indigo-200 dark:bg-slate-800 dark:border-slate-700 dark:text-indigo-400 px-3 py-2 rounded-lg text-[10px] font-black uppercase active:scale-95 shadow-sm transition-transform flex items-center gap-1.5" title="Перепроверить все дефекты (кроме ручных привязок)">🤖 Перепроверить всё</button><button onclick="sk_autoMapCategories(false, false)" class="bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400 px-3 py-2 rounded-lg text-[10px] font-black uppercase active:scale-95 shadow-sm transition-transform flex items-center gap-1.5">🤖 Распознать "Без категории"</button></div>` : ''}
                ${matrixRows || '<div class="text-center p-4 bg-[var(--card-bg)] rounded-xl border border-dashed border-[var(--card-border)] text-slate-400 text-[10px] uppercase font-bold">Нет данных для матрицы</div>'}
            </div>
        </details>
        <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden mb-4 group [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3.5 bg-[var(--hover-bg)] cursor-pointer flex justify-between items-center transition-colors select-none group-open:border-b border-[var(--card-border)]">
                <span class="font-bold text-[11px] uppercase tracking-widest text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg> Пространственный анализ (Этажи)</span>
                <span class="text-slate-400 transition-transform duration-300 group-open:rotate-180"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg></span>
            </summary>
            <div class="p-3 bg-slate-50 dark:bg-slate-900/50 max-h-[60vh] overflow-y-auto custom-scrollbar">${spatialHtml}</div>
        </details>
        <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden mb-4 group [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3.5 bg-[var(--hover-bg)] cursor-pointer flex justify-between items-center transition-colors select-none group-open:border-b border-[var(--card-border)]">
                <span class="font-bold text-[11px] uppercase tracking-widest text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg> Тренд открытых замечаний</span>
                <span class="text-slate-400 transition-transform duration-300 group-open:rotate-180"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg></span>
            </summary>
            <div class="p-3" style="height: 180px; position: relative; width: 100%;"><canvas id="sk-trend-chart"></canvas></div>
        </details>
        <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden mb-4 group [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3.5 bg-[var(--hover-bg)] cursor-pointer flex justify-between items-center transition-colors select-none group-open:border-b border-[var(--card-border)]">
                <span class="font-bold text-[11px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"></path></svg> Связано с проверками RBI</span>
                <span class="text-slate-400 transition-transform duration-300 group-open:rotate-180"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg></span>
            </summary>
            <div class="p-3 bg-slate-50 dark:bg-slate-900/50">${linkedHtml || '<div class="text-center py-4 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400 text-[10px] font-bold uppercase tracking-widest">Связанных подрядчиков не найдено</div>'}</div>
        </details>
        <details class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden mb-4 group [&_summary::-webkit-details-marker]:hidden">
            <summary class="p-3.5 bg-[var(--hover-bg)] cursor-pointer flex justify-between items-center transition-colors select-none group-open:border-b border-[var(--card-border)]">
                <span class="font-bold text-[11px] uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><svg class="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg> Изолированный анализ (Без связи)</span>
                <span class="text-slate-400 transition-transform duration-300 group-open:rotate-180"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg></span>
            </summary>
            <div class="p-3 bg-slate-50 dark:bg-slate-900/50">${unlinkedHtml || '<div class="text-center py-4 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400 text-[10px] font-bold uppercase tracking-widest">Все подрядчики связаны с RBI</div>'}</div>
        </details>`;

        setTimeout(function () {
            var ctxTrend = document.getElementById('sk-trend-chart');
            if (ctxTrend && typeof Chart !== 'undefined') {
                var monthsSet = new Set();
                activeRecords.forEach(function (r) {
                    if (r.date_issued) { var d = new Date(r.date_issued); monthsSet.add(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')); }
                });
                var sortedMonths = Array.from(monthsSet).sort();
                var labels = [], dataOpen = [], dataNew = [];
                sortedMonths.forEach(function (mKey) {
                    var parts2 = mKey.split('-'); var year2 = parts2[0]; var month2 = parts2[1];
                    var endOfMonth = new Date(year2, month2, 0, 23, 59, 59);
                    var startOfMonth = new Date(year2, month2 - 1, 1, 0, 0, 0);
                    labels.push(endOfMonth.toLocaleString('ru-RU', { month: 'short', year: '2-digit' }));
                    var openCount = 0, newCount = 0;
                    activeRecords.forEach(function (r) {
                        if (!r.date_issued) return;
                        var issued = new Date(r.date_issued);
                        var resolved = r.date_resolved ? new Date(r.date_resolved) : null;
                        if (issued >= startOfMonth && issued <= endOfMonth) newCount++;
                        if (issued <= endOfMonth && (!resolved || resolved > endOfMonth)) openCount++;
                    });
                    dataOpen.push(openCount); dataNew.push(newCount);
                });
                if (window.skTrendChartInstance) window.skTrendChartInstance.destroy();
                window.skTrendChartInstance = new Chart(ctxTrend, {
                    type: 'line',
                    data: { labels: labels, datasets: [{ label: 'Открыто на конец мес.', data: dataOpen, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 2, pointRadius: 4, fill: true, tension: 0.3 }, { label: 'Выдано новых', data: dataNew, borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0)', borderWidth: 2, borderDash: [5, 5], pointRadius: 3, fill: false, tension: 0.3 }] },
                    options: { animation: false, responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, font: { size: 9 } } } }, scales: { y: { beginAtZero: true } } }
                });
            }
        }, 100);
    };

    window.sk_renderHrTab = function () {
        var container = document.getElementById('sk-view-hr');
        if (!container) return;
        var role = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
        if (role === 'guest') { container.innerHTML = `<div class="text-center py-6 text-red-500 text-[11px] font-bold uppercase border border-red-200 bg-red-50 rounded-xl">Доступно только авторизованным сотрудникам</div>`; return; }
        if (window.skRecords.length === 0) { container.innerHTML = `<div class="text-center py-6 text-slate-400 text-[10px] font-bold uppercase border border-dashed border-[var(--card-border)] rounded-xl">Нет данных</div>`; return; }

        window.skBadRemarks = [];
        var calculateEngStats = function (recordsArray) {
            var engMap = {};
            recordsArray.forEach(function (r) {
                var baseName = r.inspector && r.inspector.trim() !== '' ? r.inspector.trim() : 'Не указан';
                var engName = baseName.toLowerCase().includes('технадзор') ? baseName : baseName + ' (Технадзор)';
                if (!engMap[engName]) engMap[engName] = { total: 0, open: 0, overdue: 0, withCategory: 0, matched: 0, closingTimes: [], contractors: new Set() };
                var d = engMap[engName];
                d.total++;
                if (r.contractor) d.contractors.add(r.contractor);
                var isOpen = !(r.is_verified_closed === true || r.status_normalized === 'verified' || String(r.status || '').toLowerCase().trim() === 'проверено');
                if (isOpen) d.open++;
                if (r.category && r.category !== 'Без категории') d.withCategory++;
                var textLower = r.text ? r.text.toLowerCase() : '';
                var hasNormative = /(сп\s*\d|гост|ПУЭ|снип|шифр|тр\s|тк\s|ппр|\d+\s*(мм|см|м|%|град)|(лист|л\.|узел|уз\.|пункт|п\.|приказ[а-я]*)\s*(№\s*|от\s*)?\d+)/i.test(textLower);
                if (hasNormative) { d.matched++; } else { if (r.text && r.text.length > 10) window.skBadRemarks.push({ eng: engName, text: r.text }); }
                var issued = r.date_issued ? new Date(r.date_issued) : null;
                var deadline = r.deadline ? new Date(r.deadline) : null;
                var resolved = r.date_resolved ? new Date(r.date_resolved) : null;
                var now = new Date();
                if (deadline) {
                    if (isOpen && now > deadline) d.overdue++;
                    else if (!isOpen && resolved && resolved > deadline) d.overdue++;
                }
                if (!isOpen && issued && resolved) { var daysToClose = Math.ceil((resolved - issued) / (1000 * 60 * 60 * 24)); if (daysToClose >= 0) d.closingTimes.push(daysToClose); }
            });
            return Object.keys(engMap).map(function (name) {
                var d = engMap[name];
                var avgTime = d.closingTimes.length > 0 ? Math.round(d.closingTimes.reduce(function (a, b) { return a + b; }, 0) / d.closingTimes.length) : 0;
                var overduePerc = d.total > 0 ? Math.round((d.overdue / d.total) * 100) : 0;
                var catPerc = d.total > 0 ? Math.round((d.withCategory / d.total) * 100) : 0;
                var accuracyPerc = d.total > 0 ? Math.round((d.matched / d.total) * 100) : 0;
                var kpi = Math.max(0, 100 - overduePerc + (catPerc === 100 ? 10 : 0));
                return { name: name, total: d.total, open: d.open, overduePerc: overduePerc, accuracyPerc: accuracyPerc, avgTime: avgTime, kpi: kpi };
            });
        };

        var baseRecords = window.skRecords;
        if (typeof activeMultiFilters !== 'undefined' && activeMultiFilters.analytics.project.length > 0) {
            var fProj = activeMultiFilters.analytics.project;
            baseRecords = baseRecords.filter(function (r) { return fProj.includes(r.project_display_name) || fProj.includes(r.project_canonical_key) || fProj.includes(r.display_name); });
        }

        var selPeriod = document.getElementById('global-filter-period') && document.getElementById('global-filter-period').value || 'ALL';
        var currentRecords = baseRecords, prevRecords = [];
        var now = new Date();
        if (selPeriod === 'WEEK') {
            var startCurr = new Date(now); startCurr.setDate(now.getDate() - 7);
            var startPrev = new Date(startCurr); startPrev.setDate(startCurr.getDate() - 7);
            currentRecords = window.skRecords.filter(function (r) { return r.date_issued && new Date(r.date_issued) >= startCurr; });
            prevRecords = window.skRecords.filter(function (r) { return r.date_issued && new Date(r.date_issued) >= startPrev && new Date(r.date_issued) < startCurr; });
        } else if (selPeriod === 'MONTH') {
            var startCurr2 = new Date(now); startCurr2.setDate(now.getDate() - 30);
            var startPrev2 = new Date(startCurr2); startPrev2.setDate(startCurr2.getDate() - 30);
            currentRecords = window.skRecords.filter(function (r) { return r.date_issued && new Date(r.date_issued) >= startCurr2; });
            prevRecords = window.skRecords.filter(function (r) { return r.date_issued && new Date(r.date_issued) >= startPrev2 && new Date(r.date_issued) < startCurr2; });
        } else {
            currentRecords = window.skRecords;
        }

        var currentStats = calculateEngStats(currentRecords);
        var prevStats = calculateEngStats(prevRecords);
        currentStats.sort(function (a, b) {
            var valA = a[window.skHrSortBy], valB = b[window.skHrSortBy];
            if (valA < valB) return window.skHrSortDesc ? 1 : -1;
            if (valA > valB) return window.skHrSortDesc ? -1 : 1;
            return 0;
        });

        var renderTrend = function (curr, prev, inverse) {
            if (prev === undefined) return '';
            var diff = curr - prev;
            if (diff === 0) return '<span class="text-[9px] text-slate-300 ml-1 font-black">▬</span>';
            var isGood = inverse ? diff < 0 : diff > 0;
            var color = isGood ? 'text-green-500' : 'text-red-500';
            var sign = diff > 0 ? '▲' : '▼';
            return '<span class="text-[9px] ' + color + ' ml-1 font-black">' + sign + Math.abs(diff) + '</span>';
        };

        var rowsHtml = currentStats.map(function (e, idx) {
            var rankColor = idx === 0 ? 'bg-yellow-400 text-white shadow-sm' : 'bg-slate-100 text-slate-500 dark:bg-slate-800';
            var accColor = e.accuracyPerc >= 80 ? 'text-green-600' : (e.accuracyPerc >= 50 ? 'text-orange-500' : 'text-red-600');
            var prevE = prevStats.find(function (p) { return p.name === e.name; });
            var prevKpi = prevE ? prevE.kpi : undefined;
            var prevAcc = prevE ? prevE.accuracyPerc : undefined;
            var prevOver = prevE ? prevE.overduePerc : undefined;
            return `<tr class="border-b border-[var(--card-border)] hover:bg-[var(--hover-bg)] transition-colors"><td class="p-2.5 flex items-center gap-2"><div class="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black ${rankColor} shrink-0">${idx + 1}</div><div class="font-bold text-[11px] text-slate-800 dark:text-white truncate max-w-[120px]" title="${e.name}">${e.name}</div></td><td class="p-2.5 text-center text-[11px] font-black text-slate-600 dark:text-slate-400">${e.total}</td><td class="p-2.5 text-center text-[12px] font-bold ${e.overduePerc > 20 ? 'text-red-600' : 'text-green-600'}">${e.overduePerc}% ${renderTrend(e.overduePerc, prevOver, true)}</td><td class="p-2.5 text-center text-[12px] font-black ${accColor}">${e.accuracyPerc}% ${renderTrend(e.accuracyPerc, prevAcc, false)}</td><td class="p-2.5 text-center text-[11px] font-bold text-slate-500">${e.avgTime} дн.</td><td class="p-2.5 text-center text-[13px] font-black ${e.kpi >= 80 ? 'text-green-600' : 'text-red-500'} bg-slate-50 dark:bg-slate-900/50 rounded-r-lg">${e.kpi} ${renderTrend(e.kpi, prevKpi, false)}</td></tr>`;
        }).join('');

        container.innerHTML = `
        <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm overflow-hidden mb-4">
            <div class="p-3.5 bg-[var(--hover-bg)] border-b border-[var(--card-border)] flex justify-between items-center">
                <div>
                    <div class="font-black text-[12px] uppercase text-slate-800 dark:text-white mb-0.5">Рейтинг инженеров СК (KPI)</div>
                    <div class="text-[9px] text-[var(--text-muted)] leading-snug font-medium">KPI = 100 - %Просрочки + Бонусы.<br>Тренд (▲▼) показывает динамику по сравнению с предыдущим периодом.</div>
                </div>
            </div>
            <div class="overflow-x-auto custom-scrollbar">
                <table class="w-full text-left whitespace-nowrap">
                    <thead class="bg-slate-50 dark:bg-slate-900 text-[9px] text-[var(--text-muted)] uppercase tracking-wider select-none">
                        <tr>
                            <th class="p-3 cursor-pointer hover:text-indigo-500 transition-colors" onclick="window.sk_sortHrTable('name')">Инженер СК <span class="text-indigo-500">${window.skHrSortBy === 'name' ? (window.skHrSortDesc ? '▼' : '▲') : ''}</span></th>
                            <th class="p-3 text-center cursor-pointer hover:text-indigo-500 transition-colors" onclick="window.sk_sortHrTable('total')">Выдал <span class="text-indigo-500">${window.skHrSortBy === 'total' ? (window.skHrSortDesc ? '▼' : '▲') : ''}</span></th>
                            <th class="p-3 text-center cursor-pointer hover:text-indigo-500 transition-colors" onclick="window.sk_sortHrTable('overduePerc')">Просрочка <span class="text-indigo-500">${window.skHrSortBy === 'overduePerc' ? (window.skHrSortDesc ? '▼' : '▲') : ''}</span></th>
                            <th class="p-3 text-center text-indigo-600 font-black cursor-pointer hover:text-indigo-800 transition-colors" onclick="window.sk_sortHrTable('accuracyPerc')">Точность <span class="text-indigo-800">${window.skHrSortBy === 'accuracyPerc' ? (window.skHrSortDesc ? '▼' : '▲') : ''}</span></th>
                            <th class="p-3 text-center cursor-pointer hover:text-indigo-500 transition-colors" onclick="window.sk_sortHrTable('avgTime')">Ср. Время <span class="text-indigo-500">${window.skHrSortBy === 'avgTime' ? (window.skHrSortDesc ? '▼' : '▲') : ''}</span></th>
                            <th class="p-3 text-center text-indigo-600 font-black cursor-pointer hover:text-indigo-800 transition-colors" onclick="window.sk_sortHrTable('kpi')">KPI <span class="text-indigo-800">${window.skHrSortBy === 'kpi' ? (window.skHrSortDesc ? '▼' : '▲') : ''}</span></th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml || '<tr><td colspan="6" class="text-center p-4 text-slate-400 text-xs">Нет данных за период</td></tr>'}</tbody>
                </table>
            </div>
        </div>
        <div class="bg-indigo-50 border border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800 rounded-xl p-4 shadow-sm">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <div class="text-[12px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 mb-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> AI-Тренер (Разбор ошибок)</div>
                    <div class="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 leading-snug pr-4 font-medium">Нейросеть выберет несколько реальных предписаний без нормативов, объяснит гарантийные риски и покажет, как нужно было написать правильно.</div>
                </div>
                <button onclick="window.sk_auditTemplatesAi()" class="bg-indigo-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase shadow-md active:scale-95 transition-transform shrink-0">Разобрать</button>
            </div>
            <div id="sk-ai-templates-res" class="hidden mt-3 p-4 bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-700 rounded-xl text-[11px] leading-relaxed text-slate-800 dark:text-slate-200 shadow-inner font-medium max-h-[300px] overflow-y-auto custom-scrollbar"></div>
        </div>`;
    };

    window.sk_showInfoModal = function (type) {
        var title = '', body = '';
        if (type === 'cmi') {
            title = 'Индекс Зрелости (CMI)';
            body = `<div class="text-[12px] leading-relaxed text-slate-700 dark:text-slate-300 space-y-3"><p><b>CMI (Control Maturity Index)</b> оценивает дисциплину подрядчика при устранении предписаний Стройконтроля.</p><div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-[10px] text-center">CMI = (%Вовремя × 0.6) + ((100 - %Просрочки) × 0.4) - Глубина</div><div class="bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-indigo-500 p-2 text-[10px]"><b>Пример:</b> У подрядчика 10 замечаний. 8 закрыто вовремя, 2 просрочено (в среднем на 5 дней).<br>CMI = (80% × 0.6) + ((100 - 20%) × 0.4) - 5 дней = 48 + 32 - 5 = <b>75 баллов</b>.</div><p>🟢 <b>≥ 70</b> — Отлично.<br>🟡 <b>40 – 69</b> — Средне.<br>🔴 <b>< 40</b> — Срыв сроков.</p></div>`;
        } else if (type === 'isd') {
            title = 'Индекс Соответствия (ИСД)';
            body = `<div class="text-[12px] leading-relaxed text-slate-700 dark:text-slate-300 space-y-3"><p><b>ИСД</b> — это детектор сокрытия брака.</p><div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-[10px] text-center">ИСД = (Факт в ПК СК / Ожидаемый Брак) × 100%</div><p>🔴 <b>ИСД < 20%</b> — Аномалия. Обязательный выезд на объект.</p></div>`;
        } else if (type === 'hr') {
            title = 'KPI Инженеров СК';
            body = `<div class="text-[12px] leading-relaxed text-slate-700 dark:text-slate-300 space-y-3"><p><b>KPI</b> оценивает качество ведения Стройконтроля конкретным инженером.</p><div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-[10px] text-center">KPI = 100 - %Просрочки + Бонус (10)</div></div>`;
        }
        var modal = document.getElementById('modal-overlay');
        document.getElementById('modal-icon').innerHTML = '';
        document.getElementById('modal-title').innerHTML = '<div class="text-center font-black uppercase text-lg text-indigo-600 dark:text-indigo-400">' + title + '</div>';
        document.getElementById('modal-body').innerHTML = body + '<div class="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700"><button onclick="closeModal()" class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[12px] uppercase shadow-md active:scale-95 transition-transform">Понятно</button></div>';
        document.body.classList.add('modal-open');
        modal.style.display = 'flex';
    };

    window.sk_deleteRecord = async function (recordId) {
        var record = window.skRecords.find(function (r) { return String(r.id) === String(recordId); });
        if (!record) return;
        if (!sk_canDeleteRecord(record)) return showToast('⚠️ Инженер может удалить только свои записи ПК СК. Остальные роли не имеют права удаления.');
        var role = sk_getCurrentRole();
        var confirmText = ['manager', 'deputy_manager'].includes(role)
            ? 'Удалить это замечание ПК СК? У вас есть право удалить любую запись.'
            : 'Удалить это замечание ПК СК? Вы можете удалять только свои загруженные записи.';
        if (!confirm(confirmText)) return;
        var nowIso = new Date().toISOString();
        record._deleted = true; record.is_deleted = true;
        record.deleted_at = nowIso; record._deletedAt = nowIso;
        record._updatedAt = nowIso; record.updated_at = nowIso; record.updatedAt = nowIso;
        record.source = 'local'; record.syncStatus = 'not_synced'; record.sync_status = 'not_synced';
        record.syncBlockReason = ''; record.sync_block_reason = '';
        await _storage().put(_storage().stores().SK_RECORDS, record);
        window.skRecords = window.skRecords.filter(function (r) { return String(r.id) !== String(recordId); });
        sk_renderDashboard();
        localStorage.setItem('rbi_cloud_dirty', '1');
        _sync('silent');
        showToast('🗑️ Замечание ПК СК удалено');
    };

    window.sk_openCategoryLinkModal = function (rawCategory) {
        var optionsHtml = '<option value="">-- Выберите правильный вид работ --</option>';
        if (typeof SYSTEM_TEMPLATES !== 'undefined') {
            Object.keys(SYSTEM_TEMPLATES).forEach(function (k) { optionsHtml += '<option value="' + SYSTEM_TEMPLATES[k].title + '">' + SYSTEM_TEMPLATES[k].title + '</option>'; });
        }
        if (typeof userTemplates !== 'undefined') {
            Object.keys(userTemplates).forEach(function (k) { optionsHtml += '<option value="' + userTemplates[k].title + '">' + userTemplates[k].title + '</option>'; });
        }
        var modal = document.getElementById('modal-overlay');
        document.getElementById('modal-icon').innerHTML = `<div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-2xl mx-auto mb-2 border border-indigo-200">🔗</div>`;
        document.getElementById('modal-title').innerHTML = `<div class="text-center font-black uppercase text-lg">Связь видов работ</div>`;
        document.getElementById('modal-body').innerHTML = `
        <div class="text-[11px] text-slate-600 text-center mb-4">Объедините категорию из ПК СК с правильным названием чек-листа в RBI.</div>
        <div class="bg-red-50 text-red-600 p-2 rounded-lg border border-red-200 text-center text-[11px] font-bold mb-3">Из ПК СК: "${rawCategory}"</div>
        <div class="text-center text-slate-400 mb-3">⬇️ будет считаться как ⬇️</div>
        <select id="sk-category-link-select" class="input-base !py-2 text-[11px] font-bold mb-4">${optionsHtml}</select>
        <div class="flex gap-2">
            <button onclick="closeModal()" class="flex-1 bg-slate-100 text-slate-600 py-3.5 rounded-xl font-bold text-[11px] uppercase active:scale-95 border">Отмена</button>
            <button onclick="sk_saveCategoryLink('${rawCategory.replace(/'/g, "\\'")}')" class="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-black text-[11px] uppercase shadow-md active:scale-95">Связать</button>
        </div>`;
        document.body.classList.add('modal-open');
        modal.style.display = 'flex';
    };

    window.sk_saveCategoryLink = async function (rawCategory) {
        var targetCategory = document.getElementById('sk-category-link-select').value;
        if (!targetCategory) return showToast('⚠️ Выберите вид работ из списка!');
        var key = window.sk_normalizeCategoryKey(rawCategory);
        window.skCategoryMap[key] = targetCategory;
        await _storage().put(_storage().stores().SK_CATEGORY_MAP, { id: 'main', data: window.skCategoryMap, source: 'local', syncStatus: 'not_synced', sync_status: 'not_synced', updatedAt: new Date().toISOString(), updated_at: new Date().toISOString() });
        var updatedCount = 0;
        var nowIso = new Date().toISOString();
        for (var r of window.skRecords) {
            var currentCatKey = window.sk_normalizeCategoryKey(r.category);
            if (currentCatKey === key || r.category === rawCategory) {
                r.category = targetCategory; r.ai_category = targetCategory; r.category_corrected = true;
                r.updated_at = nowIso; r.updatedAt = nowIso; r._updatedAt = nowIso;
                r.source = 'local'; r.syncStatus = 'not_synced'; r.sync_status = 'not_synced';
                await _storage().put(_storage().stores().SK_RECORDS, r);
                updatedCount++;
            }
        }
        closeModal();
        showToast('✅ Связь установлена! Обновлено записей: ' + updatedCount);
        localStorage.setItem('rbi_cloud_dirty', '1');
        _sync('silent');
        setTimeout(function () { sk_renderDashboard(); }, 300);
    };

    window.sk_openContractorLinkModal = async function () {
        var queue = await sk_getPendingContractorsQueue();
        if (!queue.length) { showToast('✅ Неподтверждённых подрядчиков нет'); return; }
        var canApprove = sk_canApproveContractorLink();
        var modalTitle = canApprove ? 'Связать подрядчика' : 'Отправить заявку на подрядчика';
        var modalDescription = canApprove ? 'Выберите название из ПК СК и создайте для него единое имя подрядчика.' : 'Выберите подрядчика из ПК СК и предложите единое название. Заявка уйдёт администратору на подтверждение.';
        var actionButtonText = canApprove ? 'Связать' : 'Отправить заявку';
        var optionsHtml = queue.map(function (q, idx) { return '<option value="' + idx + '">' + String(q.raw_name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</option>'; }).join('');
        var modalHtml = `
        <div id="sk-contractor-link-modal" class="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="bg-[var(--card-bg)] w-full max-w-md rounded-2xl border border-[var(--card-border)] shadow-2xl overflow-hidden">
                <div class="p-4 border-b border-[var(--card-border)]">
                    <div class="text-[13px] font-black uppercase text-slate-800 dark:text-white">${modalTitle}</div>
                    <div class="text-[10px] font-bold text-slate-500 mt-1 leading-snug">${modalDescription}</div>
                </div>
                <div class="p-4 space-y-3">
                    <div><label class="block text-[10px] font-black uppercase text-slate-500 mb-1">Подрядчик из ПК СК</label><select id="sk-link-raw-contractor" class="input-base w-full" onchange="sk_fillContractorSuggestion()">${optionsHtml}</select></div>
                    <div><label class="block text-[10px] font-black uppercase text-slate-500 mb-1">Единое название подрядчика</label><input id="sk-link-display-name" class="input-base w-full" placeholder="Например: ООО &quot;СК Каменный город&quot;"></div>
                    <div><label class="block text-[10px] font-black uppercase text-slate-500 mb-1">Технический ключ</label><input id="sk-link-canonical-key" class="input-base w-full" placeholder="Например: sk_kamenny_gorod"></div>
                </div>
                <div class="p-4 border-t border-[var(--card-border)] flex justify-end gap-2">
                    <button onclick="sk_closeContractorLinkModal()" class="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Отмена</button>
                    <button onclick="sk_saveContractorLink()" class="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-indigo-600 text-white shadow active:scale-95">${actionButtonText}</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.body.classList.add('modal-open');
        window.skContractorQueueForModal = queue;
        setTimeout(function () { sk_fillContractorSuggestion(); }, 50);
    };

    window.sk_closeContractorLinkModal = function () {
        var modal = document.getElementById('sk-contractor-link-modal');
        if (modal) modal.remove();
        document.body.classList.remove('modal-open');
    };

    window.sk_fillContractorSuggestion = function () {
        var select = document.getElementById('sk-link-raw-contractor');
        var displayInput = document.getElementById('sk-link-display-name');
        var keyInput = document.getElementById('sk-link-canonical-key');
        if (!select || !displayInput || !keyInput) return;
        var queue = window.skContractorQueueForModal || [];
        var item = queue[Number(select.value)];
        if (!item) return;
        var raw = String(item.raw_name || '').trim();
        displayInput.value = raw;
        if (window.ContractorDirectory && typeof window.ContractorDirectory.makeCanonicalKey === 'function') {
            keyInput.value = window.ContractorDirectory.makeCanonicalKey(raw);
        } else {
            keyInput.value = raw.toLowerCase().replace(/ё/g, 'е').replace(/["'«»]/g, '').replace(/\b(ооо|оао|зао|пао|ао|ип)\b/gi, '').replace(/[^a-zа-я0-9]+/gi, '_').replace(/^_+|_+$/g, '');
        }
    };

    window.sk_saveContractorLink = async function () {
        try {
            var select = document.getElementById('sk-link-raw-contractor');
            var displayInput = document.getElementById('sk-link-display-name');
            var keyInput = document.getElementById('sk-link-canonical-key');
            if (!select || !displayInput || !keyInput) return;
            var queue = window.skContractorQueueForModal || [];
            var item = queue[Number(select.value)];
            if (!item) { showToast('⚠️ Не выбран подрядчик'); return; }
            var rawName = String(item.raw_name || '').trim();
            var displayName = String(displayInput.value || '').trim();
            var canonicalKey = String(keyInput.value || '').trim();
            if (!rawName || !displayName || !canonicalKey) { showToast('⚠️ Заполните название и технический ключ'); return; }
            var projectCode = _syncConfig().projectCode || 'LOCAL';
            var currentUser = sk_getCurrentUserName();
            var nowIso = new Date().toISOString();

            if (!sk_canApproveContractorLink()) {
                var allQueue = await _storage().getAll(_storage().stores().CONTRACTOR_QUEUE) || [];
                var updatedQueue = 0;
                for (var q of allQueue) {
                    if (String(q.raw_name || '').trim().toLowerCase() === rawName.toLowerCase()) {
                        q.status = 'pending'; q.suggested_canonical_key = canonicalKey;
                        q.admin_comment = 'Заявка от инженера: предложено связать с "' + displayName + '"';
                        q.created_by = q.created_by || currentUser;
                        q.proposed_display_name = displayName; q.proposed_canonical_key = canonicalKey;
                        q.proposed_by = currentUser; q.proposed_at = nowIso;
                        q.source = 'local'; q.syncStatus = 'not_synced'; q.sync_status = 'not_synced';
                        q.syncBlockReason = ''; q.sync_block_reason = '';
                        q.updated_at = nowIso; q.updatedAt = nowIso;
                        await _storage().put(_storage().stores().CONTRACTOR_QUEUE, q);
                        updatedQueue++;
                    }
                }
                if (updatedQueue === 0) {
                    var request = {
                        id: 'contractor_queue_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
                        project_code: projectCode, raw_name: rawName, cleaned_name: rawName.toLowerCase().trim(),
                        suggested_canonical_key: canonicalKey, source_table: 'sk_records', source_record_id: '',
                        created_by: currentUser, status: 'pending',
                        admin_comment: 'Заявка от инженера: предложено связать с "' + displayName + '"',
                        proposed_display_name: displayName, proposed_canonical_key: canonicalKey,
                        proposed_by: currentUser, proposed_at: nowIso,
                        created_at: nowIso, updated_at: nowIso, updatedAt: nowIso,
                        source: 'local', syncStatus: 'not_synced', sync_status: 'not_synced',
                        syncBlockReason: '', sync_block_reason: ''
                    };
                    await _storage().put(_storage().stores().CONTRACTOR_QUEUE, request);
                }
                localStorage.setItem('rbi_cloud_dirty', '1');
                sk_closeContractorLinkModal();
                showToast('📨 Заявка на подрядчика отправлена администратору');
                setTimeout(function () { _sync('silent'); }, 500);
                await sk_renderContractorQueueBanner();
                return;
            }

            var contractor = {
                id: 'contractor_' + projectCode + '_' + canonicalKey, project_code: projectCode,
                canonical_key: canonicalKey, display_name: displayName, synonyms: [rawName], inn: '',
                created_by: currentUser, is_deleted: false, _deleted: false,
                created_at: nowIso, updated_at: nowIso, updatedAt: nowIso,
                source: 'local', syncStatus: 'not_synced', sync_status: 'not_synced', syncBlockReason: '', sync_block_reason: ''
            };
            var alias = {
                id: 'contractor_alias_' + projectCode + '_' + Date.now().toString(36), project_code: projectCode,
                raw_name: rawName, canonical_key: canonicalKey, created_by: currentUser,
                created_at: nowIso, updated_at: nowIso, updatedAt: nowIso,
                source: 'local', syncStatus: 'not_synced', sync_status: 'not_synced', syncBlockReason: '', sync_block_reason: ''
            };
            await _storage().put(_storage().stores().CONTRACTOR_DIRECTORY, contractor);
            await _storage().put(_storage().stores().CONTRACTOR_ALIASES, alias);

            var allQueue2 = await _storage().getAll(_storage().stores().CONTRACTOR_QUEUE) || [];
            for (var q2 of allQueue2) {
                if (String(q2.raw_name || '').trim().toLowerCase() === rawName.toLowerCase()) {
                    q2.status = 'linked'; q2.suggested_canonical_key = canonicalKey;
                    q2.admin_comment = 'Связано пользователем в ПК СК';
                    q2.updated_at = nowIso; q2.updatedAt = nowIso;
                    await _storage().put(_storage().stores().CONTRACTOR_QUEUE, q2);
                }
            }

            var records2 = await _storage().getAll(_storage().stores().SK_RECORDS) || [];
            var updated = 0;
            for (var r2 of records2) {
                var recRaw = String(r2.contractor_raw || r2.raw_contractor || r2.contractor || '').trim();
                if (recRaw.toLowerCase() === rawName.toLowerCase()) {
                    r2.contractor = displayName; r2.contractorName = displayName; r2.contractor_name = displayName;
                    r2.contractor_raw = rawName; r2.raw_contractor = rawName;
                    r2.contractor_canonical_key = canonicalKey; r2.contractor_normalization_status = 'matched';
                    r2.source = 'local'; r2.syncStatus = 'not_synced'; r2.sync_status = 'not_synced';
                    r2.syncBlockReason = ''; r2.sync_block_reason = '';
                    r2.updated_at = nowIso; r2.updatedAt = nowIso; r2._updatedAt = nowIso;
                    await _storage().put(_storage().stores().SK_RECORDS, r2);
                    updated++;
                }
            }

            if (window.ContractorDirectory) await window.ContractorDirectory.init();
            localStorage.setItem('rbi_cloud_dirty', '1');
            var historyUpdated = 0;
            if (typeof window.applyContractorAliasToInspectionHistory === 'function') {
                historyUpdated = await window.applyContractorAliasToInspectionHistory(rawName, canonicalKey, displayName);
            }
            showToast('✅ Подрядчик связан. ПК СК: ' + updated + ', история: ' + historyUpdated);
            sk_closeContractorLinkModal();
            await sk_loadData();
            sk_renderMainTab();
            setTimeout(function () { _sync('silent'); }, 500);
        } catch (e) {
            console.error('[ПК СК] Ошибка связывания подрядчика:', e);
            showToast('❌ Не удалось связать подрядчика');
        }
    };

    window.sk_generateAnomalyTasks = async function () {
        var _allInspections = _inspections();
        if (!window.skRecords || window.skRecords.length === 0) return;
        if (!window.rbi_tasksData) return;
        var skIssues = { open: [], cmi: [] };
        var contrMap = {};
        window.skRecords.forEach(function (r) {
            if (r.is_deleted || r._deleted) return;
            var c = r.contractor;
            if (!contrMap[c]) contrMap[c] = { total: 0, open: 0, overdueCount: 0, closedCount: 0, closedOnTimeCount: 0, overdueDaysArr: [] };
            var data = contrMap[c];
            data.total++;
            var isOpen = r.status && r.status.toLowerCase().includes('не устран');
            if (isOpen) data.open++;
            var deadline = r.deadline ? new Date(r.deadline) : null;
            var resolved = r.date_resolved ? new Date(r.date_resolved) : null;
            var now = new Date();
            if (resolved && !isOpen) data.closedCount++;
            if (deadline) {
                if (isOpen && now > deadline) { data.overdueCount++; data.overdueDaysArr.push(Math.floor((now - deadline) / (1000 * 60 * 60 * 24))); }
                else if (!isOpen && resolved) {
                    if (resolved > deadline) { data.overdueCount++; data.overdueDaysArr.push(Math.floor((resolved - deadline) / (1000 * 60 * 60 * 24))); }
                    else { data.closedOnTimeCount++; }
                }
            }
        });
        var rbiContractors = [...new Set(_allInspections.map(function (c) { return c.contractorName ? c.contractorName.toLowerCase().trim() : ''; }))];
        for (var cName in contrMap) {
            var data = contrMap[cName];
            var isLinked = rbiContractors.includes(cName.toLowerCase().trim()) || Object.values(window.skContractorMap || {}).includes(cName);
            if (isLinked) {
                if (data.open > 2) skIssues.open.push(cName);
                var overduePerc = data.total > 0 ? Math.round((data.overdueCount / data.total) * 100) : 0;
                var avgOverdueDepth = data.overdueDaysArr.length > 0 ? Math.round(data.overdueDaysArr.reduce(function (a, b) { return a + b; }, 0) / data.overdueDaysArr.length) : 0;
                var onTimePerc = data.closedCount > 0 ? Math.round((data.closedOnTimeCount / data.closedCount) * 100) : 100;
                var cmi = 100;
                if (data.total > 0) { cmi = Math.round((onTimePerc * 0.6) + ((100 - overduePerc) * 0.4) - Math.min(avgOverdueDepth, 30)); cmi = Math.max(0, Math.min(100, cmi)); }
                if (cmi < 70 && data.total > 2) skIssues.cmi.push(cName);
            }
        }
        var taskTitle = 'Анализ проблем ПК СК';
        var activeTasks = window.rbi_tasksData.filter(function (t) { return t.title === taskTitle && t.status === 'pending'; });
        if (activeTasks.length > 1) {
            for (var i = 1; i < activeTasks.length; i++) { activeTasks[i]._deleted = true; await _storage().put(_storage().stores().TASKS, activeTasks[i]); }
            window.rbi_tasksData = window.rbi_tasksData.filter(function (t) { return !t._deleted; });
        }
        var existingTask = window.rbi_tasksData.find(function (t) { return t.title === taskTitle && t.status === 'pending'; });
        if (skIssues.open.length === 0 && skIssues.cmi.length === 0) {
            if (existingTask) { existingTask.status = 'done'; existingTask.done = 1; existingTask.resultComment = 'Показатели в норме'; existingTask.updatedAt = new Date().toISOString(); await _storage().put(_storage().stores().TASKS, existingTask); if (typeof rbi_renderTasksList === 'function') rbi_renderTasksList(); }
        } else {
            var promptLines = [];
            if (skIssues.open.length > 0) promptLines.push('⚠️ Много открытых замечаний:\n- ' + [...new Set(skIssues.open)].join('\n- '));
            if (skIssues.cmi.length > 0) promptLines.push('⏱ Низкий Индекс Зрелости (срывы сроков):\n- ' + [...new Set(skIssues.cmi)].join('\n- '));
            var fullPrompt = 'Выявлены проблемы по СВЯЗАННЫМ подрядчикам в Стройконтроле:\n\n' + promptLines.join('\n\n');
            if (existingTask) {
                if (existingTask.prompt !== fullPrompt) { existingTask.prompt = fullPrompt; existingTask.updatedAt = new Date().toISOString(); await _storage().put(_storage().stores().TASKS, existingTask); }
            } else {
                var newTask = {
                    id: 'tsk_sk_systemic_alert', type: 'auto', category: 'meeting',
                    engineerName: sk_getCurrentUserName(), inspectorName: sk_getCurrentUserName(),
                    icon: 'Совещание', taskType: 'Аналитика СК', contractor: 'Системная',
                    project: (document.getElementById('inp-project') && document.getElementById('inp-project').value) || 'Все',
                    templateKey: '', workTitle: 'Аналитика СК', title: taskTitle, prompt: fullPrompt,
                    status: 'pending', priorityLvl: 3, date: new Date().toISOString(),
                    target: 1, done: 0, carryOverCount: 0,
                    history: ['[' + new Date().toLocaleDateString('ru-RU') + '] Задача создана модулем ПК СК.'],
                    updatedAt: new Date().toISOString(), _deleted: false
                };
                window.rbi_tasksData.unshift(newTask);
                await _storage().put(_storage().stores().TASKS, newTask);
            }
            if (typeof rbi_renderTasksList === 'function') rbi_renderTasksList();
        }
    };

    // =========================================================================
    // МОДУЛЬ + РЕГИСТРАЦИЯ В RBI.registry
    // =========================================================================
    var skModule = {
        _ctx: null,
        _mounted: false,

        init: function (ctx) {
            this._ctx = ctx || {};
            console.log('[sk] init');
        },

        mount: function (root, params) {
            this._mounted = true;
            console.log('[sk] mount', params || {});
            if (typeof sk_renderMainTab === 'function') sk_renderMainTab();
        },

        unmount: function () {
            this._mounted = false;
            console.log('[sk] unmount');
        },

        loadData: function () { return window.sk_loadData && window.sk_loadData(); },
        renderMainTab: function () { return window.sk_renderMainTab && window.sk_renderMainTab(); },
        switchView: function (view) { return window.sk_switchView && window.sk_switchView(view); },
        sortHrTable: function (col) { return window.sk_sortHrTable && window.sk_sortHrTable(col); },
        handleExcelImport: function (e) { return window.sk_handleExcelImport && window.sk_handleExcelImport(e); },
        showMappingModal: function (h, s) { return window.sk_showMappingModal && window.sk_showMappingModal(h, s); },
        executeImport: function (m) { return window.sk_executeImport && window.sk_executeImport(m); },
        showNormalizationModal: function () { return window.sk_showNormalizationModal && window.sk_showNormalizationModal(); },
        resolvePair: function (i, m) { return window.sk_resolvePair && window.sk_resolvePair(i, m); },
        finalizeImport: function () { return window.sk_finalizeImport && window.sk_finalizeImport(); },
        normalizeCategoryKey: function (v) { return window.sk_normalizeCategoryKey && window.sk_normalizeCategoryKey(v); },
        renderDashboard: function () { return window.sk_renderDashboard && window.sk_renderDashboard(); },
        renderHrTab: function () { return window.sk_renderHrTab && window.sk_renderHrTab(); },
        renderContractorQueueBanner: function () { return window.sk_renderContractorQueueBanner && window.sk_renderContractorQueueBanner(); },
        showInfoModal: function (t) { return window.sk_showInfoModal && window.sk_showInfoModal(t); },
        renderVolumes: function () { return window.sk_renderVolumes && window.sk_renderVolumes(); },
        addVolume: function () { return window.sk_addVolume && window.sk_addVolume(); },
        deleteVolume: function (n) { return window.sk_deleteVolume && window.sk_deleteVolume(n); },
        clearData: function () { return window.sk_clearData && window.sk_clearData(); },
        deleteRecord: function (id) { return window.sk_deleteRecord && window.sk_deleteRecord(id); },
        openCategoryLinkModal: function (c) { return window.sk_openCategoryLinkModal && window.sk_openCategoryLinkModal(c); },
        saveCategoryLink: function (c) { return window.sk_saveCategoryLink && window.sk_saveCategoryLink(c); },
        openContractorLinkModal: function () { return window.sk_openContractorLinkModal && window.sk_openContractorLinkModal(); },
        closeContractorLinkModal: function () { return window.sk_closeContractorLinkModal && window.sk_closeContractorLinkModal(); },
        fillContractorSuggestion: function () { return window.sk_fillContractorSuggestion && window.sk_fillContractorSuggestion(); },
        saveContractorLink: function () { return window.sk_saveContractorLink && window.sk_saveContractorLink(); },
        generateAnomalyTasks: function () { return window.sk_generateAnomalyTasks && window.sk_generateAnomalyTasks(); }
    };

    if (window.RBI && window.RBI.registry) {
        window.RBI.registry.register('sk', skModule);
        console.log('[sk] registered in RBI.registry');
    } else {
        console.warn('[sk] RBI.registry недоступен — модуль работает автономно');
    }

    console.log('[sk] sk.legacy.js v2.0 loaded — all functions inlined');

    // Фоновая предзагрузка при старте
    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(function () {
            if (typeof sk_loadData === 'function') sk_loadData().catch(function () {});
        }, 2500);
    });

})();

// ═══ Блок 13: Интеграция SK Module (вне IIFE) ════════════════════════════════
(function () {
    'use strict';
    // Fallback-регистрация: legacy-заглушка до загрузки ES-модуля sk.module.js
    if (window.RBI && window.RBI.registry && !window.RBI.registry.get('module.sk')) {
        window.RBI.registry.register('module.sk', {
            id: 'sk',
            _isLegacyStub: true,
            init: function () {},
            mount: function () {
                if (typeof window.sk_renderMainTab === 'function') window.sk_renderMainTab();
            },
            unmount: function () {}
        });
    }
}());
