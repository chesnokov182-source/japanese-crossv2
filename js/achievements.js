// js/achievements.js
import { addPoints, gameStats } from './storage.js';
import { showToast, showConfetti, audio } from './utils.js';
import { purchasedSkins } from './shop.js';
import { purchasedThemes, freeThemes, premiumThemes } from './themes.js';
import { getCompletedCrosswords } from './crossword.js';

// Функции для получения целевых значений (динамически)
function getTotalSkinsCount() {
    // Импортируем динамически, чтобы избежать циклических зависимостей
    return import('./shop.js').then(module => module.availableSkins.length);
}
function getTotalThemesCount() {
    return premiumThemes.length;
}
function getTotalUpgradesCount() {
    return 2; // улучшения: лимит до 3 и до 4 (2 улучшения)
}
function getTotalCrosswordsInLevel(levelId) {
    if (window.crosswordsData && window.crosswordsData[levelId]) {
        return window.crosswordsData[levelId].puzzles.length;
    }
    return 0;
}

// Конфигурация будет инициализирована после загрузки данных асинхронно
let achievementsConfig = null;

// Хранилище состояния
let unlockedAchievements = [];
let progress = {};

// Инициализация: создаём конфиг динамически
async function buildConfig() {
    const skinsCount = await getTotalSkinsCount();
    const upgradesCount = getTotalUpgradesCount();
    const themesCount = getTotalThemesCount();

    achievementsConfig = {
        crosswords: {
            name: 'Кроссворды',
            list: [
                { target: 1,  id: 'cross_1',   title: 'Начало пути',         reward: 50 },
                { target: 10, id: 'cross_10',  title: 'Любитель кроссвордов', reward: 100 },
                { target: 50, id: 'cross_50',  title: 'Мастер кроссвордов',   reward: 200 }
            ]
        },
        words: {
            name: 'Слова',
            list: [
                { target: 10,  id: 'words_10',   title: 'Первые слова',       reward: 30 },
                { target: 50,  id: 'words_50',   title: 'Набираю словарь',    reward: 80 },
                { target: 200, id: 'words_200',  title: 'Знаток лексики',     reward: 150 },
                { target: 500, id: 'words_500',  title: 'Полиглот',           reward: 300 }
            ]
        },
        hints: {
            name: 'Подсказки',
            list: [
                { target: 10, id: 'hints_10', title: 'Помощник',    reward: 40 },
                { target: 50, id: 'hints_50', title: 'Гуру подсказок', reward: 120 }
            ]
        },
        roulette_spins: {
            name: 'Рулетка',
            list: [
                { target: 10,  id: 'spin_10',  title: 'Азартный новичок', reward: 50 },
                { target: 100, id: 'spin_100', title: 'Завсегдатай казино', reward: 200 }
            ]
        },
        skins: {
            name: 'Скины',
            list: [
                { target: skinsCount, id: 'skins_all', title: 'Коллекционер скинов', reward: 500 }
            ]
        },
        themes: {
            name: 'Темы',
            list: [
                { target: themesCount, id: 'themes_all', title: 'Дизайнер интерьера', reward: 400 }
            ]
        },
        upgrades: {
            name: 'Улучшения',
            list: [
                { target: upgradesCount, id: 'upgrades_all', title: 'Полный пакет улучшений', reward: 300 }
            ]
        },
        levels: {
            name: 'Уровни',
            list: [
                { level: 'n5', target: getTotalCrosswordsInLevel('n5'), id: 'level_n5', title: 'Знаток N5', reward: 150 },
                { level: 'n4', target: getTotalCrosswordsInLevel('n4'), id: 'level_n4', title: 'Знаток N4', reward: 150 },
                { level: 'n3', target: getTotalCrosswordsInLevel('n3'), id: 'level_n3', title: 'Знаток N3', reward: 150 }
            ]
        }
    };
}

// Загрузка сохранённых достижений
export async function loadAchievements() {
    await buildConfig(); // дожидаемся построения конфига
    const saved = localStorage.getItem('achievements');
    if (saved) {
        const data = JSON.parse(saved);
        unlockedAchievements = data.unlocked || [];
        progress = data.progress || {};
    } else {
        unlockedAchievements = [];
        progress = {};
        for (let type in achievementsConfig) {
            progress[type] = 0;
        }
        saveAchievements();
    }
    syncAchievementsWithGame();
}

function saveAchievements() {
    localStorage.setItem('achievements', JSON.stringify({
        unlocked: unlockedAchievements,
        progress: progress
    }));
}

// Синхронизация с текущими данными игры
function syncAchievementsWithGame() {
    const completedCrosswords = getCompletedCrosswords().length;
    updateProgress('crosswords', completedCrosswords);
    updateProgress('words', gameStats.wordsCompleted);
    if (window.totalHintsUsed !== undefined) updateProgress('hints', window.totalHintsUsed);
    if (window.totalRouletteSpins !== undefined) updateProgress('roulette_spins', window.totalRouletteSpins);
    updateProgress('skins', purchasedSkins.length - 1);
    updateProgress('themes', purchasedThemes.filter(t => !freeThemes.some(f => f.id === t)).length);
    const upgradesBought = gameStats.maxHints - 2;
    updateProgress('upgrades', upgradesBought);
    // Уровни
    for (let levelCfg of achievementsConfig.levels.list) {
        const completedCount = getCompletedCrosswords().filter(key => key.startsWith(levelCfg.level)).length;
        updateProgress(`level_${levelCfg.level}`, completedCount);
    }
}

function updateProgress(type, value) {
    if (value === undefined) return;
    if (progress[type] === value) return;
    progress[type] = value;
    saveAchievements();
    checkAchievementsForType(type);
}

