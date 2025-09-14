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
      <section style={{ padding: 0, margin: 0, display: "flex", flexDirection: "column" }}>
        {/* Top: Purpose + Features */}
        <div style={{ backgroundColor: "#150000", width: "100%" }}>
          <div className="purpose-features-container content-wrapper">
            {/* Left: Purpose */}
            <div className="purpose-container">
              <RevealSplitText tag="h2">Purpose</RevealSplitText>
              <RevealSplitText tag="p">
                To enrich the quality and retention rate of GADPA Election 2025–2026.
                To foster transparent, inclusive, and interactive participation among
                Indonesian students. To strengthen democratic values and informed
                decision-making within the student body.
              </RevealSplitText>
            </div>

            {/* Right: Features */}
            <div className="features-container">
              <RevealSplitText tag="h2">Features</RevealSplitText>
              <RevealSplitText tag="p">
                Real-time reactions and dynamic heatmaps allow the audience’s
                engagement to be visualized instantly, creating a more interactive
                atmosphere. Students can actively shape the debate by submitting their
                own questions for candidates. The platform also ensures transparent
                vote counting, which will be presented clearly through the projector.
              </RevealSplitText>
            </div>
          </div>
        </div>

        {/* Bottom: About */}
        <div style={{ backgroundColor: "#001200", width: "100%" }}>
          <div className="about-container content-wrapper">
            <RevealSplitText tag="h2">About</RevealSplitText>
            <RevealSplitText tag="p">
              Gabungan Asosiasi dan Diaspora Pelajar Indonesia (GADPA) election
              management system for Kongres PPI XMUM 2025/2026. This platform enables
              democratic participation through transparent and interactive debate
              sessions.
            </RevealSplitText>
            <Link to="/about" className="info-link">
              Learn More →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;
