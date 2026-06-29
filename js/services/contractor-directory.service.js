/* Файл: js/services/contractor-directory.service.js */
/* Contractor Directory Service v0.1 — legacy wrapper над window.ContractorDirectory */

(function () {
    'use strict';

    window.RBI = window.RBI || {};
    window.RBI.services = window.RBI.services || {};

    window.RBI.services.contractors = {

        init: async function () {
            if (window.ContractorDirectory && typeof window.ContractorDirectory.init === 'function') {
                return window.ContractorDirectory.init();
            }
            return false;
        },

        list: function () {
            return (window.ContractorDirectory && window.ContractorDirectory.contractors) ? window.ContractorDirectory.contractors : [];
        },

        aliases: function () {
            return (window.ContractorDirectory && window.ContractorDirectory.aliases) ? window.ContractorDirectory.aliases : {};
        },

        normalize: async function (rawName) {
            if (window.ContractorDirectory && typeof window.ContractorDirectory.normalizeContractorName === 'function') {
                return window.ContractorDirectory.normalizeContractorName(rawName);
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
        window.RBI.registry.register('service.contractors', window.RBI.services.contractors);
    }

    console.log('[RBI Service] contractors loaded');
}());
