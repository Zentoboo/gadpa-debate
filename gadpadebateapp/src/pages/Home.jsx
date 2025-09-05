import React, { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import "../css/Home.css";

function FadeInBlock({ children }) {
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["0.9 1", "0.4 0"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);

  const y = useTransform(scrollYProgress, [0, 0.3], [50, 0]);

  const scale = useTransform(scrollYProgress, [0, 0.3], [0.9, 1]);

  return (
    <motion.div
      ref={ref}
      style={{ opacity, y, scale }}
      className="block"
    >
      {children}
    </motion.div>
  );
}

export default function Home() {
  const [liveStatus, setLiveStatus] = useState({ isLive: false, debates: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

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
    const intervalId = setInterval(fetchLiveStatus, 30000);
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
        <h2 className="section-title">Debates</h2>

        {!liveStatus.isLive ? (
          <div className="status-card offline">
            <div className="status-indicator offline"></div>
            <div className="status-content">
              <h3>No Live Debates Currently</h3>
              <p>Check back later for live debate sessions.</p>
            </div>
          </div>
        ) : (
          <div className="debates-table-container">
            <table className="debates-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Schedule</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {liveStatus.debates.map((debate) => (
                  <tr key={debate.id}>
                    <td>
                      <span className="status-indicator live"></span> LIVE
                    </td>
                    <td>{debate.title}</td>
                    <td>{debate.description}</td>
                    <td>
                      {debate.scheduledStartTime &&
                        new Date(debate.scheduledStartTime).toLocaleString()}
                    </td>
                    <td>
                      <button
                        onClick={() => navigate(`/debate/${debate.id}`)}
                      >
                        Join Debate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <FadeInBlock>
        <h2 className="page-title">about</h2>
        <p className="about-content">
          Gabungan Asosiasi dan Diaspora Pelajar Indonesia (GADPA) election
          management system for Kongres PPI XMUM 2025/2026.
        </p>
        <Link to="/about" className="info-link">
          Learn More →
        </Link>
      </FadeInBlock>
      <FadeInBlock>
        <h2 className="page-title">purpose</h2>
        <p className="about-content">
          Participate in real-time debate sessions with interactive features
          like question submissions and live reactions.
          Built with modern web technologies to ensure secure, transparent,
          and accessible election processes.
        </p>
      </FadeInBlock>
    </div>
  );
}
