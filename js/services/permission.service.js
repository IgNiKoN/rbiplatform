/* Файл: js/services/permission.service.js */
/* Permission Service v0.1 — legacy wrapper над window.RbiRoles */

(function () {
    'use strict';

    window.RBI = window.RBI || {};
    window.RBI.services = window.RBI.services || {};

    function roles() {
        return window.RbiRoles || null;
    }

    window.RBI.services.permissions = {

        getCurrentRole: function () {
            return roles() && roles().getCurrentRole ? roles().getCurrentRole() : 'guest';
        },

        getCloudStatus: function () {
            return roles() && roles().getCloudStatus ? roles().getCloudStatus() : 'offline';
        },

        getPermissions: function () {
            return roles() && roles().getPermissions ? roles().getPermissions() : {};
        },

        isAdmin: function () {
            return roles() && roles().isAdmin ? roles().isAdmin() : false;
        },

        isLeadership: function () {
            return roles() && roles().isLeadership ? roles().isLeadership() : false;
        },

        canManageSK: function () {
            return roles() && roles().canManageSK ? roles().canManageSK() : false;
        },

        canManageHierarchy: function () {
            return roles() && roles().canManageHierarchy ? roles().canManageHierarchy() : false;
        },

        canCreate: function () {
            return roles() && roles().canCreate ? roles().canCreate() : false;
        },

        canPush: function () {
            return roles() && roles().canPush ? roles().canPush() : false;
        },

        canEdit: function (ownerName) {
            return roles() && roles().canEdit ? roles().canEdit(ownerName || '') : false;
        },

        canDelete: function (ownerName) {
            return roles() && roles().canDelete ? roles().canDelete(ownerName || '') : false;
        },

        canManageRoles: function () {
            return roles() && roles().canManageRoles ? roles().canManageRoles() : false;
        },

        canManageObjects: function () {
            return roles() && roles().canManageObjects ? roles().canManageObjects() : false;
        },

        canEditKnowledgeBase: function () {
            return roles() && roles().canEditKnowledgeBase ? roles().canEditKnowledgeBase() : false;
        },

        canViewKnowledgeBase: function () {
            return roles() && roles().canViewKnowledgeBase ? roles().canViewKnowledgeBase() : true;
        },

        getCurrentEngineerName: function () {
            return roles() && roles().getCurrentEngineerName ? roles().getCurrentEngineerName() : 'Инженер';
        },

        getAssignedProjects: function () {
            return roles() && roles().getAssignedProjects ? roles().getAssignedProjects() : [];
        },

        getAssignedContractor: function () {
            return roles() && roles().getAssignedContractor ? roles().getAssignedContractor() : '';
        },

        // Универсальная точка проверки прав для новых модулей.
        // Вызывать как ctx.permissions.can('sk', 'manage').
        // Внутренняя реализация (конфиг-матрица role×module×action) — отдельная фаза.
        can: function (module, action) {
            var self = this;
            var key = module + ':' + action;
            var map = {
                'sk:manage':         function () { return self.canManageSK(); },
                'hierarchy:manage':  function () { return self.canManageHierarchy(); },
                'knowledge:edit':    function () { return self.canEditKnowledgeBase(); },
                'knowledge:view':    function () { return self.canViewKnowledgeBase(); },
                'roles:manage':      function () { return self.canManageRoles(); },
                'objects:manage':    function () { return self.canManageObjects(); },
                'inspection:create': function () { return self.canCreate(); },
                'inspection:push':   function () { return self.canPush(); },
                'inspection:edit':   function () { return self.canEdit(); },
                'inspection:delete': function () { return self.canDelete(); }
            };
            var handler = map[key];
            if (typeof handler === 'function') {
                return handler();
            }
            console.warn('[RBI.permissions.can] unknown module:action =', key);
            return false;
        }
    };

    if (window.RBI.registry) {
        window.RBI.registry.register('service.permissions', window.RBI.services.permissions);
    }

    console.log('[RBI Service] permissions loaded');
}());
