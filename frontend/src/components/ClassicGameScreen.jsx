import { useState, useRef } from 'react';
import socket from '../socket';
import { checkWinClassic } from '../utils/gameLogic';
import { FaBullseye, FaHourglassHalf } from 'react-icons/fa6';

export default function ClassicGameScreen({ room, board, calledNumbers, currentNumber, turnPlayerId, turnPlayerName }) {
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
                    ? <><FaBullseye /> Your turn! Tap a number on your board to call it.</>
                    : <><FaHourglassHalf /> {turnPlayerName}'s turn to call…</>}
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
