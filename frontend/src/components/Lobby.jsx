import { socket } from '../socket';
import { Users, Crown, Play } from 'lucide-react';

export default function Lobby({ roomData }) {
    if (!roomData) return null;

    const { roomId, players, hostId } = roomData;
    const isHost = socket.id === hostId;

    const handleStartGame = () => {
        socket.emit('start_game', roomId);
    };

    return (
        <div className="glass-panel lobby-container">
            <h1>Room: {roomId}</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Waiting for the host to start the game...</p>

            <div className="players-list">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Users size={20} /> Players ({players.length})
                </h3>
                {players.map(p => (
                    <div key={p.id} className="player-item">
                        <span style={{ fontWeight: 600 }}>{p.displayName} {p.id === socket.id ? '(You)' : ''}</span>
                        {p.id === hostId && (
                            <span style={{ color: 'gold', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                                <Crown size={16} /> Host
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {isHost ? (
                <button className="primary" onClick={handleStartGame} style={{ width: '100%', marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                    <Play size={20} /> Start Game
                </button>
            ) : (
                <p style={{ marginTop: '2rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                    Only the host can start the game.
                </p>
            )}
        </div>
    );
}
