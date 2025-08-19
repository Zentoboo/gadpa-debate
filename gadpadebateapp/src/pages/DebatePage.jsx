import React, { useState, useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import HeatmapChart from "../components/HeatmapChart";
import "../css/DebatePage.css";

export default function DebatePage() {
    const { debateId } = useParams(); // Get the debate ID from the URL
    const [total, setTotal] = useState(0);
    const [message, setMessage] = useState("");
    const [fires, setFires] = useState([]);
    const [bursts, setBursts] = useState([]);
    const [isShaking, setIsShaking] = useState(false);
    const [debate, setDebate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
    }, [debateId]); // Rerun if debateId changes

    const sendFire = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Use the debateId in the POST request to tie the fire to the correct debate
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
                    setTotal(data.total); // Sets the total from the POST request
                    const id = Date.now();
                    setFires((prev) => [...prev, { id, x, y }]);
                    setTimeout(() => {
                        setFires((prev) => prev.filter((f) => f.id !== id));
                    }, 2000);
                }
            })
            .catch(console.error);
    };

    const handleDataUpdate = useCallback((json) => {
        if (json && typeof json.total !== "undefined") {
            setTotal(json.total); // Updates total from the heatmap GET request
        }
    }, []);

    if (loading) {
        return <div className="debate-page-container">Loading debate...</div>;
    }

    if (error) {
        return (
            <div className="debate-page-container">
                <p className="error-message">{error}</p>
            </div>
        );
    }

    if (!debate) {
        return (
            <div className="debate-page-container">
                <p>Debate not found or is no longer live.</p>
            </div>
        );
    }

    return (
        <div className="debate-page-container">
            <div className="debate-details">
                <h1 className="debate-title">{debate.title}</h1>
                <p className="debate-description">{debate.description}</p>
                <div className="debate-info">
                    <p className="debate-round">Round {debate.currentRound} out of {debate.totalRounds}</p>
                </div>
            </div>
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

            {/* <div className="police-strip-container">
                <div className="police-strip"></div>
            </div> */}

            <div className="section-card chart-card">
                <h2 className="chart-title">🔥 Heatmap Chart</h2>
                <HeatmapChart
                    // Pass the specific debate ID to the heatmap component
                    fetchUrl={`http://localhost:5076/debate/${debateId}/heatmap-data`}
                    intervalSeconds={10}
                    onDataUpdate={handleDataUpdate}
                />
            </div>
        </div>
    );
}