import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import GadpaBreathInOut from "../components/GadpaBreathInOut";
import HeroTitle from "../components/HeroTitle";
import FadeInSection from "../components/FadeInSection";
import "../css/Home.css";
import RevealSplitText from "../components/RevealSplitText";

// Loading component
function LoadingState() {
  return (
    <main>
      <section>
        <div className="loading-state">
          <h2>Loading debate status...</h2>
        </div>
      </section>
    </main>
  );
}

// Error component
function ErrorState({ error, onRetry }) {
  return (
    <main>
      <section>
        <div className="error-state">
          <h2>Connection Error</h2>
          <p>{error}</p>
          <button className="retry-btn" onClick={onRetry}>
            Retry
          </button>
        </div>
      </section>
    </main>
  );
}

// Debates table component
function DebatesTable({ debates, onJoinDebate }) {
  return (
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
          {debates.map((debate) => (
            <tr key={debate.id}>
              <td data-label="Status">
                <span className="status-live">LIVE</span>
              </td>
              <td data-label="Title">{debate.title}</td>
              <td data-label="Description">{debate.description}</td>
              <td data-label="Schedule">
                {debate.scheduledStartTime &&
                  new Date(debate.scheduledStartTime).toLocaleString()}
              </td>
              <td data-label="Action">
                <button
                  className="join-debate-btn"
                  onClick={() => onJoinDebate(debate.id)}
                >
                  Join Debate
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// No debates component
function NoDebates() {
  return (
    <div className="no-debates">
      <h3>No Live Debates Currently</h3>
      <p>Check back later for live debate sessions.</p>
    </div>
  );
}

function Home() {
  const [liveStatus, setLiveStatus] = useState({ isLive: false, debates: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchLiveStatus = async () => {
    try {
      setError(""); // Clear any previous errors
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

  useEffect(() => {
    fetchLiveStatus();
    const intervalId = setInterval(fetchLiveStatus, 30000);
    return () => clearInterval(intervalId);
  }, []);

  const handleRetry = () => {
    setLoading(true);
    setError("");
    fetchLiveStatus();
  };

  const handleJoinDebate = (debateId) => {
    navigate(`/debate/${debateId}`);
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={handleRetry} />;
  }

  return (
    <main>
      {/* Hero Section */}
      <section className="hero-section" style={{ position: "relative", overflow: "hidden" }}>
        <GadpaBreathInOut />
        {/* <p>Indonesian Student Election Management System</p> */}

        <div className="debates" style={{ maxWidth: "1200px" }}>
          <HeroTitle />
          <h2>Debates</h2>
          {!liveStatus.isLive ? (
            <NoDebates />
          ) : (
            <DebatesTable
              debates={liveStatus.debates}
              onJoinDebate={handleJoinDebate}
            />
          )}
        </div>
      </section>

      <section
        style={{
          display: "grid",
          placeItems: "center"
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4rem",
            width: "100%",
            maxWidth: "1200px",
            alignItems: "start",
          }}
        >
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", textAlign: "left" }}>
            <RevealSplitText tag="h2">Purpose</RevealSplitText>
            <RevealSplitText tag="p">
              Participate in real-time debate sessions with interactive features.
              Engage with candidates, ask questions, and make informed decisions
              during the electoral process. Our platform ensures transparency and
              democratic participation for all Indonesian students.
            </RevealSplitText>
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", textAlign: "right" }}>
            <RevealSplitText tag="h2">Features</RevealSplitText>
            <RevealSplitText tag="p">
              Experience live streaming debates, real-time Q&amp;A sessions,
              candidate profiles, voting mechanisms, and comprehensive election
              results. All designed to foster transparent democratic engagement
              within the Indonesian student community.
            </RevealSplitText>
          </div>
        </div>
      </section>

      {/* About Section */}
      <FadeInSection className="content-section">
        <div>
          <h2>About</h2>
          <p>
            Gabungan Asosiasi dan Diaspora Pelajar Indonesia (GADPA) election
            management system for Kongres PPI XMUM 2025/2026. This platform
            enables democratic participation through transparent and interactive
            debate sessions.
          </p>
          <Link to="/about" className="info-link">
            Learn More →
          </Link>
        </div>
      </FadeInSection>
    </main>
  );
}

export default Home;