function checkAchievementsForType(type) {
    const config = achievementsConfig[type];
    if (!config) return;
    const currentValue = progress[type];
    for (let ach of config.list) {
        if (!unlockedAchievements.includes(ach.id) && currentValue >= ach.target) {
            unlockAchievement(ach.id, ach.title, ach.reward);
        }
    }
    // Специальная обработка для уровней
    if (type.startsWith('level_')) {
        const levelId = type.replace('level_', '');
        const levelConfig = achievementsConfig.levels.list.find(l => l.level === levelId);
        if (levelConfig && !unlockedAchievements.includes(levelConfig.id) && currentValue >= levelConfig.target) {
            unlockAchievement(levelConfig.id, levelConfig.title, levelConfig.reward);
        }
    }
}

function unlockAchievement(id, title, reward) {
    if (unlockedAchievements.includes(id)) return;
    unlockedAchievements.push(id);
    saveAchievements();
    addPoints(reward);
    showToast(`🏆 Достижение "${title}" получено! +${reward} очков`, 'success');
    showConfetti();
    audio.pop();
}

// Публичный метод обновления прогресса
export function updateAchievementProgress(type, value) {
    if (!achievementsConfig) {
        // Если конфиг ещё не построен, откладываем обновление
        setTimeout(() => updateAchievementProgress(type, value), 100);
        return;
    }
    switch(type) {
        case 'crosswords':
            updateProgress('crosswords', value);
            break;
        case 'words':
            updateProgress('words', value);
            break;
        case 'hints':
            updateProgress('hints', value);
            break;
        case 'roulette_spins':
            updateProgress('roulette_spins', value);
            break;
        case 'skins':
            updateProgress('skins', value);
            break;
        case 'themes':
            updateProgress('themes', value);
            break;
        case 'upgrades':
            updateProgress('upgrades', value);
            break;
        default:
            if (type.startsWith('level_')) {
                updateProgress(type, value);
            }
    }
}

// Отображение модального окна со всеми достижениями
export function renderAchievementsModal() {
    if (!achievementsConfig) {
        console.warn('Achievements not loaded yet');
        return;
    }
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 550px;">
            <h3>🏅 Достижения</h3>
            <div id="achievementsList" style="max-height: 450px; overflow-y: auto;"></div>
            <div class="modal-buttons">
                <button id="closeAchBtn" class="modal-btn modal-no">Закрыть</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    const container = modal.querySelector('#achievementsList');
    container.innerHTML = '';

    const allAchs = [];
    // Кроссворды
    achievementsConfig.crosswords.list.forEach(a => {
        allAchs.push({
            id: a.id, title: a.title, target: a.target, reward: a.reward,
            current: progress.crosswords || 0,
            desc: `Решить ${a.target} кроссворд${a.target===1?'':'ов'}`
        });
    });
    // Слова
    achievementsConfig.words.list.forEach(a => {
        allAchs.push({
            id: a.id, title: a.title, target: a.target, reward: a.reward,
            current: progress.words || 0,
            desc: `Угадать ${a.target} слов${a.target===10?'':''}`
        });
    });
    // Подсказки
    achievementsConfig.hints.list.forEach(a => {
        allAchs.push({
            id: a.id, title: a.title, target: a.target, reward: a.reward,
            current: progress.hints || 0,
            desc: `Использовать ${a.target} подсказок`
        });
    });
    // Рулетка
    achievementsConfig.roulette_spins.list.forEach(a => {
        allAchs.push({
            id: a.id, title: a.title, target: a.target, reward: a.reward,
            current: progress.roulette_spins || 0,
            desc: `Сыграть в рулетку ${a.target} раз`
        });
    });
    // Скины
    achievementsConfig.skins.list.forEach(a => {
        allAchs.push({
            id: a.id, title: a.title, target: a.target, reward: a.reward,
            current: progress.skins || 0,
            desc: `Купить все ${a.target} скинов`
        });
    });
    // Темы
    achievementsConfig.themes.list.forEach(a => {
        allAchs.push({
            id: a.id, title: a.title, target: a.target, reward: a.reward,
            current: progress.themes || 0,
            desc: `Купить все ${a.target} темы`
        });
    });
    // Улучшения
    achievementsConfig.upgrades.list.forEach(a => {
        allAchs.push({
            id: a.id, title: a.title, target: a.target, reward: a.reward,
            current: progress.upgrades || 0,
            desc: `Купить все улучшения (лимит подсказок до 4)`
        });
    });
    // Уровни
    achievementsConfig.levels.list.forEach(a => {
        allAchs.push({
            id: a.id, title: a.title, target: a.target, reward: a.reward,
            current: progress[`level_${a.level}`] || 0,
            desc: `Решить все кроссворды уровня ${a.level.toUpperCase()}`
        });
    });

    allAchs.forEach(ach => {
        const percent = (ach.current / ach.target) * 100;
        const unlocked = unlockedAchievements.includes(ach.id);
        const achDiv = document.createElement('div');
        achDiv.className = 'skin-item';
        achDiv.innerHTML = `
            <div style="flex:1">
                <strong>${ach.title}</strong><br>
                <small>${ach.desc}</small>
                <div class="progress-bar" style="margin:5px 0; height:6px;"><div style="width:${percent}%; background:#4caf50; height:6px;"></div></div>
                <span>${ach.current}/${ach.target}</span>
            </div>
            <div style="min-width: 50px; text-align: right;">${unlocked ? '✅' : `+${ach.reward}`}</div>
        `;
        container.appendChild(achDiv);
    });

    modal.querySelector('#closeAchBtn').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}
