(function () {
    'use strict';
    if (typeof window === 'undefined') { return; }
    window.RBI = window.RBI || {};
    window.RBI.utils = window.RBI.utils || {};

    window.RBI.utils.templates = {
        getSystemTemplates: function () {
            if (window.RBI && window.RBI.services && window.RBI.services.masterData) {
                return window.RBI.services.masterData.getSystemTemplates();
            }
            return (typeof window.SYSTEM_TEMPLATES !== 'undefined') ? window.SYSTEM_TEMPLATES : {};
        },
        getUserTemplates: function () {
            if (window.RBI && window.RBI.services && window.RBI.services.masterData) {
                return window.RBI.services.masterData.getUserTemplates();
            }
            return Array.isArray(window.userTemplates) ? window.userTemplates : [];
        },
        getByKey: function (key) {
            if (window.RBI && window.RBI.services && window.RBI.services.masterData) {
                return window.RBI.services.masterData.getTemplateByKey(key);
            }
            var sys = (typeof window.SYSTEM_TEMPLATES !== 'undefined') ? window.SYSTEM_TEMPLATES : {};
            if (sys[key] !== undefined) { return sys[key]; }
            var user = Array.isArray(window.userTemplates) ? window.userTemplates : [];
            for (var i = 0; i < user.length; i++) {
                if (user[i].key === key || user[i].id === key) { return user[i]; }
            }
            return null;
        },
        getAllKeys: function () {
            var sys = (typeof window.SYSTEM_TEMPLATES !== 'undefined') ? window.SYSTEM_TEMPLATES : {};
            var sysKeys = Object.keys(sys);
            var user = Array.isArray(window.userTemplates) ? window.userTemplates : [];
            var userKeys = user.map(function (t) { return t.key || t.id; }).filter(Boolean);
            return sysKeys.concat(userKeys.filter(function (k) { return sysKeys.indexOf(k) === -1; }));
        },
        isSystemTemplate: function (key) {
            var sys = (typeof window.SYSTEM_TEMPLATES !== 'undefined') ? window.SYSTEM_TEMPLATES : {};
            return Object.prototype.hasOwnProperty.call(sys, key);
        }
    };

    if (window.RBI.registry) {
        window.RBI.registry.register('utils.templates', window.RBI.utils.templates);
    }
    console.log('[RBI Utils] templates loaded');
}());
