import React, { useState } from "react";
import HeatmapChart from "../components/HeatmapChart";

export default function Home() {
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState("");

  const sendFire = () => {
    fetch("http://localhost:5076/debate/fire", { method: "POST" })
      .then(async res => {
        if (res.status === 429) {
          const data = await res.json();
          setMessage(`${data.message} Retry after ${data.retryAfterSeconds}s`);
        } else if (res.ok) {
          const data = await res.json();
          setMessage(data.message);
          setTotal(data.total);
        }
      })
      .catch(console.error);
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h1>🔥 Debate Heatmap</h1>
      <p>Total fires: {total}</p>
      <button onClick={sendFire}>Send Fire</button>
      {message && <p>{message}</p>}
      <div style={{ padding: "1rem" }}>
        <HeatmapChart
          fetchUrl="http://localhost:5076/debate/heatmap-data"
          pollInterval={10000}
          intervalSeconds={10}
          onDataUpdate={(json) => setTotal(json.total)}
        />
      </div>
    </div>
  );
}
