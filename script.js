// Таблица соответствия ромадзи → массив катаканы
const romajiToKatakana = {
    "a": ["ア"], "i": ["イ"], "u": ["ウ"], "e": ["エ"], "o": ["オ"],
    "ka": ["カ"], "ki": ["キ"], "ku": ["ク"], "ke": ["ケ"], "ko": ["コ"],
    "sa": ["サ"], "shi": ["シ"], "su": ["ス"], "se": ["セ"], "so": ["ソ"],
    "ta": ["タ"], "chi": ["チ"], "tsu": ["ツ"], "te": ["テ"], "to": ["ト"],
    "na": ["ナ"], "ni": ["ニ"], "nu": ["ヌ"], "ne": ["ネ"], "no": ["ノ"],
    "ha": ["ハ"], "hi": ["ヒ"], "fu": ["フ"], "he": ["ヘ"], "ho": ["ホ"],
    "ma": ["マ"], "mi": ["ミ"], "mu": ["ム"], "me": ["メ"], "mo": ["モ"],
    "ya": ["ヤ"], "yu": ["ユ"], "yo": ["ヨ"],
    "ra": ["ラ"], "ri": ["リ"], "ru": ["ル"], "re": ["レ"], "ro": ["ロ"],
    "wa": ["ワ"], "wo": ["ヲ"],
    "ga": ["ガ"], "gi": ["ギ"], "gu": ["グ"], "ge": ["ゲ"], "go": ["ゴ"],
    "za": ["ザ"], "ji": ["ジ"], "zu": ["ズ"], "ze": ["ゼ"], "zo": ["ゾ"],
    "da": ["ダ"], "di": ["ヂ"], "du": ["ヅ"], "de": ["デ"], "do": ["ド"],
    "ba": ["バ"], "bi": ["ビ"], "bu": ["ブ"], "be": ["ベ"], "bo": ["ボ"],
    "pa": ["パ"], "pi": ["ピ"], "pu": ["プ"], "pe": ["ペ"], "po": ["ポ"],
    "kya": ["キ", "ヤ"], "kyu": ["キ", "ユ"], "kyo": ["キ", "ヨ"],
    "sha": ["シ", "ヤ"], "shu": ["シ", "ユ"], "sho": ["シ", "ヨ"],
    "cha": ["チ", "ヤ"], "chu": ["チ", "ユ"], "cho": ["チ", "ヨ"],
    "nya": ["ニ", "ヤ"], "nyu": ["ニ", "ユ"], "nyo": ["ニ", "ヨ"],
    "hya": ["ヒ", "ヤ"], "hyu": ["ヒ", "ユ"], "hyo": ["ヒ", "ヨ"],
    "mya": ["ミ", "ヤ"], "myu": ["ミ", "ユ"], "myo": ["ミ", "ヨ"],
    "rya": ["リ", "ヤ"], "ryu": ["リ", "ユ"], "ryo": ["リ", "ヨ"],
    "gya": ["ギ", "ヤ"], "gyu": ["ギ", "ユ"], "gyo": ["ギ", "ヨ"],
    "ja": ["ジ", "ヤ"], "ju": ["ジ", "ユ"], "jo": ["ジ", "ヨ"],
    "bya": ["ビ", "ヤ"], "byu": ["ビ", "ユ"], "byo": ["ビ", "ヨ"],
    "pya": ["ピ", "ヤ"], "pyu": ["ピ", "ユ"], "pyo": ["ピ", "ヨ"],
    "fi": ["フ", "イ"],
    "nn": ["ン"],
    "-": ["ー"]
};

// Генерация удвоенных согласных
(function generateDoubledConsonants() {
    const consonants = ['k','s','t','p','c','j','d','b','g','z','r','m','h','f','w'];
    const newEntries = {};
    for (let key in romajiToKatakana) {
        const firstChar = key[0];
        if (!consonants.includes(firstChar)) continue;
        if (key.length > 1 && key[0] === key[1]) continue;
        if (firstChar === 'n') continue;
        const newKey = firstChar + key;
        if (romajiToKatakana[newKey]) continue;
        const originalValue = romajiToKatakana[key];
        newEntries[newKey] = ['ツ'].concat(originalValue);
    }
    Object.assign(romajiToKatakana, newEntries);
})();

let currentLevel = "n5";
let currentPuzzleIndex = 0;
let gridData = [];
let wordsList = [];
let cluesAcross = [];
let cluesDown = [];
let activeWordId = null;
let cellElements = [];
let gridWidth, gridHeight;
let romajiBuffers = new Map();
let hintUsed = false;
let correctCharMap = new Map();
let hintCount = 0;

const levelSelect = document.getElementById("levelSelect");
const puzzleSelect = document.getElementById("puzzleSelect");
const resetBtn = document.getElementById("resetBtn");
const hintBtn = document.getElementById("hintBtn");
const themeToggle = document.getElementById("themeToggle");
const resetProgressBtn = document.getElementById("resetProgressBtn");
const helpBtn = document.getElementById("helpBtn");
const buyPuzzleBtn = document.getElementById("buyPuzzleBtn");
const shopBtn = document.getElementById("shopBtn");

// ========== ЗВУКИ ==========
let audioContext = null;
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}
function playBeep(frequency, duration, volume = 0.3, type = 'sine') {
    try {
        initAudio();
        const now = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        oscillator.start();
        oscillator.stop(now + duration);
    } catch (e) {
        console.warn("Audio not supported", e);
    }
}
function playPop() {
    playBeep(880, 0.05, 0.2);
}
function playCorrectInput() {
    playBeep(1200, 0.04, 0.25);
}
function playErrorInput() {
    playBeep(200, 0.12, 0.2, 'sawtooth');
}
function playRouletteSpin() {
    playBeep(800, 0.02, 0.15);
}
function playRouletteWin(prize) {
    if (prize > 0) {
        playBeep(523, 0.15, 0.3);
        setTimeout(() => playBeep(659, 0.15, 0.3), 150);
        setTimeout(() => playBeep(784, 0.2, 0.3), 300);
    } else {
        playBeep(300, 0.3, 0.2, 'sawtooth');
    }
}
function playClick() {
    playBeep(600, 0.03, 0.1, 'sine');
}

// ========== КОНФЕТТИ ==========
function showConfetti() {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    let particles = [];
    for (let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 6 + 2,
            speedY: Math.random() * 8 + 5,
            speedX: (Math.random() - 0.5) * 3,
            color: `hsl(${Math.random() * 360}, 70%, 60%)`
        });
    }
    let animationId = null;
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let allDone = true;
        for (let p of particles) {
            p.y += p.speedY;
            p.x += p.speedX;
            if (p.y < canvas.height + p.size) allDone = false;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        if (!allDone) {
            animationId = requestAnimationFrame(animate);
        } else {
            cancelAnimationFrame(animationId);
            document.body.removeChild(canvas);
        }
    }
    animate();
    setTimeout(() => {
        if (animationId) cancelAnimationFrame(animationId);
        if (canvas.parentNode) document.body.removeChild(canvas);
    }, 2000);
}

// ========== ЕЖЕДНЕВНЫЙ БОНУС ==========
function checkDailyBonus() {
    const today = new Date().toDateString();
    if (gameStats.lastBonusDate !== today) {
        addPoints(50);
        gameStats.lastBonusDate = today;
        saveGameStats();
        showToast("🎁 Ежедневный бонус: +50 очков!", "success");
    }
}

// ========== ТОСТ ==========
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ========== ПОДТВЕРЖДЕНИЕ ==========
let confirmResolve = null;
const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const confirmYes = document.getElementById('confirmYes');
const confirmNo = document.getElementById('confirmNo');

function showConfirmDialog(message) {
    return new Promise((resolve) => {
        confirmResolve = resolve;
        confirmMessage.textContent = message;
        confirmModal.style.display = 'flex';
    });
}

function closeConfirmDialog(result) {
    if (confirmResolve) {
        confirmResolve(result);
        confirmResolve = null;
    }
    confirmModal.style.display = 'none';
}

confirmYes.addEventListener('click', () => closeConfirmDialog(true));
confirmNo.addEventListener('click', () => closeConfirmDialog(false));

// ========== ГЕЙМИФИКАЦИЯ (очки, слова, лимит подсказок) ==========
const STORAGE_GAME_KEY = "gameStats";
let gameStats = {
    score: 0,
    wordsCompleted: 0,
    lastBonusDate: null,
    maxHints: 2
};

function loadGameStats() {
    const saved = localStorage.getItem(STORAGE_GAME_KEY);
    if (saved) {
        gameStats = JSON.parse(saved);
        if (gameStats.maxHints === undefined) gameStats.maxHints = 2;
    } else {
        gameStats = { score: 0, wordsCompleted: 0, lastBonusDate: null, maxHints: 2 };
        saveGameStats();
    }
    updateScoreUI();
}

