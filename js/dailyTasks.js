import { gameStats, addPoints, saveGameStats, updateScoreUI } from './storage.js';
import { showToast, audio } from './utils.js';

const TASKS_KEY = 'dailyTasks';
const TASKS_LIST = [
    { id: 'solve_2_crosswords', name: 'Решить 2 кроссворда', target: 2, progress: 0, reward: 50 },
    { id: 'earn_100_points', name: 'Заработать 100 очков', target: 200, progress: 0, reward: 50 },
    { id: 'use_hint', name: 'Использовать 2 подсказки', target: 2, progress: 0, reward: 30 },
    { id: 'buy_skin', name: 'Купить скин', target: 1, progress: 0, reward: 50 },
    { id: 'win_roulette', name: 'Выиграть в рулетке 200 очков', target: 200, progress: 0, reward: 80 },
    { id: 'complete_any_word', name: 'Угадать любое слово', target: 1, progress: 0, reward: 30 }
];

let currentTasks = [];

export function loadDailyTasks() {
    const today = new Date().toDateString();
    const stored = localStorage.getItem(TASKS_KEY);
    if (stored) {
        const data = JSON.parse(stored);
        if (data.date === today) {
            currentTasks = data.tasks;
            renderDailyTasksPanel();
            return;
        }
    }
    const shuffled = [...TASKS_LIST].sort(() => 0.5 - Math.random());
    currentTasks = shuffled.slice(0, 3).map(t => ({ ...t, progress: 0 }));
    localStorage.setItem(TASKS_KEY, JSON.stringify({ date: today, tasks: currentTasks }));
    renderDailyTasksPanel();
}

export function updateTaskProgress(taskId, increment = 1, customValue = null) {
    const task = currentTasks.find(t => t.id === taskId);
    if (!task || task.progress >= task.target) return;
    let delta = (customValue !== null) ? customValue : increment;
    task.progress = Math.min(task.target, task.progress + delta);
    if (task.progress >= task.target) {
        addPoints(task.reward);
        showToast(`✅ Задание выполнено: ${task.name} (+${task.reward} очков)!`, "success");
        audio.pop();
    }
    saveDailyTasks();
    renderDailyTasksPanel();  // обновляем панель сразу
}

function saveDailyTasks() {
    const today = new Date().toDateString();
    localStorage.setItem(TASKS_KEY, JSON.stringify({ date: today, tasks: currentTasks }));
}

export function getCurrentTasks() {
    return currentTasks;
}

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
