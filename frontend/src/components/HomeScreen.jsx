import { useState } from 'react';
import socket from '../socket';
import {
    FaRotate, FaUser, FaDice, FaPencil, FaWandMagicSparkles, FaLink,
    FaKey, FaRocket, FaArrowLeft
} from 'react-icons/fa6';

export default function HomeScreen({ onJoin, onError, error, savedSession, onRejoin, onDismissSession }) {
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
                        <FaRotate />
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
                    <span className="input-icon"><FaUser /></span>
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
                                <div className="mode-card-icon"><FaDice /></div>
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
                                <div className="mode-card-icon"><FaPencil /></div>
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
                                <span className="btn-action-icon"><FaWandMagicSparkles /></span>
                                <span className="btn-action-text">
                                    <strong>Create Room</strong>
                                    <small>Host a new game</small>
                                </span>
                            </button>
                            <button className="btn btn-outline btn-action" onClick={() => setMode('join')} id="btn-join-mode">
                                <span className="btn-action-icon"><FaLink /></span>
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
                            Mode: <span className="mode-badge">{gameMode === 'classic' ? <><FaPencil /> Classic</> : <><FaDice /> Random</>}</span>
                            &nbsp;·&nbsp;
                            <span className="mode-badge">{boardSize}×{boardSize}</span>
                        </div>
                        <button className="btn btn-primary" onClick={handleCreate} id="btn-create-room">
                            <FaWandMagicSparkles /> Create New Game
                        </button>
                        <button className="btn btn-outline" onClick={() => setMode(null)}><FaArrowLeft /> Back</button>
                    </>
                )}

                {mode === 'join' && (
                    <>
                        <div className="input-group">
                            <span className="input-icon"><FaKey /></span>
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
                            <FaRocket /> Join Game
                        </button>
                        <button className="btn btn-outline" onClick={() => setMode(null)}><FaArrowLeft /> Back</button>
                    </>
                )}

                {error && <div className="error-msg">{error}</div>}
            </div>
        </div>
    );
}