function saveGameStats() {
    localStorage.setItem(STORAGE_GAME_KEY, JSON.stringify(gameStats));
}

function updateScoreUI() {
    const scoreSpan = document.getElementById("scoreValue");
    const wordsSpan = document.getElementById("wordsCompleted");
    if (scoreSpan) scoreSpan.innerText = gameStats.score;
    if (wordsSpan) wordsSpan.innerText = gameStats.wordsCompleted;
}

function addPoints(points) {
    gameStats.score += points;
    saveGameStats();
    updateScoreUI();
    showToast(`+${points} очков!`, "success");
}

function subtractPoints(points) {
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

function incrementWordsCompleted() {
    gameStats.wordsCompleted++;
    saveGameStats();
    updateScoreUI();
}

function decrementWordsCompleted() {
    gameStats.wordsCompleted = Math.max(0, gameStats.wordsCompleted - 1);
    saveGameStats();
    updateScoreUI();
}

// ========== СКИНЫ (японские атрибуты) ==========
const STORAGE_SKINS_KEY = "skins";
const availableSkins = [
    { id: "default", name: "Без скина", emoji: "", price: 0, default: true },
    { id: "japan_flag", name: "Флаг Японии", emoji: "🎌", price: 100 },
    { id: "katana", name: "Катана", emoji: "🗡️", price: 150 },
    { id: "sakura", name: "Цветок сакуры", emoji: "🌸", price: 200 },
    { id: "fan", name: "Веер", emoji: "🎐", price: 250 },
    { id: "sushi", name: "Суши", emoji: "🍣", price: 300 },
    { id: "geisha", name: "Гейша", emoji: "👘", price: 350 },
    { id: "tempura", name: "Тэмпура", emoji: "🍤", price: 400 },
    { id: "dragon", name: "Дракон", emoji: "🐉", price: 500 }
];

let purchasedSkins = [];
let selectedSkinId = "default";

function loadSkinsData() {
    const saved = localStorage.getItem(STORAGE_SKINS_KEY);
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

function saveSkinsData() {
    localStorage.setItem(STORAGE_SKINS_KEY, JSON.stringify({
        purchasedSkins: purchasedSkins,
        selectedSkinId: selectedSkinId
    }));
}

function isSkinPurchased(skinId) {
    return purchasedSkins.includes(skinId);
}

function purchaseSkin(skinId, price) {
    if (isSkinPurchased(skinId)) {
        showToast("Этот скин уже куплен!", "error");
        return false;
    }
    if (gameStats.score >= price) {
        subtractPoints(price);
        purchasedSkins.push(skinId);
        saveSkinsData();
        showConfetti();
        showToast(`Скин "${availableSkins.find(s => s.id === skinId).name}" куплен!`, "success");
        return true;
    } else {
        showToast(`Недостаточно очков! Нужно ${price} очков.`, "error");
        return false;
    }
}

function selectSkin(skinId) {
    if (!isSkinPurchased(skinId)) {
        showToast("Сначала купите этот скин!", "error");
        return false;
    }
    selectedSkinId = skinId;
    saveSkinsData();
    showToast(`Скин "${availableSkins.find(s => s.id === skinId).name}" выбран!`, "success");
    updateAllBlockedSkins();
    return true;
}

function getSelectedSkinEmoji() {
    const skin = availableSkins.find(s => s.id === selectedSkinId);
    return skin ? skin.emoji : "";
}

function updateAllBlockedSkins() {
    if (!cellElements) return;
    for (let i = 0; i < gridHeight; i++) {
        for (let j = 0; j < gridWidth; j++) {
            if (gridData[i][j] === null) {
                updateBlockedSkin(i, j);
            }
        }
    }
}

function updateBlockedSkin(row, col) {
    const cellDiv = cellElements[row]?.[col]?.parentElement;
    if (!cellDiv) return;
    const skinSpan = cellDiv.querySelector('.cell-skin');
    if (!skinSpan) return;
    const isBlocked = (gridData[row][col] === null);
    const showSkin = isBlocked && selectedSkinId !== "default";
    if (showSkin) {
        skinSpan.style.display = "flex";
        skinSpan.textContent = getSelectedSkinEmoji();
    } else {
        skinSpan.style.display = "none";
    }
}

// ========== УЛУЧШЕНИЯ (лимит подсказок) ==========
function upgradeMaxHints(newLimit, price) {
    if (newLimit <= gameStats.maxHints) {
        showToast("Это улучшение уже куплено!", "error");
        return false;
    }
    if (gameStats.score >= price) {
        subtractPoints(price);
        gameStats.maxHints = newLimit;
        saveGameStats();
        showToast(`Лимит подсказок увеличен до ${newLimit}!`, "success");
        updateButtonStates();
        return true;
    } else {
        showToast(`Недостаточно очков! Нужно ${price} очков.`, "error");
        return false;
    }
}

// ========== РУЛЕТКА ==========
const roulettePrizes = [0, 10, 20, 50, 100, 200];
const rouletteProbabilities = [25, 20, 20, 15, 10, 10];
let rouletteAnimating = false;

function spinRoulette() {
    if (rouletteAnimating) return;
    if (!subtractPoints(20)) return;

    const rand = Math.random() * 100;
    let cumulative = 0;
    let selectedPrize = 0;
    for (let i = 0; i < roulettePrizes.length; i++) {
        cumulative += rouletteProbabilities[i];
        if (rand < cumulative) {
            selectedPrize = roulettePrizes[i];
            break;
        }
    }

    rouletteAnimating = true;
    const rouletteDisplay = document.getElementById('rouletteDisplay');
    const rouletteResult = document.getElementById('rouletteResult');
    let spins = 0;
    const totalSpins = 20;
    const interval = setInterval(() => {
        const randomTemp = roulettePrizes[Math.floor(Math.random() * roulettePrizes.length)];
        rouletteDisplay.textContent = randomTemp;
        playRouletteSpin();
        spins++;
        if (spins >= totalSpins) {
            clearInterval(interval);
            rouletteDisplay.textContent = selectedPrize;
            if (selectedPrize > 0) {
                addPoints(selectedPrize);
                rouletteResult.innerHTML = `🎉 Вы выиграли ${selectedPrize} очков! 🎉`;
                if (selectedPrize >= 100) showConfetti();
                playRouletteWin(selectedPrize);
            } else {
                rouletteResult.innerHTML = `😞 Вам выпало 0 очков. Повезёт в следующий раз!`;
                playRouletteWin(0);
            }
            rouletteAnimating = false;
        }
    }, 50);
}

// ========== ПРОГРЕСС-БАР ==========
function updateLevelProgress() {
    const puzzles = window.crosswordsData[currentLevel].puzzles;
    const total = puzzles.length;
    const completedKeys = getCompletedCrosswords();
    let completedCount = 0;
    for (let i = 0; i < total; i++) {
        if (completedKeys.includes(`${currentLevel}_${i}`)) completedCount++;
    }
    const textSpan = document.getElementById("levelProgressText");
    const fillDiv = document.getElementById("levelProgressFill");
    if (textSpan) textSpan.innerText = `${completedCount}/${total}`;
    const percent = total === 0 ? 0 : (completedCount / total) * 100;
    if (fillDiv) fillDiv.style.width = `${percent}%`;
}

// ========== ПОДСВЕТКА ОШИБОК ==========
function updateWrongHighlights() {
    for (let i = 0; i < gridHeight; i++) {
        for (let j = 0; j < gridWidth; j++) {
            const cellDiv = cellElements[i]?.[j]?.parentElement;
            if (!cellDiv) continue;
            const value = gridData[i][j];
            const correct = correctCharMap.get(`${i},${j}`);
            if (value && value !== correct && correct) {
                cellDiv.classList.add("wrong");
            } else {
                cellDiv.classList.remove("wrong");
            }
        }
    }
}

function buildCorrectCharMap() {
    correctCharMap.clear();
    for (let w of wordsList) {
        for (let idx = 0; idx < w.cells.length; idx++) {
            const cell = w.cells[idx];
            const key = `${cell.row},${cell.col}`;
            correctCharMap.set(key, w.wordOrig[idx]);
        }
    }
}

// ========== РАБОТА С ХРАНИЛИЩЕМ ==========
const STORAGE_PROGRESS_KEY = "crosswordProgress";
const STORAGE_COMPLETED_KEY = "completedCrosswords";
const STORAGE_UNLOCKED_KEY = "unlockedCrosswords";
const STORAGE_EARNED_KEY = "earnedPoints";

function saveCurrentProgress() {
    const progress = getStoredProgress();
    const key = `${currentLevel}_${currentPuzzleIndex}`;
    progress[key] = {
        gridData: gridData.map(row => row.map(cell => cell)),
        hintUsed: hintUsed,
        hintCount: hintCount
    };
    localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(progress));
}

function getStoredProgress() {
    const saved = localStorage.getItem(STORAGE_PROGRESS_KEY);
    return saved ? JSON.parse(saved) : {};
}

function getUnlockedCrosswords() {
    const saved = localStorage.getItem(STORAGE_UNLOCKED_KEY);
    return saved ? JSON.parse(saved) : {};
}

function saveUnlockedCrosswords(unlocked) {
    localStorage.setItem(STORAGE_UNLOCKED_KEY, JSON.stringify(unlocked));
}

function isPuzzleUnlocked(level, puzzleIdx) {
    const unlocked = getUnlockedCrosswords();
    const key = `${level}_${puzzleIdx}`;
    if (puzzleIdx === 0 && !unlocked[key]) {
        unlocked[key] = true;
        saveUnlockedCrosswords(unlocked);
        return true;
    }
    return unlocked[key] === true;
}

function unlockPuzzle(level, puzzleIdx, price) {
    const unlocked = getUnlockedCrosswords();
    const key = `${level}_${puzzleIdx}`;
    if (unlocked[key]) return true;
    if (gameStats.score >= price) {
        unlocked[key] = true;
        saveUnlockedCrosswords(unlocked);
        subtractPoints(price);
        showConfetti();
        showToast(`Кроссворд разблокирован! -${price} очков`, "success");
        return true;
    } else {
        showToast(`Недостаточно очков! Нужно ${price} очков.`, "error");
        return false;
    }
}

function getEarnedPointsForCurrent() {
    const earned = localStorage.getItem(STORAGE_EARNED_KEY);
    const data = earned ? JSON.parse(earned) : {};
    const key = `${currentLevel}_${currentPuzzleIndex}`;
    if (!data[key]) data[key] = { words: {}, completed: false };
    return data[key];
}

function saveEarnedPointsForCurrent(earned) {
    const earnedAll = localStorage.getItem(STORAGE_EARNED_KEY);
    const data = earnedAll ? JSON.parse(earnedAll) : {};
    const key = `${currentLevel}_${currentPuzzleIndex}`;
    data[key] = earned;
    localStorage.setItem(STORAGE_EARNED_KEY, JSON.stringify(data));
}

function markWordPointsEarned(wordId) {
    const earned = getEarnedPointsForCurrent();
    if (!earned.words[wordId]) {
        earned.words[wordId] = true;
        saveEarnedPointsForCurrent(earned);
        addPoints(10);
        incrementWordsCompleted();
        playPop();
    }
}

function markCrosswordCompletedEarned() {
    const earned = getEarnedPointsForCurrent();
    if (!earned.completed) {
        earned.completed = true;
        saveEarnedPointsForCurrent(earned);
        addPoints(50);
    }
}

function revertPointsForCurrentPuzzle() {
    const earned = getEarnedPointsForCurrent();
    let pointsToSubtract = 0;
    let wordsToSubtract = 0;
    for (let wordId in earned.words) {
        if (earned.words[wordId]) {
            pointsToSubtract += 10;
            wordsToSubtract++;
        }
    }
    if (earned.completed) {
        pointsToSubtract += 50;
    }
    if (pointsToSubtract > 0) {
        gameStats.score = Math.max(0, gameStats.score - pointsToSubtract);
        gameStats.wordsCompleted = Math.max(0, gameStats.wordsCompleted - wordsToSubtract);
        saveGameStats();
        updateScoreUI();
        showToast(`Сброшено ${pointsToSubtract} очков и ${wordsToSubtract} слов`, "info");
    }
    const earnedAll = localStorage.getItem(STORAGE_EARNED_KEY);
    if (earnedAll) {
        const data = JSON.parse(earnedAll);
        delete data[`${currentLevel}_${currentPuzzleIndex}`];
        localStorage.setItem(STORAGE_EARNED_KEY, JSON.stringify(data));
    }
}

function getCompletedCrosswords() {
    const saved = localStorage.getItem(STORAGE_COMPLETED_KEY);
    return saved ? JSON.parse(saved) : [];
}

function markAsCompleted() {
    const completed = getCompletedCrosswords();
    const key = `${currentLevel}_${currentPuzzleIndex}`;
    if (!completed.includes(key)) {
        completed.push(key);
        localStorage.setItem(STORAGE_COMPLETED_KEY, JSON.stringify(completed));
        updatePuzzleSelect();
        updateLevelProgress();
        markCrosswordCompletedEarned();
        showToast(`Кроссворд решён! +50 очков`, "success");
    }
}

function isCrosswordCompleted(level, puzzleIdx) {
    const completed = getCompletedCrosswords();
    return completed.includes(`${level}_${puzzleIdx}`);
}

// ========== ТЕМА ==========
function initTheme() {
 const savedTheme = localStorage.getItem('theme') || 'light'; 
    document.body.classList.remove('dark', 'sakura'); 
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
    } else if (savedTheme === 'sakura') {
        document.body.classList.add('sakura');
    }
}
function toggleTheme() {
  let currentTheme = 'light';
    if (document.body.classList.contains('dark')) {
        currentTheme = 'dark';
    } else if (document.body.classList.contains('sakura')) {
        currentTheme = 'sakura';
    }

    // Цикл переключения: Light -> Dark -> Sakura -> Light
    let nextTheme = '';
    
    if (currentTheme === 'light') {
        nextTheme = 'dark';
    } else if (currentTheme === 'dark') {
        nextTheme = 'sakura';
    } else {
        nextTheme = 'light';
    }

    // Применяем новую тему
    document.body.classList.remove('dark', 'sakura');
    if (nextTheme === 'dark') {
        document.body.classList.add('dark');
    } else if (nextTheme === 'sakura') {
        document.body.classList.add('sakura');
    }
    
    localStorage.setItem('theme', nextTheme);
}
themeToggle.addEventListener('click', toggleTheme);
initTheme();

