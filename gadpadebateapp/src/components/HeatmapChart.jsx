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
              fill: "#ccc", // axis label color
            }}
          />

          <YAxis
            stroke="#aaa"
            label={{
              value: "Count",
              angle: -90,
              position: "insideLeft",
              fill: "#ccc", // axis label color
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

          {/* Interval as bar */}
          <Bar
            dataKey="interval"
            fill="#3b82f6" // theme blue
            name={`Fires per ${intervalSeconds}s`}
          />

          {/* Total as line */}
          <Line
            type="monotone"
            dataKey="total"
            stroke="#dc2626" // theme red
            activeDot={{ r: 6, fill: "#fff", stroke: "#dc2626" }}
            name="Total Fires"
          />

        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}