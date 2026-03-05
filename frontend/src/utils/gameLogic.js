export const LETTERS = ['B', 'I', 'N', 'G', 'O'];

const AVATAR_COLORS = [
    '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

export function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getLetterForNumber(num) {
    const letters = 'BINGOABCDEFGH';
    const index = Math.floor((num - 1) / 15);
    return letters[index] || '*';
}

export function checkWin(board, markedCells) {
    const size = board.length;
    const isMarked = (val) => val === 'FREE' || markedCells.has(val);
    let completedLines = 0;

    // Check rows
    for (let r = 0; r < size; r++) {
        if (board[r].every(isMarked)) completedLines++;
    }
    // Check columns
    for (let c = 0; c < size; c++) {
        let win = true;
        for (let r = 0; r < size; r++) {
            if (!isMarked(board[r][c])) { win = false; break; }
        }
        if (win) completedLines++;
    }
    // Check diagonals
    let d1 = true, d2 = true;
    for (let i = 0; i < size; i++) {
        if (!isMarked(board[i][i])) d1 = false;
        if (!isMarked(board[i][size - 1 - i])) d2 = false;
    }
    if (d1) completedLines++;
    if (d2) completedLines++;

    return completedLines >= 5;
}

export function checkWinClassic(board, calledNumbers) {
    const calledSet = new Set(calledNumbers);
    const isMarked = (val) => calledSet.has(val);
    const size = board.length;

    let completedLines = 0;

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
