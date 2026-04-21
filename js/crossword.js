import { showToast, showConfirmDialog, audio, romajiToKatakana, showConfetti } from './utils.js';
import { KEYS, gameStats, addPoints, subtractPoints, incrementWordsCompleted, updateScoreUI, saveGameStats } from './storage.js';
import { getSelectedSkinEmoji } from './shop.js';

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
let correctCharMap = new Map(), romajiBuffers = new Map(), cluesAcross = [], cluesDown = [];

export let currentLevel = "n5";
export let currentPuzzleIndex = 0;
export let gridData = [], wordsList = [], cellElements = [];
export let gridWidth, gridHeight, activeWordId = null, hintUsed = false, hintCount = 0;

export function setCurrentLevelAndPuzzle(lvl, idx) {
    currentLevel = lvl;
    currentPuzzleIndex = idx;
}

// Хелперы хранилища для кроссвордов
function getStoredProgress() { return JSON.parse(localStorage.getItem(KEYS.PROGRESS) || "{}"); }
function getUnlockedCrosswords() { return JSON.parse(localStorage.getItem(KEYS.UNLOCKED) || "{}"); }
function getEarnedPointsForCurrent() {
    const data = JSON.parse(localStorage.getItem(KEYS.EARNED) || "{}");
    const key = `${currentLevel}_${currentPuzzleIndex}`;
    if (!data[key]) data[key] = { words: {}, completed: false };
    return data[key];
}
function saveEarnedPointsForCurrent(earned) {
    const data = JSON.parse(localStorage.getItem(KEYS.EARNED) || "{}");
    data[`${currentLevel}_${currentPuzzleIndex}`] = earned;
    localStorage.setItem(KEYS.EARNED, JSON.stringify(data));
}
export function getCompletedCrosswords() { return JSON.parse(localStorage.getItem(KEYS.COMPLETED) || "[]"); }
export function isCrosswordCompleted(level, puzzleIdx) { return getCompletedCrosswords().includes(`${level}_${puzzleIdx}`); }
export function isPuzzleUnlocked(level, puzzleIdx) {
    const unlocked = getUnlockedCrosswords();
    const key = `${level}_${puzzleIdx}`;
    if (puzzleIdx === 0 && !unlocked[key]) { unlocked[key] = true; localStorage.setItem(KEYS.UNLOCKED, JSON.stringify(unlocked)); return true; }
    return unlocked[key] === true;
}

function saveCurrentProgress() {
    const progress = getStoredProgress();
    progress[`${currentLevel}_${currentPuzzleIndex}`] = {
        gridData: gridData.map(row => [...row]),
        hintUsed: hintUsed,
        hintCount: hintCount
    };
    localStorage.setItem(KEYS.PROGRESS, JSON.stringify(progress));
}

// Логика UI
export function updateButtonStates() {
    const unlocked = isPuzzleUnlocked(currentLevel, currentPuzzleIndex);
    const hintBtn = document.getElementById("hintBtn");
    document.getElementById("resetBtn").disabled = !unlocked;
    
    if (!unlocked) {
        hintBtn.disabled = true; hintBtn.textContent = "Кроссворд заблокирован";
    } else if (isCrosswordCompleted(currentLevel, currentPuzzleIndex)) {
        hintBtn.disabled = true; hintBtn.textContent = "Кроссворд решён";
    } else if (hintCount >= gameStats.maxHints) {
        hintBtn.disabled = true; hintBtn.textContent = `Подсказки закончились (${hintCount}/${gameStats.maxHints})`;
    } else {
        hintBtn.disabled = false; hintBtn.textContent = `Подсказка (20 очков) (${hintCount}/${gameStats.maxHints})`;
    }
}

