/**
 * knowledge.module.js
 * Модуль базы знаний — контракт платформы (id / routes / dependencies / init / mount / unmount).
 *
 * Оркестратор: загружает данные TWI/Docs/Nodes/Etalons из knowledge.service.js,
 * заполняет KnowledgeState и глобальные переменные для обратной совместимости,
 * эмитит knowledge:loaded, подписывается на sync:completed.
 *
 * Зависимости: window.RBI.services.knowledge, window.RBI.services.storage
 */

import { KnowledgeState }   from './knowledge.state.js';
import { KnowledgeRender }  from './knowledge.render.js';
import { KnowledgeActions } from './knowledge.actions.js';

export const KnowledgeModule = {
    id: 'knowledge',
    routes: ['/knowledge', '/knowledge/twi', '/knowledge/docs', '/knowledge/nodes', '/knowledge/etalons'],
    dependencies: ['storage', 'knowledge'],

    _syncUnsubscribe: null,

    /**
     * Инициализация: загружает все данные, записывает в глобальные переменные,
     * эмитит knowledge:loaded. Вызывается один раз при старте.
     */
    async init(ctx) {
        ctx.math      = window.RBI && window.RBI.utils && window.RBI.utils.math;
        ctx.toast     = window.RBI && window.RBI.utils && window.RBI.utils.toast;
        ctx.templates = window.RBI && window.RBI.utils && window.RBI.utils.templates;
        KnowledgeActions.bindCtx(ctx);

        const svc = (ctx && ctx.knowledge)
            || (window.RBI && window.RBI.services && window.RBI.services.knowledge);

        if (!svc) {
            console.warn('[KnowledgeModule] knowledge service недоступен');
            return;
        }

        await KnowledgeModule._loadAll(svc);

        // Подписка на завершение синхронизации — перезагрузить данные
        const events = (ctx && ctx.events) || (window.RBI && window.RBI.events);
        if (events && typeof events.on === 'function') {
            const handler = async () => {
                await KnowledgeModule._loadAll(svc);
                if (typeof window.renderTwiList === 'function') window.renderTwiList();
            };
            events.on('sync:completed', handler);
            KnowledgeModule._syncUnsubscribe = () => events.off && events.off('sync:completed', handler);
        }

        if (events && typeof events.emit === 'function') {
            events.emit('knowledge:loaded', {
                twiCards:   KnowledgeState.twiCards,
                customDocs: KnowledgeState.customDocs,
                customNodes: KnowledgeState.customNodes
            });
        }

        console.log('[KnowledgeModule] init complete');
    },

    /**
     * Загружает все 4 типа данных параллельно,
     * записывает в KnowledgeState (который синхронизирует с window.*).
     */
    async _loadAll(svc) {
        try {
            const [twiCards, customDocs, customNodes, etalonActs] = await Promise.all([
                svc.getTwiCards().catch(() => []),
                svc.getCustomDocs().catch(() => []),
                svc.getCustomNodes().catch(() => []),
                svc.getEtalonActs().catch(() => [])
            ]);

            KnowledgeState.setTwiCards((twiCards  || []).filter(function (c) { return !c._deleted; }));
            KnowledgeState.setDocs    ((customDocs || []).filter(function (d) { return !d._deleted; }));
            KnowledgeState.setNodes   ((customNodes|| []).filter(function (n) { return !n._deleted; }));
            KnowledgeState.setEtalons ((etalonActs || []).filter(function (a) { return !a._deleted; }));
        } catch (e) {
            console.error('[KnowledgeModule] ошибка загрузки данных:', e);
        }
    },

    /**
     * Рендер UI — вызывает KnowledgeRender.render с текущей вкладкой.
     */
    mount(container, ctx) {
        var tab = (ctx && ctx.tab) || 'twi';
        KnowledgeRender.render(tab);
    },

    /**
     * Очистка при уходе с вкладки.
     */
    unmount() {
        if (typeof KnowledgeModule._syncUnsubscribe === 'function') {
            KnowledgeModule._syncUnsubscribe();
            KnowledgeModule._syncUnsubscribe = null;
        }
    }
};

// Регистрация в реестре платформы
if (typeof window !== 'undefined' && window.RBI && window.RBI.registry) {
    window.RBI.registry.register('module.knowledge', KnowledgeModule);
}

console.log('[KnowledgeModule] knowledge.module.js loaded (ES module)');
