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
  onDataUpdate
}) {
  const [data, setData] = useState([]);
  const [actualTotal, setActualTotal] = useState(0);

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
          backgroundColor: "#1e1e1e",
          border: "1px solid #2a2a2a",
          color: "#fff",
          padding: "12px",
          borderRadius: "6px"
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

  return (
    <div style={{ width: "100%", height: 400 }}>
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
      <ResponsiveContainer>
        <ComposedChart data={data}>
          <CartesianGrid stroke="#333" strokeDasharray="3 3" />
          <XAxis
            stroke="#aaa"
            dataKey="bucketLabel"
            label={{
              value: "Time Interval",
              position: "insideBottomRight",
              offset: -5,
              fill: "#ccc",
            }}
          />
          <YAxis
            stroke="#aaa"
            label={{
              value: "Count",
              angle: -90,
              position: "insideLeft",
              fill: "#ccc",
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{
              color: "#ccc",
            }}
          />
          <Bar
            dataKey="intervalTotal"
            fill="#3b82f6"
            name={`Fires per ${intervalSeconds}s`}
          />
          <Line
            type="monotone"
            dataKey="windowCumulative"
            stroke="#dc2626"
            activeDot={{ r: 6, fill: "#fff", stroke: "#dc2626" }}
            dot={{ r: 3 }}
            name="Window Cumulative"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="actualTotal"
            stroke="#10b981"
            activeDot={{ r: 6, fill: "#fff", stroke: "#10b981" }}
            dot={{ r: 3 }}
            name="Debate Total"
            strokeWidth={2}
            strokeDasharray="5 5"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(HeatmapChart);