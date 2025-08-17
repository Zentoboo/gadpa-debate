import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";

export default function DebateManagerDashboard() {
    const { token, logout, isAuthenticated, isDebateManager } = useAuth();
    const navigate = useNavigate();

    const [debates, setDebates] = useState([]);
    const [liveStatus, setLiveStatus] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [heatmapData, setHeatmapData] = useState(null);

    // Create debate form
    const [newDebate, setNewDebate] = useState({
        title: "",
        description: "",
        questions: [""]
    });

    // Helper fetch with auth header
    const authFetch = (url, options = {}) =>
        fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...options.headers,
            },
        });

    // Redirect if not logged in or not debate manager
    useEffect(() => {
        if (!isAuthenticated || !token || !isDebateManager) {
            navigate("/debate-manager/login");
        }
    }, [isAuthenticated, token, isDebateManager, navigate]);

    // Initial data fetch
    useEffect(() => {
        if (!token || !isAuthenticated || !isDebateManager) return;

        refreshDebates();
        refreshLiveStatus();
    }, [token, isAuthenticated, isDebateManager]);

    // Auto-refresh live status and heatmap every 5 seconds when live
    useEffect(() => {
        if (!liveStatus?.isLive) return;

        const interval = setInterval(() => {
            refreshLiveStatus();
            refreshHeatmap();
        }, 5000);

        return () => clearInterval(interval);
    }, [liveStatus?.isLive]);

    const refreshDebates = () => {
        authFetch("http://localhost:5076/debate-manager/debates")
            .then((res) => {
                if (!res.ok) throw new Error('Failed to fetch debates');
                return res.json();
            })
            .then((data) => setDebates(data))
            .catch(console.error);
    };

    const refreshLiveStatus = () => {
        authFetch("http://localhost:5076/debate-manager/live/status")
            .then((res) => {
                if (!res.ok) throw new Error('Failed to fetch live status');
                return res.json();
            })
            .then((data) => setLiveStatus(data))
            .catch(console.error);
    };

    const refreshHeatmap = () => {
        authFetch("http://localhost:5076/debate-manager/live/heatmap?intervalSeconds=10&lastMinutes=5")
            .then((res) => {
                if (!res.ok) throw new Error('Failed to fetch heatmap');
                return res.json();
            })
            .then((data) => setHeatmapData(data))
            .catch(console.error);
    };

    const createDebate = () => {
        if (!newDebate.title.trim()) {
            alert("Title is required");
            return;
        }

        const validQuestions = newDebate.questions.filter(q => q.trim());
        if (validQuestions.length === 0) {
            alert("At least one question is required");
            return;
        }

        authFetch("http://localhost:5076/debate-manager/debates", {
            method: "POST",
            body: JSON.stringify({
                title: newDebate.title.trim(),
                description: newDebate.description.trim(),
                questions: validQuestions.map(q => q.trim())
            })
        })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to create debate');
                return res.json();
            })
            .then(() => {
                setNewDebate({ title: "", description: "", questions: [""] });
                setIsCreating(false);
                refreshDebates();
            })
            .catch((err) => alert(err.message));
    };

    const goLive = (debateId) => {
        authFetch(`http://localhost:5076/debate-manager/debates/${debateId}/go-live`, {
            method: "POST"
        })
            .then((res) => {
                if (!res.ok) {
                    return res.json().then(data => {
                        throw new Error(data.message || 'Failed to go live');
                    });
                }
                return res.json();
            })
            .then(() => {
                refreshLiveStatus();
                refreshHeatmap();
            })
            .catch((err) => alert(err.message));
    };

    const endLive = () => {
        authFetch("http://localhost:5076/debate-manager/live/end", {
            method: "POST"
        })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to end live debate');
                return res.json();
            })
            .then(() => {
                refreshLiveStatus();
                setHeatmapData(null);
            })
            .catch((err) => alert(err.message));
    };

    const changeRound = (roundNumber) => {
        authFetch("http://localhost:5076/debate-manager/live/change-round", {
            method: "POST",
            body: JSON.stringify({ roundNumber })
        })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to change round');
                return res.json();
            })
            .then(() => refreshLiveStatus())
            .catch((err) => alert(err.message));
    };

    const deleteDebate = (debateId) => {
        if (!confirm("Are you sure you want to delete this debate?")) return;

        authFetch(`http://localhost:5076/debate-manager/debates/${debateId}`, {
            method: "DELETE"
        })
            .then((res) => {
                if (!res.ok) {
                    return res.json().then(data => {
                        throw new Error(data.message || 'Failed to delete debate');
                    });
                }
                return res.json();
            })
            .then(() => refreshDebates())
            .catch((err) => alert(err.message));
    };

    const addQuestion = () => {
        setNewDebate(prev => ({
            ...prev,
            questions: [...prev.questions, ""]
        }));
    };

    const removeQuestion = (index) => {
        setNewDebate(prev => ({
            ...prev,
            questions: prev.questions.filter((_, i) => i !== index)
        }));
    };

    const updateQuestion = (index, value) => {
        setNewDebate(prev => ({
            ...prev,
            questions: prev.questions.map((q, i) => i === index ? value : q)
        }));
    };

    const handleLogout = () => {
        logout();
        navigate("/debate-manager/login");
    };

    // Don't render if not authenticated
    if (!isAuthenticated || !token || !isDebateManager) {
        return null;
    }

    return (
        <div style={{ padding: "1rem", maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                <h1 style={{ color: "#fff" }}>Debate Manager Dashboard</h1>
                <button onClick={handleLogout} style={{
                    padding: "0.5rem 1rem",
                    background: "#dc2626",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer"
                }}>
                    Logout
                </button>
            </div>

            {/* Live Status Section */}
            <div style={{
                background: liveStatus?.isLive ? "#1f2937" : "#374151",
                padding: "1.5rem",
                borderRadius: "8px",
                marginBottom: "2rem",
                border: liveStatus?.isLive ? "2px solid #10b981" : "1px solid #4b5563"
            }}>
                <h2 style={{
                    color: liveStatus?.isLive ? "#10b981" : "#9ca3af",
                    margin: "0 0 1rem 0",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                }}>
                    {liveStatus?.isLive ? "🔴 LIVE" : "⚫ OFFLINE"}
                </h2>

                {liveStatus?.isLive ? (
                    <div>
                        <p style={{ color: "#fff", margin: "0.5rem 0" }}>
                            <strong>Debate:</strong> {liveStatus.debate.title}
                        </p>
                        <p style={{ color: "#fff", margin: "0.5rem 0" }}>
                            <strong>Round:</strong> {liveStatus.currentRound} of {liveStatus.totalRounds}
                        </p>
                        <p style={{ color: "#fff", margin: "0.5rem 0" }}>
                            <strong>Question:</strong> {liveStatus.currentQuestion || "No question"}
                        </p>
                        <p style={{ color: "#fff", margin: "0.5rem 0" }}>
                            <strong>Total Fires:</strong> {liveStatus.totalFires}
                        </p>

                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
                            <button
                                onClick={() => changeRound(liveStatus.currentRound - 1)}
                                disabled={liveStatus.currentRound <= 1}
                                style={{
                                    padding: "0.5rem 1rem",
                                    background: liveStatus.currentRound > 1 ? "#3b82f6" : "#6b7280",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: liveStatus.currentRound > 1 ? "pointer" : "not-allowed"
                                }}
                            >
                                ← Previous Round
                            </button>

                            <button
                                onClick={() => changeRound(liveStatus.currentRound + 1)}
                                disabled={liveStatus.currentRound >= liveStatus.totalRounds}
                                style={{
                                    padding: "0.5rem 1rem",
                                    background: liveStatus.currentRound < liveStatus.totalRounds ? "#3b82f6" : "#6b7280",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: liveStatus.currentRound < liveStatus.totalRounds ? "pointer" : "not-allowed"
                                }}
                            >
                                Next Round →
                            </button>

                            <button
                                onClick={endLive}
                                style={{
                                    padding: "0.5rem 1rem",
                                    background: "#dc2626",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer"
                                }}
                            >
                                End Live
                            </button>

                            <button
                                onClick={() => { refreshLiveStatus(); refreshHeatmap(); }}
                                style={{
                                    padding: "0.5rem 1rem",
                                    background: "#16a34a",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer"
                                }}
                            >
                                Refresh
                            </button>

                            {/* 🚀 New button to LiveDebatePage */}
                            <button
                                onClick={() => navigate("/debate-manager/live")}
                                style={{
                                    padding: "0.5rem 1rem",
                                    background: "#f59e0b",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer"
                                }}
                            >
                                Open Live Control →
                            </button>
                        </div>
                    </div>
                ) : (
                    <p style={{ color: "#9ca3af" }}>No debate is currently live</p>
                )}
            </div>

            {/* Heatmap Data */}
            {heatmapData && (
                <div style={{
                    background: "#1f2937",
                    padding: "1.5rem",
                    borderRadius: "8px",
                    marginBottom: "2rem"
                }}>
                    <h3 style={{ color: "#fff", margin: "0 0 1rem 0" }}>📊 Live Heatmap Data</h3>
                    <p style={{ color: "#fff" }}>
                        <strong>Total Fires in Current Session:</strong> {heatmapData.total}
                    </p>
                    <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
                        Last {heatmapData.buckets.length} data points (refreshes every 5 seconds)
                    </p>
                </div>
            )}

            {/* Create New Debate */}
            <div style={{ marginBottom: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h2 style={{ color: "#fff", margin: 0 }}>My Debates</h2>
                    <button
                        onClick={() => setIsCreating(!isCreating)}
                        style={{
                            padding: "0.5rem 1rem",
                            background: "#16a34a",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer"
                        }}
                    >
                        {isCreating ? "Cancel" : "+ New Debate"}
                    </button>
                </div>

                {isCreating && (
                    <div style={{
                        background: "#1f2937",
                        padding: "1.5rem",
                        borderRadius: "8px",
                        marginBottom: "1rem"
                    }}>
                        <h3 style={{ color: "#fff", marginTop: 0 }}>Create New Debate</h3>

                        <input
                            type="text"
                            placeholder="Debate Title"
                            value={newDebate.title}
                            onChange={(e) => setNewDebate(prev => ({ ...prev, title: e.target.value }))}
                            style={{
                                width: "100%",
                                padding: "0.75rem",
                                marginBottom: "1rem",
                                background: "#374151",
                                border: "1px solid #4b5563",
                                borderRadius: "4px",
                                color: "#fff"
                            }}
                        />

                        <textarea
                            placeholder="Description (optional)"
                            value={newDebate.description}
                            onChange={(e) => setNewDebate(prev => ({ ...prev, description: e.target.value }))}
                            style={{
                                width: "100%",
                                padding: "0.75rem",
                                marginBottom: "1rem",
                                background: "#374151",
                                border: "1px solid #4b5563",
                                borderRadius: "4px",
                                color: "#fff",
                                minHeight: "80px",
                                resize: "vertical"
                            }}
                        />

                        <h4 style={{ color: "#fff" }}>Questions:</h4>
                        {newDebate.questions.map((question, index) => (
                            <div key={index} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                                <span style={{ color: "#9ca3af", minWidth: "60px", paddingTop: "0.75rem" }}>
                                    Round {index + 1}:
                                </span>
                                <input
                                    type="text"
                                    placeholder={`Question for round ${index + 1}`}
                                    value={question}
                                    onChange={(e) => updateQuestion(index, e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: "0.75rem",
                                        background: "#374151",
                                        border: "1px solid #4b5563",
                                        borderRadius: "4px",
                                        color: "#fff"
                                    }}
                                />
                                {newDebate.questions.length > 1 && (
                                    <button
                                        onClick={() => removeQuestion(index)}
                                        style={{
                                            padding: "0.75rem",
                                            background: "#dc2626",
                                            color: "#fff",
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: "pointer"
                                        }}
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ))}

                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                            <button
                                onClick={addQuestion}
                                style={{
                                    padding: "0.5rem 1rem",
                                    background: "#3b82f6",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer"
                                }}
                            >
                                + Add Question
                            </button>

                            <button
                                onClick={createDebate}
                                style={{
                                    padding: "0.5rem 1rem",
                                    background: "#16a34a",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer"
                                }}
                            >
                                Create Debate
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Debates List */}
            <div style={{
                display: "grid",
                gap: "1rem",
                gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))"
            }}>
                {debates.length === 0 ? (
                    <p style={{ color: "#9ca3af", gridColumn: "1 / -1" }}>
                        No debates created yet. Click "New Debate" to get started.
                    </p>
                ) : (
                    debates.map((debate) => (
                        <div
                            key={debate.id}
                            style={{
                                background: "#1f2937",
                                padding: "1.5rem",
                                borderRadius: "8px",
                                border: "1px solid #374151"
                            }}
                        >
                            <h3 style={{ color: "#fff", margin: "0 0 0.5rem 0" }}>{debate.title}</h3>
                            {debate.description && (
                                <p style={{ color: "#9ca3af", fontSize: "0.9rem", margin: "0 0 1rem 0" }}>
                                    {debate.description}
                                </p>
                            )}
                            <p style={{ color: "#9ca3af", fontSize: "0.8rem", margin: "0 0 1rem 0" }}>
                                {debate.questionCount} questions • Created {new Date(debate.createdAt).toLocaleDateString()}
                            </p>

                            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                <button
                                    onClick={() => goLive(debate.id)}
                                    disabled={liveStatus?.isLive}
                                    style={{
                                        padding: "0.5rem 1rem",
                                        background: liveStatus?.isLive ? "#6b7280" : "#10b981",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: liveStatus?.isLive ? "not-allowed" : "pointer"
                                    }}
                                >
                                    Go Live
                                </button>
                                <button
                                    onClick={() => deleteDebate(debate.id)}
                                    style={{
                                        padding: "0.5rem 1rem",
                                        background: "#dc2626",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: "pointer"
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