// ========== НУМЕРАЦИЯ СЛОВ ==========
function generateNumbering() {
    let allWords = wordsList.map((w, idx) => ({ ...w, id: idx }));
    let hasManualNumbers = allWords.some(w => w.number !== undefined && w.number !== null);
    
    if (!hasManualNumbers) {
        let numberMap = new Map();
        let counter = 1;
        let sorted = [...allWords].sort((a,b) => {
            if(a.row === b.row && a.col === b.col) return a.dir === "across" ? -1 : 1;
            if(a.row === b.row) return a.col - b.col;
            return a.row - b.row;
        });
        for(let w of sorted) {
            let key = `${w.row},${w.col}`;
            if(!numberMap.has(key)) {
                numberMap.set(key, counter++);
            }
            w.number = numberMap.get(key);
        }
        allWords.forEach(w => {
            wordsList[w.id].number = w.number;
        });
    } else {
        allWords.forEach(w => {
            if (typeof w.number !== 'number') w.number = 0;
            wordsList[w.id].number = w.number;
        });
    }
    
    cluesAcross = [];
    cluesDown = [];
    for(let w of wordsList) {
        let clueItem = { num: w.number, wordId: w.id, clue: w.clue, cells: w.cells };
        if(w.dir === "across") cluesAcross.push(clueItem);
        else cluesDown.push(clueItem);
    }
    cluesAcross.sort((a,b) => a.num - b.num);
    cluesDown.sort((a,b) => a.num - b.num);
}

// ========== УПРАВЛЕНИЕ СОСТОЯНИЕМ КНОПОК ==========
function updateButtonStates() {
    const unlocked = isPuzzleUnlocked(currentLevel, currentPuzzleIndex);
    resetBtn.disabled = !unlocked;
    if (!unlocked) {
        hintBtn.disabled = true;
        hintBtn.textContent = "Кроссворд заблокирован";
    } else {
        const completed = isCrosswordCompleted(currentLevel, currentPuzzleIndex);
        if (completed) {
            hintBtn.disabled = true;
            hintBtn.textContent = "Кроссворд решён";
        } else if (hintCount >= gameStats.maxHints) {
            hintBtn.disabled = true;
            hintBtn.textContent = `Подсказки закончились (${hintCount}/${gameStats.maxHints})`;
        } else {
            hintBtn.disabled = false;
            hintBtn.textContent = `Подсказка (20 очков) (${hintCount}/${gameStats.maxHints})`;
        }
    }
}

