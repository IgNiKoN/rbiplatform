/**
 * sk.module.js
 * Модуль СК (Стройконтроль) — контракт платформы (id / routes / dependencies / init / mount / unmount).
 *
 * Оркестратор: загружает данные через SKActions.loadData(),
 * заполняет SKState и глобальные переменные для обратной совместимости,
 * эмитит sk:initialized, подписывается на sync:completed.
 *
 * Зависимости: window.RBI.services.sk, window.RBI.services.storage
 */

import { SKState } from './sk.state.js';
import { SKActions } from './sk.actions.js';
import { SKRender } from './sk.render.js';

export const SKModule = {
    id: 'sk',
    routes: ['/sk', '/sk/:subTab'],
    dependencies: ['storage', 'sk'],

    _syncUnsubscribe: null,

    /**
     * Инициализация: загружает все данные, подписывается на sync:completed.
     * Вызывается один раз при старте.
     */
    async init(ctx) {
        ctx.math      = window.RBI && window.RBI.utils && window.RBI.utils.math;
        ctx.toast     = window.RBI && window.RBI.utils && window.RBI.utils.toast;
        ctx.templates = window.RBI && window.RBI.utils && window.RBI.utils.templates;

        SKActions.bindCtx(ctx);

        await SKActions.loadData();

        // Подписка на завершение синхронизации — перезагрузить данные
        var events = (ctx && ctx.events) || (window.RBI && window.RBI.events);
        if (events && typeof events.on === 'function') {
            var handler = async function () {
                await SKActions.loadData();
                SKRender.render(SKState.currentSubTab);
            };
            events.on('sync:completed', handler);
            SKModule._syncUnsubscribe = function () {
                if (events.off) events.off('sync:completed', handler);
            };
        }

        if (events && typeof events.emit === 'function') {
            events.emit('sk:initialized', { records: SKState.records });
        }

        console.log('[SKModule] init complete, records:', SKState.records.length);
    },

    /**
     * Рендер UI — вызывает SKRender.render с текущей вкладкой.
     */
    mount(container, ctx) {
        var tab = (ctx && ctx.tab) || SKState.currentSubTab || 'dashboard';
        SKRender.render(tab);
    },

    /**
     * Очистка при уходе с вкладки.
     */
    unmount() {
        if (typeof SKModule._syncUnsubscribe === 'function') {
            SKModule._syncUnsubscribe();
            SKModule._syncUnsubscribe = null;
        }
    }
};

// Регистрация в реестре платформы (перезаписывает legacy-заглушку)
if (typeof window !== 'undefined' && window.RBI && window.RBI.registry) {
    window.RBI.registry.register('module.sk', SKModule);
}

console.log('[SKModule] sk.module.js loaded (ES module)');
