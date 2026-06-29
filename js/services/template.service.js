/* Файл: js/services/template.service.js */
/* Template Service v0.1 — единая точка доступа к шаблонам проверок */
/* Паттерн ленивых ссылок: каждый метод читает актуальное window.* в момент вызова */
/* CRUD для пользовательских шаблонов с делегированием в app.js + эмит events */

(function () {
    'use strict';

    if (typeof window === 'undefined') { return; }

    window.RBI = window.RBI || {};
    window.RBI.services = window.RBI.services || {};

    window.RBI.services.templates = {

        /* ── Геттеры (read-only, ленивые ссылки) ── */

        getUserTemplates: function () {
            return Array.isArray(window.userTemplates) ? window.userTemplates : [];
        },

        getSystemTemplates: function () {
            return (typeof window.SYSTEM_TEMPLATES !== 'undefined') ? window.SYSTEM_TEMPLATES : {};
        },

        getByKey: function (key) {
            var sys = (typeof window.SYSTEM_TEMPLATES !== 'undefined') ? window.SYSTEM_TEMPLATES : {};
            if (sys[key] !== undefined) { return sys[key]; }
            var user = Array.isArray(window.userTemplates) ? window.userTemplates : [];
            for (var i = 0; i < user.length; i++) {
                if (user[i].key === key || user[i].id === key) { return user[i]; }
            }
            return null;
        },

        getAll: function () {
            var sys = (typeof window.SYSTEM_TEMPLATES !== 'undefined') ? window.SYSTEM_TEMPLATES : {};
            var sysArr = Object.keys(sys).map(function (k) { return sys[k]; });
            var user = Array.isArray(window.userTemplates) ? window.userTemplates : [];
            return sysArr.concat(user);
        },

        isSystemTemplate: function (key) {
            var sys = (typeof window.SYSTEM_TEMPLATES !== 'undefined') ? window.SYSTEM_TEMPLATES : {};
            return Object.prototype.hasOwnProperty.call(sys, key);
        },

        /* ── CRUD (пользовательские шаблоны) ── */

        saveUserTemplate: function (data) {
            /* Делегируем в window.saveUserTemplate (app.js), если доступна */
            if (typeof window.saveUserTemplate === 'function') {
                try {
                    window.saveUserTemplate(data);
                    this._emitChanged();
                    return;
                } catch (e) {
                    console.warn('[TemplateService] window.saveUserTemplate ошибка, fallback:', e);
                }
            }

            /* Fallback: сохраняем самостоятельно через storage.service / dbPut */
            var storeName = (window.STORES && window.STORES.USER_TEMPLATES)
                || (window.STORES && window.STORES.TEMPLATES)
                || 'user_templates';

            var record = Object.assign({}, data, {
                syncStatus: data.syncStatus || 'pending',
                updated_at: data.updated_at || new Date().toISOString()
            });

            if (window.RBI && window.RBI.services && window.RBI.services.storage &&
                    typeof window.RBI.services.storage.save === 'function') {
                window.RBI.services.storage.save(storeName, record)
                    .then(function () {
                        /* Обновить window.userTemplates в памяти */
                        if (Array.isArray(window.userTemplates)) {
                            var idx = window.userTemplates.findIndex(function (t) {
                                return t.key === record.key || t.id === record.id;
                            });
                            if (idx >= 0) {
                                window.userTemplates[idx] = record;
                            } else {
                                window.userTemplates.push(record);
                            }
                        }
                        this._emitChanged();
                    }.bind(this))
                    .catch(function (e) {
                        console.error('[TemplateService] ошибка сохранения:', e);
                    });
                return;
            }

            /* Последний fallback — прямой dbPut */
            if (typeof window.dbPut === 'function') {
                window.dbPut(storeName, record).then(function () {
                    this._emitChanged();
                }.bind(this));
            }
        },

        deleteUserTemplate: function (key) {
            /* Делегируем в window.deleteUserTemplate (app.js), если доступна */
            if (typeof window.deleteUserTemplate === 'function') {
                try {
                    window.deleteUserTemplate(key);
                    this._emitChanged();
                    return;
                } catch (e) {
                    console.warn('[TemplateService] window.deleteUserTemplate ошибка, fallback:', e);
                }
            }

            /* Fallback: soft-delete через storage.service */
            var storeName = (window.STORES && window.STORES.USER_TEMPLATES)
                || (window.STORES && window.STORES.TEMPLATES)
                || 'user_templates';

            if (window.RBI && window.RBI.services && window.RBI.services.storage &&
                    typeof window.RBI.services.storage.softDelete === 'function') {
                window.RBI.services.storage.softDelete(storeName, key)
                    .then(function () {
                        this._emitChanged();
                    }.bind(this))
                    .catch(function (e) {
                        console.error('[TemplateService] ошибка удаления:', e);
                    });
            }
        },

        /* ── Внутренний хелпер ── */

        _emitChanged: function () {
            var events = window.RBI && window.RBI.events;
            if (events && typeof events.emit === 'function') {
                events.emit('templates:changed', {});
            }
        }
    };

    if (window.RBI.registry) {
        window.RBI.registry.register('service.templates', window.RBI.services.templates);
    }

    console.log('[RBI Service] template.service loaded');
}());
