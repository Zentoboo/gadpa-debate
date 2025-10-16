import API_URL from "../config";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import GadpaBreathInOut from "../components/GadpaBreathInOut";
import HomeHeroTitle from "../components/HeroTitle";
import "../css/Home.css";
import RevealSplitText from "../components/RevealSplitText";
import FadeInSection from "../components/FadeInSection";

function LoadingState() {
  return (
    <main>
      <div className="loading-state">
        <p>Loading debate status...</p>
      </div>
    </main>
  );
}

function ErrorState({ error, onRetry }) {
  return (
    <main>
      <div className="error-state">
        <p>Connection Error</p>
        <p>{error}</p>
        <button className="retry-btn" onClick={onRetry}>
          Retry
        </button>
      </div>
    </main>
  );
}

function DebatesTable({ debates, onJoinDebate }) {
  return (
    <div className="debates-table-container">
      <table className="debates-table">
        <thead>
          <tr>
            <th className="col-status-home">Status</th>
            <th className="col-title-home">Title</th>
            <th className="col-description-home">Description</th>
            <th className="col-schedule-home">Schedule</th>
            <th className="col-action-home">Action</th>
          </tr>
        </thead>
        <tbody>
          {debates.map((debate) => (
            <tr key={debate.id}>
              <td className="col-status-home" data-label="Status">
                <span className="status-live">LIVE</span>
              </td>
              <td className="col-title-home" data-label="Title">{debate.title}</td>
              <td className="col-description-home" data-label="Description">{debate.description}</td>
              <td className="col-schedule-home" data-label="Schedule">
                {debate.scheduledStartTime &&
                  new Date(debate.scheduledStartTime).toLocaleString()}
              </td>
              <td className="col-action-home" data-label="Action">
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
      setError("");
      const response = await fetch(`${API_URL}/debate/live-debates`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setLiveStatus(data);
    } catch (err) {
      console.error("Failed to fetch live status:", err);
      setError("Could not load live debates. Showing static content only.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveStatus();
  }, []);

  const handleRetry = () => {
    setLoading(true);
    setError("");
    fetchLiveStatus();
  };

  const handleJoinDebate = (debateId) => {
    navigate(`/debate/${debateId}`);
  };

  return (
    <main>
      {/* Hero Section */}
      <section className="hero-section" style={{ position: "relative", overflow: "hidden" }}>
        <GadpaBreathInOut />

        <div className="debates" style={{ maxWidth: "1200px" }}>
          <HomeHeroTitle />
          <h2>Sessions</h2>

          {loading ? (
            <LoadingState />
          ) : error ? (
            <div className="error-inline">
              <p>{error}</p>
              <button className="retry-btn" style={{ display: "block", margin: "1rem auto" }} onClick={handleRetry}>
                retry
              </button>
            </div>
          ) : !liveStatus.isLive ? (
            <NoDebates />
          ) : (
            <DebatesTable debates={liveStatus.debates} onJoinDebate={handleJoinDebate} />
          )}
        </div>
      </section>

      {/* Purpose + Features */}
      <FadeInSection className="edgy-edges">
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
      </FadeInSection>

      {/* About */}
      <FadeInSection>
        <div className="about-container content-wrapper">
          <RevealSplitText tag="h2" className="reveal-title">About</RevealSplitText>
          <RevealSplitText tag="p">
            The Garuda Dwi Pantara (GADPA) Election is an annual democratic voting event...
          </RevealSplitText>
          <button className="button-link" onClick={() => navigate("/about")}>
            <span className="button-link-content">Learn More</span>
          </button>
        </div>
      </FadeInSection>
    </main>
  );
}

export default Home;
