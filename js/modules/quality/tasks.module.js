/**
 * tasks.module.js
 * Модуль задач — контракт платформы (id / routes / dependencies / init / mount / unmount).
 *
 * Оркестратор: загружает задачи и расписание из task.service.js,
 * заполняет TasksState (и глобальные переменные для обратной совместимости),
 * эмитит tasks:loaded, подписывается на sync:completed.
 *
 * Зависимости: window.RBI.services.tasks, window.RBI.services.storage
 */

import { TasksState }   from './tasks.state.js';
import { TasksRender }  from './tasks.render.js';
import { TasksActions } from './tasks.actions.js';

export const TasksModule = {
    id: 'tasks',
    routes: ['/tasks', '/tasks/calendar', '/tasks/schedule'],
    dependencies: ['storage', 'tasks'],

    _syncUnsubscribe: null,

    /**
     * Инициализация: загружает задачи и расписание параллельно,
     * записывает в TasksState (который синхронизирует с window.*),
     * эмитит tasks:loaded. Вызывается один раз при старте.
     */
    async init(ctx) {
        TasksActions.bindCtx(ctx);

        const svc = ctx && ctx.tasks;

        if (!svc) {
            console.warn('[TasksModule] task service недоступен');
            return;
        }

        await TasksModule._loadAll(svc);

        // Подписка на завершение синхронизации — перезагрузить данные
        const events = ctx && ctx.events;
        if (events && typeof events.on === 'function') {
            const handler = async () => {
                await TasksModule._loadAll(svc);
                if (typeof window.executeRenderTasks === 'function') {
                    window.executeRenderTasks();
                }
            };
            events.on('sync:completed', handler);
            TasksModule._syncUnsubscribe = () => events.off && events.off('sync:completed', handler);
        }

        if (events && typeof events.emit === 'function') {
            events.emit('tasks:loaded', {
                tasks:    TasksState.tasks,
                schedule: TasksState.schedule
            });
        }

        console.log('[TasksModule] init complete');
    },

    /**
     * Загружает задачи и расписание параллельно, записывает в TasksState.
     */
    async _loadAll(svc) {
        try {
            const [allTasks, allSchedule] = await Promise.all([
                svc.getAllTasks().catch(function () { return []; }),
                svc.getAllSchedule().catch(function () { return []; })
            ]);

            TasksState.setTasks(
                (allTasks || []).filter(function (t) { return !t._deleted && !t.is_deleted; })
            );
            TasksState.setSchedule(allSchedule || []);
        } catch (e) {
            console.error('[TasksModule] ошибка загрузки данных:', e);
        }
    },

    /**
     * Рендер UI — вызывает TasksRender.render с текущей вкладкой.
     */
    mount(container, ctx) {
        var tab = (ctx && ctx.tab) || 'list';
        TasksRender.render(tab);
    },

    /**
     * Очистка при уходе с вкладки.
     */
    unmount() {
        if (typeof TasksModule._syncUnsubscribe === 'function') {
            TasksModule._syncUnsubscribe();
            TasksModule._syncUnsubscribe = null;
        }
    }
};

// Регистрация в реестре платформы
if (typeof window !== 'undefined' && window.RBI && window.RBI.registry) {
    window.RBI.registry.register('module.tasks', TasksModule);
}

console.log('[TasksModule] tasks.module.js loaded (ES module)');
