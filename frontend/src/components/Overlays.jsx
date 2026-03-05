import { FaTrophy, FaRotateRight, FaPause } from 'react-icons/fa6';

/* ── Confetti Component ──────────────────────────────────── */

export function Confetti() {
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

/* ── Winner Overlay ──────────────────────────────────────── */

export function WinnerOverlay({ winner, onPlayAgain }) {
    return (
        <div className="winner-overlay">
            <Confetti />
            <div className="winner-card glass">
                <div className="winner-emoji"><FaTrophy /></div>
                <div className="winner-title">BINGO!</div>
                <div className="winner-name">{winner} wins the game!</div>
                <button className="btn btn-primary" onClick={onPlayAgain} id="btn-play-again">
                    <FaRotateRight /> Play Again
                </button>
            </div>
        </div>
    );
}

/* ── Paused Overlay ──────────────────────────────────────── */

export function PausedOverlay() {
    return (
        <div className="paused-overlay">
            <div className="paused-card glass">
                <div className="paused-icon"><FaPause /></div>
                <div className="paused-title">Game Paused</div>
                <div className="paused-text">Waiting for a player to reconnect...</div>
            </div>
        </div>
    );
}
