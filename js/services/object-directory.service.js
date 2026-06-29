/* Файл: js/services/object-directory.service.js */
/* Object Directory Service v0.1 — legacy wrapper над window.ObjectDirectory */

(function () {
    'use strict';

    window.RBI = window.RBI || {};
    window.RBI.services = window.RBI.services || {};

    window.RBI.services.objects = {

        init: async function () {
            if (window.ObjectDirectory && typeof window.ObjectDirectory.init === 'function') {
                return window.ObjectDirectory.init();
            }
            return false;
        },

        list: function () {
            return (window.ObjectDirectory && window.ObjectDirectory.objects) ? window.ObjectDirectory.objects : [];
        },

        aliases: function () {
            return (window.ObjectDirectory && window.ObjectDirectory.aliases) ? window.ObjectDirectory.aliases : {};
        },

        normalize: async function (rawName, options) {
            var opts = options || {};
            if (window.ObjectDirectory && typeof window.ObjectDirectory.normalizeProjectName === 'function') {
                return window.ObjectDirectory.normalizeProjectName(rawName, opts.isFromSkImport === true);
            }
            return {
                status: rawName ? 'unmapped' : 'empty',
                raw_name: rawName || '',
                canonical_key: '',
                display_name: rawName || 'Не указан'
            };
        }
    };

    if (window.RBI.registry) {
        window.RBI.registry.register('service.objects', window.RBI.services.objects);
    }

    console.log('[RBI Service] objects loaded');
}());
