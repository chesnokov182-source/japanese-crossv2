import {
    currentLevel, currentPuzzleIndex, gridData, wordsList, cluesAcross, cluesDown,
    activeWordId, hintUsed, hintCount, correctCharMap,
    loadCrosswordData, syncWordFromGrid, buildCorrectCharMap, generateNumbering,
    isWordComplete, areAllWordsComplete
} from './crosswordModel.js';
import {
    cellElements, romajiBuffers, renderGrid, renderClues, updateCellUI,
    updateWrongHighlights, applyHighlight, clearHighlight, updateClueCompletion,
    updateStatusMessage, updatePuzzleSelect, updateLevelProgress
} from './crosswordView.js';
import {
    gameStats, saveGameStats, updateScoreUI, addPoints, subtractPoints,
    saveProgress, deleteProgress, isPuzzleUnlocked, unlockPuzzle,
    markAsCompleted, isCrosswordCompleted, removeCompletedMark,
    markWordPointsEarned, markCrosswordCompletedEarned, revertPointsForCurrentPuzzle
} from './storage.js';
import { romajiToKatakana } from './constants.js';
import { showToast, showConfirmDialog, playPop, playCorrectInput, playErrorInput } from './utils.js';
import { playClick } from './audio.js';

// Экспорт для view
export function setActiveWord(wordId) {
    activeWordId = wordId;
    applyHighlight();
    const word = wordsList.find(w => w.id === activeWordId);
    if (word && word.cells.length) {
        const firstEmpty = word.cells.find(cell => gridData[cell.row][cell.col] === "");
        if (firstEmpty) cellElements[firstEmpty.row][firstEmpty.col]?.focus();
        else cellElements[word.cells[0].row][word.cells[0].col]?.focus();
    }
}

