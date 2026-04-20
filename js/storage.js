import { STORAGE_KEYS, availableSkins } from './constants.js';
import { showToast } from './utils.js';

// Игровая статистика (очки, завершённые слова, лимит подсказок)
export let gameStats = {
    score: 0,
    wordsCompleted: 0,
    lastBonusDate: null,
    maxHints: 2
};

export function loadGameStats() {
    const saved = localStorage.getItem(STORAGE_KEYS.GAME_STATS);
    if (saved) {
        gameStats = JSON.parse(saved);
        if (gameStats.maxHints === undefined) gameStats.maxHints = 2;
    } else {
        gameStats = { score: 0, wordsCompleted: 0, lastBonusDate: null, maxHints: 2 };
        saveGameStats();
    }
    updateScoreUI();
}

export function saveGameStats() {
    localStorage.setItem(STORAGE_KEYS.GAME_STATS, JSON.stringify(gameStats));
}

function updateScoreUI() {
    document.getElementById("scoreValue").innerText = gameStats.score;
    document.getElementById("wordsCompleted").innerText = gameStats.wordsCompleted;
}

export function addPoints(points) {
    gameStats.score += points;
    saveGameStats();
    updateScoreUI();
    showToast(`+${points} очков!`, "success");
}

export function subtractPoints(points) {
    if (gameStats.score >= points) {
        gameStats.score -= points;
        saveGameStats();
        updateScoreUI();
        showToast(`-${points} очков`, "info");
        return true;
    } else {
        showToast(`Недостаточно очков! Нужно ${points} очков.`, "error");
        return false;
    }
}

export function incrementWordsCompleted() {
    gameStats.wordsCompleted++;
    saveGameStats();
    updateScoreUI();
}

export function decrementWordsCompleted() {
    gameStats.wordsCompleted = Math.max(0, gameStats.wordsCompleted - 1);
    saveGameStats();
    updateScoreUI();
}

// Ежедневный бонус
export function checkDailyBonus() {
    const today = new Date().toDateString();
    if (gameStats.lastBonusDate !== today) {
        addPoints(50);
        gameStats.lastBonusDate = today;
        saveGameStats();
        showToast("🎁 Ежедневный бонус: +50 очков!", "success");
    }
}

// Прогресс кроссвордов
export function getStoredProgress() {
    const saved = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    return saved ? JSON.parse(saved) : {};
}

export function saveProgress(level, puzzleIdx, gridData, hintUsed, hintCount) {
    const progress = getStoredProgress();
    const key = `${level}_${puzzleIdx}`;
    progress[key] = { gridData, hintUsed, hintCount };
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
}

export function deleteProgress(level, puzzleIdx) {
    const progress = getStoredProgress();
    const key = `${level}_${puzzleIdx}`;
    if (progress[key]) {
        delete progress[key];
        localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
    }
}

// Разблокировка кроссвордов
export function getUnlockedCrosswords() {
    const saved = localStorage.getItem(STORAGE_KEYS.UNLOCKED);
    return saved ? JSON.parse(saved) : {};
}

export function saveUnlockedCrosswords(unlocked) {
    localStorage.setItem(STORAGE_KEYS.UNLOCKED, JSON.stringify(unlocked));
}

export function isPuzzleUnlocked(level, puzzleIdx) {
    const unlocked = getUnlockedCrosswords();
    const key = `${level}_${puzzleIdx}`;
    if (puzzleIdx === 0 && !unlocked[key]) {
        unlocked[key] = true;
        saveUnlockedCrosswords(unlocked);
        return true;
    }
    return unlocked[key] === true;
}

export function unlockPuzzle(level, puzzleIdx, price) {
    const unlocked = getUnlockedCrosswords();
    const key = `${level}_${puzzleIdx}`;
    if (unlocked[key]) return true;
    if (gameStats.score >= price) {
        unlocked[key] = true;
        saveUnlockedCrosswords(unlocked);
        subtractPoints(price);
        return true;
    }
    return false;
}

// Завершённые кроссворды
export function getCompletedCrosswords() {
    const saved = localStorage.getItem(STORAGE_KEYS.COMPLETED);
    return saved ? JSON.parse(saved) : [];
}

export function markAsCompleted(level, puzzleIdx) {
    const completed = getCompletedCrosswords();
    const key = `${level}_${puzzleIdx}`;
    if (!completed.includes(key)) {
        completed.push(key);
        localStorage.setItem(STORAGE_KEYS.COMPLETED, JSON.stringify(completed));
        return true;
    }
    return false;
}

export function isCrosswordCompleted(level, puzzleIdx) {
    const completed = getCompletedCrosswords();
    return completed.includes(`${level}_${puzzleIdx}`);
}

