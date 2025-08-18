import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";
import "./LiveDebatePage.css"; // Import the new CSS file

export default function LiveDebatePage() {
    const { token, isAuthenticated, isDebateManager, logout } = useAuth();
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

    // Fetch live debate status on component mount and token change
    const refreshLiveStatus = () => {
        setLoading(true);
        authFetch("http://localhost:5076/debate-manager/live/status")
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch live status");
                return res.json();
            })
            .then(data => setLiveStatus(data))
            .catch(err => console.error(err)) // Log error, but don't block UI with alert
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (!token || !isAuthenticated || !isDebateManager) return;
        refreshLiveStatus();
    }, [token, isAuthenticated, isDebateManager]);

    // Function to change the current round of the live debate
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
            .catch(err => console.error(err)); // Log error, avoid alert
    };

    // Function to end the live debate
    const endLive = () => {
        // Using window.confirm for simplicity, consider a custom modal in a full application
        if (!window.confirm("Are you sure you want to end the live debate? This action cannot be undone.")) return;

        authFetch("http://localhost:5076/debate-manager/live/end", {
            method: "POST",
        })
            .then(res => {
                if (!res.ok) throw new Error("Failed to end debate");
                return res.json();
            })
            .then(() => {
                alert("Live debate ended successfully!"); // Simple alert for confirmation
                navigate("/debate-manager/dashboard"); // Redirect to dashboard after ending
            })
            .catch(err => console.error(err)); // Log error, avoid alert
    };

    // Render loading state
    if (loading) {
        return (
            <div className="status-message-container">
                <h1>Loading Live Debate Status...</h1>
            </div>
        );
    }

    // Render message if no debate is currently live
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

    // Render live debate controls and information
    return (
        <div className="live-debate-container">
            {/* Header Section */}
            <div className="live-debate-header">
                <h2 className="live-debate-title">
                    Live Debate: {liveStatus.debate.title}
                </h2>
                {/* Logout button removed */}
            </div>

            {/* Main Content: Current Question & Round */}
            <div className="live-debate-main-content">
                <p className="live-debate-round">Round {liveStatus.currentRound} of {liveStatus.totalRounds}</p>
                <h1 className="live-debate-question">
                    {liveStatus.currentQuestion || "No question set for this round"}
                </h1>
                <div className="live-debate-stats">
                    <span>Total Fires: {liveStatus.totalFires}</span>
                </div>
            </div>

            {/* Controls Section */}
            <div className="live-debate-controls">
                <button
                    onClick={() => changeRound(liveStatus.currentRound - 1)}
                    disabled={liveStatus.currentRound <= 1}
                    className="control-button secondary"
                >
                    &larr; Previous Round
                </button>

                <button
                    onClick={() => changeRound(liveStatus.currentRound + 1)}
                    disabled={liveStatus.currentRound >= liveStatus.totalRounds}
                    className="control-button primary"
                >
                    Next Round &rarr;
                </button>

                <button
                    onClick={endLive}
                    className="control-button danger"
                >
                    End Debate
                </button>
            </div>
        </div>
    );
}
