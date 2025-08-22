import React, { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../css/DebatePage.css";

export default function DebatePage() {
    const { debateId } = useParams();
    const navigate = useNavigate();

    const [total, setTotal] = useState(0);
    const [message, setMessage] = useState("");
    const [fires, setFires] = useState([]);
    const [bursts, setBursts] = useState([]);
    const [isShaking, setIsShaking] = useState(false);
    const [debate, setDebate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [countdown, setCountdown] = useState(null);

    // Fetch the specific debate details on component load
    useEffect(() => {
        const fetchDebateDetails = async () => {
            try {
                const response = await fetch(
                    `http://localhost:5076/debate/${debateId}`
                );
                if (!response.ok) {
                    throw new Error("Failed to fetch debate details.");
                }
                const data = await response.json();
                setDebate(data);
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };
        fetchDebateDetails();
    }, [debateId]);

    // Countdown logic
    useEffect(() => {
        if (debate && debate.scheduledStartTime) {
            const interval = setInterval(() => {
                const now = new Date();
                const scheduledTime = new Date(debate.scheduledStartTime);
                const timeLeft = scheduledTime.getTime() - now.getTime();

                if (timeLeft > 0) {
                    const seconds = Math.floor((timeLeft / 1000) % 60);
                    const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
                    const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
                    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
                    const countdownString = `${days}d ${hours}h ${minutes}m ${seconds}s`;
                    setCountdown(countdownString);
                } else {
                    setCountdown("Starting now!");
                    clearInterval(interval);
                }
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [debate]);

    const sendFire = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        fetch(`http://localhost:5076/debate/${debateId}/fire`, { method: "POST" })
            .then(async (res) => {
                if (res.status === 429) {
                    const data = await res.json();
                    setMessage(`${data.message} Retry after ${data.retryAfterSeconds}s`);
                    setIsShaking(true);
                    setTimeout(() => setIsShaking(false), 600);
                    const id = Date.now();
                    setBursts((prev) => [...prev, { id }]);
                    setTimeout(() => {
                        setBursts((prev) => prev.filter((b) => b.id !== id));
                    }, 1200);
                } else if (res.ok) {
                    const data = await res.json();
                    setMessage(data.message);
                    setTotal(data.total);
                    const id = Date.now();
                    setFires((prev) => [...prev, { id, x, y }]);
                    setTimeout(() => {
                        setFires((prev) => prev.filter((f) => f.id !== id));
                    }, 2000);
                }
            })
            .catch(console.error);
    };

    if (loading) {
        return <div className="debate-page-container"><p>Loading debate...</p></div>;
    }

    if (error) {
        return (
            <div className="debate-page-container">
                <p className="error-message">{error}</p>
                <button className="back-button" onClick={() => navigate('/')}>Back to Home</button>
            </div>
        );
    }

    if (!debate) {
        return (
            <div className="debate-page-container">
                <p>Debate not found or is no longer live.</p>
                <button className="back-button" onClick={() => navigate('/')}>Back to Home</button>
            </div>
        );
    }

    const isScheduledFuture = debate.scheduledStartTime && new Date() < new Date(debate.scheduledStartTime);

    return (
        <div className="debate-page-container">
            <div className="debate-details">
                <h1 className="debate-title">{debate.title}</h1>
                <p className="debate-description">{debate.description}</p>
            </div>
            {isScheduledFuture ? (
                <div className="fire-card">
                    <h1 className="card-title">Debate is scheduled to begin soon!</h1>
                    <p className="card-total">Starts in: {countdown}</p>
                    <p className="card-message">Please check back when the countdown ends.</p>
                    <button className="back-button" onClick={() => navigate('/')}>Back to Home</button>
                </div>
            ) : (
                <>
                    <div className="debate-info">
                        <p className="debate-round">Round {debate.currentRound} out of {debate.totalRounds}</p>
                    </div>
                    <p className="debate-question">{debate.currentQuestion}</p>
                    <div className={`fire-card ${isShaking ? "shake" : ""}`}>
                        <h1 className="card-title">🔥 Show your support 🔥</h1>
                        <p className="card-total">Total fires: {total}</p>
                        <div className="fire-btn-wrapper">
                            <button onClick={sendFire} className="fire-button">
                                DETONATE
                            </button>
                            <div className="fire-animations">
                                {fires.map((fire) => (
                                    <span
                                        key={fire.id}
                                        className="fire-emoji"
                                        style={{
                                            left: `${fire.x}px`,
                                            top: `${fire.y}px`,
                                        }}
                                    >
                                        🔥
                                    </span>
                                ))}
                            </div>
                        </div>
                        {bursts.map((burst) => (
                            <span key={burst.id} className="burst-emoji">
                                💢
                            </span>
                        ))}
                        {message && <p className="card-message">{message}</p>}
                    </div>
                </>
            )}
        </div>
    );
}