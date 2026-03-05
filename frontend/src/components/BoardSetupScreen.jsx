import { useState } from 'react';
import socket from '../socket';
import { FaTrash, FaRotateLeft, FaCheck, FaCircleCheck } from 'react-icons/fa6';

export default function BoardSetupScreen({ room, onBoardReady }) {
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
                        <button className="btn btn-outline" onClick={handleClear}><FaTrash /> Clear</button>
                        <button className="btn btn-outline" onClick={handleUndo} disabled={nextNumber <= 1}><FaRotateLeft /> Undo</button>
                        <button
                            className="btn btn-success"
                            onClick={handleSubmit}
                            disabled={nextNumber <= maxNumber}
                        >
                            <FaCheck /> Ready
                        </button>
                    </div>
                )}

                {submitted && (
                    <div className="setup-submitted">
                        <FaCircleCheck style={{ color: 'var(--success)', marginRight: '8px' }} />
                        Board submitted! Waiting for other players…<span className="waiting-dots"></span>
                    </div>
                )}

                {error && <div className="error-msg">{error}</div>}
            </div>
        </div>
    );
}
