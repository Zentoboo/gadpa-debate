import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import GadpaBreathInOut from "../components/GadpaBreathInOut";
import HeroTitle from "../components/HeroTitle";
import "../css/Home.css";
import RevealSplitText from "../components/RevealSplitText";

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

function DebatesTable({ debates, onJoinDebate }) {
  return (
    <div className="debates-table-container">
      <table className="debates-table">
        <thead>
          <tr>
            <th className="col-status">Status</th>
            <th className="col-title">Title</th>
            <th className="col-description">Description</th>
            <th className="col-schedule">Schedule</th>
            <th className="col-action">Action</th>
          </tr>
        </thead>
        <tbody>
          {debates.map((debate) => (
            <tr key={debate.id}>
              <td className="col-status" data-label="Status">
                <span className="status-live">LIVE</span>
              </td>
              <td className="col-title" data-label="Title">{debate.title}</td>
              <td className="col-description" data-label="Description">{debate.description}</td>
              <td className="col-schedule" data-label="Schedule">
                {debate.scheduledStartTime &&
                  new Date(debate.scheduledStartTime).toLocaleString()}
              </td>
              <td className="col-action" data-label="Action">
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
      {/* Top: Purpose + Features */}
      <section>
        <div className="content-wrapper">
          <div className="purpose-features-container">
            <div className="purpose-container">
              <RevealSplitText tag="h2" className="reveal-title">Purpose</RevealSplitText>
              <RevealSplitText tag="p">
                To enrich the quality and retention rate of GADPA Election 2025–2026.
                To foster transparent, inclusive, and interactive participation among
                Indonesian students. To strengthen democratic values and informed
                decision-making within the student body.
              </RevealSplitText>
            </div>

            {/* Right: Features */}
            <div className="features-container">
              <RevealSplitText tag="h2" className="reveal-title">Features</RevealSplitText>
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
      </section>

      <section>
        <div className="about-container content-wrapper">
          <RevealSplitText tag="h2" className="reveal-title">About</RevealSplitText>
          <RevealSplitText tag="p">
            The Garuda Dwi Pantara (GADPA) Election is an annual democratic voting event organized by the Indonesian Society Club (PPI XMUM).
            As our Indonesian community continues to grow, this year’s election aims to build on past successes by fostering greater transparency, inclusivity, and participation than ever before.
          </RevealSplitText>
          <Link to="/about" className="info-link">
            Learn More →
          </Link>
        </div>
      </section>
    </main>
  );
}

export default Home;