// ========== ЗАГРУЗКА КРОССВОРДА ==========
function loadCrossword(levelId, puzzleIdx, preserveSaved = true) {
    const levelData = window.crosswordsData[levelId];
    if (!levelData) return;
    const puzzles = levelData.puzzles;
    if (puzzleIdx < 0 || puzzleIdx >= puzzles.length) return;
    const puzzle = puzzles[puzzleIdx];

    localStorage.setItem('lastPlayedLevel', levelId);
    localStorage.setItem('lastPlayedPuzzle', puzzleIdx);
    
    gridWidth = puzzle.width;
    gridHeight = puzzle.height;
    wordsList = puzzle.words.map((w, idx) => ({
        ...w,
        id: idx,
        current: Array(w.word.length).fill(""),
        wordOrig: w.word
    }));
    
    let emptyGrid = Array(gridHeight).fill().map(() => Array(gridWidth).fill(null));
    for(let w of wordsList) {
        let cells = [];
        for(let i=0;i<w.word.length;i++){
            let r = w.dir === "across" ? w.row : w.row + i;
            let c = w.dir === "across" ? w.col + i : w.col;
            if(r>=0 && r<gridHeight && c>=0 && c<gridWidth){
                cells.push({row:r, col:c});
                if(emptyGrid[r][c] === null) emptyGrid[r][c] = "";
            }
        }
        w.cells = cells;
    }
    for(let i=0;i<gridHeight;i++){
        for(let j=0;j<gridWidth;j++){
            if(emptyGrid[i][j] === null) emptyGrid[i][j] = null;
        }
    }
    
    const freshGrid = emptyGrid.map(row => row.map(cell => (cell === null ? null : "")));
    
    let savedData = null;
    if (preserveSaved && isPuzzleUnlocked(levelId, puzzleIdx)) {
        const progress = getStoredProgress();
        const key = `${levelId}_${puzzleIdx}`;
        if (progress[key]) {
            savedData = progress[key];
        }
    }
    
    if (savedData) {
        gridData = savedData.gridData.map(row => [...row]);
        hintUsed = savedData.hintUsed;
        hintCount = savedData.hintCount !== undefined ? savedData.hintCount : 0;
    } else {
        gridData = freshGrid;
        hintUsed = false;
        hintCount = 0;
    }
    
    generateNumbering();
    syncWordFromGrid();
    buildCorrectCharMap();
    renderGrid();
    renderClues();
    clearHighlight();
    activeWordId = null;
    checkCompletion();
    updateClueCompletion();
    updateWrongHighlights();
    romajiBuffers.clear();
    
    const unlocked = isPuzzleUnlocked(levelId, puzzleIdx);
    const statusDiv = document.getElementById("statusMsg");
    if (!unlocked) {
        const price = puzzle.price !== undefined ? puzzle.price : 0;
        statusDiv.innerHTML = `🔒 Кроссворд заблокирован. Цена: ${price} очков. Нажмите «Купить», чтобы разблокировать.`;
        statusDiv.style.color = "#c94f4f";
    } else if (statusDiv) {
        // статус обновится в checkCompletion
    }
    
    updateButtonStates();
    updateLevelProgress();
    updatePuzzleSelect();
}

// ========== ОТРИСОВКА СЕТКИ ==========
function renderGrid() {
    const container = document.getElementById("gridContainer");
    container.innerHTML = "";
    container.style.gridTemplateColumns = `repeat(${gridWidth}, minmax(70px, 1fr))`;
    cellElements = [];
    const isLocked = !isPuzzleUnlocked(currentLevel, currentPuzzleIndex);
    for(let i=0;i<gridHeight;i++){
        cellElements[i]=[];
        for(let j=0;j<gridWidth;j++){
            const isBlocked = (gridData[i][j] === null);
            const cellDiv = document.createElement("div");
            cellDiv.className = "cell";
            if(isBlocked) cellDiv.classList.add("blocked");
            const wordNumber = getWordNumberAt(i,j);
            if(wordNumber && !isBlocked){
                const spanNum = document.createElement("span");
                spanNum.className = "cell-number";
                spanNum.innerText = Math.floor(wordNumber);
                cellDiv.appendChild(spanNum);
            }
            const skinSpan = document.createElement("span");
            skinSpan.className = "cell-skin";
            skinSpan.style.display = "none";
            cellDiv.appendChild(skinSpan);
            
            const input = document.createElement("input");
            input.type = "text";
            input.maxLength = 1;
            input.value = getDisplayValue(i, j);
            input.disabled = isBlocked || isLocked;
            if(!isBlocked && !isLocked){
                input.addEventListener("keydown", (e) => handleKeydown(e, i, j));
                input.addEventListener("focus", () => onCellFocus(i,j));
                input.addEventListener("blur", () => onCellBlur(i,j));
                input.addEventListener("input", () => onCellInput(i,j));
            }
            cellDiv.appendChild(input);
            container.appendChild(cellDiv);
            cellElements[i][j] = input;
        }
    }
    applyHighlight();
    updateWrongHighlights();
    updateAllBlockedSkins();
}

function getDisplayValue(row, col) {
    const key = `${row},${col}`;
    const buffer = romajiBuffers.get(key) || "";
    if (buffer !== "") return buffer;
    return gridData[row][col] !== null ? gridData[row][col] : "";
}

function updateCellUI(row, col) {
    if (cellElements[row] && cellElements[row][col]) {
        cellElements[row][col].value = getDisplayValue(row, col);
    }
}

function getWordNumberAt(row, col) {
    for (let w of wordsList) {
        if (w.cells.length > 0 && w.cells[0].row === row && w.cells[0].col === col) {
            return w.number;
        }
    }
    return null;
}

function onCellFocus(row, col){
    if (!isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) return;
    let containingWords = wordsList.filter(w => w.cells.some(c => c.row === row && c.col === col));
    if (containingWords.length === 0) return;
    if (activeWordId !== null) {
        let activeWord = wordsList.find(w => w.id === activeWordId);
        if (activeWord && activeWord.cells.some(c => c.row === row && c.col === col)) return;
    }
    let newWord = null;
    if (activeWordId !== null) {
        let activeWord = wordsList.find(w => w.id === activeWordId);
        if (activeWord) newWord = containingWords.find(w => w.dir === activeWord.dir);
    }
    if (!newWord) newWord = containingWords.find(w => w.dir === "across") || containingWords[0];
    setActiveWord(newWord.id);
}

function onCellBlur(row, col) {
    const key = `${row},${col}`;
    const buffer = romajiBuffers.get(key);
    if (buffer === "n") {
        insertKatakanaArray(row, col, ["ン"], 0);
        romajiBuffers.delete(key);
        updateCellUI(row, col);
    } else if (buffer) {
        romajiBuffers.delete(key);
        updateCellUI(row, col);
    }
}

function setActiveWord(wordId){
    activeWordId = wordId;
    applyHighlight();
    const word = wordsList.find(w => w.id === activeWordId);
    if (word && word.cells.length) {
        const firstEmpty = word.cells.find(cell => gridData[cell.row][cell.col] === "");
        if (firstEmpty) cellElements[firstEmpty.row][firstEmpty.col]?.focus();
        else cellElements[word.cells[0].row][word.cells[0].col]?.focus();
    }
}

function applyHighlight(){
    for(let i=0;i<gridHeight;i++){
        for(let j=0;j<gridWidth;j++){
            const cellDiv = cellElements[i]?.[j]?.parentElement;
            if(cellDiv) cellDiv.classList.remove("highlight", "active-word");
        }
    }
    if(activeWordId !== null){
        const activeWord = wordsList.find(w => w.id === activeWordId);
        if(activeWord){
            for(let cell of activeWord.cells){
                const cellDiv = cellElements[cell.row]?.[cell.col]?.parentElement;
                if(cellDiv) cellDiv.classList.add("active-word");
            }
        }
    }
    document.querySelectorAll(".clue-list li").forEach(li => li.classList.remove("active-clue"));
    if(activeWordId !== null){
        let target = document.querySelector(`.clue-list li[data-word-id='${activeWordId}']`);
        if(target) target.classList.add("active-clue");
    }
}

function clearHighlight(){
    activeWordId = null;
    applyHighlight();
}

function getNextEmptyCellInWord(word, currentRow, currentCol) {
    let currentIndex = word.cells.findIndex(cell => cell.row === currentRow && cell.col === currentCol);
    if (currentIndex === -1) return null;
    for (let i = currentIndex + 1; i < word.cells.length; i++) {
        let cell = word.cells[i];
        if (gridData[cell.row][cell.col] === "") return cell;
    }
    return null;
}