export function updatePuzzleSelect() {
    const puzzleSelect = document.getElementById("puzzleSelect");
    const buyPuzzleBtn = document.getElementById("buyPuzzleBtn");
    const puzzles = window.crosswordsData[currentLevel].puzzles;
    puzzleSelect.innerHTML = "";
    
    for (let idx = 0; idx < puzzles.length; idx++) {
        const puzzle = puzzles[idx];
        const isUnlocked = isPuzzleUnlocked(currentLevel, idx);
        const isCompleted = isCrosswordCompleted(currentLevel, idx);
        const price = puzzle.price || 0;
        let text = (isCompleted ? "✓ " : "") + (puzzle.name || `Кроссворд ${idx + 1}`);
        if (!isUnlocked) text += ` (🔒 ${price} очков)`;
        
        const option = document.createElement("option");
        option.value = idx; option.textContent = text;
        if (isCompleted) option.style.fontWeight = "bold";
        if (!isUnlocked) option.style.color = "#999";
        puzzleSelect.appendChild(option);
    }
    puzzleSelect.value = currentPuzzleIndex;
    
    const currentUnlocked = isPuzzleUnlocked(currentLevel, currentPuzzleIndex);
    const currentPrice = puzzles[currentPuzzleIndex].price || 0;
    if (!currentUnlocked && currentPrice > 0) {
        buyPuzzleBtn.disabled = false; buyPuzzleBtn.textContent = `💰 Купить (${currentPrice} очков)`; buyPuzzleBtn.style.opacity = "1";
    } else {
        buyPuzzleBtn.disabled = true; buyPuzzleBtn.textContent = currentUnlocked ? "✅ Разблокирован" : `💰 Купить (0 очков)`; buyPuzzleBtn.style.opacity = "0.6";
    }
}

export function updateLevelProgress() {
    const puzzles = window.crosswordsData[currentLevel].puzzles;
    const total = puzzles.length;
    const completedKeys = getCompletedCrosswords();
    let completedCount = 0;
    for (let i = 0; i < total; i++) { if (completedKeys.includes(`${currentLevel}_${i}`)) completedCount++; }
    
    const textSpan = document.getElementById("levelProgressText");
    const fillDiv = document.getElementById("levelProgressFill");
    if (textSpan) textSpan.innerText = `${completedCount}/${total}`;
    if (fillDiv) fillDiv.style.width = `${total === 0 ? 0 : (completedCount / total) * 100}%`;
}

export function loadCrossword(levelId, puzzleIdx, preserveSaved = true) {
    const levelData = window.crosswordsData[levelId];
    if (!levelData || puzzleIdx < 0 || puzzleIdx >= levelData.puzzles.length) return;
    const puzzle = levelData.puzzles[puzzleIdx];
    
    localStorage.setItem('lastPlayedLevel', levelId);
    localStorage.setItem('lastPlayedPuzzle', puzzleIdx);
    
    gridWidth = puzzle.width; gridHeight = puzzle.height;
    wordsList = puzzle.words.map((w, idx) => ({ ...w, id: idx, current: Array(w.word.length).fill(""), wordOrig: w.word }));
    
    let emptyGrid = Array(gridHeight).fill().map(() => Array(gridWidth).fill(null));
    for(let w of wordsList) {
        let cells = [];
        for(let i=0; i<w.word.length; i++){
            let r = w.dir === "across" ? w.row : w.row + i;
            let c = w.dir === "across" ? w.col + i : w.col;
            if(r>=0 && r<gridHeight && c>=0 && c<gridWidth){
                cells.push({row:r, col:c});
                if(emptyGrid[r][c] === null) emptyGrid[r][c] = "";
            }
        }
        w.cells = cells;
    }
    
    let savedData = null;
    if (preserveSaved && isPuzzleUnlocked(levelId, puzzleIdx)) {
        savedData = getStoredProgress()[`${levelId}_${puzzleIdx}`];
    }
    
    if (savedData) {
        gridData = savedData.gridData.map(row => [...row]);
        hintUsed = savedData.hintUsed;
        hintCount = savedData.hintCount || 0;
    } else {
        gridData = emptyGrid.map(row => row.map(cell => (cell === null ? null : "")));
        hintUsed = false; hintCount = 0;
    }
    
    generateNumbering();
    syncWordFromGrid();
    buildCorrectCharMap();
    renderGrid();
    renderClues();
    clearHighlight();
    checkCompletion();
    updateClueCompletion();
    updateWrongHighlights();
    romajiBuffers.clear();
    
    const unlocked = isPuzzleUnlocked(levelId, puzzleIdx);
    const statusDiv = document.getElementById("statusMsg");
    if (!unlocked) {
        statusDiv.innerHTML = `🔒 Кроссворд заблокирован. Цена: ${puzzle.price || 0} очков. Нажмите «Купить».`;
        statusDiv.style.color = "#c94f4f";
    }
    
    updateButtonStates();
    updateLevelProgress();
    updatePuzzleSelect();
}

