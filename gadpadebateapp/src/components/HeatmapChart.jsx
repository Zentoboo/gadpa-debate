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

export default React.memo(function HeatmapChart({
  fetchUrl,
  intervalSeconds = 10,
  onDataUpdate
}) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHeatmapData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${fetchUrl}?intervalSeconds=${intervalSeconds}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();

        // Transform the buckets data for the chart
        const chartData = json.buckets.map((bucket, index) => ({
          id: index,
          bucketLabel: bucket.bucketLabel,
          bucketEndTimestamp: bucket.bucketEndTimestamp,
          intervalFireCount: bucket.intervalFireCount,
          runningTotal: bucket.runningTotal
        }));

        setData(chartData);
        setLastUpdate(new Date(json.generatedAt));

        // Call the callback with summary data for Home component
        if (onDataUpdate) {
          onDataUpdate({
            total: json.total, // For Home component compatibility
            totalFires: json.totalFires,
            last3MinutesTotalFires: json.last3MinutesTotalFires,
            bucketsCount: json.bucketsCount,
            currentBucketCount: chartData[chartData.length - 1]?.intervalFireCount || 0
          });
        }
      } catch (error) {
        console.error("Failed to fetch heatmap data:", error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchHeatmapData();

    // Set up interval to refresh every 10 seconds
    const intervalId = setInterval(fetchHeatmapData, intervalSeconds * 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, [fetchUrl, intervalSeconds]); // Removed onDataUpdate from deps

  // Custom tooltip to show more detailed information
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-600 p-2 rounded shadow-lg text-sm">
          <p className="text-white font-medium mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-xs">
              {entry.dataKey === 'intervalFireCount' ? 'Fires' : 'Total'}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (error) {
    return (
      <div className="w-full p-4 bg-red-900 border border-red-600 rounded">
        <p className="text-red-200">Error loading heatmap: {error}</p>
        <p className="text-red-300 text-sm mt-1">Check if the backend is running on the correct port.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header with status */}
      <div className="flex justify-between items-center mb-2 text-xs text-gray-500">
        <div className="flex items-center space-x-3">
          <span>Last 3 minutes • 10s intervals</span>
          {isLoading && (
            <div className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          )}
        </div>
        {lastUpdate && (
          <span>{lastUpdate.toLocaleTimeString()}</span>
        )}
      </div>

      {/* Chart */}
      <div style={{ width: "100%", height: 400 }}>
        <ResponsiveContainer>
          <ComposedChart
            data={data}
            margin={{ top: 50, right: 20, left: 20, bottom: 20 }}
          >
            <CartesianGrid stroke="#333" strokeDasharray="3 3" />
            <XAxis
              stroke="#666"
              dataKey="bucketLabel"
              tick={{ fontSize: 10, fill: "#999" }}
              tickLine={{ stroke: "#666" }}
              axisLine={{ stroke: "#666" }}
              interval={2} // Show every 3rd label (0, 3, 6, 9, 12, 15)
              height={40}
            />
            <YAxis
              stroke="#666"
              tick={{ fontSize: 10, fill: "#999" }}
              tickLine={{ stroke: "#666" }}
              axisLine={{ stroke: "#666" }}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              wrapperStyle={{
                color: "#ccc",
                fontSize: "12px",
                paddingBottom: "10px"
              }}
            />
            <Bar
              dataKey="intervalFireCount"
              fill="#3b82f6"
              name="Interval Fires"
              radius={[2, 2, 0, 0]}
            />
            <Line
              type="monotone"
              dataKey="runningTotal"
              stroke="#dc2626"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#dc2626", stroke: "#fff", strokeWidth: 2 }}
              name="Running Total"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats */}
      {data.length > 0 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-gray-400">Current Interval</div>
            <div className="text-xl font-bold text-blue-400">
              {data[data.length - 1]?.intervalFireCount || 0}
            </div>
          </div>
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-gray-400">3min Total</div>
            <div className="text-xl font-bold text-green-400">
              {data.reduce((sum, bucket) => sum + bucket.intervalFireCount, 0)}
            </div>
          </div>
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-gray-400">Peak Interval</div>
            <div className="text-xl font-bold text-orange-400">
              {Math.max(...data.map(d => d.intervalFireCount))}
            </div>
          </div>
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-gray-400">All-time Total</div>
            <div className="text-xl font-bold text-purple-400">
              {data[data.length - 1]?.runningTotal || 0}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});