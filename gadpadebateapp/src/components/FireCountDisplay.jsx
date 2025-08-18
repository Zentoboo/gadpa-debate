import React, { useState, useEffect } from "react";
import "../css/LiveDebatePage.css";

export default function FireCountDisplay({ token }) {
    const [totalFires, setTotalFires] = useState(0);

    const authFetch = (url, options = {}) =>
        fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...options.headers,
            },
        });

    const refreshFireCount = () => {
        authFetch("http://localhost:5076/debate-manager/live/status")
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch live status");
                return res.json();
            })
            .then(data => {
                if (data.isLive) {
                    setTotalFires(data.totalFires);
                }
            })
            .catch(err => console.error(err));
    };

    useEffect(() => {
        refreshFireCount();
        const interval = setInterval(refreshFireCount, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, [token]);

    return (
        <div className="live-debate-fires">
            🔥 {totalFires}
            <button
                onClick={refreshFireCount}
                className="refresh-button"
                title="Refresh fires"
            >
                🔄
            </button>
        </div>
    );
}