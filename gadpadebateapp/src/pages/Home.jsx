import React, { useState, useEffect } from "react";
import HeatmapChart from "../components/HeatmapChart";
import useSignalR from "../hooks/useSignalR";
import "./Home.css";

export default function Home() {
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState("");
  const [fires, setFires] = useState([]);
  const [bursts, setBursts] = useState([]);
  const [isShaking, setIsShaking] = useState(false);
  const [liveStatus, setLiveStatus] = useState({ isLive: false, status: 'Offline' });
  const [loading, setLoading] = useState(true);
  const [externalFires, setExternalFires] = useState([]); // Fires from other users
  const [countdown, setCountdown] = useState(null);
  
  // SignalR hook for real-time features
  const { isConnected, viewerCount, fireEvents, sendFireReaction } = useSignalR();

  useEffect(() => {
    // Check live status first
    fetch("http://localhost:5076/api/live-status")
      .then(res => res.json())
      .then(data => {
        setLiveStatus(data);
        setLoading(false);
        
        // Only fetch heatmap data if live
        if (data.isLive) {
          return fetch("http://localhost:5076/debate/heatmap")
            .then(res => res.json())
            .then(heatmapData => setTotal(heatmapData.total));
        }
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Listen for external fire reactions from SignalR
  useEffect(() => {
    const handleExternalFire = (event) => {
      const { userName, x, y } = event.detail;
      const id = Date.now() + Math.random();
      
      // Add external fire animation
      setExternalFires(prev => [...prev, { id, x, y, userName }]);
      
      // Play incoming fire sound (different from own fire)
      playSound('https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', 0.3);
      
      // Remove after animation
      setTimeout(() => {
        setExternalFires(prev => prev.filter(f => f.id !== id));
      }, 3000);
    };

    window.addEventListener('externalFireReaction', handleExternalFire);
    return () => window.removeEventListener('externalFireReaction', handleExternalFire);
  }, []);

  // Update total when new fire events come from SignalR
  useEffect(() => {
    if (fireEvents.length > 0) {
      const latestEvent = fireEvents[fireEvents.length - 1];
      setTotal(latestEvent.total);
    }
  }, [fireEvents]);

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Spacebar = Fire
      if (event.code === 'Space' && !event.repeat) {
        event.preventDefault();
        
        // Simulate click on fire button
        const fakeEvent = {
          currentTarget: { getBoundingClientRect: () => ({ left: 100, top: 50 }) },
          clientX: 150, // Fake click position
          clientY: 75
        };
        sendFire(fakeEvent);
      }
      
      // 'F' key = Fire
      if (event.key.toLowerCase() === 'f' && !event.repeat) {
        event.preventDefault();
        const fakeEvent = {
          currentTarget: { getBoundingClientRect: () => ({ left: 100, top: 50 }) },
          clientX: 150,
          clientY: 75
        };
        sendFire(fakeEvent);
      }
      
      // 'R' key = Refresh/Reload page
      if (event.key.toLowerCase() === 'r' && event.ctrlKey) {
        // Let browser handle Ctrl+R naturally
        return;
      }
    };

    // Only add keyboard listeners when debate is live or on main page
    if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [liveStatus.isLive]); // Re-add when live status changes

  // Countdown timer for scheduled debates
  useEffect(() => {
    if (!liveStatus.isLive) {
      // Mock scheduled time - 5 minutes from now (for demo)
      // In real app, this would come from the API
      const mockScheduledTime = new Date(Date.now() + 5 * 60 * 1000);
      
      const updateCountdown = () => {
        const now = new Date();
        const timeLeft = mockScheduledTime - now;
        
        if (timeLeft > 0) {
          const hours = Math.floor(timeLeft / (1000 * 60 * 60));
          const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
          
          setCountdown({
            hours,
            minutes,
            seconds,
            total: timeLeft
          });
        } else {
          setCountdown(null);
          // Could trigger a refresh to check if debate went live
        }
      };
      
      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      
      return () => clearInterval(interval);
    } else {
      setCountdown(null);
    }
  }, [liveStatus.isLive]);

  // Sound effect function
  const playSound = (url, volume = 0.5) => {
    try {
      const audio = new Audio(url);
      audio.volume = volume;
      audio.play().catch(err => console.log('Sound play failed:', err));
    } catch (err) {
      console.log('Sound creation failed:', err);
    }
  };

  // Simple sound effects using Audio API
  const playFireSound = () => {
    // Create a simple explosion sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Create explosion-like sound
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.3);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (err) {
      console.log('Web Audio API not supported');
    }
  };

  const sendFire = (e) => {
    if (!liveStatus.isLive) {
      setMessage("🚫 Debate is not live yet! Fire button disabled.");
      
      // Trigger card shake even when not live
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
      
      // Show burst emoji for error
      const id = Date.now();
      setBursts((prev) => [...prev, { id }]);
      setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== id));
      }, 1200);
      
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left; // click X inside button
    const y = e.clientY - rect.top;  // click Y inside button

    fetch("http://localhost:5076/debate/fire", { method: "POST" })
      .then(async (res) => {
        if (res.status === 429) {
          const data = await res.json();
          setMessage(`${data.message} Retry after ${data.retryAfterSeconds}s`);

          // Trigger card shake
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 600);

          // Spawn a 💢 burst at top-right of card
          const id = Date.now();
          setBursts((prev) => [...prev, { id }]);
          setTimeout(() => {
            setBursts((prev) => prev.filter((b) => b.id !== id));
          }, 1200);
        } else if (res.ok) {
          const data = await res.json();
          setMessage(data.message);
          setTotal(data.total);

          // Play fire sound effect
          playFireSound();

          // Spawn a fire at click position
          const id = Date.now();
          setFires((prev) => [...prev, { id, x, y }]);
          setTimeout(() => {
            setFires((prev) => prev.filter((f) => f.id !== id));
          }, 2000);

          // Send fire reaction to other users via SignalR
          if (sendFireReaction) {
            sendFireReaction(x, y, 'Anonymous');
          }
        }
      })
      .catch(console.error);
  };

  if (loading) {
    return (
      <div className="home-container">
        <div className="fire-card">
          <h2>Loading debate status...</h2>
        </div>
      </div>
    );
  }

  // If not live, show offline page with nice styling
  if (!liveStatus.isLive) {
    return (
      <div className="home-container">
        <div className="fire-card offline-card">
          <h1 className="home-title">🎙️ Kongres PPI XMUM 2025/2026</h1>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "2rem", opacity: 0.9 }}>
            Presidential Debate Session
          </h2>
          
          <div className="status-box">
            <h3 style={{ color: "#ff6b6b", marginBottom: "1rem" }}>
              ⏰ Status: {liveStatus.status}
            </h3>
            
            {countdown && (
              <div className="countdown-container">
                <h3 style={{ color: "#4CAF50", marginBottom: "1rem" }}>
                  🚀 Next Debate Starting In:
                </h3>
                <div className="countdown-display">
                  <div className="countdown-unit">
                    <span className="countdown-number">{countdown.hours.toString().padStart(2, '0')}</span>
                    <span className="countdown-label">Hours</span>
                  </div>
                  <span className="countdown-separator">:</span>
                  <div className="countdown-unit">
                    <span className="countdown-number">{countdown.minutes.toString().padStart(2, '0')}</span>
                    <span className="countdown-label">Minutes</span>
                  </div>
                  <span className="countdown-separator">:</span>
                  <div className="countdown-unit">
                    <span className="countdown-number">{countdown.seconds.toString().padStart(2, '0')}</span>
                    <span className="countdown-label">Seconds</span>
                  </div>
                </div>
              </div>
            )}
            
            <p style={{ fontSize: "1.1rem", lineHeight: "1.6", marginBottom: "1rem" }}>
              The debate session is currently offline. 
              Please wait for the BPU (Badan Pemilihan Umum) to start the live debate session.
            </p>
            <p style={{ fontSize: "1rem", opacity: 0.8 }}>
              When live, you'll be able to engage with the debate using the fire button (🔥) 
              to show your reaction to the candidates' responses!
            </p>
          </div>

          <div style={{ fontSize: "0.9rem", opacity: 0.7, marginTop: "2rem" }}>
            <p>Stay tuned for updates from the Election Commission</p>
            <p>Check back soon or refresh the page</p>
          </div>
        </div>
        
        {/* Police Strip even when offline */}
        <div className="police-strip"></div>
      </div>
    );
  }

  // If live, show debate interface with animations
  return (
    <div className="home-container">
      {/* Live Status Banner */}
      {liveStatus.isLive && (
        <div className="live-banner">
          <h2>🔴 LIVE: {liveStatus.debateSession}</h2>
          {liveStatus.currentQuestion && (
            <p>Current Question: {liveStatus.currentQuestion}</p>
          )}
          {liveStatus.timeRemaining && (
            <p>Time Remaining: {Math.floor(liveStatus.timeRemaining / 60)}:{(liveStatus.timeRemaining % 60).toString().padStart(2, '0')}</p>
          )}
          <div className="viewer-info">
            <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? '🟢' : '🔴'} {isConnected ? 'Connected' : 'Connecting...'}
            </span>
            <span className="viewer-count">👥 {viewerCount} watching</span>
          </div>
          <div className="keyboard-shortcuts">
            <small>⌨️ Shortcuts: [SPACE] or [F] = Fire 🔥</small>
          </div>
        </div>
      )}

      {/* Fire button card */}
      <div className={`fire-card ${isShaking ? 'shake' : ''}`}>
        <h1 className="home-title">🔥 Heat 🔥</h1>
        <p className="home-total">Total fires: {total}</p>

        <div className="fire-btn-wrapper">
          <button onClick={sendFire} className="fire-button">
            DETONATE
          </button>

          {/* Fires - positioned relative to button */}
          <div className="fire-animations">
            {fires.map((fire) => (
              <span
                key={fire.id}
                className="fire-emoji"
                style={{
                  left: `${fire.x}px`,
                  top: `${fire.y}px`
                }}
              >
                🔥
              </span>
            ))}
            
            {/* External fires from other users */}
            {externalFires.map((fire) => (
              <span
                key={fire.id}
                className="external-fire-emoji"
                style={{
                  left: `${Math.random() * 200}px`, // Random position
                  top: `${Math.random() * 50}px`,
                }}
                title={`Fire from ${fire.userName}`}
              >
                🌟
              </span>
            ))}
          </div>
        </div>

        {/* Bursts - positioned relative to card */}
        {bursts.map((burst) => (
          <span key={burst.id} className="burst-emoji">
            💢
          </span>
        ))}

        {message && <p className="home-message">{message}</p>}
      </div>

      {/* Police Strip */}
      <div className="police-strip"></div>

      {/* Chart card */}
      <div className="section-card chart-card">
        <h2 className="chart-title">🔥 Heatmap Chart</h2>
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