import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";
import "../css/LiveDebatePage.css";
import FireCountDisplay from "../components/FireCountDisplay";
import Timer from "../components/Timer";
import HeatmapChart from "../components/HeatmapChart";

export default function LiveDebatePage() {
    const { token, isAuthenticated, isDebateManager } = useAuth();
    const navigate = useNavigate();

    const [liveStatus, setLiveStatus] = useState(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [loadingAction, setLoadingAction] = useState("");
    const [total, setTotal] = useState(0);
    const [displayMode, setDisplayMode] = useState("both"); // "question", "heatmap", "both"

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

    // Redirect if not authenticated or not a debate manager
    useEffect(() => {
        if (!isAuthenticated || !isDebateManager) {
            navigate("/debate-manager/login");
        }
    }, [isAuthenticated, isDebateManager, navigate]);

    // Fetch live debate status
    const refreshLiveStatus = (isInitial = false) => {
        if (isInitial) {
            setInitialLoading(true);
        }

        authFetch("http://localhost:5076/debate-manager/live/status")
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch live status");
                return res.json();
            })
            .then(data => {
                setLiveStatus(data);
            })
            .catch(err => console.error(err))
            .finally(() => {
                if (isInitial) setInitialLoading(false);
            });
    };

    useEffect(() => {
        if (!token || !isAuthenticated || !isDebateManager) return;
        refreshLiveStatus(true);
    }, [token, isAuthenticated, isDebateManager]);

    // Handle heatmap updates
    const handleDataUpdate = useCallback((json) => {
        if (json && typeof json.total !== "undefined") {
            setTotal(json.total);
        }
    }, []);

    // Change the round
    const changeRound = (roundNumber) => {
        if (actionLoading) return;

        setActionLoading(true);
        setLoadingAction(roundNumber > liveStatus.currentRound ? "next" : "prev");

        authFetch("http://localhost:5076/debate-manager/live/change-round", {
            method: "POST",
            body: JSON.stringify({ roundNumber }),
        })
            .then(res => {
                if (!res.ok) throw new Error("Failed to change round");
                return res.json();
            })
            .then(() => {
                setTimeout(() => {
                    refreshLiveStatus();
                    setActionLoading(false);
                    setLoadingAction("");
                }, 300);
            })
            .catch(err => {
                console.error(err);
                setActionLoading(false);
                setLoadingAction("");
                alert("Failed to change round. Please try again.");
            });
    };

    // End debate
    const endLive = () => {
        if (!window.confirm("Are you sure you want to end the live debate? This action cannot be undone.")) return;

        setActionLoading(true);
        setLoadingAction("end");

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
            .catch(err => {
                console.error(err);
                setActionLoading(false);
                setLoadingAction("");
                alert("Failed to end debate. Please try again.");
            });
    };

    // Initial loading state
    if (initialLoading) {
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

    const debateId = liveStatus.debate?.id;

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

            {/* Main Content */}
            <div className="live-debate-main-content">
                {/* Unified Display Card */}
                <div className={`unified-display-card ${displayMode}`}>
                    {/* Heatmap Background (for both and heatmap modes) */}
                    {(displayMode === "both" || displayMode === "heatmap") && (
                        <div className="heatmap-background">
                            <HeatmapChart
                                fetchUrl={`http://localhost:5076/debate/${debateId}/heatmap-data`}
                                intervalSeconds={10}
                                onDataUpdate={handleDataUpdate}
                                displayMode={displayMode === "both" ? "overlay" : "full"}
                                showControls={displayMode === "heatmap"}
                            />
                        </div>
                    )}

                    {/* Question Overlay (for both and question modes) */}
                    {(displayMode === "both" || displayMode === "question") && (
                        <div className="question-overlay">
                            <h1 className="live-debate-question">
                                {liveStatus.currentQuestion || "No question set for this round"}
                            </h1>
                        </div>
                    )}
                </div>
            </div>

            {/* NEW GRID LAYOUT FOR CONTROLS */}
            <div className="controls-grid-container">
                {/* Timer Section - Left Side */}
                <div className="timer-section-container">
                    <Timer key={liveStatus.currentRound} initialDuration={180} />
                </div>

                {/* Controls Section - Right Side */}
                <div className="controls-section-container">
                    {/* Display Mode Controls - Top Right */}
                    <div className="display-mode-controls">
                        <button
                            onClick={() => setDisplayMode("question")}
                            className={`mode-button ${displayMode === "question" ? "active" : ""}`}
                        >
                            Question Only
                        </button>
                        <button
                            onClick={() => setDisplayMode("both")}
                            className={`mode-button ${displayMode === "both" ? "active" : ""}`}
                        >
                            Both (Overlay)
                        </button>
                        <button
                            onClick={() => setDisplayMode("heatmap")}
                            className={`mode-button ${displayMode === "heatmap" ? "active" : ""}`}
                        >
                            Heatmap Only
                        </button>
                    </div>

                    {/* Navigation Controls - Bottom Right */}
                    <div className="live-debate-controls">
                        <button
                            onClick={() => changeRound(liveStatus.currentRound - 1)}
                            disabled={liveStatus.currentRound <= 1 || actionLoading}
                            className={`control-button secondary ${loadingAction === "prev" ? "loading" : ""}`}
                        >
                            {loadingAction === "prev" ? (
                                <>
                                    <span className="button-spinner"></span>
                                    ← Prev
                                </>
                            ) : (
                                "← Prev"
                            )}
                        </button>

                        <button
                            onClick={() => changeRound(liveStatus.currentRound + 1)}
                            disabled={liveStatus.currentRound >= liveStatus.totalRounds || actionLoading}
                            className={`control-button primary ${loadingAction === "next" ? "loading" : ""}`}
                        >
                            {loadingAction === "next" ? (
                                <>
                                    Next →
                                    <span className="button-spinner"></span>
                                </>
                            ) : (
                                "Next →"
                            )}
                        </button>

                        <button
                            onClick={endLive}
                            disabled={actionLoading}
                            className={`control-button danger ${loadingAction === "end" ? "loading" : ""}`}
                        >
                            {loadingAction === "end" ? (
                                <>
                                    <span className="button-spinner"></span>
                                    Ending...
                                </>
                            ) : (
                                "End"
                            )}
                        </button>

                        {actionLoading && (
                            <div className="loading-status">Loading...</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}