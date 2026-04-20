import { STORAGE_KEYS } from './constants.js';
import { getStoredProgress, deleteProgress, isPuzzleUnlocked } from './storage.js';

// Состояние текущего кроссворда
export let currentLevel = "n5";
export let currentPuzzleIndex = 0;
export let gridData = [];
export let wordsList = [];
export let cluesAcross = [];
export let cluesDown = [];
export let gridWidth = 0;
export let gridHeight = 0;
export let hintUsed = false;
export let hintCount = 0;
export let correctCharMap = new Map();

// Активное слово
export let activeWordId = null;

// Вспомогательные функции
export function setCurrentLevel(level) { currentLevel = level; }
export function setCurrentPuzzleIndex(idx) { currentPuzzleIndex = idx; }

// Загрузка данных кроссворда из глобального объекта
export function loadCrosswordData(level, puzzleIdx, preserveSaved = true) {
    const levelData = window.crosswordsData[level];
    if (!levelData) return false;
    const puzzle = levelData.puzzles[puzzleIdx];
    if (!puzzle) return false;

    gridWidth = puzzle.width;
    gridHeight = puzzle.height;
    wordsList = puzzle.words.map((w, idx) => ({
        ...w,
        id: idx,
        current: Array(w.word.length).fill(""),
        wordOrig: w.word
    }));

    // Инициализация сетки
    let emptyGrid = Array(gridHeight).fill().map(() => Array(gridWidth).fill(null));
    for (let w of wordsList) {
        let cells = [];
        for (let i = 0; i < w.word.length; i++) {
            let r = w.dir === "across" ? w.row : w.row + i;
            let c = w.dir === "across" ? w.col + i : w.col;
            if (r >= 0 && r < gridHeight && c >= 0 && c < gridWidth) {
                cells.push({ row: r, col: c });
                if (emptyGrid[r][c] === null) emptyGrid[r][c] = "";
            }
        }
        w.cells = cells;
    }
    for (let i = 0; i < gridHeight; i++) {
        for (let j = 0; j < gridWidth; j++) {
            if (emptyGrid[i][j] === null) emptyGrid[i][j] = null;
        }
    }

    const freshGrid = emptyGrid.map(row => row.map(cell => (cell === null ? null : "")));

    // Попытка загрузить сохранённый прогресс
    let savedData = null;
    if (preserveSaved && isPuzzleUnlocked(level, puzzleIdx)) {
        const progress = getStoredProgress();
        const key = `${level}_${puzzleIdx}`;
        if (progress[key]) savedData = progress[key];
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
    return true;
}

export function generateNumbering() {
    let allWords = wordsList.map((w, idx) => ({ ...w, id: idx }));
    let hasManualNumbers = allWords.some(w => w.number !== undefined && w.number !== null);

    if (!hasManualNumbers) {
        let numberMap = new Map();
        let counter = 1;
        let sorted = [...allWords].sort((a, b) => {
            if (a.row === b.row && a.col === b.col) return a.dir === "across" ? -1 : 1;
            if (a.row === b.row) return a.col - b.col;
            return a.row - b.row;
        });
        for (let w of sorted) {
            let key = `${w.row},${w.col}`;
            if (!numberMap.has(key)) numberMap.set(key, counter++);
            w.number = numberMap.get(key);
        }
        allWords.forEach(w => { wordsList[w.id].number = w.number; });
    } else {
        allWords.forEach(w => { wordsList[w.id].number = w.number || 0; });
    }

    cluesAcross = [];
    cluesDown = [];
    for (let w of wordsList) {
        let clueItem = { num: w.number, wordId: w.id, clue: w.clue, cells: w.cells };
        if (w.dir === "across") cluesAcross.push(clueItem);
        else cluesDown.push(clueItem);
    }
    cluesAcross.sort((a, b) => a.num - b.num);
    cluesDown.sort((a, b) => a.num - b.num);
}

export function syncWordFromGrid() {
    for (let w of wordsList) {
        for (let i = 0; i < w.cells.length; i++) {
            let cell = w.cells[i];
            w.current[i] = gridData[cell.row][cell.col] || "";
        }
    }
}

export function buildCorrectCharMap() {
    correctCharMap.clear();
    for (let w of wordsList) {
        for (let idx = 0; idx < w.cells.length; idx++) {
            const cell = w.cells[idx];
            correctCharMap.set(`${cell.row},${cell.col}`, w.wordOrig[idx]);
        }
    }
}

export function getWordNumberAt(row, col) {
    for (let w of wordsList) {
        if (w.cells.length > 0 && w.cells[0].row === row && w.cells[0].col === col) {
            return w.number;
        }
    }
    return null;
}

export function isWordComplete(wordId) {
    const word = wordsList.find(w => w.id === wordId);
    if (!word) return false;
    for (let i = 0; i < word.word.length; i++) {
        if (word.current[i] !== word.wordOrig[i]) return false;
    }
    return true;
}

export function areAllWordsComplete() {
    for (let w of wordsList) {
        if (!isWordComplete(w.id)) return false;
    }
    return true;
}
