import React, { useState, useCallback } from "react";
import HeatmapChart from "../components/HeatmapChart";
import "./Home.css";

export default function Home() {
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState("");
  const [fires, setFires] = useState([]);
  const [bursts, setBursts] = useState([]);
  const [isShaking, setIsShaking] = useState(false);

  const sendFire = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    fetch("http://localhost:5076/debate/fire", { method: "POST" })
      .then(async (res) => {
        if (res.status === 429) {
          const data = await res.json();
          setMessage(`${data.message} Retry after ${data.retryAfterSeconds}s`);

          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 600);

          const id = Date.now();
          setBursts((prev) => [...prev, { id }]);
          setTimeout(() => {
            setBursts((prev) => prev.filter((b) => b.id !== id));
          }, 1200);
        } else if (res.ok) {
          const data = await res.json();
          setMessage(data.message);
          setTotal(data.total); // This sets the global total from the POST request.

          const id = Date.now();
          setFires((prev) => [...prev, { id, x, y }]);
          setTimeout(() => {
            setFires((prev) => prev.filter((f) => f.id !== id));
          }, 2000);
        }
      })
      .catch(console.error);
  };

  const handleDataUpdate = useCallback((json) => {
    if (json && typeof json.total !== 'undefined') {
      setTotal(json.total); // This sets the global total from the heatmap GET request.
    }
  }, []);

  return (
    <div className="home-container">
      <div className={`fire-card ${isShaking ? 'shake' : ''}`}>
        <h1 className="home-title">🔥 Heat 🔥</h1>
        <p className="home-total">Total fires: {total}</p>

        <div className="fire-btn-wrapper">
          <button onClick={sendFire} className="fire-button">
            DETONATE
          </button>

          <div className="fire-animations">
            {fires.map((fire) => (
              <span
                key={fire.id}
                className="fire-emoji"
                style={{
                  left: `${fire.x}px`,
                  top: `${fire.y}px`,
                }}
              >
                🔥
              </span>
            ))}
          </div>
        </div>

        {bursts.map((burst) => (
          <span key={burst.id} className="burst-emoji">
            💢
          </span>
        ))}

        {message && <p className="home-message">{message}</p>}
      </div>

      <div className="police-strip-container">
        <div className="police-strip"></div>
      </div>

      <div className="section-card chart-card">
        <h2 className="chart-title">🔥 Heatmap Chart</h2>
        <HeatmapChart
          fetchUrl="http://localhost:5076/debate/heatmap-data"
          intervalSeconds={10}
          onDataUpdate={handleDataUpdate}
        />
      </div>
    </div>
  );
}