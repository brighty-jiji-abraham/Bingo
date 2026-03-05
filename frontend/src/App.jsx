/**
 * Author: Brighy Jiji Abraham
 */
import { useState, useEffect, useRef } from 'react';
import socket from './socket';

/* ── Components ───────────────────────────────────────────── */
import HomeScreen from './components/HomeScreen';
import LobbyScreen from './components/LobbyScreen';
import BoardSetupScreen from './components/BoardSetupScreen';
import GameScreen from './components/GameScreen';
import ClassicGameScreen from './components/ClassicGameScreen';
import { PausedOverlay, WinnerOverlay } from './components/Overlays';

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
