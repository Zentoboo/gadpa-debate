import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../css/LiveDebatePage.css";
import FireCountDisplay from "../components/FireCountDisplay";
import Timer from "../components/Timer";
import HeatmapChart from "../components/HeatmapChart";

export default function LiveDebatePage() {
    const { token, isAuthenticated, isDebateManager, loading } = useAuth();
    const navigate = useNavigate();

    const [liveStatus, setLiveStatus] = useState(null);
    const [debateDetails, setDebateDetails] = useState(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [loadingAction, setLoadingAction] = useState("");
    const [total, setTotal] = useState(0);
    const [displayMode, setDisplayMode] = useState("both");
    const [error, setError] = useState(null);
    const [lastRoundChange, setLastRoundChange] = useState(Date.now());
    const [showQuestionList, setShowQuestionList] = useState(false);

    // Helper fetch with authentication header
    const authFetch = useCallback((url, options = {}) =>
        fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...options.headers,
            },
        }), [token]);

    // Redirect if not authenticated or not a debate manager
    useEffect(() => {
        if (loading) return;
        if (!isAuthenticated || !isDebateManager) {
            navigate("/debate-manager/login");
        }
    }, [loading, isAuthenticated, isDebateManager, navigate]);

    // Fetch detailed debate information - ENHANCED with cache busting
    const fetchDebateDetails = useCallback(async (debateId, bustCache = false) => {
        try {
            // Add cache busting parameter when needed
            const url = bustCache
                ? `http://localhost:5076/debate/${debateId}?_t=${Date.now()}`
                : `http://localhost:5076/debate/${debateId}`;

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setDebateDetails(data);
                return data;
            } else {
                console.warn("Could not fetch detailed debate info");
                return null;
            }
        } catch (err) {
            console.warn("Error fetching debate details:", err);
            return null;
        }
    }, []);

    // Fetch live debate status - ENHANCED with better refresh logic
    const refreshLiveStatus = useCallback(async (isInitial = false, bustCache = false) => {
        if (isInitial) {
            setInitialLoading(true);
            setError(null);
        }

        try {
            // Add cache busting for live status as well
            const statusUrl = bustCache
                ? `http://localhost:5076/debate-manager/live/status?_t=${Date.now()}`
                : "http://localhost:5076/debate-manager/live/status";

            const res = await authFetch(statusUrl);

            if (!res.ok) {
                if (res.status === 401) {
                    navigate("/debate-manager/login");
                    return;
                }
                throw new Error(`HTTP ${res.status}: Failed to fetch live status`);
            }

            const data = await res.json();
            setLiveStatus(data);
            setError(null);

            // If we have a live debate, fetch detailed debate information
            if (data?.isLive && data?.debate?.id) {
                const details = await fetchDebateDetails(data.debate.id, bustCache);
                if (details) {
                    setDebateDetails(details);
                }
            } else if (!data?.isLive && !isInitial) {
                // If no live debate, redirect to dashboard after a delay
                setTimeout(() => {
                    navigate("/debate-manager/dashboard");
                }, 2000);
            }
        } catch (err) {
            console.error("Error fetching live status:", err);
            setError(err.message);

            if (err.message.includes("401")) {
                navigate("/debate-manager/login");
            }
        } finally {
            if (isInitial) setInitialLoading(false);
        }
    }, [authFetch, navigate, fetchDebateDetails]);

    // Initial load
    useEffect(() => {
        if (loading) return;
        if (!token || !isAuthenticated || !isDebateManager) return;
        refreshLiveStatus(true);
    }, [loading, token, isAuthenticated, isDebateManager, refreshLiveStatus]);

    // Auto-refresh live status every 30 seconds - ENHANCED
    useEffect(() => {
        if (!liveStatus?.isLive) return;

        const interval = setInterval(() => {
            // Use cache busting every few refreshes to ensure we get fresh data
            const shouldBustCache = Math.random() < 0.3;
            refreshLiveStatus(false, shouldBustCache);
        }, 30000);

        return () => clearInterval(interval);
    }, [liveStatus?.isLive, refreshLiveStatus]);

    // Handle heatmap updates
    const handleDataUpdate = useCallback((json) => {
        if (json && typeof json.total !== "undefined") {
            setTotal(json.total);
        }
    }, []);

    // Change the round - ENHANCED with data refresh
    const changeRound = useCallback((roundNumber) => {
        if (actionLoading || !liveStatus?.isLive || !liveStatus.isActive) {
            console.log("Cannot change round - conditions not met");
            return;
        }

        // Prevent rapid successive calls
        const now = Date.now();
        if (now - lastRoundChange < 1000) {
            console.log("Rate limiting round change");
            return;
        }

        setActionLoading(true);
        setLoadingAction(roundNumber > liveStatus.currentRound ? "next" : "prev");
        setLastRoundChange(now);

        authFetch("http://localhost:5076/debate-manager/live/change-round", {
            method: "POST",
            body: JSON.stringify({ roundNumber }),
        })
            .then(res => {
                if (!res.ok) {
                    return res.json().then(errorData => {
                        throw new Error(errorData.message || `HTTP ${res.status}: Failed to change round`);
                    });
                }
                return res.json();
            })
            .then((data) => {
                console.log("Round change successful:", data);
                // Force refresh with cache busting after round change
                setTimeout(() => {
                    refreshLiveStatus(false, true); // Bust cache on round change
                    setActionLoading(false);
                    setLoadingAction("");
                }, 300);
            })
            .catch(err => {
                console.error("Round change error:", err);
                setActionLoading(false);
                setLoadingAction("");
                alert(`Failed to change round: ${err.message}`);
            });
    }, [actionLoading, liveStatus, authFetch, refreshLiveStatus, lastRoundChange]);

    // End debate
    const endLive = useCallback(() => {
        if (!window.confirm("Are you sure you want to end the live debate? This action cannot be undone.")) return;

        setActionLoading(true);
        setLoadingAction("end");

        authFetch("http://localhost:5076/debate-manager/live/end", {
            method: "POST",
        })
            .then(res => {
                if (!res.ok) {
                    return res.json().then(errorData => {
                        throw new Error(errorData.message || `HTTP ${res.status}: Failed to end debate`);
                    });
                }
                return res.json();
            })
            .then((data) => {
                console.log("Debate ended successfully:", data);
                alert("Live debate ended successfully!");
                navigate("/debate-manager/dashboard");
            })
            .catch(err => {
                console.error("End debate error:", err);
                setActionLoading(false);
                setLoadingAction("");
                alert(`Failed to end debate: ${err.message}`);
            });
    }, [authFetch, navigate]);

    // Manual refresh function - NEW
    const handleManualRefresh = useCallback(() => {
        console.log("Manual refresh triggered");
        refreshLiveStatus(false, true); // Force cache bust
    }, [refreshLiveStatus]);

    // Get current question text - ENHANCED
    const getCurrentQuestion = useCallback(() => {
        if (!liveStatus?.currentRound) return "No question set for this round";

        // Try to get question from debateDetails first (more complete data)
        if (debateDetails?.questions) {
            const currentQ = debateDetails.questions.find(q => q.round === liveStatus.currentRound);
            if (currentQ) return currentQ.question;
        }

        // Fallback to liveStatus data
        if (liveStatus.currentQuestion) {
            return liveStatus.currentQuestion;
        }

        // Last fallback
        return "Loading question...";
    }, [liveStatus, debateDetails]);

    // Get total rounds - ENHANCED
    const getTotalRounds = useCallback(() => {
        return debateDetails?.totalRounds ||
            liveStatus?.debate?.totalRounds ||
            liveStatus?.totalRounds ||
            (debateDetails?.questions ? debateDetails.questions.length : 0) ||
            0;
    }, [debateDetails, liveStatus]);

    // Initial loading state
    if (initialLoading) {
        return (
            <div className="status-message-container">
                <h1>Loading Live Debate Status...</h1>
                {error && (
                    <div className="error-message">
                        <p>Error: {error}</p>
                        <button
                            onClick={() => refreshLiveStatus(true)}
                            className="control-button secondary"
                        >
                            Retry
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // No live debate
    if (!liveStatus?.isLive) {
        return (
            <div className="status-message-container">
                <h1>No live debate is currently active</h1>
                {error && (
                    <div className="error-message">
                        <p>Error: {error}</p>
                    </div>
                )}
                <button
                    onClick={() => navigate("/debate-manager/dashboard")}
                    className="control-button primary"
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    // Handle scheduled debates that haven't started yet
    if (liveStatus.isLive && !liveStatus.isActive) {
        return (
            <div className="status-message-container">
                <h1>Debate is scheduled but not yet active</h1>
                <p>Debate: {liveStatus.debate?.title}</p>
                {liveStatus.debate?.scheduledStartTime && (
                    <p>Scheduled start: {new Date(liveStatus.debate.scheduledStartTime).toLocaleString()}</p>
                )}
                <p>The debate will automatically become active at the scheduled time.</p>
                <button
                    onClick={() => refreshLiveStatus(false)}
                    className="control-button secondary"
                    style={{ marginRight: '10px' }}
                >
                    Refresh Status
                </button>
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
    const currentQuestion = getCurrentQuestion();
    const totalRounds = getTotalRounds();
    const debateTitle = debateDetails?.title || liveStatus.debate?.title || "Live Debate";

    if (loading) return <p>Checking authentication...</p>;
    return (
        <div className="live-debate-container">
            <div className="live-debate-header">
                <h2 className="live-debate-title">
                    {debateTitle}
                </h2>
                <div className="live-debate-header-right">
                    <span className="live-debate-subtitle">
                        Round {liveStatus.currentRound} of {totalRounds}
                    </span>
                    <button
                        onClick={handleManualRefresh}
                        className="control-button secondary"
                        style={{
                            marginRight: '10px',
                            padding: '5px 10px',
                            fontSize: '12px',
                            minWidth: 'auto'
                        }}
                        title="Refresh data to see latest changes"
                    >
                        Refresh
                    </button>
                    <FireCountDisplay
                        token={token}
                        debateId={debateId}
                        onFireCountUpdate={setTotal}
                    />
                </div>
            </div>

            {/* Main Content */}
            <div className="live-debate-main-content">
                {/* Unified Display Card */}
                <div className={`unified-display-card ${displayMode}`}>
                    {/* Heatmap Background (for both and heatmap modes) */}
                    {(displayMode === "both" || displayMode === "heatmap") && debateId && (
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
                                {currentQuestion}
                            </h1>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls Grid */}
            <div className="controls-grid-container">
                {/* Timer Section - Left Side */}
                <div className="timer-section-container">
                    <Timer key={`${liveStatus.currentRound}-${lastRoundChange}`} initialDuration={180} />
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
                            disabled={liveStatus.currentRound <= 1 || actionLoading || !liveStatus.isActive}
                            className={`control-button secondary ${loadingAction === "prev" ? "loading" : ""}`}
                            title={!liveStatus.isActive ? "Debate not active" : ""}
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
                            disabled={liveStatus.currentRound >= totalRounds || actionLoading || !liveStatus.isActive}
                            className={`control-button primary ${loadingAction === "next" ? "loading" : ""}`}
                            title={!liveStatus.isActive ? "Debate not active" : ""}
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
                    </div>
                </div>
            </div>

            {/* Floating Loading Status */}
            {actionLoading && (
                <div className="loading-status">
                    {loadingAction === "prev" && "Going to previous round..."}
                    {loadingAction === "next" && "Going to next round..."}
                    {loadingAction === "end" && "Ending debate..."}
                </div>
            )}

            {/* Floating Jump-to-Round Button */}
            <button
                onClick={() => setShowQuestionList(true)}
                className="floating-question-list-btn"
                title="Jump to specific question"
            >
                📜
            </button>
            {showQuestionList && (
                <div className="question-list-overlay">
                    <div className="question-list-modal">
                        <h3>Select a Round</h3>
                        <div className="question-list-items-container">
                            {debateDetails?.questions?.map((q, index) => (
                                <button
                                    key={q.round}
                                    onClick={() => {
                                        changeRound(q.round);
                                        setShowQuestionList(false);
                                    }}
                                    disabled={actionLoading}
                                    className={`question-list-item ${liveStatus?.currentRound === q.round ? "active" : ""
                                        }`}
                                >
                                    <span className="round-number">Round {q.round}:</span>{" "}
                                    {q.question.length > 60
                                        ? q.question.slice(0, 60) + "..."
                                        : q.question}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowQuestionList(false)}
                            className="close-question-list"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Debug info */}
            {/* {process.env.NODE_ENV === 'development' && (
                <div style={{
                    position: 'fixed',
                    bottom: '10px',
                    right: '10px',
                    background: 'rgba(0,0,0,0.8)',
                    color: 'white',
                    padding: '10px',
                    fontSize: '12px',
                    borderRadius: '5px',
                    maxWidth: '200px'
                }}>
                    <div>Live: {String(liveStatus?.isLive)}</div>
                    <div>Active: {String(liveStatus?.isActive)}</div>
                    <div>Round: {liveStatus?.currentRound}</div>
                    <div>Total: {totalRounds}</div>
                    <div>Loading: {String(actionLoading)} ({loadingAction})</div>
                    <div>Question: {currentQuestion.substring(0, 30)}...</div>
                    <div>Has Details: {String(!!debateDetails)}</div>
                    <div>Details Questions: {debateDetails?.questions?.length || 0}</div>
                    <div>Status Questions: {liveStatus?.debate?.questions?.length || 0}</div>
                </div>
            )} */}
        </div>
    );
}