// Обработка ввода
export function handleKeydown(e, row, col) {
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
        else if (e.key === "ArrowRight") newCol++;
        else if (e.key === "ArrowUp") newRow--;
        else if (e.key === "ArrowDown") newRow++;
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

function processBuffer(row, col, buffer) {
    if (buffer.length === 2 && buffer[0] === 'n' && !'aiueo'.includes(buffer[1]) && buffer[1] !== 'n') {
        insertKatakanaArray(row, col, ["ン"], 0);
        const activeWord = wordsList.find(w => w.id === activeWordId);
        if (activeWord) {
            let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
            if (idx !== -1 && idx + 1 < activeWord.cells.length) {
                let nextCell = activeWord.cells[idx + 1];
                romajiBuffers.set(`${nextCell.row},${nextCell.col}`, buffer[1]);
                updateCellUI(nextCell.row, nextCell.col);
                cellElements[nextCell.row][nextCell.col]?.focus();
            } else {
                let nextEmpty = getNextEmptyCellInWord(activeWord, row, col);
                if (nextEmpty) {
                    romajiBuffers.set(`${nextEmpty.row},${nextEmpty.col}`, buffer[1]);
                    updateCellUI(nextEmpty.row, nextEmpty.col);
                    cellElements[nextEmpty.row][nextEmpty.col]?.focus();
                } else {
                    focusNextWord(activeWord.number);
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
                const activeWord = wordsList.find(w => w.id === activeWordId);
                if (activeWord) {
                    let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
                    if (idx !== -1 && idx + 1 < activeWord.cells.length) {
                        let nextCell = activeWord.cells[idx + 1];
                        romajiBuffers.set(`${nextCell.row},${nextCell.col}`, remaining);
                        updateCellUI(nextCell.row, nextCell.col);
                        cellElements[nextCell.row][nextCell.col]?.focus();
                    } else {
                        let nextEmpty = getNextEmptyCellInWord(activeWord, row, col);
                        if (nextEmpty) {
                            romajiBuffers.set(`${nextEmpty.row},${nextEmpty.col}`, remaining);
                            updateCellUI(nextEmpty.row, nextEmpty.col);
                            cellElements[nextEmpty.row][nextEmpty.col]?.focus();
                        } else {
                            focusNextWord(activeWord.number);
                        }
                    }
                }
            }
            return true;
        }
    }
    return false;
}

function insertKatakanaArray(row, col, katakanaArray, startIndex) {
    if (startIndex >= katakanaArray.length) return;
    const char = katakanaArray[startIndex];
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
        const cellDiv = cellElements[row]?.[col]?.parentElement;
        if (cellDiv) {
            cellDiv.classList.add('correct-animation');
            setTimeout(() => cellDiv.classList.remove('correct-animation'), 300);
        }
    } else {
        playErrorInput();
    }

    if (startIndex + 1 < katakanaArray.length) {
        const activeWord = wordsList.find(w => w.id === activeWordId);
        if (activeWord) {
            let idx = activeWord.cells.findIndex(c => c.row === row && c.col === col);
            if (idx !== -1 && idx + 1 < activeWord.cells.length) {
                let nextCell = activeWord.cells[idx + 1];
                insertKatakanaArray(nextCell.row, nextCell.col, katakanaArray, startIndex + 1);
                return;
            }
        }
    } else {
        const activeWord = wordsList.find(w => w.id === activeWordId);
        if (activeWord) {
            let nextEmpty = getNextEmptyCellInWord(activeWord, row, col);
            if (nextEmpty) cellElements[nextEmpty.row][nextEmpty.col]?.focus();
            else focusNextWord(activeWord.number);
        }
    }
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

function focusNextWord(currentNumber) {
    let allWords = [...cluesAcross, ...cluesDown];
    allWords.sort((a, b) => a.num - b.num);
    for (let w of allWords) {
        if (w.num > currentNumber) {
            const wordObj = wordsList.find(word => word.id === w.wordId);
            if (wordObj && !isWordComplete(wordObj.id)) {
                setActiveWord(wordObj.id);
                return;
            }
        }
    }
    for (let w of allWords) {
        const wordObj = wordsList.find(word => word.id === w.wordId);
        if (wordObj && !isWordComplete(wordObj.id)) {
            setActiveWord(wordObj.id);
            return;
        }
    }
}

export function onCellFocus(row, col) {
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

export function onCellBlur(row, col) {
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

export function onCellInput(row, col) {
    const key = `${row},${col}`;
    if (romajiBuffers.has(key)) {
        romajiBuffers.delete(key);
        updateCellUI(row, col);
    }
}

function saveCurrentProgress() {
    saveProgress(currentLevel, currentPuzzleIndex, gridData, hintUsed, hintCount);
}

function checkCompletion() {
    if (!isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) {
        updateStatusMessage(`🔒 Кроссворд заблокирован. Цена: ${window.crosswordsData[currentLevel].puzzles[currentPuzzleIndex].price || 0} очков.`, "#c94f4f");
        return;
    }
    const allComplete = areAllWordsComplete();
    if (allComplete) {
        updateStatusMessage("🎉 Поздравляем! Кроссворд полностью разгадан! 🎉", "#2c6e2c");
        if (!isCrosswordCompleted(currentLevel, currentPuzzleIndex)) {
            markAsCompleted(currentLevel, currentPuzzleIndex);
            markCrosswordCompletedEarned(currentLevel, currentPuzzleIndex);
            updatePuzzleSelect();
            updateLevelProgress();
            updateButtonStates();
        }
    } else {
        updateStatusMessage("Заполняйте ячейки. Вводите английскими буквами (a-z). Буквы отображаются в процессе набора. Например: su → ス, shu → シ+ユ, a → ア, n+s → ン+s, - → ー.", "#666");
        if (isCrosswordCompleted(currentLevel, currentPuzzleIndex)) {
            removeCompletedMark(currentLevel, currentPuzzleIndex);
            updatePuzzleSelect();
            updateLevelProgress();
            updateButtonStates();
        }
    }
}

export function giveHint() {
    if (!isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) {
        showToast("Кроссворд заблокирован.", "error");
        return;
    }
    if (isCrosswordCompleted(currentLevel, currentPuzzleIndex)) {
        showToast("Кроссворд уже решён!", "error");
        return;
    }
    if (hintCount >= gameStats.maxHints) {
        showToast(`Лимит подсказок исчерпан (${hintCount}/${gameStats.maxHints})`, "error");
        return;
    }
    let emptyCells = [];
    for (let i = 0; i < gridHeight; i++) {
        for (let j = 0; j < gridWidth; j++) {
            if (gridData[i][j] === "") {
                let belongsToIncomplete = false;
                for (let w of wordsList) {
                    const idx = w.cells.findIndex(c => c.row === i && c.col === j);
                    if (idx !== -1 && !isWordComplete(w.id)) {
                        belongsToIncomplete = true;
                        break;
                    }
                }
                if (belongsToIncomplete) emptyCells.push({ row: i, col: j });
            }
        }
    }
    if (emptyCells.length === 0) {
        showToast("Нет пустых ячеек для подсказки!", "error");
        return;
    }
    if (!subtractPoints(20)) return;
    const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const correctChar = correctCharMap.get(`${row},${col}`);
    if (!correctChar) {
        addPoints(20);
        showToast("Ошибка подсказки", "error");
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

export function resetCrossword() {
    if (!isPuzzleUnlocked(currentLevel, currentPuzzleIndex)) {
        showToast("Кроссворд заблокирован.", "error");
        return;
    }
    showConfirmDialog("Сбросить кроссворд? Очки за слова и подсказки будут возвращены.").then(confirmed => {
        if (!confirmed) return;
        // Возврат очков за подсказки
        if (hintCount > 0) {
            addPoints(hintCount * 20);
            showToast(`Возвращено ${hintCount * 20} очков за подсказки`, "info");
        }
        revertPointsForCurrentPuzzle(currentLevel, currentPuzzleIndex);
        deleteProgress(currentLevel, currentPuzzleIndex);
        if (isCrosswordCompleted(currentLevel, currentPuzzleIndex)) {
            removeCompletedMark(currentLevel, currentPuzzleIndex);
            updatePuzzleSelect();
            updateLevelProgress();
        }
        loadCrossword(currentLevel, currentPuzzleIndex, false);
        showToast("Кроссворд сброшен", "success");
    });
}

export function loadCrossword(level, puzzleIdx, preserveSaved = true) {
    const success = loadCrosswordData(level, puzzleIdx, preserveSaved);
    if (!success) return;
    renderGrid();
    renderClues();
    clearHighlight();
    checkCompletion();
    updateClueCompletion();
    updateWrongHighlights();
    romajiBuffers.clear();
    updateButtonStates();
    updateLevelProgress();
    updatePuzzleSelect();
    // Привязка обработчиков к инпутам
    for (let i = 0; i < gridHeight; i++) {
        for (let j = 0; j < gridWidth; j++) {
            const input = cellElements[i]?.[j];
            if (input && !input.disabled) {
                input.addEventListener("keydown", (e) => handleKeydown(e, i, j));
                input.addEventListener("focus", () => onCellFocus(i, j));
                input.addEventListener("blur", () => onCellBlur(i, j));
                input.addEventListener("input", () => onCellInput(i, j));
            }
        }
    }
}

export function updateButtonStates() {
    const unlocked = isPuzzleUnlocked(currentLevel, currentPuzzleIndex);
    const resetBtn = document.getElementById("resetBtn");
    const hintBtn = document.getElementById("hintBtn");
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
