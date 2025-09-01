import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../css/Home.css";

export default function Home() {
  const [liveStatus, setLiveStatus] = useState({ isLive: false, debates: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLiveStatus = async () => {
      try {
        const response = await fetch("http://localhost:5076/debate/live-debates");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setLiveStatus(data);
      } catch (error) {
        console.error("Failed to fetch live status:", error);
        setError("Failed to connect to server. Please check if the API is running.");
      } finally {
        setLoading(false);
      }
    };

    fetchLiveStatus();

    const intervalId = setInterval(fetchLiveStatus, 30000); // Check every 30 seconds
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <div className="home-container">
        <div className="loading-card">
          <h2>Loading debate status...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-container">
        <div className="error-card">
          <h2>Connection Error</h2>
          <p className="error-message">{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      <div className="hero-section">
        <h1 className="main-title">GADPA Election 2025/2026</h1>
        <p className="main-subtitle">Indonesian Student Election Management System</p>
      </div>

      <div className="status-section">
        <h2 className="section-title">Live Debate Status</h2>
        
        {!liveStatus.isLive ? (
          <div className="status-card offline">
            <div className="status-indicator offline">●</div>
            <div className="status-content">
              <h3>No Live Debates Currently</h3>
              <p>Check back later for live debate sessions.</p>
            </div>
          </div>
        ) : (
          <div className="debates-grid">
            {liveStatus.debates.map((debate) => (
              <div key={debate.id} className="debate-card">
                <div className="debate-header">
                  <div className="status-indicator live">●</div>
                  <h3>LIVE</h3>
                </div>
                <div className="debate-content">
                  <h4 className="debate-title">{debate.title}</h4>
                  <p className="debate-description">{debate.description}</p>
                  {debate.scheduledStartTime && (
                    <p className="debate-schedule">
                      Scheduled: {new Date(debate.scheduledStartTime).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="debate-actions">
                  <Link 
                    to={`/debate/${debate.id}`} 
                    className="join-button"
                  >
                    Join Debate
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="info-section">
        <div className="info-grid">
          <div className="info-card">
            <h3>About GADPA</h3>
            <p>Gabungan Asosiasi dan Diaspora Pelajar Indonesia (GADPA) election management system for Kongres PPI XMUM 2025/2026.</p>
            <Link to="/about" className="info-link">
              Learn More →
            </Link>
          </div>
          
          <div className="info-card">
            <h3>Live Debates</h3>
            <p>Participate in real-time debate sessions with interactive features like question submissions and live reactions.</p>
          </div>
          
          <div className="info-card">
            <h3>Secure & Transparent</h3>
            <p>Built with modern web technologies to ensure secure, transparent, and accessible election processes.</p>
          </div>
        </div>
      </div>
    </div>
  );
}