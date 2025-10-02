import API_URL from "../config";
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { useAuth } from "../contexts/AuthContext";
import "../css/LiveDebatePage.css";
import Timer from "../components/Timer";
import HeatmapChart from "../components/HeatmapChart";

export default function LiveDebatePage() {
    const { token, isAuthenticated, isDebateManager, loading } = useAuth();
    const navigate = useNavigate();

    const [liveStatus, setLiveStatus] = useState(null);
    const [debateDetails, setDebateDetails] = useState(null);
    const [fireTotal, setFireTotal] = useState(0);
    const [initialLoading, setInitialLoading] = useState(true);
    const [loadingAction, setLoadingAction] = useState("");
    const [displayMode, setDisplayMode] = useState("both");
    const [error, setError] = useState(null);
    const [showQuestionList, setShowQuestionList] = useState(false);

    // Helper fetch with authentication header
    const authFetch = useCallback(
        (url, options = {}) =>
            fetch(url, {
                ...options,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    ...options.headers,
                },
            }),
        [token]
    );

    // Redirect if not authenticated or not a debate manager
    useEffect(() => {
        if (loading) return;
        if (!isAuthenticated || !isDebateManager) {
            navigate("/debate-manager/login");
            return;
        }
    }, [loading, isAuthenticated, isDebateManager, navigate]);

    // Fetch detailed debate information
    const fetchDebateDetails = useCallback(
        async (debateId, bustCache = false) => {
            try {
                const url = bustCache
                    ? `${API_URL}/debate/${debateId}?_t=${Date.now()}`
                    : `${API_URL}/debate/${debateId}`;

                const response = await authFetch(url);
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
        },
        [authFetch]
    );

    // Fetch live debate status
    const refreshLiveStatus = useCallback(
        async (isInitial = false, bustCache = false) => {
            if (isInitial) {
                setInitialLoading(true);
                setError(null);
            }

            try {
                const statusUrl = bustCache
                    ? `${API_URL}/debate-manager/live/status?_t=${Date.now()}`
                    : `${API_URL}/debate-manager/live/status`;

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

                if (data?.isLive && data?.debate?.id) {
                    const details = await fetchDebateDetails(data.debate.id, bustCache);
                    if (details) setDebateDetails(details);
                } else if (!data?.isLive && !isInitial) {
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
        },
        [authFetch, navigate, fetchDebateDetails]
    );

    // Initial load
    useEffect(() => {
        if (loading) return;
        if (!token || !isAuthenticated || !isDebateManager) return;
        refreshLiveStatus(true);
    }, [loading, token, isAuthenticated, isDebateManager, refreshLiveStatus]);

    // Auto-refresh live status every 30s
    useEffect(() => {
        if (!liveStatus?.isLive) return;

        const interval = setInterval(() => {
            const shouldBustCache = Math.random() < 0.3;
            refreshLiveStatus(false, shouldBustCache);
        }, 30000);

        return () => clearInterval(interval);
    }, [liveStatus?.isLive, refreshLiveStatus]);

    // Close modal on unmount
    useEffect(() => {
        return () => setShowQuestionList(false);
    }, []);

    // Change the round
    const changeRound = useCallback(
        (roundNumber) => {
            if (loadingAction || !liveStatus?.isLive || !liveStatus.isActive) {
                console.log("Cannot change round - conditions not met");
                return;
            }

            setLoadingAction(roundNumber > liveStatus.currentRound ? "next" : "prev");

            authFetch(`${API_URL}/debate-manager/live/change-round`, {
                method: "POST",
                body: JSON.stringify({ roundNumber }),
            })
                .then((res) => {
                    if (!res.ok) {
                        return res.json().then((errorData) => {
                            throw new Error(
                                errorData.message ||
                                `HTTP ${res.status}: Failed to change round`
                            );
                        });
                    }
                    return res.json();
                })
                .then(() => {
                    setTimeout(() => {
                        refreshLiveStatus(false, true);
                    }, 300);
                })
                .catch((err) => {
                    console.error("Round change error:", err);
                    alert(`Failed to change round: ${err.message}`);
                })
                .finally(() => {
                    setLoadingAction("");
                });
        },
        [loadingAction, liveStatus, authFetch, refreshLiveStatus]
    );

    // Manual refresh
    const handleManualRefresh = useCallback(() => {
        refreshLiveStatus(false, true);
    }, [refreshLiveStatus]);

    // Get current question
    const getCurrentQuestion = useCallback(() => {
        if (!liveStatus?.currentRound) return "No question set for this round";

        if (debateDetails?.questions) {
            const currentQ = debateDetails.questions.find(
                (q) => q.round === liveStatus.currentRound
            );
            if (currentQ) return currentQ.question;
        }

        if (liveStatus.currentQuestion) return liveStatus.currentQuestion;

        return "Loading question...";
    }, [liveStatus, debateDetails]);

    // Get total rounds
    const getTotalRounds = useCallback(() => {
        return (
            debateDetails?.totalRounds ||
            liveStatus?.debate?.totalRounds ||
            liveStatus?.totalRounds ||
            (debateDetails?.questions ? debateDetails.questions.length : 0) ||
            0
        );
    }, [debateDetails, liveStatus]);

    // Loading state
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

    // Scheduled but not active
    if (liveStatus.isLive && !liveStatus.isActive) {
        return (
            <div className="status-message-container">
                <h1>Debate is scheduled but not yet active</h1>
                <p>Debate: {liveStatus.debate?.title}</p>
                {liveStatus.debate?.scheduledStartTime && (
                    <p>
                        Scheduled start:{" "}
                        {new Date(
                            liveStatus.debate.scheduledStartTime
                        ).toLocaleString()}
                    </p>
                )}
                <p>The debate will automatically become active at the scheduled time.</p>
                <button
                    onClick={() => refreshLiveStatus(false)}
                    className="control-button secondary"
                    style={{ marginRight: "10px" }}
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
    const debateTitle =
        debateDetails?.title || liveStatus.debate?.title || "Live Debate";

    if (loading) return <p>Checking authentication...</p>;

    return (
        <div className="live-debate-container">
            <div className="live-debate-header">
                <h2 className="live-debate-title">{debateTitle}</h2>
                <div className="live-debate-header-right">
                    <span className="live-debate-subtitle">
                        Round {liveStatus.currentRound} of {totalRounds}
                    </span>
                    <button
                        onClick={handleManualRefresh}
                        className="control-button secondary"
                        style={{
                            marginRight: "10px",
                            padding: "5px 10px",
                            fontSize: "12px",
                            minWidth: "auto",
                        }}
                        title="Refresh data to see latest changes"
                    >
                        Refresh
                    </button>
                    <div className="heatmap-header">
                        <span className="fire-total">🔥 {fireTotal}</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="live-debate-main-content">
                <div className={`unified-display-card ${displayMode}`}>
                    {(displayMode === "both" || displayMode === "heatmap") &&
                        debateId && (
                            <div className="heatmap-background">
                                <HeatmapChart
                                    fetchUrl={`${API_URL}/debate/${debateId}/heatmap-data`}
                                    intervalSeconds={10}
                                    displayMode={displayMode === "both" ? "overlay" : "full"}
                                    showControls={displayMode === "heatmap"}
                                    onDataUpdate={(json) => setFireTotal(json.total || 0)}
                                />
                            </div>
                        )}

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
                <div className="timer-section-container">
                    <Timer
                        key={`${liveStatus.currentRound}-${loadingAction}`}
                        initialDuration={180}
                    />
                </div>

                <div className="controls-section-container">
                    <div className="display-mode-controls">
                        <button
                            onClick={() => setDisplayMode("question")}
                            className={`mode-button ${displayMode === "question" ? "active" : ""
                                }`}
                        >
                            Question Only
                        </button>
                        <button
                            onClick={() => setDisplayMode("both")}
                            className={`mode-button ${displayMode === "both" ? "active" : ""
                                }`}
                        >
                            Both (Overlay)
                        </button>
                        <button
                            onClick={() => setDisplayMode("heatmap")}
                            className={`mode-button ${displayMode === "heatmap" ? "active" : ""
                                }`}
                        >
                            Heatmap Only
                        </button>
                    </div>

                    <div className="live-debate-controls">
                        <button
                            onClick={() =>
                                changeRound(liveStatus.currentRound - 1)
                            }
                            disabled={
                                liveStatus.currentRound <= 1 ||
                                loadingAction !== "" ||
                                !liveStatus.isActive
                            }
                            className={`control-button secondary ${loadingAction === "prev" ? "loading" : ""
                                }`}
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
                            onClick={() =>
                                changeRound(liveStatus.currentRound + 1)
                            }
                            disabled={
                                liveStatus.currentRound >= totalRounds ||
                                loadingAction !== "" ||
                                !liveStatus.isActive
                            }
                            className={`control-button primary ${loadingAction === "next" ? "loading" : ""
                                }`}
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
                        <button className="control-button">ping</button>
                    </div>
                </div>
            </div>

            {loadingAction &&
                createPortal(
                    <div className="loading-status">
                        {loadingAction === "prev" && "Going to previous round..."}
                        {loadingAction === "next" && "Going to next round..."}
                    </div>,
                    document.body
                )}

            {createPortal(
                <button
                    onClick={() => setShowQuestionList(true)}
                    className="floating-question-list-btn"
                    title="Jump to specific question"
                >
                    📜
                </button>,
                document.body
            )}

            {showQuestionList &&
                createPortal(
                    <div className="question-list-overlay">
                        <div className="question-list-modal">
                            <h3>Select a Round</h3>
                            <div className="question-list-items-container">
                                {debateDetails?.questions?.map((q) => (
                                    <button
                                        key={q.round}
                                        onClick={() => {
                                            changeRound(q.round);
                                            setShowQuestionList(false);
                                        }}
                                        disabled={loadingAction !== ""}
                                        className={`question-list-item ${liveStatus?.currentRound === q.round
                                            ? "active"
                                            : ""
                                            }`}
                                    >
                                        <span className="round-number">
                                            Round {q.round}:
                                        </span>{" "}
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
                    </div>,
                    document.body
                )}
        </div>
    );
}
