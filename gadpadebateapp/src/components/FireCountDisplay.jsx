import API_URL from "../config";
import React, { useState, useEffect, useCallback } from "react";
import "../css/LiveDebatePage.css";

export default function FireCountDisplay({ token, debateId, onFireCountUpdate }) {
    const [totalFires, setTotalFires] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const authFetch = useCallback((url, options = {}) =>
        fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...options.headers,
            },
        }), [token]);

    const refreshFireCount = useCallback(async () => {
        if (!debateId) return;

        try {
            setError(null);

            // Try to get fire count from heatmap data (more reliable)
            const heatmapResponse = await fetch(
                `${API_URL}/debate/${debateId}/heatmap-data?intervalSeconds=10&lastMinutes=1`
            );

            if (heatmapResponse.ok) {
                const heatmapData = await heatmapResponse.json();
                if (typeof heatmapData.total === 'number') {
                    setTotalFires(heatmapData.total);
                    if (onFireCountUpdate) {
                        onFireCountUpdate(heatmapData.total);
                    }
                    return;
                }
            }

            // Fallback: try to get from live status
            const statusResponse = await authFetch(`${API_URL}/debate-manager/live/status`);
            if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                if (statusData.isLive && typeof statusData.totalFires === 'number') {
                    setTotalFires(statusData.totalFires);
                    if (onFireCountUpdate) {
                        onFireCountUpdate(statusData.totalFires);
                    }
                } else {
                    // If no totalFires in response, try manual heatmap fetch with auth
                    const authHeatmapResponse = await authFetch(
                        `${API_URL}/debate-manager/live/heatmap?intervalSeconds=10&lastMinutes=1`
                    );
                    if (authHeatmapResponse.ok) {
                        const authHeatmapData = await authHeatmapResponse.json();
                        if (typeof authHeatmapData.total === 'number') {
                            setTotalFires(authHeatmapData.total);
                            if (onFireCountUpdate) {
                                onFireCountUpdate(authHeatmapData.total);
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Error fetching fire count:", err);
            setError("Failed to fetch fire count");
        }
    }, [debateId, authFetch, onFireCountUpdate]);

    const handleRefreshClick = useCallback(async () => {
        setLoading(true);
        await refreshFireCount();
        setLoading(false);
    }, [refreshFireCount]);

    useEffect(() => {
        if (!token || !debateId) return;

        // Initial load
        refreshFireCount();

        // Set up interval
        const interval = setInterval(refreshFireCount, 5000);
        return () => clearInterval(interval);
    }, [token, debateId, refreshFireCount]);

    return (
        <div className="live-debate-fires">
            🔥 {totalFires}
            <button
                className={`refresh-button ${loading ? 'loading' : ''}`}
                onClick={handleRefreshClick}
                disabled={loading}
                title={error || "Refresh fire count"}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 30 30"
                    width="24"
                    height="24"
                    className={`refresh-icon ${loading ? 'spinning' : ''}`}
                    style={{ color: error ? '#ff6b6b' : 'currentColor' }}
                >
                    <path d="M 15 3 C 12.031398 3 9.3028202 4.0834384 7.2070312 5.875 A 1.0001 1.0001 0 1 0 8.5058594 7.3945312 C 10.25407 5.9000929 12.516602 5 15 5 C 20.19656 5 24.450989 8.9379267 24.951172 14 L 22 14 L 26 20 L 30 14 L 26.949219 14 C 26.437925 7.8516588 21.277839 3 15 3 z M 4 10 L 0 16 L 3.0507812 16 C 3.562075 22.148341 8.7221607 27 15 27 C 17.968602 27 20.69718 25.916562 22.792969 24.125 A 1.0001 1.0001 0 1 0 21.494141 22.605469 C 19.74593 24.099907 17.483398 25 15 25 C 9.80344 25 5.5490109 21.062074 5.0488281 16 L 8 16 L 4 10 z"
                        fill="currentColor" />
                </svg>
            </button>
            {error && (
                <div className="fire-count-error" style={{
                    fontSize: '10px',
                    color: '#ff6b6b',
                    position: 'absolute',
                    top: '100%',
                    right: '0',
                    whiteSpace: 'nowrap'
                }}>
                    {error}
                </div>
            )}
        </div>
    );
}