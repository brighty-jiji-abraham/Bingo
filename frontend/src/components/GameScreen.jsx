import { useState, useCallback, useRef } from 'react';
import socket from '../socket';
import { checkWin, LETTERS, getLetterForNumber } from '../utils/gameLogic';

export default function GameScreen({ room, board, drawnNumbers, currentNumber, initialMarked }) {
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
            setBingoFeedback({ type: res.success ? 'success' : 'message', message: res.message });
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
