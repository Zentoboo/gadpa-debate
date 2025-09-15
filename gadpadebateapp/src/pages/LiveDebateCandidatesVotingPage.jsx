import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";
import "../css/Dashboard.css";

export default function LiveDebateCandidatesVotingPage() {
    const { token, isAuthenticated, isDebateManager, loading } = useAuth();
    const navigate = useNavigate();
    const [debateData, setDebateData] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [error, setError] = useState(null);
    const [notification, setNotification] = useState(null);
    const [updating, setUpdating] = useState(null);
    const [voteInputs, setVoteInputs] = useState({});

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
        console.log('Auth state:', { loading, isAuthenticated, isDebateManager });

        if (loading) return;

        if (!isAuthenticated || !isDebateManager) {
            console.log('Redirecting to login');
            navigate("/debate-manager/login");
        } else {
            console.log('Fetching live debate data');
            fetchLiveDebateData();
        }
    }, [loading, isAuthenticated, isDebateManager, navigate]);

    const fetchLiveDebateData = () => {
        setError(null);
        authFetch(`http://localhost:5076/debate-manager/live/current-with-candidates`)
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch live debate data");
                return res.json();
            })
            .then(data => {
                if (!data.isLive) {
                    setError("No active live debate found.");
                    return;
                }
                setDebateData(data);
                setCandidates(data.debate.candidates);

                // Initialize vote inputs with current vote counts
                const initialInputs = {};
                data.debate.candidates.forEach(candidate => {
                    initialInputs[candidate.id] = candidate.voteCount.toString();
                });
                setVoteInputs(initialInputs);
            })
            .catch(err => setError(err.message));
    };

    const updateVoteCount = async (candidateName, newVoteCount) => {
        setUpdating(candidateName);
        try {
            const response = await authFetch(
                `http://localhost:5076/debate-manager/live/candidates/update-votes`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        candidateName: candidateName,
                        voteCount: newVoteCount
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to update vote count");
            }

            const data = await response.json();
            setNotification(`Successfully updated ${candidateName}'s vote count to ${newVoteCount}`);

            // Update the candidates list with new vote count
            setCandidates(prev => prev.map(candidate =>
                candidate.name === candidateName
                    ? { ...candidate, voteCount: newVoteCount }
                    : candidate
            ));

            setTimeout(() => setNotification(null), 3000);
        } catch (err) {
            setNotification(`Error: ${err.message}`);
            setTimeout(() => setNotification(null), 5000);
        } finally {
            setUpdating(null);
        }
    };

    const handleVoteInputChange = (candidateId, value) => {
        setVoteInputs(prev => ({
            ...prev,
            [candidateId]: value
        }));
    };

    const handleUpdateVote = (candidate) => {
        const newVoteCount = parseInt(voteInputs[candidate.id]);
        if (isNaN(newVoteCount) || newVoteCount < 0) {
            setNotification("Please enter a valid non-negative number");
            setTimeout(() => setNotification(null), 3000);
            return;
        }
        updateVoteCount(candidate.name, newVoteCount);
    };

    const handleKeyPress = (e, candidate) => {
        if (e.key === 'Enter') {
            handleUpdateVote(candidate);
        }
    };

    if (loading) return <p>Checking authentication...</p>;
    if (error) return (
        <div className="dashboard-container">
            <h1>Live Debate Candidates</h1>
            <p className="text-error">Error: {error}</p>
            <button
                onClick={() => navigate("/debate-manager/dashboard")}
                className="table-button secondary"
            >
                ← Back to Dashboard
            </button>
        </div>
    );

    return (
        <div className="dashboard-container">
            <h1 className="dashboard-title">Live Debate Candidates</h1>

            {debateData && (
                <div className={`live-status ${debateData.isActive ? "active" : ""}`}>
                    <h2 className="section-title">{debateData.debate.title}</h2>
                    <p><strong>Status:</strong> <span className={debateData.isActive ? "text-success" : ""}>{debateData.isActive ? "Active" : "Preview Mode"}</span></p>
                    <p><strong>Current Round:</strong> {debateData.currentRound} of {debateData.debate.totalRounds}</p>
                    {debateData.currentQuestion && (
                        <p><strong>Current Question:</strong> {debateData.currentQuestion}</p>
                    )}
                    <p><strong>Total Fires:</strong> {debateData.totalFires}</p>
                </div>
            )}

            <button
                onClick={() => navigate("/debate-manager/dashboard")}
                className="table-button secondary"
            >
                ← Back to Dashboard
            </button>

            <table className="dashboard-table" style={{ marginTop: "1rem" }}>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Image</th>
                        <th>Candidate Name</th>
                        <th>Current Votes</th>
                        <th>Update Votes</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {candidates.length === 0 ? (
                        <tr>
                            <td colSpan="6" style={{ textAlign: "center" }}>No candidates found for this debate.</td>
                        </tr>
                    ) : (
                        candidates.map((candidate) => (
                            <tr key={candidate.id}>
                                <td>{candidate.candidateNumber}</td>
                                <td>
                                    {candidate.imageUrl ? (
                                        <img
                                            src={candidate.imageUrl}
                                            alt={candidate.name}
                                            style={{
                                                width: "50px",
                                                height: "50px",
                                                objectFit: "cover",
                                                borderRadius: "50%"
                                            }}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: "50px",
                                            height: "50px",
                                            backgroundColor: "#ddd",
                                            borderRadius: "50%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "12px",
                                            color: "#333"
                                        }}>
                                            No Image
                                        </div>
                                    )}
                                </td>
                                <td><strong>{candidate.name}</strong></td>
                                <td style={{ textAlign: "center", fontSize: "1.2em", fontWeight: "bold" }}>
                                    {candidate.voteCount}
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        min="0"
                                        value={voteInputs[candidate.id] || ""}
                                        onChange={(e) => handleVoteInputChange(candidate.id, e.target.value)}
                                        onKeyPress={(e) => handleKeyPress(e, candidate)}
                                        className="auth-input"
                                        style={{ width: "80px", textAlign: "center" }}
                                        disabled={updating === candidate.name}
                                    />
                                </td>
                                <td>
                                    <button
                                        onClick={() => handleUpdateVote(candidate)}
                                        className="table-button primary"
                                        disabled={updating === candidate.name}
                                    >
                                        {updating === candidate.name ? "Updating..." : "Update"}
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {notification && (
                <div className="floating-notification">
                    {notification}
                </div>
            )}
        </div>
    );
}