import socket from '../socket';
import { getAvatarColor } from '../utils/gameLogic';
import {
    FaTrash, FaCheck, FaXmark, FaTableCells, FaCircleCheck, FaGamepad
} from 'react-icons/fa6';

export default function LobbyScreen({ room, playerName, onSetupBoard }) {
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
                    Mode: <span className="mode-badge">{room.mode === 'classic' ? <>Classic</> : <>Random</>}</span>
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
                                                <FaTrash /> Remove
                                            </button>
                                        )}
                                    </>
                                )}
                                {p.connected && room.mode === 'classic' && (
                                    <span className={`ready-badge ${p.boardReady ? 'ready' : 'not-ready'}`}>
                                        {p.boardReady ? <><FaCheck /> Ready</> : <><FaXmark /> Setting up</>}
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
                        <FaTableCells /> Set Up Your Board
                    </button>
                )}

                {room.mode === 'classic' && me && me.boardReady && (
                    <div className="setup-submitted">
                        <FaCircleCheck style={{ color: 'var(--success)', marginRight: '8px' }} />
                        Your board is ready!
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
                                : <><FaGamepad /> Start Game</>}
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
