import { initTheme, toggleTheme } from './theme.js';
import {
    loadGameStats, checkDailyBonus, loadSkinsData,
    isPuzzleUnlocked, unlockPuzzle, getCompletedCrosswords,
    gameStats, saveGameStats, updateScoreUI  
} from './storage.js';
import { initAudio, playClick } from './audio.js';
import { showTutorial, initTutorial } from './tutorial.js';
import { initShop } from './shop.js';
import {
    currentLevel, setCurrentLevel, currentPuzzleIndex, setCurrentPuzzleIndex,
    loadCrossword, resetCrossword, giveHint, updateButtonStates
} from './gameController.js';
import { updatePuzzleSelect, updateLevelProgress } from './crosswordView.js';
import { showConfirmDialog, showToast, showConfetti } from './utils.js';
import { STORAGE_KEYS } from './constants.js';

// Инициализация UI
function initUI() {
    const levelSelect = document.getElementById("levelSelect");
    const puzzleSelect = document.getElementById("puzzleSelect");
    const resetBtn = document.getElementById("resetBtn");
    const hintBtn = document.getElementById("hintBtn");
    const themeToggle = document.getElementById("themeToggle");
    const resetProgressBtn = document.getElementById("resetProgressBtn");
    const buyPuzzleBtn = document.getElementById("buyPuzzleBtn");

    levelSelect.addEventListener("change", (e) => {
        playClick();
        const newLevel = e.target.value;
        setCurrentLevel(newLevel);
        const puzzles = window.crosswordsData[newLevel].puzzles;
        let firstUnlocked = 0;
        for (let i = 0; i < puzzles.length; i++) {
            if (isPuzzleUnlocked(newLevel, i)) {
                firstUnlocked = i;
                break;
            }
        }
        setCurrentPuzzleIndex(firstUnlocked);
        updatePuzzleSelect();
        loadCrossword(newLevel, firstUnlocked);
    });

    puzzleSelect.addEventListener("change", (e) => {
        playClick();
        const newIdx = parseInt(e.target.value);
        setCurrentPuzzleIndex(newIdx);
        updatePuzzleSelect();
        loadCrossword(currentLevel, newIdx);
    });

    resetBtn.addEventListener("click", () => {
        playClick();
        resetCrossword();
    });

    hintBtn.addEventListener("click", () => {
        playClick();
        giveHint();
    });

    themeToggle.addEventListener("click", () => {
        playClick();
        toggleTheme();
    });

    resetProgressBtn.addEventListener("click", async () => {
        playClick();
        const confirmed = await showConfirmDialog("Удалить весь сохранённый прогресс? Это действие нельзя отменить.");
        if (confirmed) {
            localStorage.removeItem(STORAGE_KEYS.PROGRESS);
            localStorage.removeItem(STORAGE_KEYS.COMPLETED);
            localStorage.removeItem(STORAGE_KEYS.UNLOCKED);
            localStorage.removeItem(STORAGE_KEYS.EARNED);
            const lastBonus = gameStats.lastBonusDate;
            localStorage.removeItem(STORAGE_KEYS.GAME_STATS);
            gameStats = { score: 0, wordsCompleted: 0, lastBonusDate: lastBonus, maxHints: 2 };
            saveGameStats();
            updateScoreUI();
            setCurrentPuzzleIndex(0);
            updatePuzzleSelect();
            loadCrossword(currentLevel, 0, false);
            showToast("Весь прогресс удалён (кроме ежедневного бонуса).", "success");
        }
    });

    buyPuzzleBtn.addEventListener("click", () => {
        playClick();
        const puzzles = window.crosswordsData[currentLevel].puzzles;
        const puzzle = puzzles[currentPuzzleIndex];
        const price = puzzle.price || 0;
        if (price > 0 && !isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) {
            const modal = document.getElementById("buyModal");
            document.getElementById("buyModalMessage").innerText = `Купить "${puzzle.name}" за ${price} очков?`;
            modal.style.display = "flex";
            const confirmBtn = document.getElementById("buyModalConfirm");
            const cancelBtn = document.getElementById("buyModalCancel");
            const handleConfirm = () => {
                if (unlockPuzzle(currentLevel, currentPuzzleIndex, price)) {
                    showConfetti();
                    showToast("Кроссворд разблокирован!", "success");
                    loadCrossword(currentLevel, currentPuzzleIndex, true);
                    updatePuzzleSelect();
                    updateButtonStates();
                }
                modal.style.display = "none";
                cleanup();
            };
            const handleCancel = () => {
                modal.style.display = "none";
                cleanup();
            };
            const cleanup = () => {
                confirmBtn.removeEventListener("click", handleConfirm);
                cancelBtn.removeEventListener("click", handleCancel);
            };
            confirmBtn.addEventListener("click", handleConfirm);
            cancelBtn.addEventListener("click", handleCancel);
        }
    });
}

// Загрузка приложения
async function main() {
    loadGameStats();
    checkDailyBonus();
    loadSkinsData();
    initTheme();
    initAudio();
    initUI();
    initShop();
    initTutorial();

    // Восстановление последнего уровня
    let startLevel = localStorage.getItem(STORAGE_KEYS.LAST_PLAYED_LEVEL) || "n5";
    let startPuzzle = parseInt(localStorage.getItem(STORAGE_KEYS.LAST_PLAYED_PUZZLE)) || 0;

    // Проверка разблокировки
    if (!isPuzzleUnlocked(startLevel, startPuzzle)) {
        const puzzles = window.crosswordsData[startLevel].puzzles;
        for (let i = 0; i < puzzles.length; i++) {
            if (isPuzzleUnlocked(startLevel, i)) {
                startPuzzle = i;
                break;
            }
        }
        if (!isPuzzleUnlocked(startLevel, startPuzzle) && startLevel !== "n5") {
            startLevel = "n5";
            startPuzzle = 0;
        }
    }

    setCurrentLevel(startLevel);
    setCurrentPuzzleIndex(startPuzzle);
    document.getElementById("levelSelect").value = startLevel;
    updatePuzzleSelect();
    loadCrossword(startLevel, startPuzzle);

    // Сохранение последнего выбора при уходе
    window.addEventListener("beforeunload", () => {
        localStorage.setItem(STORAGE_KEYS.LAST_PLAYED_LEVEL, currentLevel);
        localStorage.setItem(STORAGE_KEYS.LAST_PLAYED_PUZZLE, currentPuzzleIndex);
    });
}

main();
