/**
 * Author: Brighy Jiji Abraham
 */
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// ─── Game State ──────────────────────────────────────────────
const rooms = new Map();

// ─── Helpers ─────────────────────────────────────────────────

function generateBoard() {
    const ranges = [
        [1, 15],   // B
        [16, 30],  // I
        [31, 45],  // N
        [46, 60],  // G
        [61, 75],  // O
    ];
    const board = [];
    for (let col = 0; col < 5; col++) {
        const [min, max] = ranges[col];
        const pool = [];
        for (let n = min; n <= max; n++) pool.push(n);
        // Fisher-Yates shuffle
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        board.push(pool.slice(0, 5));
    }
    // Transpose so board[row][col]
    const transposed = [];
    for (let r = 0; r < 5; r++) {
        transposed.push([]);
        for (let c = 0; c < 5; c++) {
            transposed[r].push(board[c][r]);
        }
    }
    // Center is FREE
    transposed[2][2] = 'FREE';
    return transposed;
}

function generateNumberPool() {
    const pool = [];
    for (let i = 1; i <= 75; i++) pool.push(i);
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
}

function getLetterForNumber(num) {
    if (num <= 15) return 'B';
    if (num <= 30) return 'I';
    if (num <= 45) return 'N';
    if (num <= 60) return 'G';
    return 'O';
}

function checkWin(board, marked) {
    // Check rows
    for (let r = 0; r < 5; r++) {
        let win = true;
        for (let c = 0; c < 5; c++) {
            if (board[r][c] !== 'FREE' && !marked.includes(board[r][c])) {
                win = false; break;
            }
        }
        if (win) return true;
    }
    // Check columns
    for (let c = 0; c < 5; c++) {
        let win = true;
        for (let r = 0; r < 5; r++) {
            if (board[r][c] !== 'FREE' && !marked.includes(board[r][c])) {
                win = false; break;
            }
        }
        if (win) return true;
    }
    // Check diagonals
    let win1 = true, win2 = true;
    for (let i = 0; i < 5; i++) {
        if (board[i][i] !== 'FREE' && !marked.includes(board[i][i])) win1 = false;
        if (board[i][4 - i] !== 'FREE' && !marked.includes(board[i][4 - i])) win2 = false;
    }
    return win1 || win2;
}

function checkWinClassic(board, calledNumbers) {
    const calledSet = new Set(calledNumbers);
    const isMarked = (val) => calledSet.has(val);

    let completedLines = 0;

    // Count completed rows
    for (let r = 0; r < 5; r++) {
        if (board[r].every(isMarked)) completedLines++;
    }
    // Count completed columns
    for (let c = 0; c < 5; c++) {
        let complete = true;
        for (let r = 0; r < 5; r++) {
            if (!isMarked(board[r][c])) { complete = false; break; }
        }
        if (complete) completedLines++;
    }
    // Count completed diagonals
    let d1 = true, d2 = true;
    for (let i = 0; i < 5; i++) {
        if (!isMarked(board[i][i])) d1 = false;
        if (!isMarked(board[i][4 - i])) d2 = false;
    }
    if (d1) completedLines++;
    if (d2) completedLines++;

    // Win if total completed lines >= 5
    return completedLines >= 5;
}

