import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../css/Dashboard.css";
import "../css/LiveDebatePage.css";

export default function LiveDebateCandidatesVotingPage() {
    const { token, isAuthenticated, isDebateManager, loading } = useAuth();
    const navigate = useNavigate();
    const [debateData, setDebateData] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [error, setError] = useState(null);
    const [notification, setNotification] = useState(null);
    const [updating, setUpdating] = useState(null);

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

    const videoRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState("");
    const [showCameraSection, setShowCameraSection] = useState(true);


    const startCamera = async (deviceId) => {
        try {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            const constraints = {
                video: deviceId ? { deviceId: { exact: deviceId } } : true,
                audio: false
            };

            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
            setStream(newStream);
        } catch (err) {
            console.error("Error accessing camera:", err);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            if (videoRef.current) videoRef.current.srcObject = null;
        }
    };

    useEffect(() => {
        navigator.mediaDevices.enumerateDevices()
            .then(deviceInfos => {
                const videoInputs = deviceInfos.filter(d => d.kind === "videoinput");
                setDevices(videoInputs);
                if (videoInputs.length > 0) {
                    setSelectedDevice(videoInputs[0].deviceId);
                }
            })
            .catch(err => console.error("Error listing devices:", err));
    }, []);

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

    const handleIncrementVote = (candidate) => {
        const newVoteCount = candidate.voteCount + 1;
        updateVoteCount(candidate.name, newVoteCount);
    };

    const handleDecrementVote = (candidate) => {
        const newVoteCount = Math.max(0, candidate.voteCount - 1);
        updateVoteCount(candidate.name, newVoteCount);
    };

    if (loading) return <p>Checking authentication...</p>;

    if (error) return (
        <div className="status-message-container">
            <h1>Live Debate Candidates Voting</h1>
            <div className="error-message">
                <p>Error: {error}</p>
                <button
                    onClick={() => navigate("/debate-manager/dashboard")}
                    className="control-button secondary"
                >
                    ← Back to Dashboard
                </button>
            </div>
        </div>
    );

    return (
        <div className="live-debate-container">
            {/* Header Section*/}
            <div className="live-debate-header">
                <h2 className="live-debate-title">
                    {debateData?.debate?.title || "Live Debate"}
                </h2>
                <div className="live-debate-header-right">
                    <div className="header-stats">
                        <span className="live-debate-subtitle">
                            Total Fires: {debateData?.totalFires || 0} 🔥
                        </span>
                        <span className="live-debate-subtitle">
                            Total Votes: {candidates.reduce((sum, candidate) => sum + candidate.voteCount, 0)} 📩
                        </span>

                        {/* Collapse/Expand Camera Button */}
                        <button
                            onClick={() => setShowCameraSection(prev => !prev)}
                            className="toggle-button"
                            style={{ marginLeft: "1rem" }}
                        >
                            {showCameraSection ? "Hide Camera" : "Show Camera"}
                        </button>
                    </div>
                </div>
            </div>


            {/* Camera Section */}
            {showCameraSection && (
                <div className="camera-section">
                    <h3 className="section-title">Live Camera Preview</h3>

                    {/* Video Preview */}
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        style={{ width: "100%", maxWidth: "800px", borderRadius: "8px" }}
                    />

                    {/* Controls */}
                    <div style={{ marginTop: "10px", justifyContent: "center", display: "flex", gap: "1rem" }}>
                        <button onClick={() => startCamera(selectedDevice)} disabled={!!stream}>
                            Start Camera
                        </button>
                        <button onClick={stopCamera} disabled={!stream}>
                            Stop Camera
                        </button>
                        {devices.length > 1 && (
                            <select
                                value={selectedDevice}
                                onChange={(e) => setSelectedDevice(e.target.value)}
                            >
                                {devices.map((device, idx) => (
                                    <option key={device.deviceId} value={device.deviceId}>
                                        {device.label || `Camera ${idx + 1}`}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>
            )}

            {/* Candidates Grid */}
            <div className="candidates-voting-section">
                <h3 className="section-title">Candidate Votes</h3>
                <div className="candidates-grid">
                    {candidates.length === 0 ? (
                        <div className="no-candidates-message">
                            <p>No candidates found for this debate.</p>
                        </div>
                    ) : (
                        candidates.map((candidate) => (
                            <div key={candidate.id} className="candidate-voting-card">
                                <div className="candidate-info">
                                    <div className="candidate-image-container">
                                        {candidate.imageUrl ? (
                                            <img
                                                src={candidate.imageUrl}
                                                alt={candidate.name}
                                                className="candidate-image"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="candidate-image-placeholder">
                                                #{candidate.candidateNumber}
                                            </div>
                                        )}
                                    </div>
                                    <div className="candidate-details">
                                        <h4 className="candidate-name">{candidate.name}</h4>
                                        <span className="candidate-number">Candidate #{candidate.candidateNumber}</span>
                                    </div>
                                </div>

                                <div className="vote-control-section">
                                    <div className="vote-display">
                                        <span className="vote-count">{candidate.voteCount}</span>
                                        <span className="vote-label">votes</span>
                                    </div>

                                    <div className="vote-controls">
                                        <button
                                            onClick={() => handleDecrementVote(candidate)}
                                            disabled={updating === candidate.name || candidate.voteCount <= 0}
                                            className="vote-button decrement"
                                            title="Decrease votes"
                                        >
                                            -
                                        </button>
                                        <button
                                            onClick={() => handleIncrementVote(candidate)}
                                            disabled={updating === candidate.name}
                                            className="vote-button increment"
                                            title="Increase votes"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                {updating === candidate.name && (
                                    <div className="updating-indicator">
                                        <span className="updating-spinner"></span>
                                        Updating...
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Floating Notification */}
            {notification && (
                <div className="floating-notification">
                    {notification}
                </div>
            )}
        </div>
    );
}