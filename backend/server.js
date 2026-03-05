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
const ROOM_CLEANUP_DELAY = 60 * 1000; // 1 minute before deleting empty rooms

// ─── Game Logic ──────────────────────────────────────────────
const { generateBoard, generateNumberPool, getLetterForNumber, checkWin, checkWinClassic } = require('./gameLogic');

function startDrawInterval(room, roomCode) {
    if (room.drawInterval) clearInterval(room.drawInterval);
    room.drawInterval = setInterval(() => {
        if (room.numberPool.length === 0 || room.status !== 'playing') {
            clearInterval(room.drawInterval);
            room.drawInterval = null;
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
}

// ─── Socket.IO Events ───────────────────────────────────────

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    socket.on('create-room', ({ roomCode, playerName, mode, size = 5 }, callback) => {
        if (rooms.has(roomCode)) {
            return callback({ success: false, message: 'Room already exists.' });
        }
        const gameSize = Math.min(Math.max(parseInt(size) || 5, 5), 10);
        const gameMode = mode === 'classic' ? 'classic' : 'random';
        const room = {
            code: roomCode,
            host: socket.id,
            mode: gameMode,
            size: gameSize,
            players: [{ id: socket.id, name: playerName, board: null, marked: [], boardReady: false, connected: true }],
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

        room.players.push({ id: socket.id, name: playerName, board: null, marked: [], boardReady: false, connected: true });
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

        if (room.host === player.id) room.host = socket.id;
        player.id = socket.id;
        player.connected = true;
        socket.join(roomCode);

        // Cancel any pending room cleanup
        if (room.cleanupTimer) {
            clearTimeout(room.cleanupTimer);
            room.cleanupTimer = null;
            console.log(`  Cleanup cancelled for room ${roomCode}`);
        }

        // Restore board if available
        if (player.board) {
            socket.emit('your-board', player.board);
        }

        // Restore turn state for classic mode
        if (room.mode === 'classic' && (room.status === 'playing' || room.status === 'paused')) {
            const turnPlayer = room.players[room.turnIndex];
            if (turnPlayer) {
                socket.emit('turn-update', {
                    turnPlayerId: turnPlayer.id,
                    turnPlayerName: turnPlayer.name
                });
            }
        }

        // Resume game if a paused player returned
        if (room.status === 'paused') {
            const allConnected = room.players.every(p => p.connected);
            if (allConnected) {
                room.status = 'playing';

                // Restart draw interval for random mode
                if (room.mode === 'random') {
                    startDrawInterval(room, roomCode);
                }

                // Re-broadcast turn for classic mode
                if (room.mode === 'classic') {
                    const turnPlayer = room.players[room.turnIndex];
                    if (turnPlayer) {
                        io.to(roomCode).emit('turn-update', {
                            turnPlayerId: turnPlayer.id,
                            turnPlayerName: turnPlayer.name
                        });
                    }
                }
            }
        }

        callback({
            success: true,
            room: sanitizeRoom(room),
            board: player.board || null,
            marked: player.marked || []
        });
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
            room.numberPool = generateNumberPool(room.size);
            room.drawnNumbers = [];
            room.currentNumber = null;

            room.players.forEach(p => {
                p.board = generateBoard(room.size);
                p.marked = [];
            });

            room.players.forEach(p => {
                io.to(p.id).emit('your-board', p.board);
            });

            callback({ success: true });
            io.to(roomCode).emit('room-update', sanitizeRoom(room));

            startDrawInterval(room, roomCode);

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

        // Validate board: dynamic size grid, unique numbers
        const targetLen = room.size * room.size;
        if (!Array.isArray(board) || board.length !== room.size) {
            return callback({ success: false, message: 'Invalid board format.' });
        }
        const allNums = board.flat();
        if (allNums.length !== targetLen) return callback({ success: false, message: `Board must have ${targetLen} cells.` });
        const numSet = new Set(allNums);
        if (numSet.size !== targetLen) return callback({ success: false, message: 'All numbers must be unique.' });
        const maxNum = room.size * room.size;
        for (const n of allNums) {
            if (typeof n !== 'number' || n < 1 || n > maxNum) {
                return callback({ success: false, message: `Numbers must be 1-${maxNum}.` });
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
        const maxNum = room.size * room.size;
        if (typeof number !== 'number' || number < 1 || number > maxNum) {
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

    socket.on('kick-player', ({ roomCode, playerName }, callback) => {
        const room = rooms.get(roomCode);
        if (!room) return callback({ success: false, message: 'Room not found.' });
        if (room.host !== socket.id) return callback({ success: false, message: 'Only the host can remove players.' });
        if (room.status !== 'waiting') return callback({ success: false, message: 'Can only remove players in the lobby.' });

        const idx = room.players.findIndex(p => p.name === playerName);
        if (idx === -1) return callback({ success: false, message: 'Player not found.' });
        const player = room.players[idx];
        if (player.connected) return callback({ success: false, message: 'Can only remove disconnected players.' });

        // Notify the kicked player's socket to clear their session (if they reconnect)
        io.to(player.id).emit('force-kicked', { roomCode });

        room.players.splice(idx, 1);

        // If room is now empty, schedule cleanup
        if (room.players.length === 0) {
            scheduleRoomCleanup(roomCode);
        } else {
            // Transfer host if needed
            if (room.host === player.id) {
                const nextHost = room.players.find(p => p.connected);
                room.host = nextHost ? nextHost.id : room.players[0].id;
            }
            io.to(roomCode).emit('room-update', sanitizeRoom(room));
        }

        callback({ success: true });
        console.log(`  Host kicked ${playerName} from room ${roomCode}`);
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        for (const [code, room] of rooms.entries()) {
            const player = room.players.find(p => p.id === socket.id);
            if (player) {
                player.connected = false;

                if (room.status === 'playing' || room.status === 'paused') {
                    // Pause the active game
                    room.status = 'paused';
                    if (room.drawInterval) {
                        clearInterval(room.drawInterval);
                        room.drawInterval = null;
                    }
                }

                const anyConnected = room.players.some(p => p.connected);
                if (!anyConnected) {
                    // Everyone disconnected — schedule cleanup after 1 min
                    scheduleRoomCleanup(code);
                } else {
                    // Update the remaining players with new state
                    if (room.status === 'waiting' && room.host === socket.id) {
                        // Reassign host to next connected player
                        const nextHost = room.players.find(p => p.connected);
                        if (nextHost) room.host = nextHost.id;
                    }
                    io.to(code).emit('room-update', sanitizeRoom(room));
                }
            }
        }
    });
});

function scheduleRoomCleanup(code) {
    const room = rooms.get(code);
    if (!room) return;
    if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
    room.cleanupTimer = setTimeout(() => {
        const r = rooms.get(code);
        if (!r) return;

        // Remove all disconnected players
        const disconnected = r.players.filter(p => !p.connected);
        disconnected.forEach(p => {
            const idx = r.players.indexOf(p);
            if (idx !== -1) r.players.splice(idx, 1);
            // Invalidate their session
            io.to(p.id).emit('force-kicked', { roomCode: code });
        });

        if (r.players.length === 0) {
            // Everyone's gone — delete the room
            if (r.drawInterval) clearInterval(r.drawInterval);
            rooms.delete(code);
            console.log(`  Room ${code} deleted after timeout (no players)`);
        } else {
            // Ensure host is still a current player
            const hostStillPresent = r.players.some(p => p.id === r.host);
            if (!hostStillPresent) {
                const nextHost = r.players.find(p => p.connected) || r.players[0];
                r.host = nextHost.id;
                console.log(`  Host transferred to ${nextHost.name} in room ${code}`);
            }
            io.to(code).emit('room-update', sanitizeRoom(r));
            console.log(`  Removed ${disconnected.length} disconnected player(s) from room ${code}`);
        }
    }, ROOM_CLEANUP_DELAY);
    console.log(`  Room ${code} scheduled for cleanup in 60s`);
}

function sanitizeRoom(room) {
    return {
        code: room.code,
        host: room.host,
        mode: room.mode,
        size: room.size,
        players: room.players.map(p => ({ id: p.id, name: p.name, boardReady: p.boardReady, connected: p.connected })),
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
