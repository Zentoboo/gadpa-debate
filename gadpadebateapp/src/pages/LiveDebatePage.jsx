import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";

export default function LiveDebatePage() {
    const { token, isAuthenticated, isDebateManager, logout } = useAuth();
    const navigate = useNavigate();

    const [liveStatus, setLiveStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    // Helper fetch
    const authFetch = (url, options = {}) =>
        fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...options.headers,
            },
        });

    // Redirect if not manager
    useEffect(() => {
        if (!isAuthenticated || !isDebateManager) {
            navigate("/debate-manager/login");
        }
    }, [isAuthenticated, isDebateManager, navigate]);

    // Fetch live debate
    const refreshLiveStatus = () => {
        setLoading(true);
        authFetch("http://localhost:5076/debate-manager/live/status")
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch live status");
                return res.json();
            })
            .then(data => setLiveStatus(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (!token || !isAuthenticated || !isDebateManager) return;
        refreshLiveStatus();
    }, [token, isAuthenticated, isDebateManager]);

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
            .catch(err => alert(err.message));
    };

    const endLive = () => {
        if (!window.confirm("Are you sure you want to end the live debate?")) return;

        authFetch("http://localhost:5076/debate-manager/live/end", {
            method: "POST",
        })
            .then(res => {
                if (!res.ok) throw new Error("Failed to end debate");
                return res.json();
            })
            .then(() => {
                alert("Live debate ended.");
                navigate("/debate-manager/dashboard");
            })
            .catch(err => alert(err.message));
    };

    if (loading) {
        return <div style={{ color: "#fff", textAlign: "center", padding: "2rem" }}>Loading...</div>;
    }

    if (!liveStatus?.isLive) {
        return (
            <div style={{ color: "#fff", textAlign: "center", padding: "2rem" }}>
                <h1>No live debate is currently active</h1>
                <button
                    onClick={() => navigate("/debate-manager/dashboard")}
                    style={{
                        marginTop: "1rem",
                        padding: "0.75rem 1.5rem",
                        background: "#3b82f6",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "1rem",
                    }}
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100vh",
                background: "#111827",
                color: "#fff",
                justifyContent: "space-between",
                padding: "2rem",
            }}
        >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ margin: 0 }}>🎤 {liveStatus.debate.title}</h2>
                <button
                    onClick={logout}
                    style={{
                        padding: "0.5rem 1rem",
                        background: "#dc2626",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                    }}
                >
                    Logout
                </button>
            </div>

            {/* Main Question Display */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <h1 style={{ fontSize: "3rem", textAlign: "center", lineHeight: 1.3 }}>
                    Round {liveStatus.currentRound}:<br />
                    {liveStatus.currentQuestion || "No question"}
                </h1>
            </div>

            {/* Controls */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "1.5rem",
                    paddingBottom: "2rem",
                }}
            >
                <button
                    onClick={() => changeRound(liveStatus.currentRound - 1)}
                    disabled={liveStatus.currentRound <= 1}
                    style={{
                        padding: "1rem 2rem",
                        fontSize: "1.25rem",
                        background: liveStatus.currentRound > 1 ? "#3b82f6" : "#6b7280",
                        color: "#fff",
                        border: "none",
                        borderRadius: "10px",
                        cursor: liveStatus.currentRound > 1 ? "pointer" : "not-allowed",
                    }}
                >
                    ← Previous
                </button>

                <button
                    onClick={() => changeRound(liveStatus.currentRound + 1)}
                    disabled={liveStatus.currentRound >= liveStatus.totalRounds}
                    style={{
                        padding: "1rem 2rem",
                        fontSize: "1.25rem",
                        background: liveStatus.currentRound < liveStatus.totalRounds ? "#3b82f6" : "#6b7280",
                        color: "#fff",
                        border: "none",
                        borderRadius: "10px",
                        cursor: liveStatus.currentRound < liveStatus.totalRounds ? "pointer" : "not-allowed",
                    }}
                >
                    Next →
                </button>

                <button
                    onClick={endLive}
                    style={{
                        padding: "1rem 2rem",
                        fontSize: "1.25rem",
                        background: "#dc2626",
                        color: "#fff",
                        border: "none",
                        borderRadius: "10px",
                        cursor: "pointer",
                    }}
                >
                    End Debate
                </button>
            </div>
        </div>
    );
}
