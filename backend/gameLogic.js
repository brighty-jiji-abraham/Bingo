/**
 * Author: Brighy Jiji Abraham
 */

// ─── Board Generation ────────────────────────────────────────

/**
 * Generate a random Bingo board of the given size.
 * Each column draws from a pool of 15 numbers (BINGO convention).
 * Center cell is FREE on odd-sized boards.
 */
function generateBoard(size) {
    const board = [];
    for (let col = 0; col < size; col++) {
        const min = col * 15 + 1;
        const max = (col + 1) * 15;
        const pool = [];
        for (let n = min; n <= max; n++) pool.push(n);
        // Fisher-Yates shuffle
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        board.push(pool.slice(0, size));
    }
    // Transpose so board[row][col]
    const transposed = [];
    for (let r = 0; r < size; r++) {
        transposed.push([]);
        for (let c = 0; c < size; c++) {
            transposed[r].push(board[c][r]);
        }
    }
    // Center is FREE only on odd sizes
    if (size % 2 !== 0) {
        const center = Math.floor(size / 2);
        transposed[center][center] = 'FREE';
    }
    return transposed;
}

/**
 * Generate a shuffled number pool for random mode draws.
 * Pool contains numbers 1 to size*15.
 */
function generateNumberPool(size) {
    const pool = [];
    const maxNum = size * 15;
    for (let i = 1; i <= maxNum; i++) pool.push(i);
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
}

// ─── Number Helpers ──────────────────────────────────────────

/**
 * Get the BINGO column letter for a drawn number.
 */
function getLetterForNumber(num) {
    const letters = 'BINGOABCDEFGH';
    const index = Math.floor((num - 1) / 15);
    return letters[index] || '*';
}

// ─── Win Checking ────────────────────────────────────────────

/**
 * Check win for random mode.
 * Counts completed rows, columns, and diagonals.
 * Requires >= 5 completed lines to win.
 */
function checkWin(board, marked) {
    const size = board.length;
    let completedLines = 0;

    // Check rows
    for (let r = 0; r < size; r++) {
        let win = true;
        for (let c = 0; c < size; c++) {
            if (board[r][c] !== 'FREE' && !marked.includes(board[r][c])) {
                win = false; break;
            }
        }
        if (win) completedLines++;
    }
    // Check columns
    for (let c = 0; c < size; c++) {
        let win = true;
        for (let r = 0; r < size; r++) {
            if (board[r][c] !== 'FREE' && !marked.includes(board[r][c])) {
                win = false; break;
            }
        }
        if (win) completedLines++;
    }
    // Check diagonals
    let win1 = true, win2 = true;
    for (let i = 0; i < size; i++) {
        if (board[i][i] !== 'FREE' && !marked.includes(board[i][i])) win1 = false;
        if (board[i][size - 1 - i] !== 'FREE' && !marked.includes(board[i][size - 1 - i])) win2 = false;
    }
    if (win1) completedLines++;
    if (win2) completedLines++;

    return completedLines >= 5;
}

/**
 * Check win for classic mode.
 * Uses called numbers (global) instead of per-player marked numbers.
 * Requires >= 5 completed lines to win.
 */
function checkWinClassic(board, calledNumbers) {
    const calledSet = new Set(calledNumbers);
    const isMarked = (val) => calledSet.has(val);

    let completedLines = 0;
    const size = board.length;

    // Count completed rows
    for (let r = 0; r < size; r++) {
        if (board[r].every(isMarked)) completedLines++;
    }
    // Count completed columns
    for (let c = 0; c < size; c++) {
        let complete = true;
        for (let r = 0; r < size; r++) {
            if (!isMarked(board[r][c])) { complete = false; break; }
        }
        if (complete) completedLines++;
    }
    // Count completed diagonals
    let d1 = true, d2 = true;
    for (let i = 0; i < size; i++) {
        if (!isMarked(board[i][i])) d1 = false;
        if (!isMarked(board[i][size - 1 - i])) d2 = false;
    }
    if (d1) completedLines++;
    if (d2) completedLines++;

    return completedLines >= 5;
}

// ─── Exports ─────────────────────────────────────────────────

module.exports = {
    generateBoard,
    generateNumberPool,
    getLetterForNumber,
    checkWin,
    checkWinClassic
};
