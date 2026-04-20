import {
    currentLevel, currentPuzzleIndex, gridData, wordsList, cluesAcross, cluesDown,
    gridWidth, gridHeight, activeWordId, getWordNumberAt, correctCharMap
} from './crosswordModel.js';
import { isPuzzleUnlocked, getSelectedSkinEmoji } from './storage.js';
import { setActiveWord } from './gameController.js';

export let cellElements = [];
export let romajiBuffers = new Map();

export function renderGrid() {
    const container = document.getElementById("gridContainer");
    container.innerHTML = "";
    container.style.gridTemplateColumns = `repeat(${gridWidth}, minmax(70px, 1fr))`;
    cellElements = [];
    const isLocked = !isPuzzleUnlocked(currentLevel, currentPuzzleIndex);

    for (let i = 0; i < gridHeight; i++) {
        cellElements[i] = [];
        for (let j = 0; j < gridWidth; j++) {
            const isBlocked = (gridData[i][j] === null);
            const cellDiv = document.createElement("div");
            cellDiv.className = "cell";
            if (isBlocked) cellDiv.classList.add("blocked");

            const wordNumber = getWordNumberAt(i, j);
            if (wordNumber && !isBlocked) {
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

            cellDiv.appendChild(input);
            container.appendChild(cellDiv);
            cellElements[i][j] = input;
        }
    }
    updateAllBlockedSkins();
    applyHighlight();
    updateWrongHighlights();
}

function getDisplayValue(row, col) {
    const key = `${row},${col}`;
    const buffer = romajiBuffers.get(key) || "";
    return buffer !== "" ? buffer : (gridData[row][col] !== null ? gridData[row][col] : "");
}

export function updateCellUI(row, col) {
    if (cellElements[row] && cellElements[row][col]) {
        cellElements[row][col].value = getDisplayValue(row, col);
    }
}

export function updateWrongHighlights() {
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

export function applyHighlight() {
    for (let i = 0; i < gridHeight; i++) {
        for (let j = 0; j < gridWidth; j++) {
            const cellDiv = cellElements[i]?.[j]?.parentElement;
            if (cellDiv) cellDiv.classList.remove("highlight", "active-word");
        }
    }
    if (activeWordId !== null) {
        const activeWord = wordsList.find(w => w.id === activeWordId);
        if (activeWord) {
            for (let cell of activeWord.cells) {
                const cellDiv = cellElements[cell.row]?.[cell.col]?.parentElement;
                if (cellDiv) cellDiv.classList.add("active-word");
            }
        }
    }
    document.querySelectorAll(".clue-list li").forEach(li => li.classList.remove("active-clue"));
    if (activeWordId !== null) {
        const target = document.querySelector(`.clue-list li[data-word-id='${activeWordId}']`);
        if (target) target.classList.add("active-clue");
    }
}

export function clearHighlight() {
    activeWordId = null;
    applyHighlight();
}

export function renderClues() {
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

    for (let clue of cluesAcross) {
        const li = document.createElement("li");
        li.setAttribute("data-word-id", clue.wordId);
        li.innerHTML = `<span class="clue-num">${Math.floor(clue.num)}.</span><span class="clue-text">${clue.clue}</span>`;
        li.addEventListener("click", () => {
            if (isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) {
                setActiveWord(clue.wordId);
                const word = wordsList.find(w => w.id === clue.wordId);
                if (word && word.cells.length) {
                    cellElements[word.cells[0].row][word.cells[0].col]?.focus();
                }
            }
        });
        acrossUl.appendChild(li);
    }
    for (let clue of cluesDown) {
        const li = document.createElement("li");
        li.setAttribute("data-word-id", clue.wordId);
        li.innerHTML = `<span class="clue-num">${Math.floor(clue.num)}.</span><span class="clue-text">${clue.clue}</span>`;
        li.addEventListener("click", () => {
            if (isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) {
                setActiveWord(clue.wordId);
                const word = wordsList.find(w => w.id === clue.wordId);
                if (word && word.cells.length) {
                    cellElements[word.cells[0].row][word.cells[0].col]?.focus();
                }
            }
        });
        downUl.appendChild(li);
    }
    updateClueCompletion();
}

export function updateClueCompletion() {
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
    }
}

export function updateAllBlockedSkins() {
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
    const emoji = getSelectedSkinEmoji();
    if (isBlocked && emoji) {
        skinSpan.style.display = "flex";
        skinSpan.textContent = emoji;
    } else {
        skinSpan.style.display = "none";
    }
}

export function updateStatusMessage(message, color) {
    const statusDiv = document.getElementById("statusMsg");
    if (statusDiv) {
        statusDiv.innerHTML = message;
        statusDiv.style.color = color;
    }
}

export function updatePuzzleSelect() {
    const puzzles = window.crosswordsData[currentLevel].puzzles;
    const select = document.getElementById("puzzleSelect");
    select.innerHTML = "";
    for (let idx = 0; idx < puzzles.length; idx++) {
        const puzzle = puzzles[idx];
        const isUnlocked = isPuzzleUnlocked(currentLevel, idx);
        const isCompleted = isCrosswordCompleted(currentLevel, idx);
        const price = puzzle.price !== undefined ? puzzle.price : 0;
        let text = (isCompleted ? "✓ " : "") + (puzzle.name || `Кроссворд ${idx + 1}`);
        if (!isUnlocked) text += ` (🔒 ${price} очков)`;
        const option = document.createElement("option");
        option.value = idx;
        option.textContent = text;
        if (isCompleted) option.style.fontWeight = "bold";
        if (!isUnlocked) option.style.color = "#999";
        select.appendChild(option);
    }
    select.value = currentPuzzleIndex;
    updateBuyButtonState();
}

function updateBuyButtonState() {
    const puzzles = window.crosswordsData[currentLevel].puzzles;
    const puzzle = puzzles[currentPuzzleIndex];
    const price = puzzle.price !== undefined ? puzzle.price : 0;
    const unlocked = isPuzzleUnlocked(currentLevel, currentPuzzleIndex);
    const btn = document.getElementById("buyPuzzleBtn");
    if (!unlocked && price > 0) {
        btn.disabled = false;
        btn.textContent = `💰 Купить (${price} очков)`;
        btn.style.opacity = "1";
    } else {
        btn.disabled = true;
        btn.textContent = unlocked ? "✅ Разблокирован" : `💰 Купить (0 очков)`;
        btn.style.opacity = "0.6";
    }
}

export function updateLevelProgress() {
    const puzzles = window.crosswordsData[currentLevel].puzzles;
    const total = puzzles.length;
    const completedKeys = getCompletedCrosswords();
    let completedCount = 0;
    for (let i = 0; i < total; i++) {
        if (completedKeys.includes(`${currentLevel}_${i}`)) completedCount++;
    }
    document.getElementById("levelProgressText").innerText = `${completedCount}/${total}`;
    const percent = total === 0 ? 0 : (completedCount / total) * 100;
    document.getElementById("levelProgressFill").style.width = `${percent}%`;
}

// Импорт из storage (циклическая зависимость разрешается через динамический импорт или перенос в main)
import { isCrosswordCompleted, getCompletedCrosswords } from './storage.js';
