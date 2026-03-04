import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';

export default function Home({ isConnected }) {
    const [displayName, setDisplayName] = useState('');
    const [roomId, setRoomId] = useState('');
    const navigate = useNavigate();

    const handleJoinOrCreate = (e) => {
        e.preventDefault();
        if (!displayName || !roomId) return;

        socket.emit('join_room', { roomId, displayName });
        navigate(`/room/${roomId}`);
    };

    return (
        <div className="glass-panel auth-container">
            <h1>Bingo</h1>
            <p style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                {isConnected ? '🟢 Server Connected' : '🔴 Server Disconnected'}
            </p>

            <form onSubmit={handleJoinOrCreate}>
                <div className="input-group">
                    <label htmlFor="displayName">Display Name</label>
                    <input
                        id="displayName"
                        type="text"
                        placeholder="Enter your name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                    />
                </div>

                <div className="input-group">
                    <label htmlFor="roomId">Room Code</label>
                    <input
                        id="roomId"
                        type="text"
                        placeholder="Enter a room code"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        required
                        maxLength={10}
                        style={{ textTransform: 'uppercase' }}
                    />
                </div>

                <button type="submit" className="primary" style={{ width: '100%' }} disabled={!isConnected || !displayName || !roomId}>
                    Join Game
                </button>
            </form>
        </div>
    );
}
