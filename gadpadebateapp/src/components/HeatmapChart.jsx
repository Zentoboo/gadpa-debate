import React, { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

export default function HeatmapChart({ fetchUrl, pollInterval = 10000 }) { // default 10s
  const [data, setData] = useState([]);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const fetchData = () => {
      fetch(fetchUrl)
        .then(res => res.json())
        .then(json => {
          const now = Date.now();
          const elapsedSec = Math.floor((now - startTime) / 1000);
          setData(prev => [
            ...prev,
            { time: `${elapsedSec}s`, total: json.total }
          ]);
        })
        .catch(console.error);
    };

    // Initial fetch
    fetchData();
    // Poll every X ms
    const interval = setInterval(fetchData, pollInterval);
    return () => clearInterval(interval);
  }, [fetchUrl, pollInterval, startTime]);

  return (
    <div style={{ width: "100%", height: 300 }}>
      <h2>🔥 Heatmap Trend</h2>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" label={{ value: "Time", position: "insideBottomRight", offset: -5 }} />
          <YAxis label={{ value: "Total Fires", angle: -90, position: "insideLeft" }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="total" stroke="#ff4d4f" activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
