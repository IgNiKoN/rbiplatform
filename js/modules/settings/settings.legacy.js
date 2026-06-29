/**
 * settings.legacy.js
 * Модуль настроек RBI Quality Pro.
 * Зарегистрирован в RBI.registry как 'quality.settings'.
 *
 * Содержит реальный код из js/app.js:
 *   loadSettings, saveSettings, renderSettingsTab, toggleSetting,
 *   resetSettingsToDefault, applySettingsToUI,
 *   rbiGetSavedThemePreference, rbiSaveThemePreference,
 *   clearPdfCache, previewStorageCleanup
 *
 * Оригинальные функции в app.js НЕ удалены.
 * Window-прокси установлены для функций, вызываемых из index.html.
 */

(function () {
    'use strict';

    // ─── Вспомогательные константы ───────────────────────────────────────────

    var RBI_ALLOWED_THEMES_LOCAL = ['auto', 'light', 'dark', 'rbi-light', 'rbi-dark'];

    // ─── Вспомогательные функции изоляции ────────────────────────────────────

    // Фаза 92: единая точка доступа к IndexedDB через StorageService или fallback
    function _storage() {
        if (window.RBI && window.RBI.services && window.RBI.services.storage) {
            return window.RBI.services.storage;
        }
        return {
            stores: function() { return typeof window.STORES !== 'undefined' ? window.STORES : {}; },
            get: function(store, key) { return window.dbGet(store, key); },
            put: function(store, data) { return window.dbPut(store, data); }
        };
    }

    // Фаза 64: изоляция записи appSettings через SettingsService с fallback
    function _setSetting(key, value) {
        if (window.RBI && window.RBI.services && window.RBI.services.settings) {
            window.RBI.services.settings.set(key, value);
            return;
        }
        if (window.appSettings) window.appSettings[key] = value;
    }

    // Фаза 141: единая точка чтения настроек через SettingsService или fallback
    function _getSetting(key) {
        if (window.RBI && window.RBI.services && window.RBI.services.settings) {
            return window.RBI.services.settings.get(key);
        }
        return window.appSettings ? window.appSettings[key] : undefined;
    }

    // ─── Приватные функции ────────────────────────────────────────────────────

    function _rbiGetSavedThemePreference() {
        var value = localStorage.getItem('rbi_theme_preference');
        return RBI_ALLOWED_THEMES_LOCAL.includes(value) ? value : null;
    }

    function _rbiSaveThemePreference(value) {
        var theme = RBI_ALLOWED_THEMES_LOCAL.includes(value) ? value : 'auto';
        localStorage.setItem('rbi_theme_preference', theme);
        return theme;
    }

    async function _loadSettings() {
        try {
            var data = await _storage().get(_storage().stores().SETTINGS, 'user_prefs');
            if (data) Object.assign(window.appSettings, data);

            var savedTheme = _rbiGetSavedThemePreference();

            if (savedTheme) {
                window.appSettings.theme = savedTheme;
            } else if (!RBI_ALLOWED_THEMES_LOCAL.includes(window.appSettings.theme)) {
                window.appSettings.theme = 'auto';
                _rbiSaveThemePreference('auto');
            }

        } catch (e) {
            console.error('Ошибка загрузки настроек', e);
            window.appSettings.theme = _rbiGetSavedThemePreference() || 'auto';
        }
    }

    async function _saveSettings(key, value) {
        if (key === 'theme') {
            value = _rbiSaveThemePreference(value);
        }

        _setSetting(key, value);

        _applySettingsToUI();

        try {
            await _storage().put(_storage().stores().SETTINGS, Object.assign({ key: 'user_prefs' }, window.appSettings));
        } catch (e) {
            console.error('Ошибка сохранения настроек', e);
        }
    }

    function _renderSettingsTab() {
        // 1. Базовые селекторы оформления
        if (document.getElementById('set-theme')) document.getElementById('set-theme').value = _getSetting('theme') || 'auto';
        if (document.getElementById('set-fontsize')) document.getElementById('set-fontsize').value = _getSetting('fontSize') || 'medium';
        if (document.getElementById('set-navpos')) document.getElementById('set-navpos').value = _getSetting('navPosition') || 'auto';
        if (document.getElementById('set-dashmode')) document.getElementById('set-dashmode').value = _getSetting('dashboardMode') || 'compact';

        // 2. Переключатели логики
        if (document.getElementById('set-swipe')) document.getElementById('set-swipe').checked = _getSetting('swipeEnabled');
        if (document.getElementById('set-collapse')) document.getElementById('set-collapse').checked = _getSetting('autoCollapseOk');
        if (document.getElementById('set-groups-col')) document.getElementById('set-groups-col').checked = _getSetting('defaultGroupsCollapsed');
        if (document.getElementById('set-fast')) document.getElementById('set-fast').checked = _getSetting('fastMode');

        if (document.getElementById('set-storage-auto-cleanup')) {
            document.getElementById('set-storage-auto-cleanup').checked = _getSetting('storageAutoCleanupEnabled') !== false;
        }
        if (document.getElementById('set-storage-cleanup-threshold')) {
            document.getElementById('set-storage-cleanup-threshold').value = String(_getSetting('storageCleanupThresholdPercent') || 80);
        }
        if (document.getElementById('set-storage-photo-ttl')) {
            document.getElementById('set-storage-photo-ttl').value = String(_getSetting('storageInspectionPhotoTtlDays') || 60);
        }
        if (document.getElementById('set-storage-report-ttl')) {
            document.getElementById('set-storage-report-ttl').value = String(_getSetting('storageReportTtlDays') || 30);
        }
        if (document.getElementById('set-storage-doc-ttl')) {
            document.getElementById('set-storage-doc-ttl').value = String(_getSetting('storageDocTtlDays') || _getSetting('storageKnowledgeFileTtlDays') || 60);
        }
        if (document.getElementById('set-storage-twi-node-ttl')) {
            document.getElementById('set-storage-twi-node-ttl').value = String(_getSetting('storageTwiTtlDays') || _getSetting('storageNodeTtlDays') || 90);
        }
        if (document.getElementById('set-storage-practice-ttl')) {
            document.getElementById('set-storage-practice-ttl').value = String(_getSetting('storagePracticeTtlDays') || 60);
        }

        // 3. Аналитика
        if (document.getElementById('set-ana-pareto')) document.getElementById('set-ana-pareto').checked = _getSetting('anaEngPareto');
        if (document.getElementById('set-ana-trend')) document.getElementById('set-ana-trend').checked = _getSetting('anaOpTrend');
        if (document.getElementById('set-ana-leader')) document.getElementById('set-ana-leader').checked = _getSetting('anaOpLeader');
        if (document.getElementById('set-ana-ai')) document.getElementById('set-ana-ai').checked = _getSetting('anaEngAi');
        if (document.getElementById('set-ana-photos')) document.getElementById('set-ana-photos').checked = _getSetting('anaEngPhotos');
        if (document.getElementById('set-ana-top')) document.getElementById('set-ana-top').checked = _getSetting('anaOpTopDefects');
        if (document.getElementById('set-task-meeting')) document.getElementById('set-task-meeting').value = _getSetting('taskMeetingDay') || '1';
        if (document.getElementById('set-task-fmea')) document.getElementById('set-task-fmea').value = _getSetting('taskFmeaDay') || '5';
        if (document.getElementById('set-task-month')) document.getElementById('set-task-month').value = _getSetting('taskMonthReportDay') || '1';

        // 3.5. AI-настройки
        if (document.getElementById('set-ai-enabled')) {
            document.getElementById('set-ai-enabled').checked = _getSetting('aiEnabled');
            document.getElementById('ai-settings-body').style.display = _getSetting('aiEnabled') ? 'block' : 'none';
        }
        if (document.getElementById('set-ai-key')) document.getElementById('set-ai-key').value = _getSetting('apiKey') || '';
        if (document.getElementById('set-ai-corp-pwd')) document.getElementById('set-ai-corp-pwd').value = _getSetting('aiCorpPwd') || '';

        var aiModes = document.getElementsByName('ai-mode');
        if (aiModes.length > 0) {
            var mode = _getSetting('aiAuthMode') || 'role';
            document.getElementById('corporate-pwd-field').classList.add('hidden');
            document.getElementById('personal-key-field').classList.add('hidden');

            if (mode === 'role') {
                aiModes[0].checked = true;
            } else if (mode === 'corporate') {
                aiModes[1].checked = true;
                document.getElementById('corporate-pwd-field').classList.remove('hidden');
            } else if (mode === 'personal') {
                aiModes[2].checked = true;
                document.getElementById('personal-key-field').classList.remove('hidden');
            }
        }

        // 4. Автоматизация бэкапов
        if (document.getElementById('set-autocache')) document.getElementById('set-autocache').checked = _getSetting('autoCacheCloudFiles');
        if (document.getElementById('set-autobackup')) document.getElementById('set-autobackup').checked = _getSetting('autoBackupEnabled');
        if (document.getElementById('set-autobackup-day')) document.getElementById('set-autobackup-day').value = _getSetting('autoBackupDay') || '5';
        if (document.getElementById('set-autobackup-share')) document.getElementById('set-autobackup-share').checked = _getSetting('autoBackupShare');
        if (document.getElementById('set-automanager')) document.getElementById('set-automanager').checked = _getSetting('autoManagerEnabled');
        if (document.getElementById('set-automanager-day')) document.getElementById('set-automanager-day').value = _getSetting('autoManagerDay') || '5';

        // 5. Брендирование и Авто-отчёты
        if (document.getElementById('set-brand-color')) document.getElementById('set-brand-color').value = _getSetting('brandColor') || '#4f46e5';
        if (document.getElementById('set-auto-report')) document.getElementById('set-auto-report').checked = _getSetting('autoReportEnabled');
        if (document.getElementById('set-auto-report-day')) document.getElementById('set-auto-report-day').value = _getSetting('autoReportDay') || '1';
        if (document.getElementById('set-auto-report-type')) document.getElementById('set-auto-report-type').value = _getSetting('autoReportType') || 'global_onepager';

        var logoPreview = document.getElementById('brand-logo-preview');
        var logoImg = document.getElementById('brand-logo-img');
        if (logoPreview && logoImg) {
            if (_getSetting('brandLogo')) {
                logoImg.src = _getSetting('brandLogo');
                logoPreview.classList.remove('hidden');
            } else {
                logoPreview.classList.add('hidden');
            }
        }

        if (typeof window.renderSyncUI === 'function') window.renderSyncUI();

        var brandControls = document.getElementById('corp-branding-controls');
        if (brandControls) {
            var currentRole = window.RbiRoles ? window.RbiRoles.getCurrentRole() : 'guest';
            var isAdmin = ['manager', 'deputy_manager', 'director'].includes(currentRole);
            var controlsHtml = '';

            if (isAdmin) {
                controlsHtml += '<div class="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg flex justify-between items-center mb-2 shadow-sm">' +
                    '<div>' +
                    '<div class="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase">Для всей команды</div>' +
                    '<div class="text-[9px] text-slate-500">Сделать стилем компании</div>' +
                    '</div>' +
                    '<button onclick="window.publishCorporateBranding()" class="bg-indigo-600 text-white px-3 py-2 rounded-lg text-[9px] font-bold active:scale-95 shadow-md uppercase">Опубликовать</button>' +
                    '</div>';
            }

            if (_getSetting('isBrandingCustomized')) {
                controlsHtml += '<button onclick="window.resetToCorporateBranding()" class="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 px-3 py-2.5 rounded-lg text-[10px] font-bold active:scale-95 shadow-sm uppercase flex items-center justify-center gap-2">' +
                    '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>' +
                    'Вернуть корпоративный стиль' +
                    '</button>';
            }

            brandControls.innerHTML = controlsHtml;
        }
    }

    function _toggleSetting(settingKey, element) {
        var val = element.type === 'checkbox' ? element.checked : element.value;
        _setSetting(settingKey, val);

        if (settingKey === 'brandColor') {
            _setSetting('isBrandingCustomized', true);
            _saveSettings('isBrandingCustomized', true);
        }

        _saveSettings(settingKey, val);
    }

    function _resetSettingsToDefault() {
        if (!confirm('Сбросить все настройки к значениям по умолчанию?')) return;

        var defaults = {
            userRole: 'engineer',
            cloudStatus: 'offline',
            assignedProjects: [],
            assignedContractor: '',
            contractorName: '',
            theme: 'auto', engineerName: '', defaultProject: '', fontSize: 'medium', navPosition: 'auto', swipeEnabled: false,
            autoCollapseOk: false, defaultGroupsCollapsed: false, fastMode: false,
            soundEnabled: true, autoSave: true, aiEnabled: false, autoCacheCloudFiles: true, pushEnabled: false, storageMode: 'adaptive',
            storageAutoCleanupEnabled: true,
            storageSilentCleanupEnabled: true,
            storageKeepAllIfFreeMB: 2048,
            storageSoftCleanupFreeMB: 1000,
            storageNormalCleanupFreeMB: 500,
            storageCriticalCleanupFreeMB: 250,
            storageSoftThresholdPercent: 60,
            storageCleanupThresholdPercent: 80,
            storageCriticalThresholdPercent: 90,
            storageInspectionPhotoTtlDays: 60,
            storageKnowledgeFileTtlDays: 45,
            storageReportTtlDays: 30,
            storageTwiTtlDays: 90,
            storageNodeTtlDays: 90,
            storagePracticeTtlDays: 60,
            storageDocTtlDays: 60,
            storageCleanupOnlyCloudBackedFiles: true,
            storageLastCleanupAt: null,
            storagePersistentRequestedAt: null,
            storagePersistentGranted: false, aiAuto: false, apiKey: '', dashboardMode: 'compact',
            anaEngPareto: true, anaOpTrend: true, anaOpLeader: true, anaEngAi: true, anaEngPhotos: true, anaOpTopDefects: true,
            autoBackupEnabled: false, autoBackupDay: '5', autoBackupShare: false, autoManagerEnabled: false, autoManagerDay: '5',
            brandColor: '#1c2b39', brandLogo: '', autoReportEnabled: false, autoReportDay: '1', autoReportType: 'global_onepager'
        };
        // Мутируем существующий объект, чтобы не разрывать ссылку с app.js (let appSettings)
        Object.keys(window.appSettings).forEach(function (k) { delete window.appSettings[k]; });
        Object.assign(window.appSettings, defaults);
        _rbiSaveThemePreference('auto');
        window.appSettings.theme = 'auto';

        _saveSettings('dummy', 'dummy');
        _renderSettingsTab();
        _applySettingsToUI();

        setTimeout(function () {
            if (typeof window.updateBodyPadding === 'function') window.updateBodyPadding();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.body.classList.remove('modal-open');
        }, 100);

        if (typeof window.showToast === 'function') window.showToast('Настройки сброшены!');
    }

    function _applySettingsToUI() {
        var theme = _getSetting('theme') || 'auto';

        if (theme === 'auto') {
            var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = prefersDark ? 'dark' : 'light';
        }

        if (!['light', 'dark', 'rbi-light', 'rbi-dark'].includes(theme)) {
            theme = 'light';
        }

        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.classList.remove('light', 'dark', 'rbi-light', 'rbi-dark');
        document.documentElement.classList.add(theme);

        if (theme === 'dark' || theme === 'rbi-dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        } else {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
        }

        if (_getSetting('fastMode')) document.body.classList.add('fast-mode');
        else document.body.classList.remove('fast-mode');

        document.documentElement.classList.remove('font-small', 'font-medium', 'font-large', 'font-xlarge');
        document.documentElement.classList.add('font-' + (_getSetting('fontSize') || 'medium'));

        document.body.classList.remove('nav-pos-auto', 'nav-pos-top', 'nav-pos-bottom');
        document.body.classList.add('nav-pos-' + (_getSetting('navPosition') || 'auto'));

        var dash = document.getElementById('header-dashboard');
        var dashExp = document.getElementById('dash-expanded-view');
        var dashIcon = document.getElementById('dash-expand-icon');

        if (_getSetting('dashboardMode') === 'hidden') {
            if (dash) dash.style.display = 'none';
        } else if (_getSetting('dashboardMode') === 'expanded') {
            if (dash) dash.style.display = 'block';
            if (dashExp) dashExp.classList.remove('hidden');
            if (dashIcon) dashIcon.style.display = 'none';
        } else {
            if (dash) dash.style.display = 'block';
            if (dashExp) dashExp.classList.add('hidden');
            if (dashIcon) dashIcon.style.display = 'flex';
        }

        setTimeout(function () {
            if (typeof window.updateBodyPadding === 'function') window.updateBodyPadding();
        }, 150);

        var activeTab = document.querySelector('.view-section.active');
        if (activeTab && typeof window.updateFabButton === 'function') window.updateFabButton(activeTab.id);

        var aiBody = document.getElementById('ai-settings-body');
        if (aiBody) aiBody.style.display = _getSetting('aiEnabled') ? 'block' : 'none';

        var personalKeyBlock = document.getElementById('personal-key-field');
        if (personalKeyBlock) {
            if (_getSetting('usePersonalKey')) personalKeyBlock.classList.remove('hidden');
            else personalKeyBlock.classList.add('hidden');
        }

        if (typeof window.RbiRoles !== 'undefined') window.RbiRoles.applyUIConstraints();
        if (typeof window.ObjectDirectory !== 'undefined') window.ObjectDirectory.initUI();

        var themeSelect = document.getElementById('set-theme');
        if (themeSelect && themeSelect.value !== (_getSetting('theme') || 'auto')) {
            themeSelect.value = _getSetting('theme') || 'auto';
        }
    }

    async function _clearPdfCache() {
        var ok = confirm(
            'Очистить локальный кэш файлов?\n\n' +
            'Будут удалены только локальные копии файлов, которые уже есть в облаке.\n' +
            'Проверки, история, задачи, документы и файлы в Supabase не удаляются.\n\n' +
            'Без интернета очищенные файлы могут быть недоступны, но загрузятся снова при подключении.'
        );

        if (!ok) return;

        if (!window.RbiStorageManager || typeof window.RbiStorageManager.runManualRecoverableCacheCleanup !== 'function') {
            if (typeof window.showToast === 'function') window.showToast('⚠️ Менеджер хранилища не загружен');
            return;
        }

        if (typeof window.showToast === 'function') window.showToast('⏳ Очищаем восстановимый кэш...');
        await window.RbiStorageManager.runManualRecoverableCacheCleanup();
    }

    async function _previewStorageCleanup() {
        if (!window.RbiStorageManager || typeof window.RbiStorageManager.previewAdaptiveStorageCleanup !== 'function') {
            if (typeof window.showToast === 'function') window.showToast('⚠️ Менеджер хранилища не загружен');
            return;
        }

        if (typeof window.showToast === 'function') window.showToast('⏳ Проверяем файловый кэш...');

        var result = await window.RbiStorageManager.previewAdaptiveStorageCleanup('manual_preview');

        if (!result || result.error) {
            if (typeof window.showToast === 'function') window.showToast('❌ Не удалось проверить кэш');
            return;
        }
    }

    // ─── Модуль ───────────────────────────────────────────────────────────────

    var settingsModule = {
        _version: '1.0',
        _name: 'quality.settings',

        init: function () {
            console.log('[RBI Module] quality.settings v2.0 loaded (hard override)');
        },

        mount: function () {
            _renderSettingsTab();
        },

        unmount: function () {
        },

        loadSettings: _loadSettings,
        saveSettings: _saveSettings,
        renderSettingsTab: _renderSettingsTab,
        toggleSetting: _toggleSetting,
        resetSettingsToDefault: _resetSettingsToDefault,
        applySettingsToUI: _applySettingsToUI,
        clearPdfCache: _clearPdfCache,
        previewStorageCleanup: _previewStorageCleanup,
        rbiGetSavedThemePreference: _rbiGetSavedThemePreference,
        rbiSaveThemePreference: _rbiSaveThemePreference
    };

    // ─── Регистрация ──────────────────────────────────────────────────────────

    if (window.RBI && window.RBI.registry) {
        window.RBI.registry.register('quality.settings', settingsModule);
    }

    settingsModule.init();

    // ─── Window-прокси (для вызовов из index.html) ────────────────────────────

    window.loadSettings = _loadSettings;
    window.saveSettings = _saveSettings;
    window.renderSettingsTab = _renderSettingsTab;
    window.toggleSetting = _toggleSetting;
    window.resetSettingsToDefault = _resetSettingsToDefault;
    window.applySettingsToUI = _applySettingsToUI;
    window.clearPdfCache = _clearPdfCache;
    window.previewStorageCleanup = _previewStorageCleanup;
    window.rbiGetSavedThemePreference = _rbiGetSavedThemePreference;
    window.rbiSaveThemePreference = _rbiSaveThemePreference;

    console.log('[quality.settings] window-proxies installed (v2.0 hard override)');

}());
