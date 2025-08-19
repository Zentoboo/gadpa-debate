import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";
import "../css/Dashboard.css";

export default function DebateManagerDashboard() {
    const { token, isAuthenticated, isDebateManager } = useAuth();
    const navigate = useNavigate();

    const [debates, setDebates] = useState([]);
    const [liveStatus, setLiveStatus] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [editingDebateId, setEditingDebateId] = useState(null);
    const [heatmapData, setHeatmapData] = useState(null);
    const [newDebate, setNewDebate] = useState({
        title: "",
        description: "",
        questions: [""]
    });
    const [editDebate, setEditDebate] = useState({
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

    const startEditDebate = (debate) => {
        // First fetch the full debate details including questions
        authFetch(`http://localhost:5076/debate-manager/debates/${debate.id}`)
            .then((res) => {
                if (!res.ok) throw new Error('Failed to fetch debate details');
                return res.json();
            })
            .then((fullDebate) => {
                // Handle questions whether they come as objects or strings
                let processedQuestions = [""];

                if (fullDebate.questions && fullDebate.questions.length > 0) {
                    processedQuestions = fullDebate.questions.map(question => {
                        // If question is an object, extract the text property
                        if (typeof question === 'object' && question !== null) {
                            return question.text || question.question || question.content || "";
                        }
                        // If question is already a string, use it directly
                        return question || "";
                    });
                }

                setEditDebate({
                    title: fullDebate.title,
                    description: fullDebate.description || "",
                    questions: processedQuestions
                });
                setEditingDebateId(debate.id);
                setIsCreating(false); // Close create form if open
            })
            .catch((err) => alert(err.message));
    };

    const saveEditDebate = () => {
        if (!editDebate.title.trim()) {
            alert("Title is required");
            return;
        }

        const validQuestions = editDebate.questions.filter(q => q.trim());
        if (validQuestions.length === 0) {
            alert("At least one question is required");
            return;
        }

        authFetch(`http://localhost:5076/debate-manager/debates/${editingDebateId}`, {
            method: "PUT",
            body: JSON.stringify({
                title: editDebate.title.trim(),
                description: editDebate.description.trim(),
                questions: validQuestions.map(q => q.trim())
            })
        })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to update debate');
                return res.json();
            })
            .then(() => {
                setEditDebate({ title: "", description: "", questions: [""] });
                setEditingDebateId(null);
                refreshDebates();
            })
            .catch((err) => alert(err.message));
    };

    const cancelEdit = () => {
        setEditingDebateId(null);
        setEditDebate({ title: "", description: "", questions: [""] });
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
        if (!window.confirm("Are you sure you want to end the current live debate?")) {
            return;
        }

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

    const deleteDebate = (debateId) => {
        if (!window.confirm("Are you sure you want to delete this debate?")) {
            return;
        }

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

    // Helper functions for create form
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

    // Helper functions for edit form
    const addEditQuestion = () => {
        setEditDebate(prev => ({
            ...prev,
            questions: [...prev.questions, ""]
        }));
    };

    const removeEditQuestion = (index) => {
        setEditDebate(prev => ({
            ...prev,
            questions: prev.questions.filter((_, i) => i !== index)
        }));
    };

    const updateEditQuestion = (index, value) => {
        setEditDebate(prev => ({
            ...prev,
            questions: prev.questions.map((q, i) => i === index ? value : q)
        }));
    };

    if (!isAuthenticated || !token || !isDebateManager) {
        return null;
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1 className="dashboard-title">Debate Manager Dashboard</h1>
            </div>

            {/* Live Status Section */}
            <h2 className="section-title">Live Debate Status</h2>
            <div className={`live-status ${liveStatus?.isLive ? 'active' : ''}`}>
                <h3 className="section-title" style={{ marginTop: 0 }}>
                    {liveStatus?.isLive ? "LIVE" : "OFFLINE"}
                </h3>

                {liveStatus?.isLive ? (
                    <div>
                        <p><strong>Debate:</strong> {liveStatus.debate.title}</p>
                        <p><strong>Total Rounds:</strong> {liveStatus.totalRounds}</p>
                        <p><strong>Total Fires:</strong> {liveStatus.totalFires}</p>

                        <div className="table-actions" style={{ marginTop: "1rem" }}>
                            <button
                                onClick={() => navigate("/debate-manager/live")}
                                className="table-button primary"
                            >
                                Open Live Control &rarr;
                            </button>
                            <button
                                onClick={endLive}
                                className="table-button danger"
                            >
                                End Live Debate
                            </button>
                        </div>
                    </div>
                ) : (
                    <p style={{ color: "#9ca3af" }}>No debate is currently live. Select one from the list below to go live.</p>
                )}
            </div>

            {/* Heatmap Data */}
            {heatmapData && (
                <div className="live-status">
                    <h3 className="section-title">Live Heatmap Data</h3>
                    <p style={{ color: "#fff" }}>
                        <strong>Total Fires in Current Session:</strong> {heatmapData.total}
                    </p>
                    <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
                        Last {heatmapData.buckets.length} data points (refreshes every 5 seconds)
                    </p>
                </div>
            )}

            {/* Create New Debate */}
            <h2 className="section-title">My Debates</h2>
            <button
                onClick={() => {
                    setIsCreating(!isCreating);
                    if (editingDebateId) {
                        cancelEdit();
                    }
                }}
                className="table-button primary"
                style={{ marginBottom: "1rem" }}
            >
                {isCreating ? "Cancel" : "+ New Debate"}
            </button>

            {isCreating && (
                <div style={{ marginBottom: "2rem", padding: "1.5rem", borderRadius: "8px", background: "#1f2937", border: "1px solid #374151" }}>
                    <h3 style={{ color: "#fff", marginTop: 0 }}>Create New Debate</h3>

                    <input
                        type="text"
                        placeholder="Debate Title"
                        value={newDebate.title}
                        onChange={(e) => setNewDebate(prev => ({ ...prev, title: e.target.value }))}
                        className="auth-input"
                        style={{ marginBottom: "1rem" }}
                    />

                    <textarea
                        placeholder="Description (optional)"
                        value={newDebate.description}
                        onChange={(e) => setNewDebate(prev => ({ ...prev, description: e.target.value }))}
                        className="auth-input"
                        style={{ marginBottom: "1rem", minHeight: "80px", resize: "vertical" }}
                    />

                    <h4 style={{ color: "#fff", marginBottom: "0.5rem" }}>Questions:</h4>
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
                                className="auth-input"
                                style={{ flex: 1 }}
                            />
                            {newDebate.questions.length > 1 && (
                                <button
                                    onClick={() => removeQuestion(index)}
                                    className="table-button danger"
                                >
                                    &times;
                                </button>
                            )}
                        </div>
                    ))}

                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                        <button
                            onClick={addQuestion}
                            className="table-button secondary"
                        >
                            + Add Question
                        </button>

                        <button
                            onClick={createDebate}
                            className="table-button primary"
                        >
                            Create Debate
                        </button>
                    </div>
                </div>
            )}

            {/* Edit Debate Form */}
            {editingDebateId && (
                <div style={{ marginBottom: "2rem", padding: "1.5rem", borderRadius: "8px", background: "#1f2937", border: "1px solid #4f46e5" }}>
                    <h3 style={{ color: "#fff", marginTop: 0 }}>Edit Debate</h3>

                    <input
                        type="text"
                        placeholder="Debate Title"
                        value={editDebate.title}
                        onChange={(e) => setEditDebate(prev => ({ ...prev, title: e.target.value }))}
                        className="auth-input"
                        style={{ marginBottom: "1rem" }}
                    />

                    <textarea
                        placeholder="Description (optional)"
                        value={editDebate.description}
                        onChange={(e) => setEditDebate(prev => ({ ...prev, description: e.target.value }))}
                        className="auth-input"
                        style={{ marginBottom: "1rem", minHeight: "80px", resize: "vertical" }}
                    />

                    <h4 style={{ color: "#fff", marginBottom: "0.5rem" }}>Questions:</h4>
                    {editDebate.questions.map((question, index) => (
                        <div key={index} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                            <span style={{ color: "#9ca3af", minWidth: "60px", paddingTop: "0.75rem" }}>
                                Round {index + 1}:
                            </span>
                            <input
                                type="text"
                                placeholder={`Question for round ${index + 1}`}
                                value={question}
                                onChange={(e) => updateEditQuestion(index, e.target.value)}
                                className="auth-input"
                                style={{ flex: 1 }}
                            />
                            {editDebate.questions.length > 1 && (
                                <button
                                    onClick={() => removeEditQuestion(index)}
                                    className="table-button danger"
                                >
                                    &times;
                                </button>
                            )}
                        </div>
                    ))}

                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                        <button
                            onClick={addEditQuestion}
                            className="table-button secondary"
                        >
                            + Add Question
                        </button>

                        <button
                            onClick={saveEditDebate}
                            className="table-button primary"
                        >
                            Save Changes
                        </button>

                        <button
                            onClick={cancelEdit}
                            className="table-button secondary"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Debates List */}
            <table className="dashboard-table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Description</th>
                        <th>Questions</th>
                        <th>Created At</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {debates.length === 0 ? (
                        <tr>
                            <td colSpan="5" style={{ textAlign: "center" }}>No debates created yet. Click "New Debate" to get started.</td>
                        </tr>
                    ) : (
                        debates.map((debate) => (
                            <tr key={debate.id}>
                                <td>{debate.title}</td>
                                <td>{debate.description}</td>
                                <td>{debate.questionCount}</td>
                                <td>{new Date(debate.createdAt).toLocaleDateString()}</td>
                                <td>
                                    <div className="table-actions">
                                        <button
                                            onClick={() => goLive(debate.id)}
                                            disabled={liveStatus?.isLive}
                                            className={`table-button ${liveStatus?.isLive ? 'secondary' : 'primary'}`}
                                        >
                                            Go Live
                                        </button>
                                        <button
                                            onClick={() => startEditDebate(debate)}
                                            className="table-button secondary"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => deleteDebate(debate.id)}
                                            className="table-button danger"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}