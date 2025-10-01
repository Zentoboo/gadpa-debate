import API_URL from "../config";
import React, { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../css/DebatePage.css";
import TypeIt from "../components/TypeIt";

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

    // password authentication state
    const [requiresPassword, setRequiresPassword] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [password, setPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [passwordSubmitting, setPasswordSubmitting] = useState(false);

    // Fetch the specific debate details
    const fetchDebateDetails = useCallback(async () => {
        try {
            const response = await fetch(
                `${API_URL}/debate/${debateId}`
            );
            if (!response.ok) {
                throw new Error("Failed to fetch debate details.");
            }
            const data = await response.json();
            setDebate(data);
            setRequiresPassword(data.requirePassword || false);

            if (data.requirePassword) {
                try {
                    const testResponse = await fetch(
                        `${API_URL}/debate/${debateId}/validate-session`,
                        { credentials: "include" }
                    );
                    setIsAuthenticated(testResponse.ok);
                    setShowPasswordModal(!testResponse.ok);
                } catch (err) {
                    setIsAuthenticated(false);
                    setShowPasswordModal(true);
                }
            }

            // If debate is live and not in countdown, get the current fire total
            if (data.isLive && !data.countdown && (!data.requirePassword || isAuthenticated)) {
                fetchFireTotal();
            }

            // Fetch user question count for this debate
            const countRes = await fetch(
                `${API_URL}/debate/${debateId}/user-questions/count`
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
    }, [debateId]); // removed isAuthenticated to avoid race loops

    // Submit password for authentication
    const submitPassword = async () => {
        if (!password.trim() || passwordSubmitting) return;

        setPasswordSubmitting(true);
        setPasswordError("");

        try {
            const response = await fetch(
                `${API_URL}/debate/${debateId}/authenticate`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        password: password.trim(),
                    }),
                }
            );

            const data = await response.json();

            if (response.ok) {
                setIsAuthenticated(true);
                setShowPasswordModal(false);
                setPassword("");
                setPasswordError("");
                // refresh debate details immediately after login
                await fetchDebateDetails();
            } else {
                // stay in modal, just show error
                setPasswordError(data.message || "Invalid password.");
            }
        } catch (error) {
            setPasswordError("Failed to authenticate. Please try again.");
        } finally {
            setPasswordSubmitting(false);
        }
    };

    // Autofocus password input when modal opens
    useEffect(() => {
        if (showPasswordModal) {
            document.getElementById("password-input")?.focus();
        }
    }, [showPasswordModal]);

    // Fetch current fire total
    const fetchFireTotal = useCallback(async () => {
        try {
            const response = await fetch(
                `${API_URL}/debate/${debateId}/heatmap-data?intervalSeconds=10&lastMinutes=1`,
                { credentials: "include" }
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

        if (requiresPassword && !isAuthenticated) {
            setShowPasswordModal(true);
            return;
        }

        setQuestionSubmitting(true);
        setQuestionMessage("");

        try {
            const response = await fetch(
                `${API_URL}/debate/${debateId}/submit-question`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        question: userQuestion.trim(),
                    }),
                }
            );

            const data = await response.json();

            if (response.ok) {
                setQuestionMessage(data.message);
                setUserQuestion("");
                setUserQuestionsCount((prev) => prev + 1);
            } else if (response.status === 401) {
                setIsAuthenticated(false);
                setShowPasswordModal(true);
                setQuestionMessage("Please authenticate to submit questions.");
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

        const isScheduledFuture =
            debate.scheduledStartTime && new Date() < new Date(debate.scheduledStartTime);

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
        if (requiresPassword && !isAuthenticated) {
            setShowPasswordModal(true);
            return;
        }
        const container = e.currentTarget
            .closest(".fire-section")
            .querySelector(".fire-animations");
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        fetch(`${API_URL}/debate/${debateId}/fire`, {
            method: "POST",
            credentials: "include",
        })
            .then(async (res) => {
                const data = await res.json();

                if (res.ok) {
                    setMessage(data.message);
                    setTotal(data.total);
                    const id = Date.now();
                    setFires((prev) => [...prev, { id, x, y }]);

                    setTimeout(() => {
                        setFires((prev) => prev.filter((f) => f.id !== id));
                    }, 2000);
                } else if (res.status === 401) {
                    setIsAuthenticated(false);
                    setShowPasswordModal(true);
                    setMessage("Please authenticate to continue.");
                } else if (res.status === 400 || res.status === 429) {
                    setMessage(data.message);

                    setIsShaking(true);
                    setTimeout(() => setIsShaking(false), 500);

                    const burstId = Date.now();
                    setBursts((prev) => [...prev, { id: burstId }]);
                    setTimeout(() => {
                        setBursts((prev) => prev.filter((b) => b.id !== burstId));
                    }, 1000);
                } else {
                    setMessage("Something went wrong, please try again.");
                }
            })
            .catch((err) => {
                console.error(err);
                setMessage("Failed to connect to server.");
            });
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
                    <button className="back-button" onClick={() => navigate("/")}>
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    if (!debate) {
        return (
            <div className="debate-page-container">
                <div className="status-section fade-in">
                    <h1 className="status-title">Debate Not Found</h1>
                    <p className="status-message">
                        The debate may have ended or does not exist.
                    </p>
                    <button className="back-button" onClick={() => navigate("/")}>
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    const showCountdown =
        (debate.scheduledStartTime &&
            new Date() < new Date(debate.scheduledStartTime)) ||
        (debate.isLive && debate.countdown);

    const hasReachedQuestionLimit =
        userQuestionsCount >= (debate.maxQuestionsPerUser || 3);
    const canSubmitQuestions =
        debate.allowUserQuestions &&
        debate.isLive &&
        !showCountdown &&
        !hasReachedQuestionLimit;
    const isSuccess = questionMessage?.toLowerCase().includes("successfully");

    return (
        <>
            {requiresPassword && !isAuthenticated ? (
                // Show password modal only
                <div className="auth-container">
                    <div className="auth-card">
                        <p className="auth-title">Protected Debate</p>
                        <p className="small-text">
                            This debate requires a password to access.
                        </p>
                        <input
                            id="password-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === "Enter" && submitPassword()
                            }
                            placeholder="Password"
                            className="auth-input"
                            disabled={passwordSubmitting}
                        />
                        {passwordError && (
                            <p className="password-error">{passwordError}</p>
                        )}
                        <div style={{ gap: "0.4rem", display: "flex", flexDirection: "column" }}>
                            <button
                                onClick={submitPassword}
                                disabled={
                                    passwordSubmitting || !password.trim()
                                }
                                className="auth-button"
                            >
                                {passwordSubmitting
                                    ? "Authenticating..."
                                    : "Submit"}
                            </button>
                            <button
                                onClick={() => {
                                    setShowPasswordModal(false);
                                    setPassword("");
                                    setPasswordError("");
                                    navigate("/");
                                }}
                                className="cancel-button"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <main className="top-8">
                    <section>
                        <div className="debate-header">
                            <div className="debate-details">
                                <h1 className="debate-title">{debate.title}</h1>
                                <p className="debate-description">
                                    {debate.description}
                                </p>
                            </div>
                            <div className="debate-info">
                                Round {debate.currentRound} out of{" "}
                                {debate.totalRounds}
                            </div>
                        </div>

                        {debate.isLive && !showCountdown ? (
                            <>
                                {/* Current Question Section */}
                                {debate.currentQuestion && (
                                    <div
                                        className="debates-table-container fade-in"
                                        style={{
                                            maxWidth: "1200px",
                                            marginBottom: "2rem",
                                        }}
                                    >
                                        <table className="debates-table questions-table">
                                            <thead>
                                                <tr>
                                                    <th>Current Question</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>
                                                        {debate.currentQuestion}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                <div className="fire-event-and-candidates-section">
                                    <div
                                        className={`fire-section fade-in ${isShaking ? "shake" : ""
                                            }`}
                                    >
                                        <h2 className="fire-title">🔥 Heat 🔥</h2>
                                        <div className="fire-total">
                                            Total fires: {total}
                                        </div>
                                        <div className="fire-btn-wrapper">
                                            <button
                                                onClick={sendFire}
                                                className="fire-button"
                                            >
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
                                            <span
                                                key={burst.id}
                                                className="burst-emoji"
                                            >
                                                💢
                                            </span>
                                        ))}
                                        {message && (
                                            <p className="fire-message">{message}</p>
                                        )}
                                    </div>
                                    {debate.candidates?.length > 0 && (
                                        <div className="debate-table-container">
                                            <table
                                                className="questions-table-debatepage"
                                                style={{ maxWidth: "600px" }}
                                            >
                                                <thead>
                                                    <tr>
                                                        <th>Candidates</th>
                                                        <th>Votes</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {debate.candidates.map((candidate, index) => (
                                                        <tr key={index}>
                                                            <td className="col-candidate-name" >{candidate.name}</td>
                                                            <td className="col-candidate-votes">{candidate.voteCount}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>


                                {/* === SECTION 3: User Question Submission === */}
                                {debate.allowUserQuestions && (
                                    <section style={{ padding: "2rem 0" }}>
                                        <div className="question-submission-section fade-in">
                                            <h3 className="question-section-title">
                                                <TypeIt
                                                    rotateWords
                                                    autoPlay={true}
                                                    duration={1}
                                                    delay={2}
                                                    rotateWordsOptions={{
                                                        wordsList: ["Curious?", "Ask the candidates", "Submit your question"],
                                                        cycle: true,
                                                        clear: true,
                                                        clearingDuration: 2,
                                                        pauseAfterComplete: 2,
                                                        pauseAfterClear: 0.5,
                                                    }}
                                                />
                                            </h3>
                                            <div className="question-header">
                                                <span
                                                    className={`question-status ${isSuccess ? "success" : "error"
                                                        }`}
                                                    style={{
                                                        display:
                                                            questionMessage ||
                                                                hasReachedQuestionLimit
                                                                ? "inline-block"
                                                                : "none",
                                                    }}
                                                >
                                                    {hasReachedQuestionLimit
                                                        ? `Max reached (${debate.maxQuestionsPerUser})`
                                                        : questionMessage}
                                                </span>
                                            </div>
                                            <div className="question-form">
                                                <textarea
                                                    value={userQuestion}
                                                    onChange={(e) =>
                                                        setUserQuestion(e.target.value)
                                                    }
                                                    placeholder="Ask your question here..."
                                                    maxLength={500}
                                                    disabled={
                                                        !canSubmitQuestions ||
                                                        questionSubmitting
                                                    }
                                                    className="question-textarea"
                                                    rows={4}
                                                />
                                                <div className="question-form-footer">
                                                    <div className="question-info">
                                                        <span className="char-count">
                                                            {userQuestion.length}/500
                                                        </span>
                                                        <span className="questions-count">
                                                            {userQuestionsCount}/
                                                            {debate.maxQuestionsPerUser || 3}{" "}
                                                            questions used
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
                                                        {questionSubmitting
                                                            ? "Submitting..."
                                                            : "Submit"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                )}
                                <section style={{ height: "30vh", minHeight: "4vh", justifyContent: "flex-start", display: "flex", alignItems: "center" }}>
                                    {isAuthenticated && (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await fetch(`${API_URL}/debate/${debateId}/logout`, {
                                                        method: "POST",
                                                        credentials: "include",
                                                    });
                                                } catch (err) {
                                                    console.error("Logout failed:", err);
                                                } finally {
                                                    setIsAuthenticated(false);
                                                    setShowPasswordModal(true);
                                                }
                                            }}
                                            className="button-link-2-red"
                                        >
                                            logout of session
                                        </button>
                                    )}
                                </section>
                            </>
                        ) : (
                            <>
                                {/* Countdown or Not Live State Sections */}
                                <div className="status-section fade-in">
                                    <h1 className="status-title">
                                        {showCountdown
                                            ? "Debate Starting Soon!"
                                            : "Debate Not Currently Live"}
                                    </h1>
                                    {showCountdown && (
                                        <>
                                            <div className="countdown-display">
                                                {countdown}
                                            </div>
                                            <p className="status-message">
                                                {countdown === "Starting now!"
                                                    ? "The debate should be starting now! Refreshing..."
                                                    : "Please check back when the countdown ends. The debate will begin automatically."}
                                            </p>
                                        </>
                                    )}
                                    {!showCountdown && (
                                        <p className="status-message">
                                            The debate may have ended or hasn't
                                            started yet. Check the schedule for
                                            upcoming debates.
                                        </p>
                                    )}
                                    <button
                                        className="back-button"
                                        onClick={() => navigate("/")}
                                    >
                                        Back to Home
                                    </button>
                                </div>
                            </>
                        )}
                    </section>
                </main>
            )}
        </>
    );
}