import API_URL from "../config";
import React, { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../css/Dashboard.css";

export default function DebateManagerDashboard() {
    const { token, isAuthenticated, isDebateManager } = useAuth();
    const navigate = useNavigate();

    const [debates, setDebates] = useState([]);
    const [liveStatus, setLiveStatus] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [editingDebateId, setEditingDebateId] = useState(null);

    const toUtcFromLocal = (localString) => {
        if (!localString) return null;
        const d = new Date(localString);
        return d.toISOString();
    };

    const toLocalDateTimeInputValue = (utcString) => {
        if (!utcString) return "";
        const d = new Date(utcString);
        const pad = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    };

    const [newDebate, setNewDebate] = useState({
        title: "",
        description: "",
        questions: [""],
        allowUserQuestions: false,
        maxQuestionsPerUser: 3,
        scheduledStartTime: "",
        candidates: [],
        requirePassword: false,
        accessPassword: "",
    });

    const [editDebate, setEditDebate] = useState({
        title: "",
        description: "",
        questions: [""],
        allowUserQuestions: false,
        maxQuestionsPerUser: 3,
        scheduledStartTime: "",
        candidates: [],
        requirePassword: false,
        accessPassword: "",
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
        if (!token || !isAuthenticated || !isDebateManager) return;
        refreshDebates();
        refreshLiveStatus();
    }, [token, isAuthenticated, isDebateManager]);

    useEffect(() => {
        if (!liveStatus?.isLive) return;
        const interval = setInterval(() => {
            refreshLiveStatus();
        }, 5000);
        return () => clearInterval(interval);
    }, [liveStatus?.isLive]);

    const refreshDebates = () => {
        authFetch(`${API_URL}/debate-manager/debates`)
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch debates");
                return res.json();
            })
            .then(setDebates)
            .catch(console.error);
    };

    const refreshLiveStatus = () => {
        authFetch(`${API_URL}/debate-manager/live/status`)
            .then(res => res.json())
            .then(setLiveStatus)
            .catch(console.error);
    };

    const createDebate = () => {
        const validQuestions = newDebate.questions.filter(q => q.trim());
        if (!newDebate.title.trim() || validQuestions.length === 0) return;

        authFetch(`${API_URL}/debate-manager/debates`, {
            method: "POST",
            body: JSON.stringify({
                title: newDebate.title.trim(),
                description: newDebate.description.trim(),
                questions: validQuestions.map(q => q.trim()),
                allowUserQuestions: newDebate.allowUserQuestions,
                maxQuestionsPerUser: newDebate.maxQuestionsPerUser,
                scheduledStartTime: newDebate.scheduledStartTime
                    ? toUtcFromLocal(newDebate.scheduledStartTime)
                    : null,
                candidates: newDebate.candidates.map(c => ({
                    name: c.name,
                    imageData: c.imageData
                })),
                requirePassword: newDebate.requirePassword,
                accessPassword: newDebate.accessPassword,
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
                    scheduledStartTime: "",
                    candidates: [],
                    requirePassword: false,
                    accessPassword: "",
                });
                setIsCreating(false);
                refreshDebates();
            })
            .catch(err => alert(err.message));
    };

    const startEditDebate = (debate) => {
        authFetch(`${API_URL}/debate-manager/debates/${debate.id}`)
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
                    scheduledStartTime: fullDebate.scheduledStartTime
                        ? toLocalDateTimeInputValue(fullDebate.scheduledStartTime)
                        : "",
                    candidates: (fullDebate.candidates || []).map(c => ({
                        name: c.name,
                        imageData: c.imageData || null
                    })),
                    requirePassword: fullDebate.requirePassword || false,
                    accessPassword: fullDebate.accessPassword || "",
                });
                setEditingDebateId(debate.id);
                setIsCreating(false);
            })
            .catch(err => alert(err.message));
    };

    const saveEditDebate = () => {
        const validQuestions = editDebate.questions.filter(q => q.trim());
        if (!editDebate.title.trim()) {
            alert("Title is required.");
            return;
        }

        if (validQuestions.length === 0) {
            alert("At least one question is required.");
            return;
        }

        const requestBody = {
            title: editDebate.title.trim(),
            description: editDebate.description.trim(),
            questions: validQuestions.map(q => q.trim()),
            allowUserQuestions: editDebate.allowUserQuestions,
            maxQuestionsPerUser: editDebate.maxQuestionsPerUser,
            scheduledStartTime: editDebate.scheduledStartTime
                ? toUtcFromLocal(editDebate.scheduledStartTime)
                : null,
            candidates: editDebate.candidates.map(c => ({
                name: c.name,
                imageData: c.imageData
            })),
            requirePassword: editDebate.requirePassword,
            accessPassword: editDebate.accessPassword,
        };

        authFetch(`${API_URL}/debate-manager/debates/${editingDebateId}`, {
            method: "PUT",
            body: JSON.stringify(requestBody),
        })
            .then(res => {
                if (!res.ok) {
                    return res.json().then(err => {
                        throw new Error(err.message || "Failed to save debate");
                    });
                }
                return res.json();
            })
            .then(() => {
                setEditDebate({
                    title: "",
                    description: "",
                    questions: [""],
                    allowUserQuestions: false,
                    maxQuestionsPerUser: 3,
                    scheduledStartTime: "",
                    candidates: [],
                    requirePassword: false,
                    accessPassword: "",
                });
                setEditingDebateId(null);
                refreshDebates();
                alert("Debate updated successfully!");
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
            scheduledStartTime: "",
            candidates: [],
            requirePassword: false,
            accessPassword: "",
        });
    };

    const goLive = (id) => {
        authFetch(`${API_URL}/debate-manager/debates/${id}/go-live`, { method: "POST" })
            .then(res => res.json())
            .then(() => {
                refreshLiveStatus();
            })
            .catch(err => alert(err.message));
    };

    const endLive = () => {
        const confirmationMessage = liveStatus.isActive
            ? "Are you sure you want to end the current live debate?"
            : "Are you sure you want to cancel the scheduled debate?";

        if (!window.confirm(confirmationMessage)) return;

        authFetch(`${API_URL}/debate-manager/live/end`, { method: "POST" })
            .then(async res => {
                const responseData = await res.json();
                if (!res.ok) {
                    throw new Error(responseData.message || `HTTP ${res.status}`);
                }
                return responseData;
            })
            .then(() => {
                refreshLiveStatus();
            })
            .catch(err => {
                alert(`Failed to end debate: ${err.message}`);
            });
    };

    const deleteDebate = (id) => {
        if (!window.confirm("Are you sure you want to delete this debate?")) return;
        authFetch(`${API_URL}/debate-manager/debates/${id}`, { method: "DELETE" })
            .then(res => res.json())
            .then(() => refreshDebates())
            .catch(console.error);
    };

    const addQuestion = () => setNewDebate(prev => ({ ...prev, questions: [...prev.questions, ""] }));
    const removeQuestion = (i) => setNewDebate(prev => ({ ...prev, questions: prev.questions.filter((_, idx) => idx !== i) }));
    const updateQuestion = (i, val) => setNewDebate(prev => ({ ...prev, questions: prev.questions.map((q, idx) => idx === i ? val : q) }));

    const addEditQuestion = () => setEditDebate(prev => ({ ...prev, questions: [...prev.questions, ""] }));
    const removeEditQuestion = (i) => setEditDebate(prev => ({ ...prev, questions: prev.questions.filter((_, idx) => idx !== i) }));
    const updateEditQuestion = (i, val) => setEditDebate(prev => ({ ...prev, questions: prev.questions.map((q, idx) => idx === i ? val : q) }));

    const handleAddCandidate = () => {
        setNewDebate(prev => ({
            ...prev,
            candidates: [...prev.candidates, { name: "", imageData: null }]
        }));
    };

    const handleUpdateCandidate = (index, field, value) => {
        setNewDebate(prev => {
            const updatedCandidates = [...prev.candidates];
            updatedCandidates[index][field] = value;
            return { ...prev, candidates: updatedCandidates };
        });
    };

    const handleCandidateImageUpload = async (index, file) => {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('Image size must be less than 5MB');
            return;
        }

        try {
            const base64 = await fileToBase64(file);
            handleUpdateCandidate(index, 'imageData', base64);
        } catch (error) {
            alert('Failed to process image');
            console.error(error);
        }
    };

    const handleRemoveCandidate = (index) => {
        setNewDebate(prev => ({
            ...prev,
            candidates: prev.candidates.filter((_, i) => i !== index)
        }));
    };

    const handleAddEditCandidate = () => {
        setEditDebate(prev => ({
            ...prev,
            candidates: [...prev.candidates, { name: "", imageData: null }]
        }));
    };

    const handleUpdateEditCandidate = (index, field, value) => {
        setEditDebate(prev => {
            const updatedCandidates = [...prev.candidates];
            updatedCandidates[index][field] = value;
            return { ...prev, candidates: updatedCandidates };
        });
    };

    const handleEditCandidateImageUpload = async (index, file) => {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('Image size must be less than 5MB');
            return;
        }

        try {
            const base64 = await fileToBase64(file);
            handleUpdateEditCandidate(index, 'imageData', base64);
        } catch (error) {
            alert('Failed to process image');
            console.error(error);
        }
    };

    const handleRemoveEditCandidate = (index) => {
        setEditDebate(prev => ({
            ...prev,
            candidates: prev.candidates.filter((_, i) => i !== index)
        }));
    };

    if (isAuthenticated === null || isDebateManager === null) {
        return <p>Checking authentication...</p>;
    }
    if (!isAuthenticated || !token || !isDebateManager) {
        return <Navigate to="/debate-manager/login" replace />;
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header"><h1>Debate Manager Dashboard</h1></div>

            <div className={`live-status ${liveStatus?.isActive ? "active" : ""}`}>
                {liveStatus?.isLive ? (
                    <div>
                        <p><strong>Debate:</strong> {liveStatus.debate.title}</p>
                        {liveStatus.isPreviewable ? (
                            <>
                                <p style={{ color: "orange" }}>Scheduled: {new Date(liveStatus.debate.scheduledStartTime).toLocaleString()}</p>
                                <div className="table-actions" style={{ marginTop: "1rem" }}>
                                    <button onClick={endLive} className="table-button danger">Cancel Scheduled Debate</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p><strong>Total Rounds:</strong> {liveStatus.debate.totalRounds}</p>
                                <p><strong>Total Fires:</strong> {liveStatus.totalFires}</p>
                                <div className="table-actions" style={{ marginTop: "1rem" }}>
                                    <button onClick={() => navigate("/debate-manager/debate")} className="table-button primary">Debate →</button>
                                    <button onClick={() => navigate("/debate-manager/vote")} className="table-button primary">Voting →</button>
                                    <button onClick={endLive} className="table-button danger">End Live Debate</button>
                                </div>
                            </>
                        )}
                    </div>
                ) : <p style={{ color: "#9ca3af" }}>No debate is currently live.</p>}
            </div>

            <h2>My Debates</h2>
            <button onClick={() => { setIsCreating(!isCreating); if (editingDebateId) cancelEdit(); }} className="table-button primary" style={{ marginBottom: "1rem" }}>
                {isCreating ? "Cancel" : "+ New Debate"}
            </button>

            {isCreating && (
                <div className="form-box">
                    <h3>Create New Debate</h3>
                    <input
                        type="text"
                        placeholder="Debate Title"
                        value={newDebate.title}
                        onChange={(e) => setNewDebate((prev) => ({ ...prev, title: e.target.value }))}
                        className="auth-input"
                    />
                    <textarea
                        placeholder="Description"
                        value={newDebate.description}
                        onChange={(e) => setNewDebate((prev) => ({ ...prev, description: e.target.value }))}
                        className="auth-input"
                    />
                    <div className="settings">
                        <label>
                            <input
                                type="checkbox"
                                checked={newDebate.allowUserQuestions}
                                onChange={(e) => setNewDebate((prev) => ({ ...prev, allowUserQuestions: e.target.checked }))}
                            /> Allow User Questions
                        </label>
                        <label>
                            Max Per User:
                            <input
                                type="number"
                                min="1"
                                max="20"
                                value={newDebate.maxQuestionsPerUser}
                                onChange={(e) => setNewDebate((prev) => ({ ...prev, maxQuestionsPerUser: Number(e.target.value) }))}
                            />
                        </label>
                        <label>
                            Scheduled Start:
                            <input
                                type="datetime-local"
                                value={newDebate.scheduledStartTime}
                                onChange={(e) => setNewDebate((prev) => ({ ...prev, scheduledStartTime: e.target.value }))}
                            />
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={newDebate.requirePassword}
                                onChange={(e) => setNewDebate((prev) => ({ ...prev, requirePassword: e.target.checked }))}
                            /> Require Password
                        </label>
                        {newDebate.requirePassword && (
                            <label>
                                Access Password:
                                <input
                                    type="text"
                                    value={newDebate.accessPassword}
                                    onChange={(e) => setNewDebate((prev) => ({ ...prev, accessPassword: e.target.value }))}
                                    placeholder="(min 4 chars)"
                                    className="auth-input"
                                />
                            </label>
                        )}
                    </div>
                    <h4>Questions</h4>
                    <table className="questions-table">
                        <colgroup>
                            <col className="col-number-q" />
                            <col className="col-question-q" />
                            <col className="col-action-q" />
                        </colgroup>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Question</th>
                                <th>Action</th>
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

                    <h4>Candidates</h4>
                    <table className="candidates-table">
                        <colgroup>
                            <col className="col-number-c" />
                            <col className="col-name-c" />
                            <col className="col-image-c" />
                            <col className="col-preview-c" />
                            <col className="col-action-c" />
                        </colgroup>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Name</th>
                                <th>Image</th>
                                <th>Preview</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {newDebate.candidates.map((c, i) => (
                                <tr key={i}>
                                    <td>{i + 1}</td>
                                    <td>
                                        <input
                                            type="text"
                                            value={c.name}
                                            onChange={(e) => handleUpdateCandidate(i, "name", e.target.value)}
                                            className="auth-input"
                                            placeholder="Candidate Name"
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleCandidateImageUpload(i, e.target.files[0])}
                                            style={{ fontSize: "0.9rem" }}
                                        />
                                    </td>
                                    <td>
                                        {c.imageData && (
                                            <img
                                                src={c.imageData}
                                                alt={c.name}
                                                style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "4px" }}
                                            />
                                        )}
                                    </td>
                                    <td>
                                        <button className="danger" onClick={() => handleRemoveCandidate(i)}>
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button onClick={handleAddCandidate} style={{ marginBottom: "1rem" }}>+ Add Candidate</button>
                    <button onClick={createDebate} className="auth-button">
                        Create Debate
                    </button>
                </div>
            )}

            {editingDebateId && (
                <div className="form-box">
                    <h3>Edit Debate</h3>
                    <input
                        type="text"
                        placeholder="Debate Title"
                        value={editDebate.title}
                        onChange={(e) => setEditDebate((prev) => ({ ...prev, title: e.target.value }))}
                        className="auth-input"
                    />
                    <textarea
                        placeholder="Description"
                        value={editDebate.description}
                        onChange={(e) => setEditDebate((prev) => ({ ...prev, description: e.target.value }))}
                        className="auth-input"
                    />
                    <div className="settings">
                        <label>
                            <input
                                type="checkbox"
                                checked={editDebate.allowUserQuestions}
                                onChange={(e) => setEditDebate((prev) => ({ ...prev, allowUserQuestions: e.target.checked }))}
                            /> Allow User Questions
                        </label>
                        <label>
                            Max Per User:
                            <input
                                type="number"
                                min="1"
                                max="20"
                                value={editDebate.maxQuestionsPerUser}
                                onChange={(e) => setEditDebate((prev) => ({ ...prev, maxQuestionsPerUser: Number(e.target.value) }))}
                            />
                        </label>
                        <label>
                            Scheduled Start:
                            <input
                                type="datetime-local"
                                value={editDebate.scheduledStartTime}
                                onChange={(e) => setEditDebate((prev) => ({ ...prev, scheduledStartTime: e.target.value }))}
                            />
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={editDebate.requirePassword}
                                onChange={(e) => setEditDebate((prev) => ({ ...prev, requirePassword: e.target.checked }))}
                            /> Require Password
                        </label>
                        {editDebate.requirePassword && (
                            <label>
                                Access Password:
                                <input
                                    type="text"
                                    value={editDebate.accessPassword}
                                    onChange={(e) => setEditDebate((prev) => ({ ...prev, accessPassword: e.target.value }))}
                                    placeholder="Enter access password (min 4 chars)"
                                    className="auth-input"
                                />
                            </label>
                        )}
                    </div>
                    <h4>Questions</h4>
                    <table className="questions-table">
                        <colgroup>
                            <col className="col-number-q" />
                            <col className="col-question-q" />
                            <col className="col-action-q" />
                        </colgroup>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Question</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {editDebate.questions.map((q, i) => (
                                <tr key={i}>
                                    <td>{i + 1}</td>
                                    <td>
                                        <textarea
                                            value={q}
                                            onChange={(e) => updateEditQuestion(i, e.target.value)}
                                            rows={2}
                                            style={{ width: "100%", resize: "vertical", overflowWrap: "break-word" }}
                                        />
                                    </td>
                                    <td>
                                        {editDebate.questions.length > 1 && (
                                            <button className="danger" onClick={() => removeEditQuestion(i)}>×</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button onClick={addEditQuestion}>+ Add Question</button>

                    <h4>Candidates</h4>
                    <table className="candidates-table">
                        <colgroup>
                            <col className="col-number-c" />
                            <col className="col-name-c" />
                            <col className="col-image-c" />
                            <col className="col-preview-c" />
                            <col className="col-action-c" />
                        </colgroup>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Name</th>
                                <th>Image</th>
                                <th>Preview</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {editDebate.candidates.map((c, i) => (
                                <tr key={i}>
                                    <td>{i + 1}</td>
                                    <td>
                                        <input
                                            type="text"
                                            value={c.name}
                                            onChange={(e) => handleUpdateEditCandidate(i, "name", e.target.value)}
                                            className="auth-input"
                                            placeholder="Candidate Name"
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleEditCandidateImageUpload(i, e.target.files[0])}
                                            style={{ fontSize: "0.9rem" }}
                                        />
                                    </td>
                                    <td>
                                        {c.imageData && (
                                            <img
                                                src={c.imageData}
                                                alt={c.name}
                                                style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "4px" }}
                                            />
                                        )}
                                    </td>
                                    <td>
                                        <button className="danger" onClick={() => handleRemoveEditCandidate(i)}>
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button onClick={handleAddEditCandidate} style={{ marginBottom: "1rem" }}>+ Add Candidate</button>
                    <button onClick={saveEditDebate} className="auth-button">
                        Save Changes
                    </button>
                    <button onClick={cancelEdit} className="auth-button danger" style={{ marginLeft: "1rem" }}>
                        Cancel
                    </button>
                </div>
            )}

            <div className="dashboard-table-container">
                <table className="dashboard-table">
                    <thead>
                        <tr>
                            <th className="col-title-dashboard">Title</th>
                            <th className="col-question">Questions</th>
                            <th className="col-created">Created</th>
                            <th className="col-schedule">Scheduled Start</th>
                            <th className="col-password">Password</th>
                            <th className="col-action">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {debates.length > 0 ? (
                            debates.map(d => (
                                <tr key={d.id}>
                                    <td className="col-title-dashboard">
                                        {d.title}
                                        {liveStatus?.isLive && liveStatus?.debate?.id === d.id && (
                                            <span style={{ color: "orange", fontSize: "0.8em", marginLeft: "0.5rem" }}>
                                                (LIVE)
                                            </span>
                                        )}
                                    </td>
                                    <td className="col-question">{d.questionCount}</td>
                                    <td className="col-created">{new Date(d.createdAt).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}</td>
                                    <td className="col-schedule">{d.scheduledStartTime ? new Date(d.scheduledStartTime).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" }) : "Not Scheduled"}</td>
                                    <td className="col-password">
                                        {d.requirePassword ? "Password Locked" : "Open"}
                                    </td>
                                    <td className="col-action">
                                        <button onClick={() => goLive(d.id)} disabled={liveStatus?.isLive || liveStatus?.isPreviewable}>Go Live</button>
                                        <button onClick={() => startEditDebate(d)}>Edit</button>
                                        <button onClick={() => deleteDebate(d.id)} disabled={liveStatus?.isLive && liveStatus?.debate?.id === d.id}>Delete</button>
                                        <button onClick={() => navigate(`/debate-manager/debates/${d.id}/user-questions`)}>User Questions</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" style={{ textAlign: "center", color: "#666" }}>No debates found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}