function generateNumbering() {
    let allWords = wordsList.map((w, idx) => ({ ...w, id: idx }));
    let hasManualNumbers = allWords.some(w => w.number !== undefined && w.number !== null);
    
    if (!hasManualNumbers) {
        let numberMap = new Map(); let counter = 1;
        let sorted = [...allWords].sort((a,b) => {
            if(a.row === b.row && a.col === b.col) return a.dir === "across" ? -1 : 1;
            if(a.row === b.row) return a.col - b.col;
            return a.row - b.row;
        });
        for(let w of sorted) {
            let key = `${w.row},${w.col}`;
            if(!numberMap.has(key)) numberMap.set(key, counter++);
            w.number = numberMap.get(key);
        }
        allWords.forEach(w => { wordsList[w.id].number = w.number; });
    }
    
    cluesAcross = []; cluesDown = [];
    for(let w of wordsList) {
        let clueItem = { num: w.number, wordId: w.id, clue: w.clue, cells: w.cells };
        if(w.dir === "across") cluesAcross.push(clueItem);
        else cluesDown.push(clueItem);
    }
    cluesAcross.sort((a,b) => a.num - b.num);
    cluesDown.sort((a,b) => a.num - b.num);
}

export function updateAllBlockedSkins() {
    if (!cellElements) return;
    for (let i = 0; i < gridHeight; i++) {
        for (let j = 0; j < gridWidth; j++) {
            if (gridData[i][j] === null) {
                const cellDiv = cellElements[i]?.[j]?.parentElement;
                if (!cellDiv) continue;
                const skinSpan = cellDiv.querySelector('.cell-skin');
                if (skinSpan) {
                    const emoji = getSelectedSkinEmoji();
                    skinSpan.style.display = emoji ? "flex" : "none";
                    skinSpan.textContent = emoji;
                }
            }
        }
    }
}

function renderGrid() {
    const container = document.getElementById("gridContainer");
    container.innerHTML = "";
    
    // Фиксированная ширина ячеек (60px)
    container.style.gridTemplateColumns = `repeat(${gridWidth}, 70px)`;
    cellElements = [];
    const isLocked = !isPuzzleUnlocked(currentLevel, currentPuzzleIndex);
    
    for (let i = 0; i < gridHeight; i++) {
        cellElements[i] = [];
        for (let j = 0; j < gridWidth; j++) {
            const isBlocked = (gridData[i][j] === null);
            const cellDiv = document.createElement("div");
            cellDiv.className = "cell" + (isBlocked ? " blocked" : "");
            
            const wordNumber = getWordNumberAt(i, j);
            if (wordNumber && !isBlocked) {
                const spanNum = document.createElement("span");
                spanNum.className = "cell-number"; 
                spanNum.innerText = Math.floor(wordNumber);
                cellDiv.appendChild(spanNum);
            }
            
            const input = document.createElement("input");
            input.type = "text"; 
            input.maxLength = 1;
            input.value = getDisplayValue(i, j);
            input.disabled = isBlocked || isLocked;
            
            // Включаем стандартный ввод для всех
            input.readOnly = false;
            input.removeAttribute('inputmode');

            const skinSpan = document.createElement("span");
            skinSpan.className = "cell-skin";
            skinSpan.style.display = "none";

            if (!isBlocked && !isLocked) {
                if (isMobile) {
                    input.readOnly = true;  // запрещаем прямой ввод на мобильных
                    input.addEventListener("click", (e) => {
                        e.preventDefault();
                        openMobileInput(i, j);
                    });
                } else {
                    // для ПК оставляем старые обработчики
                    input.addEventListener("focus", () => onCellFocus(i, j));
                    input.addEventListener("blur", () => onCellBlur(i, j));
                    input.addEventListener("keydown", (e) => handleKeydown(e, i, j));
                    input.addEventListener("input", (e) => onCellInput(i, j));
                }
            }
            
            cellDiv.appendChild(input);
            cellDiv.appendChild(skinSpan);
            container.appendChild(cellDiv);
            cellElements[i][j] = input;
        }
    }
    
    applyHighlight();
    updateWrongHighlights();
    if (typeof updateAllBlockedSkins === 'function') updateAllBlockedSkins();
}

function getWordNumberAt(row, col) {
    for (let w of wordsList) { if (w.cells.length > 0 && w.cells[0].row === row && w.cells[0].col === col) return w.number; }
    return null;
}
function getDisplayValue(row, col) { return romajiBuffers.get(`${row},${col}`) || (gridData[row][col] !== null ? gridData[row][col] : ""); }
function updateCellUI(row, col) { if (cellElements[row]?.[col]) cellElements[row][col].value = getDisplayValue(row, col); }

