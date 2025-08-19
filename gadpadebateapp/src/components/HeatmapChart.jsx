import React, { useState, useEffect, memo } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

function HeatmapChart({
  fetchUrl,
  intervalSeconds = 10,
  lastMinutes = 3,
  onDataUpdate,
  displayMode = "standalone", // "standalone", "overlay", "full"
  showControls = true
}) {
  const [data, setData] = useState([]);
  const [actualTotal, setActualTotal] = useState(0);
  const [showDebateTotal, setShowDebateTotal] = useState(true);
  const [showWindowCumulative, setShowWindowCumulative] = useState(true);
  const [showFiresPerInterval, setShowFiresPerInterval] = useState(true);

  useEffect(() => {
    const fetchHeatmapData = async () => {
      try {
        const response = await fetch(`${fetchUrl}?intervalSeconds=${intervalSeconds}&lastMinutes=${lastMinutes}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const json = await response.json();

        if (json.buckets) {
          const currentTotal = json.total || 0;
          const windowCumulativeTotal = json.buckets.reduce((sum, bucket) => sum + bucket.intervalTotal, 0);

          // Calculate the baseline (total fires before this time window started)
          const baselineTotal = currentTotal - windowCumulativeTotal;

          // Calculate the actual running total for each bucket
          let runningActualTotal = baselineTotal;
          const enhancedBuckets = json.buckets.map((bucket) => {
            runningActualTotal += bucket.intervalTotal;
            return {
              ...bucket,
              actualTotal: runningActualTotal
            };
          });

          setData(enhancedBuckets);
          setActualTotal(currentTotal);
          if (onDataUpdate) onDataUpdate(json);
        } else {
          console.error("No 'buckets' property found in the response:", json);
        }
      } catch (error) {
        console.error("Failed to fetch heatmap data:", error);
      }
    };

    fetchHeatmapData();

    const intervalId = setInterval(fetchHeatmapData, intervalSeconds * 1000);

    return () => clearInterval(intervalId);
  }, [fetchUrl, intervalSeconds, lastMinutes, onDataUpdate]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: displayMode === "overlay" ? "rgba(0, 0, 0, 0.9)" : "#1e1e1e",
          border: "1px solid #2a2a2a",
          color: "#fff",
          padding: "12px",
          borderRadius: "6px",
          backdropFilter: displayMode === "overlay" ? "blur(4px)" : "none"
        }}>
          <p style={{ color: "#fff", margin: "0 0 8px 0" }}>{`Time: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color, margin: "4px 0" }}>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Calculate chart height based on display mode
  const getChartHeight = () => {
    switch (displayMode) {
      case "overlay":
        return "100%";
      case "full":
        return 400;
      default:
        return 400;
    }
  };

  const chartOpacity = displayMode === "overlay" ? 0.9 : 1;

  return (
    <div style={{
      width: "100%",
      height: displayMode === "overlay" ? "100%" : "auto",
      display: "flex",
      flexDirection: "column"
    }}>
      {/* Header - only show in standalone and full modes */}
      {displayMode !== "overlay" && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
          color: "#ccc",
          fontSize: "14px"
        }}>
          <span>Live Heatmap Data</span>
          <span style={{ fontWeight: "bold" }}>
            Total Fires: {actualTotal}
          </span>
        </div>
      )}

      {/* Visibility Controls - only show when requested and not in overlay mode */}
      {showControls && displayMode !== "overlay" && (
        <div style={{
          display: "flex",
          gap: "20px",
          marginBottom: "16px",
          padding: "12px",
          backgroundColor: "#1e1e1e",
          borderRadius: "6px",
          border: "1px solid #333",
          flexWrap: "wrap"
        }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#ccc", fontSize: "13px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showFiresPerInterval}
              onChange={(e) => setShowFiresPerInterval(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <span style={{ color: "#3b82f6" }}>■</span> Fires per {intervalSeconds}s
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#ccc", fontSize: "13px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showWindowCumulative}
              onChange={(e) => setShowWindowCumulative(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <span style={{ color: "#dc2626" }}>■</span> Window Cumulative
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#ccc", fontSize: "13px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showDebateTotal}
              onChange={(e) => setShowDebateTotal(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <span style={{ color: "#10b981" }}>- - -</span> Debate Total
          </label>
        </div>
      )}

      {/* Chart Container */}
      <div style={{
        flex: 1,
        minHeight: displayMode === "overlay" ? "100%" : "400px",
        opacity: chartOpacity
      }}>
        <ResponsiveContainer width="100%" height={getChartHeight()}>
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid stroke="#333" strokeDasharray="3 3" opacity={displayMode === "overlay" ? 0.6 : 1} />
            <XAxis
              stroke={displayMode === "overlay" ? "#fff" : "#aaa"}
              dataKey="bucketLabel"
              label={{
                value: "Time Interval",
                position: "insideBottomRight",
                offset: -5,
                fill: displayMode === "overlay" ? "#fff" : "#ccc",
              }}
              tick={{ fontSize: displayMode === "overlay" ? 11 : 12 }}
            />
            <YAxis
              stroke={displayMode === "overlay" ? "#fff" : "#aaa"}
              label={{
                value: "Count",
                angle: -90,
                position: "insideLeft",
                fill: displayMode === "overlay" ? "#fff" : "#ccc",
              }}
              tick={{ fontSize: displayMode === "overlay" ? 11 : 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            {displayMode !== "overlay" && (
              <Legend
                wrapperStyle={{
                  color: "#ccc",
                }}
              />
            )}
            {showFiresPerInterval && (
              <Bar
                dataKey="intervalTotal"
                fill={displayMode === "overlay" ? "rgba(59, 130, 246, 0.8)" : "#3b82f6"}
                name={`Fires per ${intervalSeconds}s`}
              />
            )}
            {showWindowCumulative && (
              <Line
                type="monotone"
                dataKey="windowCumulative"
                stroke={displayMode === "overlay" ? "rgba(220, 38, 38, 1)" : "#dc2626"}
                activeDot={{
                  r: 6,
                  fill: "#fff",
                  stroke: displayMode === "overlay" ? "rgba(220, 38, 38, 1)" : "#dc2626"
                }}
                dot={{ r: displayMode === "overlay" ? 4 : 3 }}
                name="Window Cumulative"
                strokeWidth={displayMode === "overlay" ? 4 : 2}
              />
            )}
            {showDebateTotal && (
              <Line
                type="monotone"
                dataKey="actualTotal"
                stroke={displayMode === "overlay" ? "rgba(16, 185, 129, 1)" : "#10b981"}
                activeDot={{
                  r: 6,
                  fill: "#fff",
                  stroke: displayMode === "overlay" ? "rgba(16, 185, 129, 1)" : "#10b981"
                }}
                dot={{ r: displayMode === "overlay" ? 4 : 3 }}
                name="Debate Total"
                strokeWidth={displayMode === "overlay" ? 4 : 2}
                strokeDasharray="5 5"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default memo(HeatmapChart);