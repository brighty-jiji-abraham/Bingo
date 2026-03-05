/**
 * Author: Brighy Jiji Abraham
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import socket from './socket';

/* ── Helpers ──────────────────────────────────────────────── */

const LETTERS = ['B', 'I', 'N', 'G', 'O'];
const AVATAR_COLORS = [
    '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getLetterForNumber(num) {
    if (num <= 15) return 'B';
    if (num <= 30) return 'I';
    if (num <= 45) return 'N';
    if (num <= 60) return 'G';
    return 'O';
}

function checkWin(board, markedCells) {
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

function checkWinClassic(board, calledNumbers) {
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

    // Win if total completed lines >= 5
    return completedLines >= 5;
}

/* ── Confetti Component ──────────────────────────────────── */

function Confetti() {
    const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#fbbf24', '#14b8a6'];
    const pieces = Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 2 + Math.random() * 3,
        color: colors[i % colors.length],
        size: 6 + Math.random() * 8,
        rotation: Math.random() * 360,
    }));

    return (
        <>
            {pieces.map(p => (
                <div
                    key={p.id}
                    className="confetti-piece"
                    style={{
                        left: `${p.left}%`,
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        backgroundColor: p.color,
                        animationDelay: `${p.delay}s`,
                        animationDuration: `${p.duration}s`,
                        transform: `rotate(${p.rotation}deg)`,
                        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                    }}
                />
            ))}
        </>
    );
}

/* ── Home Screen ─────────────────────────────────────────── */

