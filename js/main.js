import { audio, showConfirmDialog, showToast } from './utils.js';
import { loadGameStats, checkDailyBonus, KEYS, gameStats, saveGameStats, updateScoreUI, incrementHintsUsed, incrementRouletteSpins, totalHintsUsed, totalRouletteSpins } from './storage.js';
import { loadSkinsData, openShopModal } from './shop.js';
import { 
    currentLevel, currentPuzzleIndex, setCurrentLevelAndPuzzle, loadCrossword, 
    updatePuzzleSelect, resetCrossword, buyCurrentPuzzle, giveHint, isPuzzleUnlocked, getCompletedCrosswords
} from './crossword.js';
import { loadDailyTasks, renderDailyTasksPanel } from './dailyTasks.js';
import { loadThemesData, getAvailableThemes, applyTheme, confirmPurchaseTheme, currentThemeId, purchasedThemes } from './themes.js';
import { loadAchievements, updateAchievementProgress, renderAchievementsModal } from './achievements.js';

function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.classList.remove('dark', 'sakura');
    if (savedTheme !== 'light') document.body.classList.add(savedTheme);
}
applySavedTheme();

document.addEventListener('DOMContentLoaded', () => {
    loadGameStats();
    checkDailyBonus();
    loadSkinsData();
    loadThemesData(); 
    loadAchievements();
    loadDailyTasks();
    renderDailyTasksPanel();

    let startLvl = localStorage.getItem('lastPlayedLevel') || "n5";
    let startIdx = parseInt(localStorage.getItem('lastPlayedPuzzle')) || 0;

    if (!isPuzzleUnlocked(startLvl, startIdx)) {
        const puzzles = window.crosswordsData[startLvl].puzzles;
        for (let i = 0; i < puzzles.length; i++) {
            if (isPuzzleUnlocked(startLvl, i)) { startIdx = i; break; }
        }
        if (!isPuzzleUnlocked(startLvl, startIdx) && startLvl !== "n5") { startLvl = "n5"; startIdx = 0; }
    }

    setCurrentLevelAndPuzzle(startLvl, startIdx);
    document.getElementById("levelSelect").value = startLvl;
    updatePuzzleSelect();
    loadCrossword(startLvl, startIdx);

    // ========== ВЫПАДАЮЩИЙ СПИСОК ТЕМ ==========
    const themeBtn = document.getElementById('themeBtn');
    const themeDropdown = document.getElementById('themeDropdown');

    if (themeBtn && themeDropdown) {
        function updateThemeDropdown() {
            const themes = getAvailableThemes();
            themeDropdown.innerHTML = '';
            themes.forEach(theme => {
                const btn = document.createElement('button');
                let displayText;
                if (theme.id === currentThemeId) {
                    displayText = `${theme.name} ✓`;
                } else if (purchasedThemes.includes(theme.id)) {
                    displayText = theme.name;
                } else {
                    displayText = `${theme.name} (${theme.price} очков)`;
                }
                btn.textContent = displayText;
                if (theme.id === currentThemeId) {
                    btn.style.fontWeight = 'bold';
                }
                Object.assign(btn.style, {
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--border, #ccc)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: 'inherit'
                });
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (theme.price > 0 && !purchasedThemes.includes(theme.id)) {
                        const ok = await confirmPurchaseTheme(theme.id);
                        if (ok) {
                            updateThemeDropdown();
                        }
                    } else if (purchasedThemes.includes(theme.id)) {
                        applyTheme(theme.id);
                        updateThemeDropdown();
                    }
                    themeDropdown.style.display = 'none';
                });
                themeDropdown.appendChild(btn);
            });
        }

        themeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = themeDropdown.style.display === 'block';
            if (isVisible) {
                themeDropdown.style.display = 'none';
            } else {
                updateThemeDropdown();
                themeDropdown.style.display = 'block';
            }
        });

        document.addEventListener('click', () => {
            themeDropdown.style.display = 'none';
        });
        themeDropdown.addEventListener('click', (e) => e.stopPropagation());
    } else {
        console.warn('Theme button or dropdown not found');
    }

    // ========== ОСТАЛЬНЫЕ КНОПКИ ==========
    document.getElementById("levelSelect").addEventListener("change", (e) => {
        audio.click();
        const newLvl = e.target.value;
        let firstUnlocked = 0;
        for (let i = 0; i < window.crosswordsData[newLvl].puzzles.length; i++) {
            if (isPuzzleUnlocked(newLvl, i)) { firstUnlocked = i; break; }
        }
        setCurrentLevelAndPuzzle(newLvl, firstUnlocked);
        updatePuzzleSelect();
        loadCrossword(newLvl, firstUnlocked);
    });

    document.getElementById("puzzleSelect").addEventListener("change", (e) => {
        audio.click();
        setCurrentLevelAndPuzzle(currentLevel, parseInt(e.target.value, 10));
        updatePuzzleSelect();
        loadCrossword(currentLevel, currentPuzzleIndex);
    });

    document.getElementById("resetBtn").addEventListener("click", () => { audio.click(); resetCrossword(); });
    document.getElementById("hintBtn").addEventListener("click", () => { audio.click(); giveHint(); });
    document.getElementById("shopBtn").addEventListener("click", () => { audio.click(); openShopModal(); });
    document.getElementById("buyPuzzleBtn").addEventListener("click", () => { audio.click(); buyCurrentPuzzle(); });
    document.getElementById("closeShopBtn").addEventListener("click", () => document.getElementById("shopModal").style.display = "none");

    // ========== ДОСТИЖЕНИЯ ==========
    const achievementsBtn = document.getElementById('achievementsBtn');
    if (achievementsBtn) {
        achievementsBtn.addEventListener('click', () => {
            audio.click();
            renderAchievementsModal();
        });
    } else {
        console.warn('Achievements button not found');
    }

    // ========== СБРОС ВСЕГО ПРОГРЕССА ==========
    document.getElementById("resetProgressBtn").addEventListener("click", async () => {
        if (await showConfirmDialog("Удалить весь прогресс? Это действие нельзя отменить.")) {
            localStorage.removeItem(KEYS.PROGRESS);
            localStorage.removeItem(KEYS.COMPLETED);
            localStorage.removeItem(KEYS.UNLOCKED);
            localStorage.removeItem(KEYS.EARNED);
            localStorage.removeItem(KEYS.GAME);
            localStorage.removeItem("skins");
            localStorage.removeItem("shopActiveTab");
            localStorage.removeItem("dailyTasks");
            localStorage.removeItem("lastFreeSpin");
            localStorage.removeItem("lastPlayedLevel");
            localStorage.removeItem("lastPlayedPuzzle");
            localStorage.removeItem('themes');
            localStorage.removeItem('achievements');
            localStorage.removeItem('totalHintsUsed');
            localStorage.removeItem('totalRouletteSpins');
            
            gameStats.score = 0;
            gameStats.wordsCompleted = 0;
            gameStats.maxHints = 2;
            gameStats.lastBonusDate = null;
            saveGameStats();
            updateScoreUI();
            loadSkinsData();
            loadDailyTasks();
            loadThemesData();
            loadAchievements();
            renderDailyTasksPanel();
            setCurrentLevelAndPuzzle("n5", 0);
            document.getElementById("levelSelect").value = "n5";
            updatePuzzleSelect();
            loadCrossword("n5", 0, false);
            showToast("Прогресс полностью сброшен.", "success");
        }
    });

    // ========== ТУТОРИАЛ ==========
    const showTutorial = () => {
        const modal = document.getElementById("tutorialModal");
        const msg = document.getElementById("tutorialMessage");
        const nextBtn = document.getElementById("tutorialNext");
        const steps = [
            "Добро пожаловать в японские кроссворды JLPT! 🎌",
            "📝 Вводите английскими буквами. Пример: su → ス, shu → シ+ユ, - → ー",
            "🔄 На пересечении слов: двойной клик для выбора другого слова",
            "🔍 Подсказка: нажмите на пустую ячейку и нажмите «Подсказка» – откроется правильная буква (-20 очков)",
            "📋 Ежедневные задания – выполняйте и получайте бонусы!",
            "🎡 Бесплатная рулетка – один раз в день!",
            "🌓 Приятной игры!"
        ];
        let step = 0;
        const update = () => { msg.innerText = steps[step]; nextBtn.innerText = step === steps.length - 1 ? "Завершить" : "Далее"; };
        const close = () => { modal.style.display = "none"; localStorage.setItem("tutorialShown", "true"); };
        nextBtn.onclick = () => { step++; if (step < steps.length) update(); else close(); };
        document.getElementById("tutorialClose").onclick = close;
        update();
        modal.style.display = "flex";
    };

    document.getElementById("helpBtn").addEventListener("click", () => { audio.click(); showTutorial(); });
    if (!localStorage.getItem("tutorialShown")) setTimeout(showTutorial, 500);

    // ========== МОБИЛЬНАЯ АДАПТАЦИЯ (ПРИНУДИТЕЛЬНАЯ) ==========
    function applyMobileLayout() {
        const isMobile = window.innerWidth <= 768;
        const cluesSection = document.querySelector('.clues-section');
        const floatingClue = document.getElementById('floatingClue');
        
        if (cluesSection) {
            cluesSection.style.display = isMobile ? 'none' : '';
        }

    // Вызываем при загрузке и при изменении размера окна
    applyMobileLayout();
    window.addEventListener('resize', applyMobileLayout);
    }
    });
