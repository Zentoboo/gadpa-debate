import React, { useState, useEffect, useRef } from "react";

export default function Timer({ initialDuration = 120 }) {
    const [duration, setDuration] = useState(initialDuration);
    const [currentTime, setCurrentTime] = useState(initialDuration);
    const [isRunning, setIsRunning] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState("");
    const intervalRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isRunning && currentTime > 0) {
            clearInterval(intervalRef.current);
            intervalRef.current = setInterval(() => {
                setCurrentTime(prevTime => prevTime - 1);
            }, 1000);
        } else if (currentTime === 0) {
            setIsRunning(false);
            clearInterval(intervalRef.current);
        }
        return () => clearInterval(intervalRef.current);
    }, [isRunning, currentTime]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            setEditValue(formatTime(currentTime));
        }
    }, [isEditing, currentTime]);

    const formatTime = (timeInSeconds) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = timeInSeconds % 60;
        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    };

    const parseTimeInput = (inputString) => {
        const parts = inputString.split(":");
        if (parts.length === 2) {
            const minutes = parseInt(parts[0], 10);
            const seconds = parseInt(parts[1], 10);
            if (!isNaN(minutes) && !isNaN(seconds) && minutes >= 0 && seconds >= 0 && seconds < 60) {
                return minutes * 60 + seconds;
            }
        } else if (parts.length === 1) {
            const minutes = parseInt(parts[0], 10);
            if (!isNaN(minutes) && minutes >= 0) {
                return minutes * 60;
            }
        }
        return null;
    };

    const handleDoubleClick = () => {
        // Prevent editing when timer is running
        if (!isRunning) {
            setIsEditing(true);
        }
    };

    const handleSaveEdit = () => {
        const newTimeInSeconds = parseTimeInput(editValue);
        if (newTimeInSeconds !== null) {
            setDuration(newTimeInSeconds);
            setCurrentTime(newTimeInSeconds);
            setIsRunning(false);
            clearInterval(intervalRef.current);
            setIsEditing(false);
        } else {
            alert("Please enter time in MM:SS or M format (e.g., 02:30 or 5).");
            setEditValue(formatTime(currentTime));
            inputRef.current.focus();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            handleSaveEdit();
        } else if (e.key === "Escape") {
            setIsEditing(false);
            setEditValue(formatTime(currentTime));
        }
    };

    const startTimer = () => {
        if (!isRunning && currentTime > 0) {
            setIsRunning(true);
            setIsEditing(false); // Exit edit mode when starting
        }
    };

    const pauseTimer = () => {
        setIsRunning(false);
        clearInterval(intervalRef.current);
    };

    const stopTimer = () => {
        setIsRunning(false);
        clearInterval(intervalRef.current);
        setCurrentTime(duration);
        setIsEditing(false);
    };

    const timerColorClass = currentTime <= 10 && currentTime > 0 ? "red-timer" : "";
    const timerFinishedClass = currentTime === 0 ? "finished-timer" : "";
    const runningClass = isRunning ? "running-timer" : "";

    return (
        <div className="timer-section">
            {isEditing ? (
                <input
                    ref={inputRef}
                    type="text"
                    className="timer-display editable-input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={handleKeyDown}
                />
            ) : (
                <div
                    className={`timer-display ${timerColorClass} ${timerFinishedClass} ${runningClass}`}
                    onDoubleClick={handleDoubleClick}
                    style={{
                        cursor: isRunning ? 'default' : 'pointer',
                        userSelect: isRunning ? 'none' : 'auto'
                    }}
                >
                    {formatTime(currentTime)}
                </div>
            )}

            <div className="timer-controls">
                {!isRunning && currentTime > 0 && (
                    <button onClick={startTimer} className="control-button primary" disabled={isEditing}>
                        Play ▶️
                    </button>
                )}
                {isRunning && (
                    <button onClick={pauseTimer} className="control-button secondary" disabled={isEditing}>
                        Pause ⏸️
                    </button>
                )}
                {currentTime !== duration && (
                    <button onClick={stopTimer} className="control-button danger" disabled={isEditing || isRunning}>
                        Stop ⏹️
                    </button>
                )}
            </div>
        </div>
    );
}