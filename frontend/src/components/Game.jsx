import { useState, useEffect } from 'react';
import { socket } from '../socket';
import { Trophy, RefreshCcw } from 'lucide-react';

export default function Game({ roomData, board }) {
    const [markedCells, setMarkedCells] = useState(new Set());

    if (!roomData || !board) return null;

    const { roomId, drawnNumbers, state, winner } = roomData;
    const currentNumber = drawnNumbers.length > 0 ? drawnNumbers[drawnNumbers.length - 1] : null;

    // Auto-mark FREE space
    useEffect(() => {
        const newMarked = new Set(markedCells);
        newMarked.add('FREE');
        setMarkedCells(newMarked);
    }, []);

    const toggleMark = (val) => {
        if (val === 'FREE') return;
        const newMarked = new Set(markedCells);
        if (newMarked.has(val)) {
            newMarked.delete(val);
        } else {
            newMarked.add(val);
        }
        setMarkedCells(newMarked);
    };

    const handleCallBingo = () => {
        socket.emit('call_bingo', { roomId, board });
    };

    const headers = ['B', 'I', 'N', 'G', 'O'];

    return (
        <div className="game-container">
            {state === 'finished' && (
                <div className="winner-overlay">
                    <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem', maxWidth: '400px' }}>
                        <Trophy size={64} color="gold" style={{ marginBottom: '1rem' }} />
                        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>BINGO!</h1>
                        <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
                            <strong>{winner}</strong> has won the game!
                        </p>
                        <button className="primary" onClick={() => window.location.href = '/'}>
                            <RefreshCcw size={18} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                            Play Again
                        </button>
                    </div>
                </div>
            )}

            <div className="side-panel glass-panel">
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>Current Number</h2>
                    <div className="current-number">
                        {currentNumber ? currentNumber : '...'}
                    </div>
                </div>

                <div>
                    <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                        Caller History
                    </h3>
                    <div className="history-list">
                        {[...drawnNumbers].reverse().map((num, i) => (
                            <div key={i} className="history-item" style={i === 0 ? { background: 'var(--accent-color)', color: 'white' } : {}}>
                                {num}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="main-board glass-panel">
                <div className="board-header">
                    {headers.map(h => <div key={h}>{h}</div>)}
                </div>

                <div className="board-grid">
                    {board.map((row, rIdx) =>
                        row.map((cellVal, cIdx) => {
                            const isFree = cellVal === 'FREE';
                            const isMarked = markedCells.has(cellVal);
                            return (
                                <div
                                    key={`${rIdx}-${cIdx}`}
                                    className={`cell ${isMarked ? 'marked' : ''} ${isFree ? 'free' : ''}`}
                                    onClick={() => toggleMark(cellVal)}
                                >
                                    {cellVal}
                                </div>
                            );
                        })
                    )}
                </div>

                <button
                    className="success"
                    style={{ width: '100%', maxWidth: '500px', fontSize: '1.25rem', padding: '1rem' }}
                    onClick={handleCallBingo}
                    disabled={state === 'finished'}
                >
                    CALL BINGO
                </button>
            </div>
        </div>
    );
}