export function removeCompletedMark(level, puzzleIdx) {
    const completed = getCompletedCrosswords();
    const key = `${level}_${puzzleIdx}`;
    const index = completed.indexOf(key);
    if (index !== -1) {
        completed.splice(index, 1);
        localStorage.setItem(STORAGE_KEYS.COMPLETED, JSON.stringify(completed));
        return true;
    }
    return false;
}

// Заработанные очки за текущий кроссворд
export function getEarnedPointsForCurrent(level, puzzleIdx) {
    const saved = localStorage.getItem(STORAGE_KEYS.EARNED);
    const data = saved ? JSON.parse(saved) : {};
    const key = `${level}_${puzzleIdx}`;
    if (!data[key]) data[key] = { words: {}, completed: false };
    return data[key];
}

export function saveEarnedPointsForCurrent(level, puzzleIdx, earned) {
    const saved = localStorage.getItem(STORAGE_KEYS.EARNED);
    const data = saved ? JSON.parse(saved) : {};
    data[`${level}_${puzzleIdx}`] = earned;
    localStorage.setItem(STORAGE_KEYS.EARNED, JSON.stringify(data));
}

export function markWordPointsEarned(level, puzzleIdx, wordId) {
    const earned = getEarnedPointsForCurrent(level, puzzleIdx);
    if (!earned.words[wordId]) {
        earned.words[wordId] = true;
        saveEarnedPointsForCurrent(level, puzzleIdx, earned);
        addPoints(10);
        incrementWordsCompleted();
        return true;
    }
    return false;
}

export function markCrosswordCompletedEarned(level, puzzleIdx) {
    const earned = getEarnedPointsForCurrent(level, puzzleIdx);
    if (!earned.completed) {
        earned.completed = true;
        saveEarnedPointsForCurrent(level, puzzleIdx, earned);
        addPoints(50);
        return true;
    }
    return false;
}

export function revertPointsForCurrentPuzzle(level, puzzleIdx) {
    const earned = getEarnedPointsForCurrent(level, puzzleIdx);
    let pointsToSubtract = 0;
    let wordsToSubtract = 0;
    for (let wordId in earned.words) {
        if (earned.words[wordId]) {
            pointsToSubtract += 10;
            wordsToSubtract++;
        }
    }
    if (earned.completed) pointsToSubtract += 50;
    if (pointsToSubtract > 0) {
        gameStats.score = Math.max(0, gameStats.score - pointsToSubtract);
        gameStats.wordsCompleted = Math.max(0, gameStats.wordsCompleted - wordsToSubtract);
        saveGameStats();
        updateScoreUI();
        showToast(`Сброшено ${pointsToSubtract} очков и ${wordsToSubtract} слов`, "info");
    }
    const saved = localStorage.getItem(STORAGE_KEYS.EARNED);
    if (saved) {
        const data = JSON.parse(saved);
        delete data[`${level}_${puzzleIdx}`];
        localStorage.setItem(STORAGE_KEYS.EARNED, JSON.stringify(data));
    }
}

// Скины
export let purchasedSkins = [];
export let selectedSkinId = "default";

export function loadSkinsData() {
    const saved = localStorage.getItem(STORAGE_KEYS.SKINS);
    if (saved) {
        const data = JSON.parse(saved);
        purchasedSkins = data.purchasedSkins || [];
        selectedSkinId = data.selectedSkinId || "default";
    } else {
        purchasedSkins = ["default"];
        selectedSkinId = "default";
        saveSkinsData();
    }
}

export function saveSkinsData() {
    localStorage.setItem(STORAGE_KEYS.SKINS, JSON.stringify({ purchasedSkins, selectedSkinId }));
}

export function isSkinPurchased(skinId) {
    return purchasedSkins.includes(skinId);
}

export function purchaseSkin(skinId, price) {
    if (isSkinPurchased(skinId)) return false;
    if (gameStats.score >= price) {
        subtractPoints(price);
        purchasedSkins.push(skinId);
        saveSkinsData();
        return true;
    }
    return false;
}

export function selectSkin(skinId) {
    if (!isSkinPurchased(skinId)) return false;
    selectedSkinId = skinId;
    saveSkinsData();
    return true;
}

export function getSelectedSkinEmoji() {
    const skin = availableSkins.find(s => s.id === selectedSkinId);
    return skin ? skin.emoji : "";
}

// Улучшения
export function upgradeMaxHints(newLimit, price) {
    if (newLimit <= gameStats.maxHints) return false;
    if (gameStats.score >= price) {
        subtractPoints(price);
        gameStats.maxHints = newLimit;
        saveGameStats();
        return true;
    }
    return false;
}
