import { gameStats, addPoints, showToast, saveGameStats, updateScoreUI } from './storage.js';
import { audio } from './utils.js';

const TASKS_KEY = 'dailyTasks';
const TASKS_LIST = [
    { id: 'solve_2_crosswords', name: 'Решить 2 кроссворда', target: 2, progress: 0, reward: 50 },
    { id: 'earn_100_points', name: 'Заработать 100 очков', target: 100, progress: 0, reward: 50 },
    { id: 'use_hint', name: 'Использовать подсказку', target: 1, progress: 0, reward: 30 },
    { id: 'buy_skin', name: 'Купить скин', target: 1, progress: 0, reward: 40 },
    { id: 'win_roulette', name: 'Выиграть в рулетке 50+ очков', target: 50, progress: 0, reward: 60 },
    { id: 'complete_any_word', name: 'Угадать любое слово', target: 3, progress: 0, reward: 30 }
];

let currentTasks = [];

// Загрузка/генерация заданий на сегодня
export function loadDailyTasks() {
    const today = new Date().toDateString();
    const stored = localStorage.getItem(TASKS_KEY);
    if (stored) {
        const data = JSON.parse(stored);
        if (data.date === today) {
            currentTasks = data.tasks;
            return;
        }
    }
    // Новый день – выбираем 3 случайных задания
    const shuffled = [...TASKS_LIST].sort(() => 0.5 - Math.random());
    currentTasks = shuffled.slice(0, 3).map(t => ({ ...t, progress: 0 }));
    localStorage.setItem(TASKS_KEY, JSON.stringify({ date: today, tasks: currentTasks }));
}

// Обновить прогресс задания (вызывать при соответствующих событиях)
export function updateTaskProgress(taskId, increment = 1, customValue = null) {
    const task = currentTasks.find(t => t.id === taskId);
    if (!task || task.progress >= task.target) return;

    let delta = increment;
    if (customValue !== null) delta = customValue;

    task.progress = Math.min(task.target, task.progress + delta);
    if (task.progress >= task.target) {
        addPoints(task.reward);
        showToast(`✅ Задание выполнено: ${task.name} (+${task.reward} очков)!`, "success");
        audio.pop();
    }
    saveDailyTasks();
}

function saveDailyTasks() {
    const today = new Date().toDateString();
    localStorage.setItem(TASKS_KEY, JSON.stringify({ date: today, tasks: currentTasks }));
}

// Получить текущие задания для отображения в UI
export function getCurrentTasks() {
    return currentTasks;
}

// Инициализация UI панели заданий (добавить в index.html отдельный блок)
export function renderDailyTasksPanel() {
    const container = document.getElementById('dailyTasksContainer');
    if (!container) return;
    if (currentTasks.length === 0) loadDailyTasks();
    container.innerHTML = '<h3>📋 Ежедневные задания</h3>';
    currentTasks.forEach(task => {
        const percent = (task.progress / task.target) * 100;
        container.innerHTML += `
            <div class="daily-task">
                <div class="task-name">${task.name}</div>
                <div class="task-progress"><div style="width:${percent}%;"></div></div>
                <div class="task-reward">+${task.reward}</div>
            </div>
        `;
    });
}