// ========== ВСТАВКА СИМВОЛОВ (с проверкой правильности и звуками) ==========
function insertKatakanaArray(row, col, katakanaArray, startIndex) {
    if (startIndex >= katakanaArray.length) return;
    const char = katakanaArray[startIndex];
    if (startIndex === 0) {
        gridData[row][col] = char;
        updateCellUI(row, col);
        syncWordFromGrid();
        checkCompletion();
        updateClueCompletion();
        updateWrongHighlights();
        saveCurrentProgress();
        
        const correctChar = correctCharMap.get(`${row},${col}`);
        if (char === correctChar) {
            playCorrectInput();
            // Добавляем анимацию
            const cellDiv = cellElements[row]?.[col]?.parentElement;
            if (cellDiv) {
                cellDiv.classList.add('correct-animation');
                setTimeout(() => {
                    cellDiv.classList.remove('correct-animation');
                }, 300); // Удаляем класс после завершения анимации
            }
        } else {
            playErrorInput();
        }

        if (katakanaArray.length > 1) {
            if (activeWordId !== null) {
                const activeWord = wordsList.find(w => w.id === activeWordId);
                if (activeWord) {
                    let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
                    if (idx !== -1 && idx + 1 < activeWord.cells.length) {
                        let nextCell = activeWord.cells[idx + 1];
                        insertKatakanaArray(nextCell.row, nextCell.col, katakanaArray, 1);
                        return;
                    }
                }
            }
        } else {
            if (activeWordId !== null) {
                const activeWord = wordsList.find(w => w.id === activeWordId);
                if (activeWord) {
                    let nextEmpty = getNextEmptyCellInWord(activeWord, row, col);
                    if (nextEmpty) cellElements[nextEmpty.row][nextEmpty.col]?.focus();
                    else focusNextWord(activeWord.number);
                }
            }
        }
    } else {
        gridData[row][col] = char;
        updateCellUI(row, col);
        syncWordFromGrid();
        checkCompletion();
        updateClueCompletion();
        updateWrongHighlights();
        saveCurrentProgress();
        
        const correctChar = correctCharMap.get(`${row},${col}`);
        if (char === correctChar) {
            playCorrectInput();
            // Добавляем анимацию
            const cellDiv = cellElements[row]?.[col]?.parentElement;
            if (cellDiv) {
                cellDiv.classList.add('correct-animation');
                setTimeout(() => {
                    cellDiv.classList.remove('correct-animation');
                }, 300); // Удаляем класс после завершения анимации
            }
        } else {
            playErrorInput();
        }

        if (startIndex + 1 < katakanaArray.length) {
            if (activeWordId !== null) {
                const activeWord = wordsList.find(w => w.id === activeWordId);
                if (activeWord) {
                    let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
                    if (idx !== -1 && idx + 1 < activeWord.cells.length) {
                        let nextCell = activeWord.cells[idx + 1];
                        insertKatakanaArray(nextCell.row, nextCell.col, katakanaArray, startIndex + 1);
                        return;
                    }
                }
            }
        } else {
            if (activeWordId !== null) {
                const activeWord = wordsList.find(w => w.id === activeWordId);
                if (activeWord) {
                    let nextEmpty = getNextEmptyCellInWord(activeWord, row, col);
                    if (nextEmpty) cellElements[nextEmpty.row][nextEmpty.col]?.focus();
                    else focusNextWord(activeWord.number);
                }
            }
        }
    }
}

function focusNextWord(currentNumber) {
    let allWords = [...cluesAcross, ...cluesDown];
    allWords.sort((a,b) => a.num - b.num);
    
    for (let w of allWords) {
        if (w.num > currentNumber) {
            const wordObj = wordsList.find(word => word.id === w.wordId);
            if (!wordObj) continue;
            let isComplete = true;
            for (let i = 0; i < wordObj.word.length; i++) {
                if (wordObj.current[i] !== wordObj.wordOrig[i]) {
                    isComplete = false;
                    break;
                }
            }
            if (!isComplete) {
                setActiveWord(wordObj.id);
                return;
            }
        }
    }
    
    for (let w of allWords) {
        const wordObj = wordsList.find(word => word.id === w.wordId);
        if (!wordObj) continue;
        let isComplete = true;
        for (let i = 0; i < wordObj.word.length; i++) {
            if (wordObj.current[i] !== wordObj.wordOrig[i]) {
                isComplete = false;
                break;
            }
        }
        if (!isComplete) {
            setActiveWord(wordObj.id);
            return;
        }
    }
}

function processBuffer(row, col, buffer) {
    if (buffer.length === 2 && buffer[0] === 'n' && !'aiueo'.includes(buffer[1]) && buffer[1] !== 'n') {
        insertKatakanaArray(row, col, ["ン"], 0);
        if (activeWordId !== null) {
            const activeWord = wordsList.find(w => w.id === activeWordId);
            if (activeWord) {
                let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
                if (idx !== -1 && idx + 1 < activeWord.cells.length) {
                    let nextCell = activeWord.cells[idx + 1];
                    const nextKey = `${nextCell.row},${nextCell.col}`;
                    romajiBuffers.set(nextKey, buffer[1]);
                    updateCellUI(nextCell.row, nextCell.col);
                    cellElements[nextCell.row][nextCell.col]?.focus();
                } else {
                    let nextEmpty = getNextEmptyCellInWord(activeWord, row, col);
                    if (nextEmpty) {
                        const nextKey = `${nextEmpty.row},${nextEmpty.col}`;
                        romajiBuffers.set(nextKey, buffer[1]);
                        updateCellUI(nextEmpty.row, nextEmpty.col);
                        cellElements[nextEmpty.row][nextEmpty.col]?.focus();
                    } else {
                        focusNextWord(activeWord.number);
                        setTimeout(() => {
                            if (activeWordId !== null) {
                                const newWord = wordsList.find(w => w.id === activeWordId);
                                if (newWord && newWord.cells.length) {
                                    let firstCell = newWord.cells[0];
                                    const firstKey = `${firstCell.row},${firstCell.col}`;
                                    romajiBuffers.set(firstKey, buffer[1]);
                                    updateCellUI(firstCell.row, firstCell.col);
                                    cellElements[firstCell.row][firstCell.col]?.focus();
                                }
                            }
                        }, 10);
                    }
                }
            }
        }
        return true;
    }

    if (romajiToKatakana.hasOwnProperty(buffer)) {
        insertKatakanaArray(row, col, romajiToKatakana[buffer], 0);
        return true;
    }

    for (let i = buffer.length - 1; i >= 1; i--) {
        let prefix = buffer.slice(0, i);
        if (romajiToKatakana.hasOwnProperty(prefix)) {
            const katakanaArray = romajiToKatakana[prefix];
            const remaining = buffer.slice(i);
            insertKatakanaArray(row, col, katakanaArray, 0);
            if (remaining.length > 0) {
                if (activeWordId !== null) {
                    const activeWord = wordsList.find(w => w.id === activeWordId);
                    if (activeWord) {
                        let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
                        if (idx !== -1 && idx + 1 < activeWord.cells.length) {
                            let nextCell = activeWord.cells[idx + 1];
                            const nextKey = `${nextCell.row},${nextCell.col}`;
                            romajiBuffers.set(nextKey, remaining);
                            updateCellUI(nextCell.row, nextCell.col);
                            cellElements[nextCell.row][nextCell.col]?.focus();
                        } else {
                            let nextEmpty = getNextEmptyCellInWord(activeWord, row, col);
                            if (nextEmpty) {
                                const nextKey = `${nextEmpty.row},${nextEmpty.col}`;
                                romajiBuffers.set(nextKey, remaining);
                                updateCellUI(nextEmpty.row, nextEmpty.col);
                                cellElements[nextEmpty.row][nextEmpty.col]?.focus();
                            } else {
                                focusNextWord(activeWord.number);
                                setTimeout(() => {
                                    if (activeWordId !== null) {
                                        const newWord = wordsList.find(w => w.id === activeWordId);
                                        if (newWord && newWord.cells.length) {
                                            let firstCell = newWord.cells[0];
                                            const firstKey = `${firstCell.row},${firstCell.col}`;
                                            romajiBuffers.set(firstKey, remaining);
                                            updateCellUI(firstCell.row, firstCell.col);
                                            cellElements[firstCell.row][firstCell.col]?.focus();
                                        }
                                    }
                                }, 10);
                            }
                        }
                    }
                }
            }
            return true;
        }
    }
    return false;
}

