/**
 * history.module.js
 * Модуль истории проверок — контракт платформы (id / routes / dependencies / init / mount / unmount).
 *
 * Оркестратор: загружает данные через HistoryActions,
 * подписывается на sync:completed и inspection:created → перезагружает список,
 * эмитит history:initialized.
 *
 * Зависимости: window.RBI.services.inspections, window.RBI.services.storage
 */

import { HistoryActions } from './history.actions.js';
import { HistoryRender }  from './history.render.js';

export const HistoryModule = {
    id: 'history',
    routes: ['/history', '/history/:id'],
    dependencies: ['storage', 'inspections'],

    _unsubscribeSync: null,
    _unsubscribeCreated: null,

    async init(ctx) {
        HistoryActions.bindCtx(ctx);

        const events = ctx && ctx.events;

        // 1. Загрузить данные
        await HistoryActions.loadRecords();

        // 2. Подписаться на sync:completed → перезагрузить
        if (events && typeof events.on === 'function') {
            const onSync = async () => {
                await HistoryActions.loadRecords();
                HistoryRender.render();
            };
            events.on('sync:completed', onSync);
            HistoryModule._unsubscribeSync = () => events.off && events.off('sync:completed', onSync);
        }

        // 3. Подписаться на inspection:created → перезагрузить
        if (events && typeof events.on === 'function') {
            const onCreated = async () => {
                await HistoryActions.loadRecords();
                HistoryRender.render();
            };
            events.on('inspection:created', onCreated);
            HistoryModule._unsubscribeCreated = () => events.off && events.off('inspection:created', onCreated);
        }

        // 4. Эмитить history:initialized
        if (events && typeof events.emit === 'function') {
            events.emit('history:initialized', {});
        }

        console.log('[HistoryModule] init complete');
    },

    mount(container, ctx) {
        const tab = (ctx && ctx.tab) || null;
        HistoryRender.render(tab);
    },

    unmount() {
        if (typeof HistoryModule._unsubscribeSync === 'function') {
            HistoryModule._unsubscribeSync();
            HistoryModule._unsubscribeSync = null;
        }
        if (typeof HistoryModule._unsubscribeCreated === 'function') {
            HistoryModule._unsubscribeCreated();
            HistoryModule._unsubscribeCreated = null;
        }
    }
};

if (typeof window !== 'undefined' && window.RBI && window.RBI.registry) {
    window.RBI.registry.register('module.history', HistoryModule);
}

console.log('[HistoryModule] history.module.js loaded (ES module)');
