import React, { useState, useEffect } from "react";
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

export default function HeatmapChart({
  fetchUrl,
  intervalSeconds = 10,
  onDataUpdate
}) {
  const [data, setData] = useState([]);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    let timer;

    const fetchBucketData = () => {
      fetch(`${fetchUrl}?intervalSeconds=${intervalSeconds}`)
        .then(res => res.json())
        .then(json => {
          const now = Date.now();
          const elapsedSec = Math.floor((now - startTime) / 1000);

          // Completed bucket start
          const bucketStart = elapsedSec - intervalSeconds;
          const bucketLabel = `${bucketStart}-${bucketStart + intervalSeconds}s`;

          // Skip if negative (before first bucket is done)
          if (bucketStart < 0) return;

          setData(prev => {
            if (prev.some(item => item.bucketLabel === bucketLabel)) {
              return prev;
            }
            return [
              ...prev,
              {
                bucketLabel,
                total: json.total,
                interval: json.intervalTotal
              }
            ];
          });

          if (onDataUpdate) onDataUpdate(json);
        })
        .catch(console.error);
    };

    const scheduleNextFetch = () => {
      const now = Date.now();
      const elapsedSec = Math.floor((now - startTime) / 1000);
      const secsToNextBucket = intervalSeconds - (elapsedSec % intervalSeconds);
      timer = setTimeout(() => {
        fetchBucketData();
        scheduleNextFetch();
      }, secsToNextBucket * 1000);
    };

    scheduleNextFetch();

    return () => clearTimeout(timer);
  }, [fetchUrl, intervalSeconds, startTime, onDataUpdate]);

  return (
    <div style={{ width: "100%", height: 400 }}>
      <h2>🔥 Heatmap Trend (per {intervalSeconds}s)</h2>
      <ResponsiveContainer>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="bucketLabel"
            label={{ value: "Time Interval", position: "insideBottomRight", offset: -5 }}
          />
          <YAxis label={{ value: "Count", angle: -90, position: "insideLeft" }} />
          <Tooltip />
          <Legend />
          {/* Interval as bar */}
          <Bar dataKey="interval" fill="#0077ff" name={`Fires per ${intervalSeconds}s`} />
          {/* Total as line */}
          <Line type="monotone" dataKey="total" stroke="#af191bff" activeDot={{ r: 8 }} name="Total Fires" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