function handleKeydown(e, row, col) {
    if (gridData[row][col] === null) return;
    const allowedChars = /^[a-zA-Z-]$/;
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && !allowedChars.test(e.key)) {
        e.preventDefault();
        return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) e.preventDefault();

    if (e.key === "Backspace") {
        const key = `${row},${col}`;
        let buffer = romajiBuffers.get(key) || "";
        if (buffer.length > 0) {
            buffer = buffer.slice(0, -1);
            romajiBuffers.set(key, buffer);
            updateCellUI(row, col);
        } else {
            if (gridData[row][col] !== "") {
                gridData[row][col] = "";
                updateCellUI(row, col);
                syncWordFromGrid();
                checkCompletion();
                updateClueCompletion();
                updateWrongHighlights();
                saveCurrentProgress();
            } else {
                if (activeWordId !== null) {
                    const activeWord = wordsList.find(w => w.id === activeWordId);
                    if (activeWord) {
                        let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
                        if (idx > 0) {
                            let prev = activeWord.cells[idx - 1];
                            cellElements[prev.row][prev.col]?.focus();
                        }
                    }
                }
            }
        }
        return;
    }

    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
        let newRow = row, newCol = col;
        if (e.key === "ArrowLeft") newCol--;
        if (e.key === "ArrowRight") newCol++;
        if (e.key === "ArrowUp") newRow--;
        if (e.key === "ArrowDown") newRow++;
        if (newRow >= 0 && newRow < gridHeight && newCol >= 0 && newCol < gridWidth && gridData[newRow][newCol] !== null) {
            cellElements[newRow][newCol]?.focus();
        }
        return;
    }

    if (e.key.length === 1 && allowedChars.test(e.key)) {
        const key = `${row},${col}`;
        let buffer = (romajiBuffers.get(key) || "") + e.key.toLowerCase();
        romajiBuffers.set(key, buffer);
        updateCellUI(row, col);

        if (buffer.length === 1 && gridData[row][col] !== "") {
            gridData[row][col] = "";
            updateCellUI(row, col);
            syncWordFromGrid();
            checkCompletion();
            updateClueCompletion();
            updateWrongHighlights();
            saveCurrentProgress();
        }

        const processed = processBuffer(row, col, buffer);
        if (processed) {
            romajiBuffers.set(key, "");
            updateCellUI(row, col);
        }
    }
}

function onCellInput(row, col) {
    const key = `${row},${col}`;
    if (romajiBuffers.has(key)) {
        romajiBuffers.delete(key);
        updateCellUI(row, col);
    }
}

function syncWordFromGrid() {
    for (let w of wordsList) {
        for (let i = 0; i < w.cells.length; i++) {
            let cell = w.cells[i];
            let val = gridData[cell.row][cell.col] || "";
            w.current[i] = val;
        }
    }
}

function checkCompletion() {
    let allFilled = true;
    for (let w of wordsList) {
        for (let i = 0; i < w.word.length; i++) {
            if (w.current[i] !== w.wordOrig[i]) {
                allFilled = false;
                break;
            }
        }
    }
    const statusDiv = document.getElementById("statusMsg");
    const unlocked = isPuzzleUnlocked(currentLevel, currentPuzzleIndex);
    if (allFilled && unlocked) {
        statusDiv.innerHTML = "🎉 Поздравляем! Кроссворд полностью разгадан! 🎉";
        statusDiv.style.color = "#2c6e2c";
        if (!isCrosswordCompleted(currentLevel, currentPuzzleIndex)) {
            markAsCompleted();
        }
        updateButtonStates();
    } else if (unlocked) {
        statusDiv.innerHTML = "Заполняйте ячейки. Вводите английскими буквами (a-z). Буквы отображаются в процессе набора. Например: su → ス, shu → シ+ユ, a → ア, n+s → ン+s, - → ー.";
        statusDiv.style.color = "#666";
        if (isCrosswordCompleted(currentLevel, currentPuzzleIndex)) {
            const completed = getCompletedCrosswords();
            const key = `${currentLevel}_${currentPuzzleIndex}`;
            const index = completed.indexOf(key);
            if (index !== -1) {
                completed.splice(index, 1);
                localStorage.setItem(STORAGE_COMPLETED_KEY, JSON.stringify(completed));
                updatePuzzleSelect();
                updateLevelProgress();
                updateButtonStates();
            }
        }
    }
    // Если кроссворд заблокирован, сообщение уже установлено в loadCrossword
}

function updateClueCompletion() {
    for (let w of wordsList) {
        let isComplete = true;
        for (let i = 0; i < w.word.length; i++) {
            if (w.current[i] !== w.wordOrig[i]) {
                isComplete = false;
                break;
            }
        }
        const clueLi = document.querySelector(`.clue-list li[data-word-id='${w.id}']`);
        if (clueLi) {
            if (isComplete) clueLi.classList.add("completed");
            else clueLi.classList.remove("completed");
        }
        if (isComplete) {
            markWordPointsEarned(w.id);
        }
    }
}

function renderClues() {
    const container = document.getElementById("cluesContainer");
    if (!container) return;
    container.innerHTML = `
        <div class="clue-block">
            <h3>По горизонтали</h3>
            <ul class="clue-list" id="acrossList"></ul>
        </div>
        <div class="clue-block">
            <h3>По вертикали</h3>
            <ul class="clue-list" id="downList"></ul>
        </div>
    `;
    const acrossUl = document.getElementById("acrossList");
    const downUl = document.getElementById("downList");
    
    for(let clue of cluesAcross){
        const li = document.createElement("li");
        li.setAttribute("data-word-id", clue.wordId);
        li.innerHTML = `<span class="clue-num">${Math.floor(clue.num)}.</span><span class="clue-text">${clue.clue}</span>`;
        li.addEventListener("click", () => {
            if (isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) {
                setActiveWord(clue.wordId);
                const word = wordsList.find(w => w.id === clue.wordId);
                if(word && word.cells.length){
                    cellElements[word.cells[0].row][word.cells[0].col]?.focus();
                }
            }
        });
        acrossUl.appendChild(li);
    }
    for(let clue of cluesDown){
        const li = document.createElement("li");
        li.setAttribute("data-word-id", clue.wordId);
        li.innerHTML = `<span class="clue-num">${Math.floor(clue.num)}.</span><span class="clue-text">${clue.clue}</span>`;
        li.addEventListener("click", () => {
            if (isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) {
                setActiveWord(clue.wordId);
                const word = wordsList.find(w => w.id === clue.wordId);
                if(word && word.cells.length){
                    cellElements[word.cells[0].row][word.cells[0].col]?.focus();
                }
            }
        });
        downUl.appendChild(li);
    }
    updateClueCompletion();
}

// ========== СБРОС ТЕКУЩЕГО КРОССВОРДА (с подтверждением) ==========
async function resetCrossword() {
    if (!isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) {
        showToast("Кроссворд заблокирован. Сброс невозможен.", "error");
        return;
    }
    const confirmed = await showConfirmDialog("Вы уверены, что хотите сбросить этот кроссворд? Все ячейки будут очищены, а очки за слова и подсказки будут возвращены.");
    if (!confirmed) return;
    
    const progress = getStoredProgress();
    const key = `${currentLevel}_${currentPuzzleIndex}`;
    let savedHintCount = 0;
    if (progress[key] && progress[key].hintCount !== undefined) {
        savedHintCount = progress[key].hintCount;
    }
    if (savedHintCount > 0) {
        const refund = savedHintCount * 20;
        gameStats.score += refund;
        saveGameStats();
        updateScoreUI();
        showToast(`Возвращено ${refund} очков за подсказки`, "info");
    }
    revertPointsForCurrentPuzzle();
    if (progress[key]) {
        delete progress[key];
        localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(progress));
    }
    const completed = getCompletedCrosswords();
    const completedKey = `${currentLevel}_${currentPuzzleIndex}`;
    const index = completed.indexOf(completedKey);
    if (index !== -1) {
        completed.splice(index, 1);
        localStorage.setItem(STORAGE_COMPLETED_KEY, JSON.stringify(completed));
        updatePuzzleSelect();
        updateLevelProgress();
    }
    loadCrossword(currentLevel, currentPuzzleIndex, false);
    showToast("Кроссворд сброшен. Все ячейки очищены.", "success");
}

