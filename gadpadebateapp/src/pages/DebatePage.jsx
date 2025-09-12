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

    // Question submission state
    const [userQuestion, setUserQuestion] = useState("");
    const [questionSubmitting, setQuestionSubmitting] = useState(false);
    const [questionMessage, setQuestionMessage] = useState("");
    const [userQuestionsCount, setUserQuestionsCount] = useState(0);

    // Fetch the specific debate details
    const fetchDebateDetails = useCallback(async () => {
        try {
            const response = await fetch(
                `http://localhost:5076/debate/${debateId}`
            );
            if (!response.ok) {
                throw new Error("Failed to fetch debate details.");
            }
            const data = await response.json();
            setDebate(data);

            // If debate is live and not in countdown, get the current fire total
            if (data.isLive && !data.countdown) {
                fetchFireTotal();
            }

            // Fetch user question count for this debate
            const countRes = await fetch(
                `http://localhost:5076/debate/${debateId}/user-questions/count`
            );
            if (countRes.ok) {
                const countData = await countRes.json();
                setUserQuestionsCount(countData.count);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [debateId]);

    // Fetch current fire total
    const fetchFireTotal = useCallback(async () => {
        try {
            const response = await fetch(
                `http://localhost:5076/debate/${debateId}/heatmap-data?intervalSeconds=10&lastMinutes=1`
            );
            if (response.ok) {
                const data = await response.json();
                setTotal(data.total || 0);
            }
        } catch (e) {
            console.error("Failed to fetch fire total:", e);
        }
    }, [debateId]);

    // Submit user question
    const submitQuestion = async () => {
        if (!userQuestion.trim() || questionSubmitting) return;

        setQuestionSubmitting(true);
        setQuestionMessage("");

        try {
            const response = await fetch(
                `http://localhost:5076/debate/${debateId}/submit-question`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        question: userQuestion.trim(),
                    }),
                }
            );

            const data = await response.json();

            if (response.ok) {
                setQuestionMessage(data.message);
                setUserQuestion("");
                setUserQuestionsCount(prev => prev + 1);
            } else if (response.status === 429) {
                setQuestionMessage(`${data.message} Retry after ${data.retryAfterSeconds}s`);
            } else {
                setQuestionMessage(data.message || "Failed to submit question.");
            }
        } catch (error) {
            setQuestionMessage("Failed to submit question. Please try again.");
        } finally {
            setQuestionSubmitting(false);
        }
    };

    // Initial fetch on component load
    useEffect(() => {
        fetchDebateDetails();
    }, [fetchDebateDetails]);

    // Set up polling for scheduled debates to detect when they go live
    useEffect(() => {
        if (!debate) return;

        const isScheduledFuture = debate.scheduledStartTime && new Date() < new Date(debate.scheduledStartTime);

        if (isScheduledFuture || (debate.isLive && debate.countdown)) {
            const interval = setInterval(() => {
                fetchDebateDetails();
            }, 30000);

            return () => clearInterval(interval);
        }
    }, [debate, fetchDebateDetails]);

    // Countdown logic
    useEffect(() => {
        if (!debate || !debate.scheduledStartTime) return;

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
                setTimeout(() => {
                    fetchDebateDetails();
                }, 2000);
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [debate?.scheduledStartTime, fetchDebateDetails]);

    // Refresh fire total periodically for live debates
    useEffect(() => {
        if (!debate?.isLive || debate.countdown) return;

        const interval = setInterval(() => {
            fetchFireTotal();
        }, 5000);

        return () => clearInterval(interval);
    }, [debate?.isLive, debate?.countdown, fetchFireTotal]);

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
                } else if (res.status === 400) {
                    const data = await res.json();
                    setMessage(data.message);
                    fetchDebateDetails();
                }
            })
            .catch(console.error);
    };

    if (loading) {
        return (
            <div className="debate-page-container loading-container">
                <p className="loading-text">Loading debate...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="debate-page-container">
                <div className="status-section fade-in">
                    <p className="error-message">{error}</p>
                    <button className="back-button" onClick={() => navigate('/')}>Back to Home</button>
                </div>
            </div>
        );
    }

    if (!debate) {
        return (
            <div className="debate-page-container">
                <div className="status-section fade-in">
                    <h1 className="status-title">Debate Not Found</h1>
                    <p className="status-message">The debate may have ended or does not exist.</p>
                    <button className="back-button" onClick={() => navigate('/')}>Back to Home</button>
                </div>
            </div>
        );
    }

    const showCountdown = (debate.scheduledStartTime && new Date() < new Date(debate.scheduledStartTime)) ||
        (debate.isLive && debate.countdown);

    const hasReachedQuestionLimit = userQuestionsCount >= (debate.maxQuestionsPerUser || 3);
    const canSubmitQuestions = debate.allowUserQuestions && debate.isLive && !showCountdown && !hasReachedQuestionLimit;
    const isSuccess = questionMessage.toLowerCase().includes('successfully');

    return (
        <main>
            {/* === SECTION 1: Debate Info, Current Question, and Fire Support === */}
            <section>
                <div className="debate-header">
                    <div className="debate-details">
                        <h1 className="debate-title">{debate.title}</h1>
                        <p className="debate-description">{debate.description}</p>
                    </div>

                    <div className="debate-info">
                        Round {debate.currentRound} out of {debate.totalRounds}
                    </div>
                </div>

                {debate.isLive && !showCountdown ? (
                    <>
                        {/* Current Question Section */}
                        {debate.currentQuestion && (
                            <div className="current-question-section fade-in">
                                <div className="question-label">Current Question</div>
                                <p className="current-question">{debate.currentQuestion}</p>
                            </div>
                        )}

                        {/* Fire Interaction Section */}
                        <div className={`fire-section fade-in ${isShaking ? "shake" : ""}`}>
                            <h2 className="fire-title">🔥 Show Your Support 🔥</h2>
                            <div className="fire-total">Total fires: {total}</div>
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
                            {message && <p className="fire-message">{message}</p>}
                        </div>
                    </>
                ) : (
                    <>
                        {/* Countdown or Not Live State Sections */}
                        <div className="status-section fade-in">
                            <h1 className="status-title">
                                {showCountdown ? "Debate Starting Soon!" : "Debate Not Currently Live"}
                            </h1>
                            {showCountdown && (
                                <>
                                    <div className="countdown-display">{countdown}</div>
                                    <p className="status-message">
                                        {countdown === "Starting now!" ?
                                            "The debate should be starting now! Refreshing..." :
                                            "Please check back when the countdown ends. The debate will begin automatically."
                                        }
                                    </p>
                                </>
                            )}
                            {!showCountdown && (
                                <p className="status-message">The debate may have ended or hasn't started yet. Check the schedule for upcoming debates.</p>
                            )}
                            <button className="back-button" onClick={() => navigate('/')}>Back to Home</button>
                        </div>
                    </>
                )}
            </section>

            {/* === SECTION 2: User Question Submission === */}
            {debate.allowUserQuestions && (
                <section>
                    <div className="question-submission-section fade-in">
                        <h3 className="question-section-title">Submit Your Question</h3>
                        <div className="question-header">
                            <span
                                className={`question-status ${isSuccess ? 'success' : 'error'}`}
                                style={{ display: (questionMessage || hasReachedQuestionLimit) ? 'inline-block' : 'none' }}
                            >
                                {hasReachedQuestionLimit
                                    ? `Max reached (${debate.maxQuestionsPerUser})`
                                    : questionMessage}
                            </span>
                        </div>
                        <div className="question-form">
                            <textarea
                                value={userQuestion}
                                onChange={(e) => setUserQuestion(e.target.value)}
                                placeholder="Ask your question here..."
                                maxLength={500}
                                disabled={!canSubmitQuestions || questionSubmitting}
                                className="question-textarea"
                                rows={4}
                            />
                            <div className="question-form-footer">
                                <div className="question-info">
                                    <span className="char-count">
                                        {userQuestion.length}/500
                                    </span>
                                    <span className="questions-count">
                                        {userQuestionsCount}/{debate.maxQuestionsPerUser || 3} questions used
                                    </span>
                                </div>
                                <button
                                    onClick={submitQuestion}
                                    disabled={
                                        !canSubmitQuestions ||
                                        questionSubmitting ||
                                        userQuestion.trim().length < 5
                                    }
                                    className="submit-question-btn"
                                >
                                    {questionSubmitting ? "Submitting..." : "Submit"}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            )}
        </main>
    );
}