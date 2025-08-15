import React, { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

export default function HeatmapChart({ fetchUrl, pollInterval = 10000 }) {
  const [data, setData] = useState([]);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const fetchData = () => {
      fetch(fetchUrl)
        .then(res => res.json())
        .then(json => {
          const now = Date.now();
          const elapsedMs = now - startTime;

          if (data.length === 0 || json.total !== data[data.length - 1].total) {
            setData(prev => [
              ...prev,
              { elapsedMs: elapsedMs, total: json.total }
            ]);
          }
        })
        .catch(console.error);
    };

    fetchData();
    const interval = setInterval(fetchData, pollInterval);
    return () => clearInterval(interval);
  }, [fetchUrl, pollInterval, startTime, data]);

  // Custom tick formatter to display milliseconds as seconds, rounded to the nearest whole number
  const formatTimeTick = (tick) => {
    return `${Math.round(tick / 1000)}s`;
  };

  return (
    <div style={{ width: "100%", height: 400 }}>
      <h2>🔥 Heatmap Trend</h2>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="elapsedMs"
            label={{ value: "Time", position: "insideBottomRight", offset: -5 }}
            tickFormatter={formatTimeTick}
            type="number"
            domain={['dataMin', 'dataMax']}
          />
          <YAxis label={{ value: "Total Fires", angle: -90, position: "insideLeft" }} />
          <Tooltip
            formatter={(value) => [`Total Fires: ${value}`]}
            // Label formatter for the tooltip, also rounded to the nearest second
            labelFormatter={(label) => `Time: ${Math.round(label / 1000)}s`}
          />
          <Legend />
          <Line type="monotone" dataKey="total" stroke="#af191bff" activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}