function updatePuzzleSelect() {
    const puzzles = window.crosswordsData[currentLevel].puzzles;
    puzzleSelect.innerHTML = "";
    for (let idx = 0; idx < puzzles.length; idx++) {
        const puzzle = puzzles[idx];
        const isUnlocked = isPuzzleUnlocked(currentLevel, idx);
        const isCompleted = isCrosswordCompleted(currentLevel, idx);
        const price = puzzle.price !== undefined ? puzzle.price : 0;
        let text = (isCompleted ? "✓ " : "") + (puzzle.name || `Кроссворд ${idx + 1}`);
        if (!isUnlocked) {
            text += ` (🔒 ${price} очков)`;
        }
        const option = document.createElement("option");
        option.value = idx;
        option.textContent = text;
        if (isCompleted) {
            option.style.fontWeight = "bold";
        }
        if (!isUnlocked) {
            option.style.color = "#999";
        }
        puzzleSelect.appendChild(option);
    }
    puzzleSelect.value = currentPuzzleIndex;
    
    const currentPuzzle = puzzles[currentPuzzleIndex];
    const currentUnlocked = isPuzzleUnlocked(currentLevel, currentPuzzleIndex);
    const currentPrice = currentPuzzle.price !== undefined ? currentPuzzle.price : 0;
    if (!currentUnlocked && currentPrice > 0) {
        buyPuzzleBtn.disabled = false;
        buyPuzzleBtn.textContent = `💰 Купить (${currentPrice} очков)`;
        buyPuzzleBtn.style.opacity = "1";
    } else {
        buyPuzzleBtn.disabled = true;
        buyPuzzleBtn.textContent = currentUnlocked ? "✅ Разблокирован" : `💰 Купить (0 очков)`;
        buyPuzzleBtn.style.opacity = "0.6";
    }
}

function buyCurrentPuzzle() {
    const puzzles = window.crosswordsData[currentLevel].puzzles;
    const puzzle = puzzles[currentPuzzleIndex];
    const price = puzzle.price !== undefined ? puzzle.price : 0;
    if (price > 0 && !isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) {
        const modal = document.getElementById("buyModal");
        const message = document.getElementById("buyModalMessage");
        message.innerText = `Купить "${puzzle.name}" за ${price} очков?`;
        modal.style.display = "flex";
        
        const confirmBtn = document.getElementById("buyModalConfirm");
        const cancelBtn = document.getElementById("buyModalCancel");
        
        const handleConfirm = () => {
            if (unlockPuzzle(currentLevel, currentPuzzleIndex, price)) {
                loadCrossword(currentLevel, currentPuzzleIndex, true);
                updatePuzzleSelect();
                updateButtonStates();
            }
            modal.style.display = "none";
            confirmBtn.removeEventListener("click", handleConfirm);
            cancelBtn.removeEventListener("click", handleCancel);
        };
        const handleCancel = () => {
            modal.style.display = "none";
            confirmBtn.removeEventListener("click", handleConfirm);
            cancelBtn.removeEventListener("click", handleCancel);
        };
        confirmBtn.addEventListener("click", handleConfirm);
        cancelBtn.addEventListener("click", handleCancel);
    } else {
        showToast("Этот кроссворд уже разблокирован!", "info");
    }
}

levelSelect.addEventListener("change", (e) => {
    currentLevel = e.target.value;
    const puzzles = window.crosswordsData[currentLevel].puzzles;
    let firstUnlocked = 0;
    for (let i = 0; i < puzzles.length; i++) {
        if (isPuzzleUnlocked(currentLevel, i)) {
            firstUnlocked = i;
            break;
        }
    }
    currentPuzzleIndex = firstUnlocked;
    updatePuzzleSelect();
    loadCrossword(currentLevel, currentPuzzleIndex);
});

puzzleSelect.addEventListener("change", (e) => {
    const newIndex = parseInt(e.target.value, 10);
    currentPuzzleIndex = newIndex;
    updatePuzzleSelect();
    loadCrossword(currentLevel, currentPuzzleIndex);
});

resetBtn.addEventListener("click", () => {
    resetCrossword();
});

resetProgressBtn.addEventListener("click", async () => {
    const confirmed = await showConfirmDialog("Вы уверены, что хотите удалить весь сохранённый прогресс? Это действие нельзя отменить.");
    if (confirmed) {
        localStorage.removeItem(STORAGE_PROGRESS_KEY);
        localStorage.removeItem(STORAGE_COMPLETED_KEY);
        localStorage.removeItem(STORAGE_UNLOCKED_KEY);
        localStorage.removeItem(STORAGE_EARNED_KEY);
        const lastBonus = gameStats.lastBonusDate;
        localStorage.removeItem(STORAGE_GAME_KEY);
        gameStats = { score: 0, wordsCompleted: 0, lastBonusDate: lastBonus, maxHints: 2 };
        saveGameStats();
        updateScoreUI();
        currentPuzzleIndex = 0;
        updatePuzzleSelect();
        loadCrossword(currentLevel, 0, false);
        showToast("Весь прогресс удалён (кроме ежедневного бонуса).", "success");
    }
});

buyPuzzleBtn.addEventListener("click", buyCurrentPuzzle);

themeToggle.addEventListener('click', () => {
    playClick();
    toggleTheme();
});

resetBtn.addEventListener('click', () => {
    playClick();
    resetCrossword();
});

hintBtn.addEventListener('click', () => {
    playClick();
});

shopBtn.addEventListener('click', () => {
    playClick();
    openShopModal();
});

buyPuzzleBtn.addEventListener('click', () => {
    playClick();
    buyCurrentPuzzle();
});

helpBtn.addEventListener('click', () => {
    playClick();
    showTutorial();
});

// Для селекторов уровней тоже можно добавить, но там onChange, а не click
levelSelect.addEventListener('change', () => playClick());
puzzleSelect.addEventListener('change', () => playClick());

// ========== МАГАЗИН (скины + улучшения + рулетка) ==========
let currentShopTab = localStorage.getItem('shopActiveTab') || 'skins';