function onCellFocus(row, col) {
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
        insertKatakanaArray(row, col, ["ン"], 0); romajiBuffers.delete(key); updateCellUI(row, col);
    } else if (buffer) {
        romajiBuffers.delete(key); updateCellUI(row, col);
    }
}

function setActiveWord(wordId){
    activeWordId = wordId; applyHighlight();
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
function clearHighlight() { activeWordId = null; applyHighlight(); }

function getNextEmptyCellInWord(word, currentRow, currentCol) {
    let currentIndex = word.cells.findIndex(cell => cell.row === currentRow && cell.col === currentCol);
    if (currentIndex === -1) return null;
    for (let i = currentIndex + 1; i < word.cells.length; i++) {
        let cell = word.cells[i];
        if (gridData[cell.row][cell.col] === "") return cell;
    }
    return null;
}

function insertKatakanaArray(row, col, katakanaArray, startIndex) {
    if (startIndex >= katakanaArray.length) return;
    const char = katakanaArray[startIndex];
    
    gridData[row][col] = char;
    updateCellUI(row, col);
    syncWordFromGrid(); checkCompletion(); updateClueCompletion(); updateWrongHighlights(); saveCurrentProgress();
    
    const correctChar = correctCharMap.get(`${row},${col}`);
    if (char === correctChar) {
        audio.correct();
        const cellDiv = cellElements[row]?.[col]?.parentElement;
        if (cellDiv) {
            cellDiv.classList.add('correct-animation');
            setTimeout(() => cellDiv.classList.remove('correct-animation'), 300);
        }
    } else { audio.error(); }

    if (katakanaArray.length > 1 && startIndex === 0 || startIndex + 1 < katakanaArray.length) {
        const activeWord = activeWordId !== null ? wordsList.find(w => w.id === activeWordId) : null;
        if (activeWord) {
            let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
            if (idx !== -1 && idx + 1 < activeWord.cells.length) {
                let nextCell = activeWord.cells[idx + 1];
                insertKatakanaArray(nextCell.row, nextCell.col, katakanaArray, startIndex === 0 ? 1 : startIndex + 1);
                return;
            }
        }
    } else {
        const activeWord = activeWordId !== null ? wordsList.find(w => w.id === activeWordId) : null;
        if (activeWord) {
            let nextEmpty = getNextEmptyCellInWord(activeWord, row, col);
            if (nextEmpty) cellElements[nextEmpty.row][nextEmpty.col]?.focus();
            else focusNextWord(activeWord.number);
        }
    }
}

function focusNextWord(currentNumber) {
    let allWords = [...cluesAcross, ...cluesDown].sort((a,b) => a.num - b.num);
    for (let pass = 0; pass < 2; pass++) {
        for (let w of allWords) {
            if (pass === 0 && w.num <= currentNumber) continue;
            const wordObj = wordsList.find(word => word.id === w.wordId);
            if (!wordObj) continue;
            if (wordObj.current.join('') !== wordObj.wordOrig) { setActiveWord(wordObj.id); return; }
        }
    }
}

function processBuffer(row, col, buffer) {
    if (buffer.length === 2 && buffer[0] === 'n' && !'aiueo'.includes(buffer[1]) && buffer[1] !== 'n') {
        insertKatakanaArray(row, col, ["ン"], 0);
        advanceFocusAndBuffer(row, col, buffer[1]);
        return true;
    }
    if (romajiToKatakana[buffer]) {
        insertKatakanaArray(row, col, romajiToKatakana[buffer], 0);
        return true;
    }
    for (let i = buffer.length - 1; i >= 1; i--) {
        let prefix = buffer.slice(0, i);
        if (romajiToKatakana[prefix]) {
            insertKatakanaArray(row, col, romajiToKatakana[prefix], 0);
            if (buffer.slice(i).length > 0) advanceFocusAndBuffer(row, col, buffer.slice(i));
            return true;
        }
    }
    return false;
}

function advanceFocusAndBuffer(row, col, remainingChar) {
    if (activeWordId === null) return;
    const activeWord = wordsList.find(w => w.id === activeWordId);
    if (!activeWord) return;
    
    let targetCell = null;
    let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
    if (idx !== -1 && idx + 1 < activeWord.cells.length) targetCell = activeWord.cells[idx + 1];
    else targetCell = getNextEmptyCellInWord(activeWord, row, col);

    if (targetCell) {
        romajiBuffers.set(`${targetCell.row},${targetCell.col}`, remainingChar);
        updateCellUI(targetCell.row, targetCell.col);
        cellElements[targetCell.row][targetCell.col]?.focus();
    } else {
        focusNextWord(activeWord.number);
        setTimeout(() => {
            if (activeWordId !== null) {
                const newWord = wordsList.find(w => w.id === activeWordId);
                if (newWord && newWord.cells.length) {
                    let firstCell = newWord.cells[0];
                    romajiBuffers.set(`${firstCell.row},${firstCell.col}`, remainingChar);
                    updateCellUI(firstCell.row, firstCell.col);
                    cellElements[firstCell.row][firstCell.col]?.focus();
                }
            }
        }, 10);
    }
}

function handleKeydown(e, row, col) {
    if (gridData[row][col] === null) return;
    const allowedChars = /^[a-zA-Z-]$/;
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && !allowedChars.test(e.key)) { e.preventDefault(); return; }
    if (!isMobile && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) e.preventDefault();
    
    if (e.key === "Backspace") {
        const key = `${row},${col}`;
        let buffer = romajiBuffers.get(key) || "";
        if (buffer.length > 0) {
            romajiBuffers.set(key, buffer.slice(0, -1)); updateCellUI(row, col);
        } else {
            if (gridData[row][col] !== "") {
                gridData[row][col] = ""; updateCellUI(row, col);
                syncWordFromGrid(); checkCompletion(); updateClueCompletion(); updateWrongHighlights(); saveCurrentProgress();
            } else if (activeWordId !== null) {
                const activeWord = wordsList.find(w => w.id === activeWordId);
                if (activeWord) {
                    let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
                    if (idx > 0) cellElements[activeWord.cells[idx - 1].row][activeWord.cells[idx - 1].col]?.focus();
                }
            }
        }
        return;
    }

    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        let newRow = row, newCol = col;
        if (e.key === "ArrowLeft") newCol--; if (e.key === "ArrowRight") newCol++;
        if (e.key === "ArrowUp") newRow--; if (e.key === "ArrowDown") newRow++;
        if (newRow >= 0 && newRow < gridHeight && newCol >= 0 && newCol < gridWidth && gridData[newRow][newCol] !== null) {
            cellElements[newRow][newCol]?.focus();
        }
        return;
    }

    if (e.key.length === 1 && allowedChars.test(e.key)) {
        // На мобильных устройствах не обрабатываем здесь, символ уйдёт в input
        if (isMobile) return;
        
        e.preventDefault();
        const key = `${row},${col}`;
        let buffer = (romajiBuffers.get(key) || "") + e.key.toLowerCase();
        romajiBuffers.set(key, buffer);
        updateCellUI(row, col);
        if (gridData[row][col] !== "") {
            gridData[row][col] = "";
            syncWordFromGrid();
            checkCompletion();
            updateClueCompletion();
            updateWrongHighlights();
            saveCurrentProgress();
        }
        processBuffer(row, col, buffer);
    }
}

