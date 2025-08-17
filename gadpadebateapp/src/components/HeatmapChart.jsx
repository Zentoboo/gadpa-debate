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

  useEffect(() => {
    const fetchHeatmapData = async () => {
      try {
        const response = await fetch(`${fetchUrl}?intervalSeconds=${intervalSeconds}&lastMinutes=${lastMinutes}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const json = await response.json();

        if (json.buckets) {
          setData(json.buckets);
          if (onDataUpdate) onDataUpdate(json); // Pass the entire JSON object
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

  return (
    <div style={{ width: "100%", height: 400 }}>
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
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e1e1e",
              border: "1px solid #2a2a2a",
              color: "#fff",
            }}
            labelStyle={{ color: "#fff" }}
            itemStyle={{ color: "#ccc" }}
          />
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
            dataKey="total" // Reverted to 'total' to show cumulative sum
            stroke="#dc2626"
            activeDot={{ r: 6, fill: "#fff", stroke: "#dc2626" }}
            dot={{ r: 3 }}
            name="Cumulative Total" // Updated name for clarity
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(HeatmapChart);