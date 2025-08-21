import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/Home.css";

export default function Home() {
  const [liveDebates, setLiveDebates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLiveDebates = async () => {
      try {
        const response = await fetch("http://localhost:5076/debate/live-debates");
        if (!response.ok) {
          throw new Error("Failed to fetch live debates.");
        }
        const data = await response.json();
        if (data.isLive) {
          setLiveDebates(data.debates);
        } else {
          setLiveDebates([]);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveDebates();
  }, []);

  const handleJoinDebate = (debateId) => {
    navigate(`/debate/${debateId}`);
  };

  if (loading) {
    return (
      <div className="home-container">
        <p>Loading live debates...</p>
      </div>
    );
  }

  return (
    <div className="home-container">
      <h1 className="home-title">Public Debates</h1>
      <p>Join a live debate below to participate.</p>

      {error && <p className="home-message error">{error}</p>}

      {liveDebates.length > 0 ? (
        <table className="debate-list-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {liveDebates.map((debate) => (
              <tr key={debate.id}>
                <td>{debate.title}</td>
                <td>
                  <span className="live-indicator">
                    <span className="live-dot"></span> LIVE
                  </span>
                </td>
                <td>
                  <button
                    className="join-button"
                    onClick={() => handleJoinDebate(debate.id)}
                  >
                    Join
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="no-debates-message">
          There are currently no live debates. Please check back later!
        </p>
      )}
    </div>
  );
}