function onCellInput(row, col) {
    const input = cellElements[row][col];
    const val = input.value.toUpperCase();
    const key = `${row},${col}`;

    // Если введена сразу японская буква (с системной клавиатуры телефона)
    if (/[\u30A0-\u30FF\u3040-\u309F]/.test(val)) {
        gridData[row][col] = val;
        romajiBuffers.delete(key);
        updateCellUI(row, col);
        checkWinCondition();
        moveToNextCell(row, col);
        return;
    }
    else if (/^[A-Za-z]$/.test(val)) {
    // Для ПК не обрабатываем здесь (уже сделано в keydown)
    if (!isMobile) {
        input.value = getDisplayValue(row, col);
        return;
    }
    
    // Для мобильных: накапливаем буфер и откладываем преобразование
    const key = `${row},${col}`;
    let buffer = (romajiBuffers.get(key) || "") + val.toLowerCase();
    romajiBuffers.set(key, buffer);
    updateCellUI(row, col);
    
    if (gridData[row][col] !== "") {
        gridData[row][col] = "";
        syncWordFromGrid();
        checkCompletion();
        updateClueCompletion();
        updateWrongHighlights();
        saveCurrentProgress();
    }
    
    // Сбрасываем предыдущий таймер
    if (window._mobileRomajiTimer) clearTimeout(window._mobileRomajiTimer);
    // Устанавливаем таймер на 500 мс для попытки преобразования накопленного буфера
    window._mobileRomajiTimer = setTimeout(() => {
        const currentBuffer = romajiBuffers.get(key);
        if (currentBuffer && currentBuffer.length > 0) {
            // Ищем самое длинное совпадение в словаре
            let matched = false;
            for (let len = Math.min(currentBuffer.length, 4); len >= 1; len--) {
                const prefix = currentBuffer.slice(0, len);
                if (romajiToKatakana[prefix]) {
                    insertKatakanaArray(row, col, romajiToKatakana[prefix], 0);
                    const remaining = currentBuffer.slice(len);
                    if (remaining) {
                        romajiBuffers.set(key, remaining);
                        updateCellUI(row, col);
                    } else {
                        romajiBuffers.delete(key);
                    }
                    matched = true;
                    break;
                }
            }
            if (!matched && currentBuffer.length > 0) {
                // Если ничего не подошло, очищаем буфер (ошибочный ввод)
                romajiBuffers.delete(key);
                updateCellUI(row, col);
            }
        }
        window._mobileRomajiTimer = null;
    }, 1100);
    
    // Скрываем латиницу из поля
    input.value = getDisplayValue(row, col);
}

    // Если введена латиница (ПК или английская раскладка телефона)
    if (/^[A-Z]$/.test(val)) {
        // Твоя существующая логика преобразования Ромадзи -> Катакана
        handleRomajiLogic(row, col, val); 
    }
}