function HomeScreen({ onJoin, onError, error, savedSession, onRejoin, onDismissSession }) {
    const [name, setName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [mode, setMode] = useState(null); // 'create' | 'join'
    const [gameMode, setGameMode] = useState('random'); // 'random' | 'classic'
    const [boardSize, setBoardSize] = useState(5); // 5 to 10

    const handleCreate = () => {
        if (!name.trim()) return onError('Enter your name');
        const code = Math.random().toString(36).substring(2, 6).toUpperCase();
        socket.emit('create-room', { roomCode: code, playerName: name.trim(), mode: gameMode, size: boardSize }, (res) => {
            if (res.success) onJoin(code, name.trim(), gameMode);
            else onError(res.message);
        });
    };

    const handleJoin = () => {
        if (!name.trim()) return onError('Enter your name');
        if (!roomCode.trim()) return onError('Enter room code');
        socket.emit('join-room', { roomCode: roomCode.trim().toUpperCase(), playerName: name.trim() }, (res) => {
            if (res.success) onJoin(roomCode.trim().toUpperCase(), name.trim(), null);
            else onError(res.message);
        });
    };

    return (
        <div className="home">
            <div className="home-logo">BINGO</div>
            <p className="home-subtitle">Create a room and invite your friends for a real-time multiplayer Bingo game!</p>

            {savedSession && (
                <div className="rejoin-banner glass">
                    <div className="rejoin-banner-text">
                        <i className="fa-solid fa-rotate"></i>
                        <div>
                            <strong>Rejoin previous game?</strong>
                            <p>Room <span className="rejoin-code">{savedSession.roomCode}</span> as <em>{savedSession.playerName}</em></p>
                        </div>
                    </div>
                    <div className="rejoin-banner-actions">
                        <button className="btn btn-primary" onClick={onRejoin} id="btn-rejoin">Rejoin</button>
                        <button className="btn btn-outline" onClick={onDismissSession}>Dismiss</button>
                    </div>
                </div>
            )}

            <div className="home-card glass">
                <div className="input-group">
                    <span className="input-icon"><i className="fa-solid fa-user"></i></span>
                    <input
                        className="input input-with-icon"
                        placeholder="Your name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        maxLength={20}
                        id="input-name"
                    />
                </div>

                {!mode && (
                    <>
                        {/* Mode Cards */}
                        <div className="mode-cards">
                            <div
                                className={`mode-card ${gameMode === 'random' ? 'active' : ''}`}
                                onClick={() => setGameMode('random')}
                                id="btn-mode-random"
                            >
                                <div className="mode-card-icon"><i className="fa-solid fa-dice"></i></div>
                                <div className="mode-card-content">
                                    <div className="mode-card-title">Random</div>
                                    <div className="mode-card-desc">Auto-generated boards, numbers drawn every 4s</div>
                                </div>
                                <div className="mode-card-check">{gameMode === 'random' ? '✓' : ''}</div>
                            </div>
                            <div
                                className={`mode-card ${gameMode === 'classic' ? 'active' : ''}`}
                                onClick={() => setGameMode('classic')}
                                id="btn-mode-classic"
                            >
                                <div className="mode-card-icon"><i className="fa-solid fa-pencil"></i></div>
                                <div className="mode-card-content">
                                    <div className="mode-card-title">Classic</div>
                                    <div className="mode-card-desc">Place your own numbers, take turns calling</div>
                                </div>
                                <div className="mode-card-check">{gameMode === 'classic' ? '✓' : ''}</div>
                            </div>
                        </div>

                        {/* Size Chips */}
                        <div className="size-picker">
                            <label className="size-picker-label">Board Size</label>
                            <div className="size-chips">
                                {[5, 6, 7, 8, 9, 10].map(s => (
                                    <button
                                        key={s}
                                        className={`size-chip ${boardSize === s ? 'active' : ''}`}
                                        onClick={() => setBoardSize(s)}
                                    >
                                        {s}×{s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="home-actions">
                            <button className="btn btn-primary btn-action" onClick={() => setMode('create')} id="btn-create-mode">
                                <span className="btn-action-icon"><i className="fa-solid fa-wand-magic-sparkles"></i></span>
                                <span className="btn-action-text">
                                    <strong>Create Room</strong>
                                    <small>Host a new game</small>
                                </span>
                            </button>
                            <button className="btn btn-outline btn-action" onClick={() => setMode('join')} id="btn-join-mode">
                                <span className="btn-action-icon"><i className="fa-solid fa-link"></i></span>
                                <span className="btn-action-text">
                                    <strong>Join Room</strong>
                                    <small>Enter a room code</small>
                                </span>
                            </button>
                        </div>
                    </>
                )}

                {mode === 'create' && (
                    <>
                        <div className="mode-badge-display">
                            Mode: <span className="mode-badge">{gameMode === 'classic' ? <><i className="fa-solid fa-pencil"></i> Classic</> : <><i className="fa-solid fa-dice"></i> Random</>}</span>
                            &nbsp;·&nbsp;
                            <span className="mode-badge">{boardSize}×{boardSize}</span>
                        </div>
                        <button className="btn btn-primary" onClick={handleCreate} id="btn-create-room">
                            <i className="fa-solid fa-wand-magic-sparkles"></i> Create New Game
                        </button>
                        <button className="btn btn-outline" onClick={() => setMode(null)}><i className="fa-solid fa-arrow-left"></i> Back</button>
                    </>
                )}

                {mode === 'join' && (
                    <>
                        <div className="input-group">
                            <span className="input-icon"><i className="fa-solid fa-key"></i></span>
                            <input
                                className="input input-with-icon"
                                placeholder="Room code (e.g. AB3F)"
                                value={roomCode}
                                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                                maxLength={6}
                                id="input-room-code"
                            />
                        </div>
                        <button className="btn btn-success" onClick={handleJoin} id="btn-join-room">
                            <i className="fa-solid fa-rocket"></i> Join Game
                        </button>
                        <button className="btn btn-outline" onClick={() => setMode(null)}><i className="fa-solid fa-arrow-left"></i> Back</button>
                    </>
                )}

                {error && <div className="error-msg">{error}</div>}
            </div>
        </div>
    );
}

/* ── Lobby Screen ────────────────────────────────────────── */

function LobbyScreen({ room, playerName, onSetupBoard }) {
    const isHost = room.host === socket.id;
    const me = room.players.find(p => p.id === socket.id);

    const handleStart = () => {
        socket.emit('start-game', { roomCode: room.code }, (res) => {
            if (!res.success) alert(res.message);
        });
    };

    const connectedPlayers = room.players.filter(p => p.connected);
    const allReady = connectedPlayers.length > 0 &&
        (room.mode !== 'classic' || connectedPlayers.every(p => p.boardReady));

    const handleKick = (playerName) => {
        if (!window.confirm(`Remove ${playerName} from the room?`)) return;
        socket.emit('kick-player', { roomCode: room.code, playerName }, (res) => {
            if (!res.success) alert(res.message);
        });
    };

    return (
        <div className="lobby">
            <div className="lobby-card glass">
                <h2>Game Lobby</h2>
                <div className="room-code-display" id="room-code">{room.code}</div>
                <div className="mode-badge-display">
                    Mode: <span className="mode-badge">{room.mode === 'classic' ? '✏️ Classic' : '🎲 Random'}</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Share this code with friends to join
                </p>

                <div>
                    <h3 style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>
                        Players ({room.players.length})
                    </h3>
                    <ul className="player-list">
                        {room.players.map((p) => (
                            <li className={`player-item${!p.connected ? ' disconnected-player' : ''}`} key={p.name}>
                                <div
                                    className="player-avatar"
                                    style={{
                                        backgroundColor: p.connected ? getAvatarColor(p.name) : '#374151',
                                        opacity: p.connected ? 1 : 0.5
                                    }}
                                >
                                    {p.name[0].toUpperCase()}
                                </div>
                                <span style={{ opacity: p.connected ? 1 : 0.5 }}>{p.name}</span>
                                {p.id === room.host && <span className="host-badge">HOST</span>}
                                {!p.connected && (
                                    <>
                                        <span className="disconnected-badge">Reconnecting…</span>
                                        {isHost && p.id !== socket.id && (
                                            <button
                                                className="kick-btn"
                                                onClick={() => handleKick(p.name)}
                                                title={`Remove ${p.name}`}
                                            >
                                                🗑️ Remove
                                            </button>
                                        )}
                                    </>
                                )}
                                {p.connected && room.mode === 'classic' && (
                                    <span className={`ready-badge ${p.boardReady ? 'ready' : 'not-ready'}`}>
                                        {p.boardReady ? '✓ Ready' : '✗ Setting up'}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Classic mode: show setup board button if player hasn't set up */}
                {room.mode === 'classic' && me && !me.boardReady && (
                    <button
                        className="btn btn-success"
                        onClick={onSetupBoard}
                        id="btn-setup-board"
                    >
                        ✏️ Set Up Your Board
                    </button>
                )}

                {room.mode === 'classic' && me && me.boardReady && (
                    <div className="setup-submitted">
                        ✅ Your board is ready!
                    </div>
                )}

                {isHost ? (
                    <button
                        className="btn btn-primary"
                        onClick={handleStart}
                        disabled={room.players.length < 2 || (room.mode === 'classic' && !allReady)}
                        id="btn-start-game"
                    >
                        {room.players.length < 2
                            ? 'Waiting for players…'
                            : room.mode === 'classic' && !allReady
                                ? 'Waiting for boards…'
                                : '🎮 Start Game'}
                    </button>
                ) : (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Waiting for host to start<span className="waiting-dots"></span>
                    </p>
                )}
            </div>
        </div>
    );
}

/* ── Board Setup Screen (Classic Mode) ───────────────────── */

function BoardSetupScreen({ room, onBoardReady }) {
    const size = room.size || 5;
    const maxNumber = size * size;
    const [board, setBoard] = useState(Array.from({ length: size }, () => Array(size).fill(null)));
    const [nextNumber, setNextNumber] = useState(1);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleCellClick = (r, c) => {
        if (submitted) return;

        // If cell is already filled, allow removing it (undo)
        if (board[r][c] !== null) {
            const removedVal = board[r][c];
            setBoard(prev => {
                const next = prev.map(row => [...row]);
                // Remove this cell's number and shift down any numbers placed after it
                const removed = next[r][c];
                next[r][c] = null;
                // Decrement all numbers greater than the removed one
                for (let ri = 0; ri < size; ri++) {
                    for (let ci = 0; ci < size; ci++) {
                        if (next[ri][ci] !== null && next[ri][ci] > removed) {
                            next[ri][ci] = next[ri][ci] - 1;
                        }
                    }
                }
                return next;
            });
            setNextNumber(prev => prev - 1);
            return;
        }

        // Place number on empty cell
        if (nextNumber > maxNumber) return;
        setBoard(prev => {
            const next = prev.map(row => [...row]);
            next[r][c] = nextNumber;
            return next;
        });
        setNextNumber(prev => prev + 1);
    };

    const handleUndo = () => {
        if (nextNumber <= 1) return;
        const lastPlaced = nextNumber - 1;
        setBoard(prev => {
            const next = prev.map(row => [...row]);
            for (let ri = 0; ri < size; ri++) {
                for (let ci = 0; ci < size; ci++) {
                    if (next[ri][ci] === lastPlaced) {
                        next[ri][ci] = null;
                        return next;
                    }
                }
            }
            return prev;
        });
        setNextNumber(prev => prev - 1);
    };

    const handleClear = () => {
        setBoard(Array.from({ length: size }, () => Array(size).fill(null)));
        setNextNumber(1);
        setError('');
    };

    const handleSubmit = () => {
        const allFilled = board.every(row => row.every(cell => cell !== null));
        if (!allFilled) {
            setError(`Place all ${maxNumber} numbers on the board first!`);
            return;
        }
        socket.emit('set-board', { roomCode: room.code, board }, (res) => {
            if (res.success) {
                setSubmitted(true);
                setError('');
                onBoardReady();
            } else {
                setError(res.message);
            }
        });
    };

    return (
        <div className="board-setup">
            <div className="board-setup-card glass">
                <h2>Set Up Your Board</h2>
                <p className="setup-instruction">
                    Click cells to place numbers 1–{maxNumber}. Click a placed number to remove it.
                </p>

                {!submitted && (
                    <div className="setup-progress">
                        {nextNumber <= maxNumber ? (
                            <span>Placing: <strong className="next-number-badge">{nextNumber}</strong></span>
                        ) : (
                            <span className="setup-complete-text">✓ All numbers placed!</span>
                        )}
                    </div>
                )}

                <div className="board-grid" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
                    {board.map((row, r) =>
                        row.map((val, c) => (
                            <div
                                key={`${r}-${c}`}
                                className={`board-cell setup-cell${val !== null ? ' filled' : ''}${submitted ? ' locked' : ''}`}
                                onClick={() => handleCellClick(r, c)}
                                id={`setup-cell-${r}-${c}`}
                                style={{ fontSize: size >= 8 ? '0.85rem' : size >= 6 ? '1rem' : undefined }}
                            >
                                {val !== null ? val : ''}
                            </div>
                        ))
                    )}
                </div>

                {!submitted && (
                    <div className="setup-actions">
                        <button className="btn btn-outline" onClick={handleClear}>🗑️ Clear</button>
                        <button className="btn btn-outline" onClick={handleUndo} disabled={nextNumber <= 1}>↩️ Undo</button>
                        <button
                            className="btn btn-success"
                            onClick={handleSubmit}
                            disabled={nextNumber <= maxNumber}
                        >
                            ✅ Ready
                        </button>
                    </div>
                )}

                {submitted && (
                    <div className="setup-submitted">
                        ✅ Board submitted! Waiting for other players…<span className="waiting-dots"></span>
                    </div>
                )}

                {error && <div className="error-msg">{error}</div>}
            </div>
        </div>
    );
}

/* ── Random Game Screen ──────────────────────────────────── */

function GameScreen({ room, board, drawnNumbers, currentNumber, initialMarked }) {
    const [markedCells, setMarkedCells] = useState(() => {
        const s = new Set(initialMarked || []);
        s.add('FREE');
        return s;
    });
    const [bingoFeedback, setBingoFeedback] = useState(null);
    const feedbackTimer = useRef(null);

    const handleMark = useCallback((row, col) => {
        const val = board[row][col];
        if (val === 'FREE') return;
        if (!drawnNumbers.includes(val)) return;

        setMarkedCells(prev => {
            const next = new Set(prev);
            if (next.has(val)) {
                next.delete(val);
                socket.emit('unmark-number', { roomCode: room.code, number: val });
            } else {
                next.add(val);
                socket.emit('mark-number', { roomCode: room.code, number: val });
            }
            return next;
        });
    }, [board, drawnNumbers, room.code]);

    const handleBingo = () => {
        if (!checkWin(board, markedCells)) {
            setBingoFeedback({ type: 'error', message: "You don't have a valid BINGO yet!" });
            if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
            feedbackTimer.current = setTimeout(() => setBingoFeedback(null), 3000);
            return;
        }
        socket.emit('call-bingo', { roomCode: room.code }, (res) => {
            setBingoFeedback({ type: res.success ? 'success' : 'error', message: res.message });
            if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
            feedbackTimer.current = setTimeout(() => setBingoFeedback(null), 3000);
        });
    };

    return (
        <div className="game">
            <div className="game-header">
                <div className="game-logo">BINGO</div>
                <div className="current-number">
                    <span className="current-number-label">Current</span>
                    {currentNumber ? (
                        <div className="current-number-ball" key={currentNumber}>
                            {getLetterForNumber(currentNumber)}{currentNumber}
                        </div>
                    ) : (
                        <div className="current-number-ball empty">?</div>
                    )}
                </div>
                <div className="bingo-area">
                    <button className="btn btn-gold" onClick={handleBingo} id="btn-call-bingo">
                        BINGO!
                    </button>
                    {bingoFeedback && (
                        <div className={`bingo-feedback ${bingoFeedback.type}`}>
                            {bingoFeedback.message}
                        </div>
                    )}
                </div>
            </div>

            <div className="board-container">
                <div className="board-header" style={{ gridTemplateColumns: `repeat(${board.length}, 1fr)` }}>
                    {Array.from({ length: board.length }).map((_, i) => (
                        <div key={i} className="board-header-cell" style={{ fontSize: board.length >= 8 ? '0.85rem' : board.length >= 6 ? '1.1rem' : undefined }}>{i < 5 ? LETTERS[i] : '*'}</div>
                    ))}
                </div>
                <div className="board-grid" style={{ gridTemplateColumns: `repeat(${board.length}, 1fr)` }}>
                    {board.map((row, r) =>
                        row.map((val, c) => {
                            const isFree = val === 'FREE';
                            const isMarked = markedCells.has(val);
                            const isDrawn = isFree || drawnNumbers.includes(val);
                            return (
                                <div
                                    key={`${r}-${c}`}
                                    className={`board-cell${isFree ? ' free' : ''}${isMarked && !isFree ? ' marked' : ''}${isDrawn && !isMarked && !isFree ? ' callable' : ''}`}
                                    onClick={() => handleMark(r, c)}
                                    id={`cell-${r}-${c}`}
                                    style={{ fontSize: board.length >= 8 ? '0.85rem' : board.length >= 6 ? '1rem' : undefined }}
                                >
                                    {isFree ? 'FREE' : val}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="drawn-numbers">
                <h3>Called Numbers ({drawnNumbers.length})</h3>
                <div className="drawn-numbers-grid">
                    {drawnNumbers.map((num, i) => (
                        <div
                            key={num}
                            className={`drawn-chip${i === drawnNumbers.length - 1 ? ' latest' : ''}`}
                        >
                            {num}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ── Classic Game Screen ─────────────────────────────────── */

function ClassicGameScreen({ room, board, calledNumbers, currentNumber, turnPlayerId, turnPlayerName }) {
    const [bingoFeedback, setBingoFeedback] = useState(null);
    const [callError, setCallError] = useState('');
    const feedbackTimer = useRef(null);
    const calledSet = new Set(calledNumbers);

    const isMyTurn = turnPlayerId === socket.id;

    const handleCallNumber = (number) => {
        if (!isMyTurn) return;
        if (calledSet.has(number)) return;
        socket.emit('call-number', { roomCode: room.code, number }, (res) => {
            if (!res.success) {
                setCallError(res.message);
                setTimeout(() => setCallError(''), 2000);
            }
        });
    };

    const handleBingo = () => {
        if (!checkWinClassic(board, calledNumbers)) {
            setBingoFeedback({ type: 'error', message: "You don't have a valid BINGO yet!" });
            if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
            feedbackTimer.current = setTimeout(() => setBingoFeedback(null), 3000);
            return;
        }
        socket.emit('call-bingo', { roomCode: room.code }, (res) => {
            setBingoFeedback({ type: res.success ? 'success' : 'error', message: res.message });
            if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
            feedbackTimer.current = setTimeout(() => setBingoFeedback(null), 3000);
        });
    };

    return (
        <div className="game classic-game">
            {/* Turn indicator */}
            <div className={`turn-banner ${isMyTurn ? 'my-turn' : ''}`}>
                {isMyTurn
                    ? "🎯 Your turn! Tap a number on your board to call it."
                    : `⏳ ${turnPlayerName}'s turn to call…`}
            </div>

            <div className="game-header">
                <div className="game-logo">CLASSIC</div>
                <div className="current-number">
                    <span className="current-number-label">Last Called</span>
                    {currentNumber ? (
                        <div className="current-number-ball" key={currentNumber}>
                            {currentNumber}
                        </div>
                    ) : (
                        <div className="current-number-ball empty">?</div>
                    )}
                </div>
                <div className="bingo-area">
                    <button className="btn btn-gold" onClick={handleBingo} id="btn-call-bingo-classic">
                        BINGO!
                    </button>
                    {bingoFeedback && (
                        <div className={`bingo-feedback ${bingoFeedback.type}`}>
                            {bingoFeedback.message}
                        </div>
                    )}
                </div>
            </div>

            {/* Player's board - click to call */}
            {(() => {
                const completedLines = [];
                const isMarked = (val) => calledSet.has(val);
                const size = board.length;

                // Check rows
                for (let r = 0; r < size; r++) {
                    if (board[r].every(isMarked)) completedLines.push({ type: 'row', index: r });
                }
                // Check columns
                for (let c = 0; c < size; c++) {
                    let complete = true;
                    for (let r = 0; r < size; r++) {
                        if (!isMarked(board[r][c])) { complete = false; break; }
                    }
                    if (complete) completedLines.push({ type: 'col', index: c });
                }
                // Check diagonals
                let d1 = true, d2 = true;
                for (let i = 0; i < size; i++) {
                    if (!isMarked(board[i][i])) d1 = false;
                    if (!isMarked(board[i][size - 1 - i])) d2 = false;
                }
                if (d1) completedLines.push({ type: 'diag', index: 0 });
                if (d2) completedLines.push({ type: 'diag', index: 1 });

                // SVG line coordinates (percentage-based)
                const step = 100 / size;
                const cellCenter = (i) => (step / 2) + i * step;

                const getLineCoords = (line) => {
                    if (line.type === 'row') {
                        const y = cellCenter(line.index);
                        return { x1: 2, y1: y, x2: 98, y2: y };
                    }
                    if (line.type === 'col') {
                        const x = cellCenter(line.index);
                        return { x1: x, y1: 2, x2: x, y2: 98 };
                    }
                    if (line.type === 'diag' && line.index === 0) {
                        return { x1: 2, y1: 2, x2: 98, y2: 98 };
                    }
                    return { x1: 98, y1: 2, x2: 2, y2: 98 };
                };

                const lineColors = {
                    row: '#ef4444',
                    col: '#3b82f6',
                    diag: '#fbbf24',
                };

                return (
                    <div className="board-container">
                        {callError && <div className="error-msg call-error-toast">{callError}</div>}
                        <div className="board-grid-wrapper">
                            <div className="board-grid" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
                                {board.map((row, r) =>
                                    row.map((val, c) => {
                                        const isCalled = calledSet.has(val);
                                        const isCallable = isMyTurn && !isCalled;
                                        return (
                                            <div
                                                key={`${r}-${c}`}
                                                className={`board-cell${isCalled ? ' marked' : ''}${isCallable ? ' my-turn-cell' : ''}`}
                                                id={`classic-cell-${r}-${c}`}
                                                style={{ fontSize: size >= 8 ? '0.85rem' : size >= 6 ? '1rem' : undefined }}
                                                onClick={() => isCallable && handleCallNumber(val)}
                                                title={isCallable ? `Call ${val}` : ''}
                                            >
                                                {val}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            {completedLines.length > 0 && (
                                <svg className="line-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    {completedLines.map((line, i) => {
                                        const coords = getLineCoords(line);
                                        return (
                                            <line
                                                key={`${line.type}-${line.index}`}
                                                x1={coords.x1}
                                                y1={coords.y1}
                                                x2={coords.x2}
                                                y2={coords.y2}
                                                stroke={lineColors[line.type]}
                                                strokeWidth="1.8"
                                                strokeLinecap="round"
                                                className="strike-line"
                                                style={{ animationDelay: `${i * 0.15}s` }}
                                            />
                                        );
                                    })}
                                </svg>
                            )}
                        </div>
                    </div>
                );
            })()}



            {/* Called history */}
            <div className="drawn-numbers">
                <h3>Called Numbers ({calledNumbers.length})</h3>
                <div className="drawn-numbers-grid">
                    {calledNumbers.map((num, i) => (
                        <div
                            key={num}
                            className={`drawn-chip${i === calledNumbers.length - 1 ? ' latest' : ''}`}
                        >
                            {num}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ── Winner Overlay ──────────────────────────────────────── */

function WinnerOverlay({ winner, onPlayAgain }) {
    return (
        <div className="winner-overlay">
            <Confetti />
            <div className="winner-card glass">
                <div className="winner-emoji">🏆</div>
                <div className="winner-title">BINGO!</div>
                <div className="winner-name">{winner} wins the game!</div>
                <button className="btn btn-primary" onClick={onPlayAgain} id="btn-play-again">
                    🔄 Play Again
                </button>
            </div>
        </div>
    );
}

/* ── Paused Overlay ──────────────────────────────────────── */

function PausedOverlay() {
    return (
        <div className="paused-overlay">
            <div className="paused-card glass">
                <div className="paused-icon">⏸️</div>
                <div className="paused-title">Game Paused</div>
                <div className="paused-text">Waiting for a player to reconnect...</div>
            </div>
        </div>
    );
}

/* ── Main App ────────────────────────────────────────────── */

export default function App() {
    const [screen, setScreen] = useState('home'); // home | lobby | setup | game | classicGame
    const screenRef = useRef('home'); // always-current screen value for socket callbacks
    useEffect(() => { screenRef.current = screen; }, [screen]);
    const [room, setRoom] = useState(null);
    const [playerName, setPlayerName] = useState('');
    const [gameMode, setGameMode] = useState('random');
    const [board, setBoard] = useState(null);
    const [drawnNumbers, setDrawnNumbers] = useState([]);
    const [currentNumber, setCurrentNumber] = useState(null);
    const [calledNumbers, setCalledNumbers] = useState([]);
    const [turnPlayerId, setTurnPlayerId] = useState(null);
    const [turnPlayerName, setTurnPlayerName] = useState('');
    const [winner, setWinner] = useState(null);
    const [error, setError] = useState('');
    const [savedSession, setSavedSession] = useState(null);
    const [restoredMarked, setRestoredMarked] = useState([]);

    const handleJoinRoom = (code, name, mode) => {
        setPlayerName(name);
        if (mode) setGameMode(mode);
        setScreen('lobby');
        setError('');
        localStorage.setItem('bingo_session', JSON.stringify({ roomCode: code, playerName: name }));
    };

    const handleError = (msg) => setError(msg);

    const handleBoardReady = () => {
        // Board submitted, go back to lobby
        setScreen('lobby');
    };

    // ── Session persistence ───────────────────────────────────
    useEffect(() => {
        const saved = localStorage.getItem('bingo_session');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setSavedSession(parsed);
            } catch {
                localStorage.removeItem('bingo_session');
            }
        }
    }, []);

    const handleDismissSession = () => {
        localStorage.removeItem('bingo_session');
        setSavedSession(null);
    };

    const handleRejoin = () => {
        if (!savedSession) return;
        const { roomCode, playerName } = savedSession;
        socket.emit('rejoin-room', { roomCode, playerName }, (res) => {
            if (!res.success) {
                localStorage.removeItem('bingo_session');
                setSavedSession(null);
                setError(res.message);
                return;
            }
            const { room: roomData, board: boardData, marked: markedData } = res;
            setRoom(roomData);
            setPlayerName(playerName);
            setGameMode(roomData.mode);
            setSavedSession(null);
            if (boardData) setBoard(boardData);
            if (markedData) setRestoredMarked(markedData);
            if (roomData.status === 'waiting') {
                setScreen('lobby');
            } else if (roomData.status === 'playing' || roomData.status === 'paused') {
                if (roomData.mode === 'classic') {
                    setCalledNumbers(roomData.calledNumbers || []);
                    setCurrentNumber(roomData.currentNumber);
                    const turnPlayer = roomData.players[roomData.turnIndex];
                    if (turnPlayer) {
                        setTurnPlayerId(turnPlayer.id);
                        setTurnPlayerName(turnPlayer.name);
                    }
                    setScreen('classicGame');
                } else {
                    setDrawnNumbers(roomData.drawnNumbers || []);
                    setCurrentNumber(roomData.currentNumber);
                    setScreen('game');
                }
            }
        });
    };

    useEffect(() => {
        socket.on('room-update', (data) => {
            setRoom(data);
            if (data.mode) setGameMode(data.mode);

            if (data.status === 'waiting' && screenRef.current !== 'home' && screenRef.current !== 'setup') {
                setScreen('lobby');
                setBoard(null);
                setDrawnNumbers([]);
                setCurrentNumber(null);
                setCalledNumbers([]);
                setWinner(null);
            }
            if (data.status === 'playing' || data.status === 'paused') {
                if (data.mode === 'classic') {
                    setScreen('classicGame');
                    setCalledNumbers(data.calledNumbers || []);
                    setCurrentNumber(data.currentNumber);
                } else if (screenRef.current === 'lobby') {
                    setScreen('game');
                    setDrawnNumbers(data.drawnNumbers || []);
                    setCurrentNumber(data.currentNumber);
                }
            }
        });

        socket.on('your-board', (boardData) => {
            setBoard(boardData);
        });

        socket.on('number-drawn', (data) => {
            setDrawnNumbers(data.drawnNumbers);
            setCurrentNumber(data.number);
        });

        socket.on('classic-number-called', (data) => {
            setCalledNumbers(data.calledNumbers);
            setCurrentNumber(data.number);
        });

        socket.on('turn-update', (data) => {
            setTurnPlayerId(data.turnPlayerId);
            setTurnPlayerName(data.turnPlayerName);
        });

        socket.on('game-over', (data) => {
            setWinner(data.winner);
        });

        socket.on('force-kicked', ({ roomCode }) => {
            // Clear saved session so rejoin prompt doesn't appear
            localStorage.removeItem('bingo_session');
            setSavedSession(null);
            setRoom(null);
            setBoard(null);
            setScreen('home');
            setError(`You were removed from room ${roomCode}.`);
        });

        return () => {
            socket.off('room-update');
            socket.off('your-board');
            socket.off('number-drawn');
            socket.off('classic-number-called');
            socket.off('turn-update');
            socket.off('game-over');
            socket.off('force-kicked');
        };
    }, [screen]);

    const handlePlayAgain = () => {
        localStorage.removeItem('bingo_session');
        setSavedSession(null);
        if (room) {
            socket.emit('play-again', { roomCode: room.code });
        }
        setWinner(null);
    };

    return (
        <>
            {screen === 'home' && (
                <HomeScreen
                    onJoin={handleJoinRoom}
                    onError={handleError}
                    error={error}
                    savedSession={savedSession}
                    onRejoin={handleRejoin}
                    onDismissSession={handleDismissSession}
                />
            )}
            {screen === 'lobby' && room && (
                <LobbyScreen room={room} playerName={playerName} onSetupBoard={() => setScreen('setup')} />
            )}
            {screen === 'setup' && room && (
                <BoardSetupScreen room={room} onBoardReady={handleBoardReady} />
            )}
            {screen === 'game' && board && room && (
                <GameScreen
                    room={room}
                    board={board}
                    drawnNumbers={drawnNumbers}
                    currentNumber={currentNumber}
                    initialMarked={restoredMarked}
                />
            )}
            {screen === 'classicGame' && board && room && (
                <ClassicGameScreen
                    room={room}
                    board={board}
                    calledNumbers={calledNumbers}
                    currentNumber={currentNumber}
                    turnPlayerId={turnPlayerId}
                    turnPlayerName={turnPlayerName}
                />
            )}
            {room && room.status === 'paused' && (
                <PausedOverlay />
            )}
            {winner && (
                <WinnerOverlay winner={winner} onPlayAgain={handlePlayAgain} />
            )}
        </>
    );
}
