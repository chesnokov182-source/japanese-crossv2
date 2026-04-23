import { showToast } from './utils.js';
import { updateTaskProgress } from './dailyTasks.js';

export const KEYS = {
    GAME: "gameStats",
    PROGRESS: "crosswordProgress",
    COMPLETED: "completedCrosswords",
    UNLOCKED: "unlockedCrosswords",
    EARNED: "earnedPoints"
};

export let gameStats = { score: 0, wordsCompleted: 0, lastBonusDate: null, maxHints: 2 };

export function loadGameStats() {
    const saved = localStorage.getItem(KEYS.GAME);
    if (saved) {
        gameStats = JSON.parse(saved);
        if (gameStats.maxHints === undefined) gameStats.maxHints = 2;
    } else {
        saveGameStats();
    }
    updateScoreUI();
}

export function saveGameStats() {
    localStorage.setItem(KEYS.GAME, JSON.stringify(gameStats));
}

export function updateScoreUI() {
    const scoreSpan = document.getElementById("scoreValue");
    const wordsSpan = document.getElementById("wordsCompleted");
    if (scoreSpan) scoreSpan.innerText = gameStats.score;
    if (wordsSpan) wordsSpan.innerText = gameStats.wordsCompleted;
}

export function addPoints(points) {
    gameStats.score += points;
    saveGameStats();
    updateScoreUI();
    updateTaskProgress('earn_100_points', points)
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
        showToast(`Недостаточно очков! Нужно ${points}.`, "error");
        return false;
    }
}

export function incrementWordsCompleted() {
    gameStats.wordsCompleted++;
    saveGameStats();
    updateScoreUI();
}

export function checkDailyBonus() {
    const today = new Date().toDateString();
    if (gameStats.lastBonusDate !== today) {
        addPoints(50);
        gameStats.lastBonusDate = today;
        saveGameStats();
        showToast("🎁 Ежедневный бонус: +50 очков!", "success");
    }
}