function syncWordFromGrid() { for (let w of wordsList) { for (let i = 0; i < w.cells.length; i++) w.current[i] = gridData[w.cells[i].row][w.cells[i].col] || ""; } }

function checkCompletion() {
    let allFilled = true;
    for (let w of wordsList) { if (w.current.join('') !== w.wordOrig) { allFilled = false; break; } }
    
    const statusDiv = document.getElementById("statusMsg");
    const unlocked = isPuzzleUnlocked(currentLevel, currentPuzzleIndex);
    
    if (allFilled && unlocked) {
        statusDiv.innerHTML = "🎉 Поздравляем! Кроссворд полностью разгадан! 🎉"; statusDiv.style.color = "#2c6e2c";
        if (!isCrosswordCompleted(currentLevel, currentPuzzleIndex)) {
            const completed = getCompletedCrosswords();
            completed.push(`${currentLevel}_${currentPuzzleIndex}`);
            localStorage.setItem(KEYS.COMPLETED, JSON.stringify(completed));
            
            const earned = getEarnedPointsForCurrent();
            if (!earned.completed) { earned.completed = true; saveEarnedPointsForCurrent(earned); addPoints(50); }
            
            updatePuzzleSelect(); updateLevelProgress(); updateButtonStates();
            showToast(`Кроссворд решён! +50 очков`, "success");
        }
    } else if (unlocked) {
        statusDiv.innerHTML = "Заполняйте ячейки. Вводите английскими буквами (a-z). Например: su → ス, shu → シ+ユ, n+s → ン+s, - → ー.";
        statusDiv.style.color = "#666";
    }
}

function buildCorrectCharMap() {
    correctCharMap.clear();
    for (let w of wordsList) { for (let idx = 0; idx < w.cells.length; idx++) correctCharMap.set(`${w.cells[idx].row},${w.cells[idx].col}`, w.wordOrig[idx]); }
}
function updateWrongHighlights() {
    for (let i = 0; i < gridHeight; i++) {
        for (let j = 0; j < gridWidth; j++) {
            const cellDiv = cellElements[i]?.[j]?.parentElement;
            if (!cellDiv) continue;
            const correct = correctCharMap.get(`${i},${j}`);
            if (gridData[i][j] && gridData[i][j] !== correct && correct) cellDiv.classList.add("wrong");
            else cellDiv.classList.remove("wrong");
        }
    }
}

function updateClueCompletion() {
    for (let w of wordsList) {
        let isComplete = (w.current.join('') === w.wordOrig);
        const clueLi = document.querySelector(`.clue-list li[data-word-id='${w.id}']`);
        if (clueLi) { if (isComplete) clueLi.classList.add("completed"); else clueLi.classList.remove("completed"); }
        if (isComplete) {
            const earned = getEarnedPointsForCurrent();
            if (!earned.words[w.id]) {
                earned.words[w.id] = true; saveEarnedPointsForCurrent(earned);
                addPoints(10); incrementWordsCompleted(); audio.pop();
            }
        }
    }
}