// ─── Socket.IO Events ───────────────────────────────────────

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    socket.on('create-room', ({ roomCode, playerName, mode }, callback) => {
        if (rooms.has(roomCode)) {
            return callback({ success: false, message: 'Room already exists.' });
        }
        const gameMode = mode === 'classic' ? 'classic' : 'random';
        const room = {
            code: roomCode,
            host: socket.id,
            mode: gameMode,
            players: [{ id: socket.id, name: playerName, board: null, marked: [], boardReady: false }],
            status: 'waiting',
            numberPool: [],
            drawnNumbers: [],
            currentNumber: null,
            drawInterval: null,
            winner: null,
            turnIndex: 0,
            calledNumbers: []
        };
        rooms.set(roomCode, room);
        socket.join(roomCode);
        callback({ success: true, mode: gameMode });
        io.to(roomCode).emit('room-update', sanitizeRoom(room));
        console.log(`  Room ${roomCode} created by ${playerName} (mode: ${gameMode})`);
    });

    socket.on('join-room', ({ roomCode, playerName }, callback) => {
        const room = rooms.get(roomCode);
        if (!room) return callback({ success: false, message: 'Room not found.' });
        if (room.status !== 'waiting') return callback({ success: false, message: 'Game already in progress.' });
        if (room.players.find(p => p.id === socket.id)) return callback({ success: false, message: 'Already in room.' });

        room.players.push({ id: socket.id, name: playerName, board: null, marked: [], boardReady: false });
        socket.join(roomCode);
        callback({ success: true });
        io.to(roomCode).emit('room-update', sanitizeRoom(room));
        console.log(`  ${playerName} joined room ${roomCode}`);
    });

    socket.on('rejoin-room', ({ roomCode, playerName }, callback) => {
        const room = rooms.get(roomCode);
        if (!room) return callback({ success: false, message: 'Room no longer exists.' });

        const player = room.players.find(p => p.name === playerName);
        if (!player) return callback({ success: false, message: 'You are not in this room.' });

        // Swap old socket ID → new one
        if (room.host === player.id) room.host = socket.id;
        player.id = socket.id;
        socket.join(roomCode);

        // Restore board if available
        if (player.board) {
            socket.emit('your-board', player.board);
        }

        // Restore turn state for classic mode
        if (room.mode === 'classic' && room.status === 'playing') {
            const turnPlayer = room.players[room.turnIndex];
            if (turnPlayer) {
                socket.emit('turn-update', {
                    turnPlayerId: turnPlayer.id,
                    turnPlayerName: turnPlayer.name
                });
            }
        }

        callback({ success: true, room: sanitizeRoom(room), board: player.board || null });
        io.to(roomCode).emit('room-update', sanitizeRoom(room));
        console.log(`  ${playerName} rejoined room ${roomCode}`);
    });

    socket.on('start-game', ({ roomCode }, callback) => {
        const room = rooms.get(roomCode);
        if (!room) return callback({ success: false, message: 'Room not found.' });
        if (room.host !== socket.id) return callback({ success: false, message: 'Only the host can start.' });
        if (room.players.length < 2) return callback({ success: false, message: 'Need at least 2 players.' });

        if (room.mode === 'classic') {
            // Verify all players submitted boards
            const allReady = room.players.every(p => p.boardReady);
            if (!allReady) return callback({ success: false, message: 'All players must set up their boards first.' });

            room.status = 'playing';
            room.calledNumbers = [];
            room.turnIndex = Math.floor(Math.random() * room.players.length);

            callback({ success: true });
            io.to(roomCode).emit('room-update', sanitizeRoom(room));
            io.to(roomCode).emit('turn-update', {
                turnPlayerId: room.players[room.turnIndex].id,
                turnPlayerName: room.players[room.turnIndex].name
            });

            // Send each player their own board back
            room.players.forEach(p => {
                io.to(p.id).emit('your-board', p.board);
            });

            console.log(`  Classic game started in room ${roomCode}`);
        } else {
            // Random mode (existing logic)
            room.status = 'playing';
            room.numberPool = generateNumberPool();
            room.drawnNumbers = [];
            room.currentNumber = null;

            room.players.forEach(p => {
                p.board = generateBoard();
                p.marked = [];
            });

            room.players.forEach(p => {
                io.to(p.id).emit('your-board', p.board);
            });

            callback({ success: true });
            io.to(roomCode).emit('room-update', sanitizeRoom(room));

            // Draw every 4 seconds
            room.drawInterval = setInterval(() => {
                if (room.numberPool.length === 0 || room.status !== 'playing') {
                    clearInterval(room.drawInterval);
                    return;
                }
                const num = room.numberPool.pop();
                room.drawnNumbers.push(num);
                room.currentNumber = num;
                io.to(roomCode).emit('number-drawn', {
                    number: num,
                    letter: getLetterForNumber(num),
                    drawnNumbers: room.drawnNumbers
                });
            }, 4000);

            console.log(`  Random game started in room ${roomCode}`);
        }
    });

    socket.on('mark-number', ({ roomCode, number }) => {
        const room = rooms.get(roomCode);
        if (!room || room.status !== 'playing') return;
        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;
        if (!room.drawnNumbers.includes(number)) return;
        if (!player.marked.includes(number)) {
            player.marked.push(number);
        }
    });

    socket.on('set-board', ({ roomCode, board }, callback) => {
        const room = rooms.get(roomCode);
        if (!room) return callback({ success: false, message: 'Room not found.' });
        if (room.mode !== 'classic') return callback({ success: false, message: 'Not a classic game.' });
        if (room.status !== 'waiting') return callback({ success: false, message: 'Game already started.' });
        const player = room.players.find(p => p.id === socket.id);
        if (!player) return callback({ success: false, message: 'Player not found.' });

        // Validate board: 5x5 grid, numbers 1-25, all unique
        if (!Array.isArray(board) || board.length !== 5) {
            return callback({ success: false, message: 'Invalid board format.' });
        }
        const allNums = board.flat();
        if (allNums.length !== 25) return callback({ success: false, message: 'Board must have 25 cells.' });
        const numSet = new Set(allNums);
        if (numSet.size !== 25) return callback({ success: false, message: 'All numbers must be unique.' });
        for (const n of allNums) {
            if (typeof n !== 'number' || n < 1 || n > 25) {
                return callback({ success: false, message: 'Numbers must be 1-25.' });
            }
        }

        player.board = board;
        player.boardReady = true;
        callback({ success: true });
        io.to(roomCode).emit('room-update', sanitizeRoom(room));
        console.log(`  ${player.name} set their board in room ${roomCode}`);
    });

    socket.on('call-number', ({ roomCode, number }, callback) => {
        const room = rooms.get(roomCode);
        if (!room || room.status !== 'playing') return callback({ success: false, message: 'Game not in progress.' });
        if (room.mode !== 'classic') return callback({ success: false, message: 'Not a classic game.' });
        const player = room.players.find(p => p.id === socket.id);
        if (!player) return callback({ success: false, message: 'Player not found.' });

        // Check it's this player's turn
        if (room.players[room.turnIndex].id !== socket.id) {
            return callback({ success: false, message: 'Not your turn.' });
        }

        // Validate number
        if (typeof number !== 'number' || number < 1 || number > 25) {
            return callback({ success: false, message: 'Invalid number.' });
        }
        if (room.calledNumbers.includes(number)) {
            return callback({ success: false, message: 'Number already called.' });
        }

        room.calledNumbers.push(number);
        room.currentNumber = number;

        // Advance turn
        room.turnIndex = (room.turnIndex + 1) % room.players.length;

        callback({ success: true });
        io.to(roomCode).emit('classic-number-called', {
            number: number,
            callerName: player.name,
            calledNumbers: room.calledNumbers
        });
        io.to(roomCode).emit('turn-update', {
            turnPlayerId: room.players[room.turnIndex].id,
            turnPlayerName: room.players[room.turnIndex].name
        });

        console.log(`  ${player.name} called ${number} in room ${roomCode}`);
    });

    socket.on('call-bingo', ({ roomCode }, callback) => {
        const room = rooms.get(roomCode);
        if (!room || room.status !== 'playing') return callback({ success: false, message: 'Game not in progress.' });
        const player = room.players.find(p => p.id === socket.id);
        if (!player) return callback({ success: false, message: 'Player not found.' });

        let won;
        if (room.mode === 'classic') {
            won = checkWinClassic(player.board, room.calledNumbers);
        } else {
            won = checkWin(player.board, player.marked);
        }

        if (won) {
            room.status = 'finished';
            room.winner = player.name;
            if (room.drawInterval) clearInterval(room.drawInterval);
            io.to(roomCode).emit('game-over', { winner: player.name });
            callback({ success: true, message: 'BINGO! You win!' });
            console.log(`  ${player.name} won in room ${roomCode}!`);
        } else {
            callback({ success: false, message: 'Not a valid BINGO yet!' });
        }
    });

    socket.on('play-again', ({ roomCode }) => {
        const room = rooms.get(roomCode);
        if (!room) return;
        room.status = 'waiting';
        room.winner = null;
        room.drawnNumbers = [];
        room.currentNumber = null;
        room.numberPool = [];
        room.calledNumbers = [];
        room.turnIndex = 0;
        room.players.forEach(p => { p.board = null; p.marked = []; p.boardReady = false; });
        io.to(roomCode).emit('room-update', sanitizeRoom(room));
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        for (const [code, room] of rooms.entries()) {
            const idx = room.players.findIndex(p => p.id === socket.id);
            if (idx !== -1) {
                const wasCurrentTurn = room.mode === 'classic' &&
                    room.status === 'playing' &&
                    room.players[room.turnIndex] &&
                    room.players[room.turnIndex].id === socket.id;

                room.players.splice(idx, 1);

                if (room.players.length === 0) {
                    if (room.drawInterval) clearInterval(room.drawInterval);
                    rooms.delete(code);
                } else {
                    if (room.host === socket.id) room.host = room.players[0].id;

                    // Fix classic mode turn after disconnect
                    if (room.mode === 'classic' && room.status === 'playing') {
                        // Clamp turnIndex in case it's now out of bounds
                        if (room.turnIndex >= room.players.length) {
                            room.turnIndex = 0;
                        }
                        // If it was this player's turn, advance to next and notify
                        if (wasCurrentTurn) {
                            io.to(code).emit('turn-update', {
                                turnPlayerId: room.players[room.turnIndex].id,
                                turnPlayerName: room.players[room.turnIndex].name
                            });
                            console.log(`  Turn advanced after disconnect in room ${code} → ${room.players[room.turnIndex].name}`);
                        }
                    }

                    io.to(code).emit('room-update', sanitizeRoom(room));
                }
            }
        }
    });
});

function sanitizeRoom(room) {
    return {
        code: room.code,
        host: room.host,
        mode: room.mode,
        players: room.players.map(p => ({ id: p.id, name: p.name, boardReady: p.boardReady })),
        status: room.status,
        drawnNumbers: room.drawnNumbers,
        currentNumber: room.currentNumber,
        winner: room.winner,
        calledNumbers: room.calledNumbers || [],
        turnIndex: room.turnIndex || 0
    };
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Bingo server running on http://192.168.12.49:${PORT}`);
});
