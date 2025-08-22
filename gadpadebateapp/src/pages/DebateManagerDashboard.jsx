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
        questions: [""],
        allowUserQuestions: false,
        maxQuestionsPerUser: 3,
        allowQuestionsWhenLive: false,
    });

    const [editDebate, setEditDebate] = useState({
        title: "",
        description: "",
        questions: [""],
        allowUserQuestions: false,
        maxQuestionsPerUser: 3,
        allowQuestionsWhenLive: false,
    });

    const authFetch = (url, options = {}) =>
        fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...options.headers,
            },
        });

    useEffect(() => {
        if (!isAuthenticated || !token || !isDebateManager) {
            navigate("/debate-manager/login");
        }
    }, [isAuthenticated, token, isDebateManager, navigate]);

    useEffect(() => {
        if (!token || !isAuthenticated || !isDebateManager) return;
        refreshDebates();
        refreshLiveStatus();
    }, [token, isAuthenticated, isDebateManager]);

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
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch debates");
                return res.json();
            })
            .then(setDebates)
            .catch(console.error);
    };

    const refreshLiveStatus = () => {
        authFetch("http://localhost:5076/debate-manager/live/status")
            .then(res => res.json())
            .then(setLiveStatus)
            .catch(console.error);
    };

    const refreshHeatmap = () => {
        authFetch("http://localhost:5076/debate-manager/live/heatmap?intervalSeconds=10&lastMinutes=5")
            .then(res => res.json())
            .then(setHeatmapData)
            .catch(console.error);
    };

    const createDebate = () => {
        const validQuestions = newDebate.questions.filter(q => q.trim());
        if (!newDebate.title.trim() || validQuestions.length === 0) {
            alert("Title and at least one question are required");
            return;
        }

        authFetch("http://localhost:5076/debate-manager/debates", {
            method: "POST",
            body: JSON.stringify({
                title: newDebate.title.trim(),
                description: newDebate.description.trim(),
                questions: validQuestions.map(q => q.trim()),
                allowUserQuestions: newDebate.allowUserQuestions,
                maxQuestionsPerUser: newDebate.maxQuestionsPerUser,
                allowQuestionsWhenLive: newDebate.allowQuestionsWhenLive,
            }),
        })
            .then(res => {
                if (!res.ok) throw new Error("Failed to create debate");
                return res.json();
            })
            .then(() => {
                setNewDebate({
                    title: "",
                    description: "",
                    questions: [""],
                    allowUserQuestions: false,
                    maxQuestionsPerUser: 3,
                    allowQuestionsWhenLive: false,
                });
                setIsCreating(false);
                refreshDebates();
            })
            .catch(err => alert(err.message));
    };

    const startEditDebate = (debate) => {
        authFetch(`http://localhost:5076/debate-manager/debates/${debate.id}`)
            .then(res => res.json())
            .then(fullDebate => {
                const processedQuestions = (fullDebate.questions || []).map(q =>
                    typeof q === "object" ? q.question || "" : q || ""
                );
                setEditDebate({
                    title: fullDebate.title,
                    description: fullDebate.description || "",
                    questions: processedQuestions.length ? processedQuestions : [""],
                    allowUserQuestions: fullDebate.allowUserQuestions,
                    maxQuestionsPerUser: fullDebate.maxQuestionsPerUser || 3,
                    allowQuestionsWhenLive: fullDebate.allowQuestionsWhenLive,
                });
                setEditingDebateId(debate.id);
                setIsCreating(false);
            })
            .catch(err => alert(err.message));
    };

    const saveEditDebate = () => {
        const validQuestions = editDebate.questions.filter(q => q.trim());
        if (!editDebate.title.trim() || validQuestions.length === 0) {
            alert("Title and at least one question are required");
            return;
        }

        authFetch(`http://localhost:5076/debate-manager/debates/${editingDebateId}`, {
            method: "PUT",
            body: JSON.stringify({
                title: editDebate.title.trim(),
                description: editDebate.description.trim(),
                questions: validQuestions.map(q => q.trim()),
                allowUserQuestions: editDebate.allowUserQuestions,
                maxQuestionsPerUser: editDebate.maxQuestionsPerUser,
                allowQuestionsWhenLive: editDebate.allowQuestionsWhenLive,
            }),
        })
            .then(res => res.json())
            .then(() => {
                setEditDebate({
                    title: "",
                    description: "",
                    questions: [""],
                    allowUserQuestions: false,
                    maxQuestionsPerUser: 3,
                    allowQuestionsWhenLive: false,
                });
                setEditingDebateId(null);
                refreshDebates();
            })
            .catch(err => alert(err.message));
    };

    const cancelEdit = () => {
        setEditingDebateId(null);
        setEditDebate({
            title: "",
            description: "",
            questions: [""],
            allowUserQuestions: false,
            maxQuestionsPerUser: 3,
            allowQuestionsWhenLive: false,
        });
    };

    const goLive = (id) => {
        authFetch(`http://localhost:5076/debate-manager/debates/${id}/go-live`, { method: "POST" })
            .then(res => res.json())
            .then(() => {
                refreshLiveStatus();
                refreshHeatmap();
            })
            .catch(err => alert(err.message));
    };

    const endLive = () => {
        if (!window.confirm("Are you sure you want to end the current live debate?")) return;
        authFetch("http://localhost:5076/debate-manager/live/end", { method: "POST" })
            .then(res => res.json())
            .then(() => {
                refreshLiveStatus();
                setHeatmapData(null);
            })
            .catch(err => alert(err.message));
    };

    const deleteDebate = (id) => {
        if (!window.confirm("Are you sure you want to delete this debate?")) return;
        authFetch(`http://localhost:5076/debate-manager/debates/${id}`, { method: "DELETE" })
            .then(res => res.json())
            .then(() => refreshDebates())
            .catch(err => alert(err.message));
    };

    const addQuestion = () => setNewDebate(prev => ({ ...prev, questions: [...prev.questions, ""] }));
    const removeQuestion = (i) => setNewDebate(prev => ({ ...prev, questions: prev.questions.filter((_, idx) => idx !== i) }));
    const updateQuestion = (i, val) => setNewDebate(prev => ({ ...prev, questions: prev.questions.map((q, idx) => idx === i ? val : q) }));

    const addEditQuestion = () => setEditDebate(prev => ({ ...prev, questions: [...prev.questions, ""] }));
    const removeEditQuestion = (i) => setEditDebate(prev => ({ ...prev, questions: prev.questions.filter((_, idx) => idx !== i) }));
    const updateEditQuestion = (i, val) => setEditDebate(prev => ({ ...prev, questions: prev.questions.map((q, idx) => idx === i ? val : q) }));

    if (!isAuthenticated || !token || !isDebateManager) return null;

    return (
        <div className="dashboard-container">
            <div className="dashboard-header"><h1>Debate Manager Dashboard</h1></div>

            {/* Live Status Section */}
            <h2 className="section-title">Live Debate Status</h2>
            <div className={`live-status ${liveStatus?.isLive ? "active" : ""}`}>
                {liveStatus?.isLive ? (
                    <div>
                        <p><strong>Debate:</strong> {liveStatus.debate.title}</p>
                        <p><strong>Total Rounds:</strong> {liveStatus.totalRounds}</p>
                        <p><strong>Total Fires:</strong> {liveStatus.totalFires}</p>
                        <div className="table-actions" style={{ marginTop: "1rem" }}>
                            <button onClick={() => navigate("/debate-manager/live")} className="table-button primary">Open Live Control →</button>
                            <button onClick={endLive} className="table-button danger">End Live Debate</button>
                        </div>
                    </div>
                ) : <p style={{ color: "#9ca3af" }}>No debate is currently live.</p>}
            </div>

            {heatmapData && (
                <div className="live-status">
                    <h3>Live Heatmap Data</h3>
                    <p><strong>Total Fires:</strong> {heatmapData.total}</p>
                </div>
            )}

            {/* Create Form */}
            <h2>My Debates</h2>
            <button onClick={() => { setIsCreating(!isCreating); if (editingDebateId) cancelEdit(); }} className="table-button primary" style={{ marginBottom: "1rem" }}>
                {isCreating ? "Cancel" : "+ New Debate"}
            </button>

            {/* Create Form */}
            {isCreating && (
                <div className="form-box">
                    <h3>Create New Debate</h3>
                    <input
                        type="text"
                        placeholder="Debate Title"
                        value={newDebate.title}
                        onChange={(e) =>
                            setNewDebate((prev) => ({ ...prev, title: e.target.value }))
                        }
                        className="auth-input"
                    />
                    <textarea
                        placeholder="Description"
                        value={newDebate.description}
                        onChange={(e) =>
                            setNewDebate((prev) => ({ ...prev, description: e.target.value }))
                        }
                        className="auth-input"
                    />

                    {/* Settings */}
                    <div className="settings">
                        <label>
                            <input
                                type="checkbox"
                                checked={newDebate.allowUserQuestions}
                                onChange={(e) =>
                                    setNewDebate((prev) => ({
                                        ...prev,
                                        allowUserQuestions: e.target.checked,
                                    }))
                                }
                            />
                            Allow User Questions
                        </label>
                        <label>
                            Max Per User:
                            <input
                                type="number"
                                min="1"
                                max="20"
                                value={newDebate.maxQuestionsPerUser}
                                onChange={(e) =>
                                    setNewDebate((prev) => ({
                                        ...prev,
                                        maxQuestionsPerUser: Number(e.target.value),
                                    }))
                                }
                            />
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={newDebate.allowQuestionsWhenLive}
                                onChange={(e) =>
                                    setNewDebate((prev) => ({
                                        ...prev,
                                        allowQuestionsWhenLive: e.target.checked,
                                    }))
                                }
                            />
                            Allow During Live
                        </label>
                    </div>

                    <h4>Questions</h4>
                    <table className="questions-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Question</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {newDebate.questions.map((q, i) => (
                                <tr key={i}>
                                    <td>{i + 1}</td>
                                    <td>
                                        <textarea
                                            value={q}
                                            onChange={(e) => updateQuestion(i, e.target.value)}
                                            rows={2}
                                            style={{ width: "100%", resize: "vertical", overflowWrap: "break-word" }}
                                        />
                                    </td>
                                    <td>
                                        {newDebate.questions.length > 1 && (
                                            <button className="danger" onClick={() => removeQuestion(i)}>×</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button onClick={addQuestion}>+ Add Question</button>
                    <button onClick={createDebate}>Create Debate</button>
                </div>
            )}

            {/* Edit Form */}
            {editingDebateId && (
                <div className="form-box">
                    <h3>Edit Debate</h3>
                    <input
                        type="text"
                        value={editDebate.title}
                        onChange={(e) =>
                            setEditDebate((prev) => ({ ...prev, title: e.target.value }))
                        }
                        className="auth-input"
                    />
                    <textarea
                        value={editDebate.description}
                        onChange={(e) =>
                            setEditDebate((prev) => ({ ...prev, description: e.target.value }))
                        }
                        className="auth-input"
                    />

                    {/* Settings */}
                    <div className="settings">
                        <label>
                            <input
                                type="checkbox"
                                checked={editDebate.allowUserQuestions}
                                onChange={(e) =>
                                    setEditDebate((prev) => ({
                                        ...prev,
                                        allowUserQuestions: e.target.checked,
                                    }))
                                }
                            />
                            Allow User Questions
                        </label>
                        <label>
                            Max Per User:
                            <input
                                type="number"
                                min="1"
                                max="20"
                                value={editDebate.maxQuestionsPerUser}
                                onChange={(e) =>
                                    setEditDebate((prev) => ({
                                        ...prev,
                                        maxQuestionsPerUser: Number(e.target.value),
                                    }))
                                }
                            />
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={editDebate.allowQuestionsWhenLive}
                                onChange={(e) =>
                                    setEditDebate((prev) => ({
                                        ...prev,
                                        allowQuestionsWhenLive: e.target.checked,
                                    }))
                                }
                            />
                            Allow During Live
                        </label>
                    </div>

                    <h4>Questions</h4>
                    {editDebate.questions.map((q, i) => (
                        <div className="question-row" key={i}>
                            <input
                                type="text"
                                value={q}
                                onChange={(e) => updateEditQuestion(i, e.target.value)}
                            />
                            {editDebate.questions.length > 1 && (
                                <button className="danger" onClick={() => removeEditQuestion(i)}>
                                    ×
                                </button>
                            )}
                        </div>
                    ))}
                    <button onClick={addEditQuestion}>+ Add Question</button>
                    <button onClick={saveEditDebate}>Save</button>
                    <button className="secondary" onClick={cancelEdit}>
                        Cancel
                    </button>
                </div>
            )}

            {/* Debate List */}
            <table className="dashboard-table">
                <thead>
                    <tr><th>Title</th><th>Questions</th><th>Created</th><th>Actions</th></tr>
                </thead>
                <tbody>
                    {debates.map(d => (
                        <tr key={d.id}>
                            <td>{d.title}</td>
                            <td>{d.questionCount}</td>
                            <td>{new Date(d.createdAt).toLocaleDateString()}</td>
                            <td>
                                <button onClick={() => goLive(d.id)} disabled={liveStatus?.isLive}>Go Live</button>
                                <button onClick={() => startEditDebate(d)}>Edit</button>
                                <button onClick={() => deleteDebate(d.id)}>Delete</button>
                                <button onClick={() => navigate(`/debate-manager/debates/${d.id}/user-questions`)}>User Questions</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