function renderClues() {
    const container = document.getElementById("cluesContainer");
    if (!container) return;
    container.innerHTML = `
        <div class="clue-block"><h3>По горизонтали</h3><ul class="clue-list" id="acrossList"></ul></div>
        <div class="clue-block"><h3>По вертикали</h3><ul class="clue-list" id="downList"></ul></div>
    `;
    const setupClues = (list, ulId) => {
        const ul = document.getElementById(ulId);
        for(let clue of list){
            const li = document.createElement("li");
            li.setAttribute("data-word-id", clue.wordId);
            li.innerHTML = `<span class="clue-num">${Math.floor(clue.num)}.</span><span class="clue-text">${clue.clue}</span>`;
            li.addEventListener("click", () => {
                if (isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) {
                    setActiveWord(clue.wordId);
                    const word = wordsList.find(w => w.id === clue.wordId);
                    if(word && word.cells.length) cellElements[word.cells[0].row][word.cells[0].col]?.focus();
                }
            });
            ul.appendChild(li);
        }
    };
    setupClues(cluesAcross, "acrossList");
    setupClues(cluesDown, "downList");
    updateClueCompletion();
}

function openMobileInput(row, col) {
    if (!isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) return;
    currentMobileRow = row;
    currentMobileCol = col;
    const modal = document.getElementById("mobileInputModal");
    const inputField = document.getElementById("mobileInputField");
    if (!modal || !inputField) return;
    inputField.value = "";
    modal.style.display = "flex";
    inputField.focus();
}

function closeMobileInput() {
    const modal = document.getElementById("mobileInputModal");
    if (modal) modal.style.display = "none";
    currentMobileRow = null;
    currentMobileCol = null;
}

function submitMobileInput() {
    if (currentMobileRow === null || currentMobileCol === null) return;
    const inputField = document.getElementById("mobileInputField");
    let romaji = inputField.value.trim().toLowerCase();
    if (!romaji) {
        closeMobileInput();
        return;
    }
    
    const word = wordsList.find(w => w.cells.some(c => c.row === currentMobileRow && c.col === currentMobileCol));
    if (!word) {
        closeMobileInput();
        return;
    }
    
    let startIdx = word.cells.findIndex(c => c.row === currentMobileRow && c.col === currentMobileCol);
    if (startIdx === -1) {
        closeMobileInput();
        return;
    }
    
    let remaining = romaji;
    let pos = startIdx;
    let error = false;
    
    while (remaining.length > 0 && pos < word.cells.length) {
        let matched = false;
        for (let len = Math.min(remaining.length, 4); len >= 1; len--) {
            const prefix = remaining.slice(0, len);
            if (romajiToKatakana[prefix]) {
                const katakanaArray = romajiToKatakana[prefix];
                for (let k = 0; k < katakanaArray.length && pos + k < word.cells.length; k++) {
                    const cell = word.cells[pos + k];
                    gridData[cell.row][cell.col] = katakanaArray[k];
                    updateCellUI(cell.row, cell.col);
                }
                pos += katakanaArray.length;
                remaining = remaining.slice(len);
                matched = true;
                break;
            }
        }
        if (!matched) {
            error = true;
            break;
        }
    }
    
    if (error || remaining.length > 0) {
        showToast("Не удалось преобразовать часть введённого текста. Проверьте раскладку.", "error");
    } else {
        syncWordFromGrid();
        checkCompletion();
        updateClueCompletion();
        updateWrongHighlights();
        saveCurrentProgress();
        showToast("Готово!", "success");
    }
    closeMobileInput();
}

