/**
 * Author: Brighy Jiji Abraham
 */
// gameLogic.js

// Generate standard US Bingo board
// B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75
const generateBoard = () => {
    const generateColumn = (min, max, count) => {
        const numbers = new Set();
        while (numbers.size < count) {
            numbers.add(Math.floor(Math.random() * (max - min + 1)) + min);
        }
        return Array.from(numbers);
    };

    const B = generateColumn(1, 15, 5);
    const I = generateColumn(16, 30, 5);
    const N = generateColumn(31, 45, 5); // 5th will be skipped/replaced with FREE
    const G = generateColumn(46, 60, 5);
    const O = generateColumn(61, 75, 5);

    N[2] = 'FREE'; // Center space is free

    const board = [
        [B[0], I[0], N[0], G[0], O[0]],
        [B[1], I[1], N[1], G[1], O[1]],
        [B[2], I[2], N[2], G[2], O[2]],
        [B[3], I[3], N[3], G[3], O[3]],
        [B[4], I[4], N[4], G[4], O[4]]
    ];
    return board;
};

// Check if player has bingo based on drawn numbers
const checkBingo = (board, drawnNumbers) => {
    const drawnSet = new Set(drawnNumbers);
    drawnSet.add('FREE'); // Free space is always "drawn"

    const isMarked = (val) => drawnSet.has(val);

    // Check rows
    for (let r = 0; r < 5; r++) {
        if (board[r].every(isMarked)) return true;
    }

    // Check columns
    for (let c = 0; c < 5; c++) {
        let colWin = true;
        for (let r = 0; r < 5; r++) {
            if (!isMarked(board[r][c])) {
                colWin = false;
                break;
            }
        }
        if (colWin) return true;
    }

    // Check diagonals
    let diag1Win = true;
    let diag2Win = true;
    for (let i = 0; i < 5; i++) {
        if (!isMarked(board[i][i])) diag1Win = false;
        if (!isMarked(board[i][4 - i])) diag2Win = false;
    }

    return diag1Win || diag2Win;
};

module.exports = {
    generateBoard,
    checkBingo
};
