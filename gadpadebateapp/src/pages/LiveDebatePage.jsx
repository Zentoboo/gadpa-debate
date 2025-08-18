import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";
import "./LiveDebatePage.css";
import FireCountDisplay from "../components/FireCountDisplay";
import Timer from "../components/Timer"; // Import the updated Timer component

export default function LiveDebatePage() {
    const { token, isAuthenticated, isDebateManager } = useAuth();
    const navigate = useNavigate();

    const [liveStatus, setLiveStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    // Helper fetch with authentication header
    const authFetch = (url, options = {}) =>
        fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...options.headers,
            },
        });

    // Redirect if user is not authenticated or not a debate manager
    useEffect(() => {
        if (!isAuthenticated || !isDebateManager) {
            navigate("/debate-manager/login");
        }
    }, [isAuthenticated, isDebateManager, navigate]);

    // Fetch live debate status
    const refreshLiveStatus = () => {
        setLoading(true);
        authFetch("http://localhost:5076/debate-manager/live/status")
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch live status");
                return res.json();
            })
            .then(data => setLiveStatus(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (!token || !isAuthenticated || !isDebateManager) return;
        refreshLiveStatus();
    }, [token, isAuthenticated, isDebateManager]);

    // Change the round
    const changeRound = (roundNumber) => {
        authFetch("http://localhost:5076/debate-manager/live/change-round", {
            method: "POST",
            body: JSON.stringify({ roundNumber }),
        })
            .then(res => {
                if (!res.ok) throw new Error("Failed to change round");
                return res.json();
            })
            .then(() => refreshLiveStatus())
            .catch(err => console.error(err));
    };

    // End debate
    const endLive = () => {
        if (!window.confirm("Are you sure you want to end the live debate? This action cannot be undone.")) return;

        authFetch("http://localhost:5076/debate-manager/live/end", {
            method: "POST",
        })
            .then(res => {
                if (!res.ok) throw new Error("Failed to end debate");
                return res.json();
            })
            .then(() => {
                alert("Live debate ended successfully!");
                navigate("/debate-manager/dashboard");
            })
            .catch(err => console.error(err));
    };

    // Loading state
    if (loading) {
        return (
            <div className="status-message-container">
                <h1>Loading Live Debate Status...</h1>
            </div>
        );
    }

    // No live debate
    if (!liveStatus?.isLive) {
        return (
            <div className="status-message-container">
                <h1>No live debate is currently active</h1>
                <button
                    onClick={() => navigate("/debate-manager/dashboard")}
                    className="control-button primary"
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    // Main render
    return (
        <div className="live-debate-container">
            {/* Header */}
            <div className="live-debate-header">
                <h2 className="live-debate-title">
                    {liveStatus.debate.title}
                </h2>
                <div className="live-debate-header-right">
                    <span className="live-debate-subtitle">
                        Round {liveStatus.currentRound} of {liveStatus.totalRounds}
                    </span>
                    <FireCountDisplay token={token} />
                </div>
            </div>

            {/* Main Content - Question and Timer in separate cards */}
            <div className="live-debate-main-content">
                {/* Question Card */}
                <div className="question-card">
                    <h1 className="live-debate-question">
                        {liveStatus.currentQuestion || "No question set for this round"}
                    </h1>
                </div>

                {/* Timer Card */}
                <div className="timer-card">
                    <Timer key={liveStatus.currentRound} initialDuration={180} />
                </div>
            </div>

            {/* Controls */}
            <div className="live-debate-controls">
                <button
                    onClick={() => changeRound(liveStatus.currentRound - 1)}
                    disabled={liveStatus.currentRound <= 1}
                    className="control-button secondary"
                >
                    ← Prev
                </button>

                <button
                    onClick={() => changeRound(liveStatus.currentRound + 1)}
                    disabled={liveStatus.currentRound >= liveStatus.totalRounds}
                    className="control-button primary"
                >
                    Next →
                </button>

                <button
                    onClick={endLive}
                    className="control-button danger"
                >
                    End
                </button>
            </div>
        </div>
    );
}