export async function resetCrossword() {
    if (!isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) return showToast("Кроссворд заблокирован.", "error");
    if (!await showConfirmDialog("Сбросить кроссворд? Очки за слова и подсказки будут возвращены.")) return;
    
    const progress = getStoredProgress();
    if (progress[`${currentLevel}_${currentPuzzleIndex}`]?.hintCount > 0) {
        const refund = progress[`${currentLevel}_${currentPuzzleIndex}`].hintCount * 20;
        gameStats.score += refund; saveGameStats(); updateScoreUI(); showToast(`Возвращено ${refund} очков за подсказки`, "info");
    }
    
    const earned = getEarnedPointsForCurrent();
    let pts = 0, words = 0;
    for (let w in earned.words) { if(earned.words[w]) { pts += 10; words++; } }
    if (earned.completed) pts += 50;
    
    if (pts > 0) {
        gameStats.score = Math.max(0, gameStats.score - pts);
        gameStats.wordsCompleted = Math.max(0, gameStats.wordsCompleted - words);
        saveGameStats(); updateScoreUI();
    }
    
    const earnedAll = JSON.parse(localStorage.getItem(KEYS.EARNED) || "{}");
    delete earnedAll[`${currentLevel}_${currentPuzzleIndex}`];
    localStorage.setItem(KEYS.EARNED, JSON.stringify(earnedAll));

    if (progress[`${currentLevel}_${currentPuzzleIndex}`]) {
        delete progress[`${currentLevel}_${currentPuzzleIndex}`];
        localStorage.setItem(KEYS.PROGRESS, JSON.stringify(progress));
    }
    
    const completed = getCompletedCrosswords();
    const idx = completed.indexOf(`${currentLevel}_${currentPuzzleIndex}`);
    if (idx !== -1) { completed.splice(idx, 1); localStorage.setItem(KEYS.COMPLETED, JSON.stringify(completed)); }
    
    loadCrossword(currentLevel, currentPuzzleIndex, false);
    showToast("Кроссворд сброшен.", "success");
}

export function buyCurrentPuzzle() {
    const puzzle = window.crosswordsData[currentLevel].puzzles[currentPuzzleIndex];
    const price = puzzle.price || 0;
    if (price > 0 && !isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) {
        const modal = document.getElementById("buyModal");
        document.getElementById("buyModalMessage").innerText = `Купить "${puzzle.name}" за ${price} очков?`;
        modal.style.display = "flex";
        
        const confirmBtn = document.getElementById("buyModalConfirm");
        const cancelBtn = document.getElementById("buyModalCancel");
        
        const handleConfirm = () => {
            if (gameStats.score >= price) {
                const unlocked = getUnlockedCrosswords(); unlocked[`${currentLevel}_${currentPuzzleIndex}`] = true;
                localStorage.setItem(KEYS.UNLOCKED, JSON.stringify(unlocked));
                subtractPoints(price); showConfetti(); showToast(`Разблокировано!`, "success");
                loadCrossword(currentLevel, currentPuzzleIndex, true); updateButtonStates();
            } else showToast(`Нужно ${price} очков.`, "error");
            closeModal();
        };
        const handleCancel = () => closeModal();
        const closeModal = () => { modal.style.display = "none"; confirmBtn.removeEventListener("click", handleConfirm); cancelBtn.removeEventListener("click", handleCancel); };
        
        confirmBtn.addEventListener("click", handleConfirm); cancelBtn.addEventListener("click", handleCancel);
    } else showToast("Уже разблокирован!", "info");
}

export function giveHint() {
    if (!isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) return showToast("Заблокировано.", "error");
    if (isCrosswordCompleted(currentLevel, currentPuzzleIndex)) return showToast("Уже решено!", "error");
    if (hintCount >= gameStats.maxHints) return showToast("Лимит подсказок исчерпан.", "error");
    
    let emptyCells = [];
    for (let i = 0; i < gridHeight; i++) {
        for (let j = 0; j < gridWidth; j++) {
            if (gridData[i][j] === "") {
                let belongsToIncomplete = false;
                for (let w of wordsList) {
                    if (w.cells.some(c => c.row === i && c.col === j) && w.current.join('') !== w.wordOrig) { belongsToIncomplete = true; break; }
                }
                if (belongsToIncomplete) emptyCells.push({row: i, col: j});
            }
        }
    }
    if (emptyCells.length === 0) return showToast("Нет пустых ячеек!", "error");
    if (!subtractPoints(20)) return;
    
    const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    gridData[row][col] = correctCharMap.get(`${row},${col}`);
    updateCellUI(row, col); syncWordFromGrid(); checkCompletion(); updateClueCompletion(); updateWrongHighlights();
    hintCount++; saveCurrentProgress(); updateButtonStates();
}

window.openMobileInput = openMobileInput;
window.closeMobileInput = closeMobileInput;
window.submitMobileInput = submitMobileInput;