function openShopModal() {
    const modal = document.getElementById("shopModal");
    const modalContent = modal.querySelector('.modal-content');
    
    const oldTitle = modalContent.querySelector('h3');
    if (oldTitle) oldTitle.remove();
    
    let tabsContainer = modalContent.querySelector('.shop-tabs');
    if (!tabsContainer) {
        tabsContainer = document.createElement('div');
        tabsContainer.className = 'shop-tabs';
        modalContent.insertBefore(tabsContainer, modalContent.firstChild);
    }
    tabsContainer.innerHTML = `
        <button class="shop-tab" data-tab="skins">🎨 Скины</button>
        <button class="shop-tab" data-tab="upgrades">⚡ Улучшения</button>
        <button class="shop-tab" data-tab="roulette">🎲 Рулетка</button>
    `;
    
    let skinsSection = modalContent.querySelector('.shop-section.skins');
    let upgradesSection = modalContent.querySelector('.shop-section.upgrades');
    let rouletteSection = modalContent.querySelector('.shop-section.roulette');
    if (!skinsSection) {
        skinsSection = document.createElement('div');
        skinsSection.className = 'shop-section skins';
        modalContent.appendChild(skinsSection);
        upgradesSection = document.createElement('div');
        upgradesSection.className = 'shop-section upgrades';
        modalContent.appendChild(upgradesSection);
        rouletteSection = document.createElement('div');
        rouletteSection.className = 'shop-section roulette';
        modalContent.appendChild(rouletteSection);
    }
    
    // Заполняем скины с новой структурой
    skinsSection.innerHTML = '';
    for (let skin of availableSkins) {
        const purchased = isSkinPurchased(skin.id);
        const selected = (selectedSkinId === skin.id);
        const skinDiv = document.createElement("div");
        skinDiv.className = "skin-item";
        skinDiv.innerHTML = `
            <div class="skin-info">
                <div class="skin-emoji">${skin.emoji || "🖼️"}</div>
                <div class="skin-details">
                    <div class="skin-name">${skin.name}</div>
                    <div class="skin-price">${skin.price > 0 ? `${skin.price} очков` : "бесплатно"}</div>
                </div>
            </div>
            <div>
                ${!purchased ? `<button class="skin-btn buy" data-id="${skin.id}" data-price="${skin.price}">Купить</button>` :
                  (selected ? `<button class="skin-btn selected" disabled>Выбран</button>` :
                   `<button class="skin-btn select" data-id="${skin.id}">Выбрать</button>`)}
            </div>
        `;
        skinsSection.appendChild(skinDiv);
    }
    
    // Заполняем улучшения
    upgradesSection.innerHTML = `
        <div class="upgrade-item">
            <div class="upgrade-info">
                <div class="upgrade-name">📈 Лимит подсказок: 3</div>
                <div class="upgrade-desc">Максимум 3 подсказки на кроссворд</div>
                <div class="upgrade-price">500 очков</div>
            </div>
            <div>
                ${gameStats.maxHints >= 3 ? '<button class="upgrade-btn disabled" disabled>Куплено</button>' : '<button class="upgrade-btn buy" data-upgrade="3" data-price="500">Купить</button>'}
            </div>
        </div>
        <div class="upgrade-item">
            <div class="upgrade-info">
                <div class="upgrade-name">📈 Лимит подсказок: 4</div>
                <div class="upgrade-desc">Максимум 4 подсказки на кроссворд</div>
                <div class="upgrade-price">750 очков</div>
            </div>
            <div>
                ${gameStats.maxHints >= 4 ? '<button class="upgrade-btn disabled" disabled>Куплено</button>' : (gameStats.maxHints >= 3 ? '<button class="upgrade-btn buy" data-upgrade="4" data-price="750">Купить</button>' : '<button class="upgrade-btn disabled" disabled>Сначала купите лимит 3</button>')}
            </div>
        </div>
    `;
    
    // Заполняем рулетку
    rouletteSection.innerHTML = `
        <div class="roulette-container">
            <div class="roulette-spin-area">
                <span id="rouletteDisplay">🎰</span>
            </div>
            <button id="rouletteSpinBtn" class="roulette-spin-btn">Крутить (20 очков)</button>
            <div id="rouletteResult" class="roulette-result"></div>
            <div class="roulette-info">
                Шансы выигрыша:<br>
                0 очков – 25%<br>
                10 очков – 20%<br>
                20 очков – 20%<br>
                50 очков – 15%<br>
                100 очков – 10%<br>
                200 очков – 10%
            </div>
        </div>
    `;
    const spinBtn = document.getElementById('rouletteSpinBtn');
    if (spinBtn) spinBtn.addEventListener('click', spinRoulette);
    
    // Обработчики для скинов
    skinsSection.querySelectorAll('.skin-btn.buy').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.dataset.id;
            const price = parseInt(btn.dataset.price);
            if (purchaseSkin(id, price)) {
                openShopModal();
            }
        });
    });
    skinsSection.querySelectorAll('.skin-btn.select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.dataset.id;
            selectSkin(id);
            openShopModal();
        });
    });
    
    // Обработчики для улучшений
    upgradesSection.querySelectorAll('.upgrade-btn.buy').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const newLimit = parseInt(btn.dataset.upgrade);
            const price = parseInt(btn.dataset.price);
            if (upgradeMaxHints(newLimit, price)) {
                openShopModal();
                updateButtonStates();
            }
        });
    });
    
    // Переключение табов с сохранением
    const tabs = tabsContainer.querySelectorAll('.shop-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentShopTab = tab.dataset.tab;
            localStorage.setItem('shopActiveTab', currentShopTab);
            skinsSection.classList.toggle('active', currentShopTab === 'skins');
            upgradesSection.classList.toggle('active', currentShopTab === 'upgrades');
            rouletteSection.classList.toggle('active', currentShopTab === 'roulette');
        });
    });
    
    const activeTab = currentShopTab;
    tabs.forEach(tab => {
        if (tab.dataset.tab === activeTab) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    skinsSection.classList.toggle('active', activeTab === 'skins');
    upgradesSection.classList.toggle('active', activeTab === 'upgrades');
    rouletteSection.classList.toggle('active', activeTab === 'roulette');
    
    modal.style.display = "flex";
}

document.getElementById("closeShopBtn").addEventListener("click", () => {
    document.getElementById("shopModal").style.display = "none";
});
shopBtn.addEventListener("click", openShopModal);

// ========== ПОДСКАЗКА ==========
function giveHint() {
    if (!isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) {
        showToast("Кроссворд заблокирован. Подсказки недоступны.", "error");
        return;
    }
    if (isCrosswordCompleted(currentLevel, currentPuzzleIndex)) {
        showToast("Кроссворд уже решён! Подсказки не нужны.", "error");
        return;
    }
    if (hintCount >= gameStats.maxHints) {
        showToast(`Вы уже использовали все ${gameStats.maxHints} подсказки для этого кроссворда.`, "error");
        return;
    }
    let emptyCells = [];
    for (let i = 0; i < gridHeight; i++) {
        for (let j = 0; j < gridWidth; j++) {
            if (gridData[i][j] === "") {
                let belongsToIncomplete = false;
                for (let w of wordsList) {
                    const idx = w.cells.findIndex(c => c.row === i && c.col === j);
                    if (idx !== -1) {
                        let wordComplete = true;
                        for (let k = 0; k < w.word.length; k++) {
                            if (w.current[k] !== w.wordOrig[k]) {
                                wordComplete = false;
                                break;
                            }
                        }
                        if (!wordComplete) {
                            belongsToIncomplete = true;
                            break;
                        }
                    }
                }
                if (belongsToIncomplete) {
                    emptyCells.push({row: i, col: j});
                }
            }
        }
    }
    if (emptyCells.length === 0) {
        showToast("Нет пустых ячеек для подсказки! (Возможно, всё уже заполнено или остались только ошибки?)", "error");
        return;
    }
    if (!subtractPoints(20)) {
        return;
    }
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const { row, col } = emptyCells[randomIndex];
    let correctChar = correctCharMap.get(`${row},${col}`);
    if (!correctChar) {
        showToast("Ошибка: не удалось определить правильную букву.", "error");
        addPoints(20);
        return;
    }
    gridData[row][col] = correctChar;
    updateCellUI(row, col);
    syncWordFromGrid();
    checkCompletion();
    updateClueCompletion();
    updateWrongHighlights();
    saveCurrentProgress();
    hintCount++;
    saveCurrentProgress();
    updateButtonStates();
}

hintBtn.addEventListener("click", giveHint);

// ========== ТУТОРИАЛ ==========
function showTutorial() {
    const tutorialModal = document.getElementById("tutorialModal");
    const tutorialMessage = document.getElementById("tutorialMessage");
    const tutorialNext = document.getElementById("tutorialNext");
    const tutorialClose = document.getElementById("tutorialClose");
    let step = 0;
    const steps = [
        "Добро пожаловать в японские кроссворды JLPT! 🎌\n\nВ этом туториале вы узнаете основы работы.",
        "📝 Вводите слова английскими буквами (ромадзи).\nПример: 'su' → ス, 'shu' → シ+ユ, 'n' → ン.\nДефис '-' даёт длинную гласную ー.",
        "🎯 За правильно угаданное слово даётся 10 очков, за полный кроссворд – 50 очков.",
        "💰 Очки можно тратить на разблокировку новых кроссвордов, на подсказки (20 очков за подсказку, лимит можно увеличить в магазине), на скины и в рулетке.",
        "🎁 Каждый день вы получаете 50 бонусных очков за вход.",
        "🌓 Кнопка темы переключает светлую/тёмную тему. Прогресс сохраняется автоматически.\n\nПриятной игры!"
    ];
    function updateTutorial() {
        tutorialMessage.innerText = steps[step];
        if (step === steps.length - 1) {
            tutorialNext.innerText = "Завершить";
        } else {
            tutorialNext.innerText = "Далее";
        }
    }
    function nextStep() {
        step++;
        if (step < steps.length) {
            updateTutorial();
        } else {
            closeTutorial();
        }
    }
    function closeTutorial() {
        tutorialModal.style.display = "none";
        tutorialNext.removeEventListener("click", nextStep);
        tutorialClose.removeEventListener("click", closeTutorial);
        localStorage.setItem("tutorialShown", "true");
    }
    tutorialNext.addEventListener("click", nextStep);
    tutorialClose.addEventListener("click", closeTutorial);
    step = 0;
    updateTutorial();
    tutorialModal.style.display = "flex";
}

if (!localStorage.getItem("tutorialShown")) {
    window.addEventListener("load", () => {
        setTimeout(showTutorial, 500);
    });
}

helpBtn.addEventListener("click", showTutorial);

// Инициализация
loadGameStats();
checkDailyBonus();
loadSkinsData();
updatePuzzleSelect();

// Проверка последнего уровня
let startLevel = localStorage.getItem('lastPlayedLevel') || "n5";
let startPuzzle = parseInt(localStorage.getItem('lastPlayedPuzzle')) || 0;

// Проверка, разблокирован ли этот пазл (если нет, сбрасываем на первый разблокированный)
if (!isPuzzleUnlocked(startLevel, startPuzzle)) {
    const puzzles = window.crosswordsData[startLevel].puzzles;
    for (let i = 0; i < puzzles.length; i++) {
        if (isPuzzleUnlocked(startLevel, i)) {
            startPuzzle = i;
            break;
        }
    }
    // Если в этом уровне ничего не разблокировано, пробуем N5
    if (!isPuzzleUnlocked(startLevel, startPuzzle) && startLevel !== "n5") {
        startLevel = "n5";
        startPuzzle = 0;
    }
}

// Установка значений в селекторы перед загрузкой
levelSelect.value = startLevel;
currentLevel = startLevel;
currentPuzzleIndex = startPuzzle;

loadCrossword(startLevel, startPuzzle);
