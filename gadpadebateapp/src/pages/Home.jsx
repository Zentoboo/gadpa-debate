import React, { useEffect, useState } from "react";

export default function Home() {
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("http://localhost:5076/debate/heatmap")
      .then(res => res.json())
      .then(data => setTotal(data.total))
      .catch(console.error);
  }, []);

  const sendFire = () => {
    fetch("http://localhost:5076/debate/fire", {
      method: "POST"
    })
      .then(async res => {
        if (res.status === 429) {
          const data = await res.json();
          setMessage(`${data.message} Retry after ${data.retryAfterSeconds}s`);
        } else if (res.ok) {
          return res.json().then(data => {
            setMessage(data.message);
            setTotal(data.total);
          });
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
    </div>
  );
}
