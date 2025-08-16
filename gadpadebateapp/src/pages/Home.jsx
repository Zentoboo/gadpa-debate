import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  const [externalFires, setExternalFires] = useState([]);
  const [countdown, setCountdown] = useState(null);

  const { isConnected, viewerCount, fireEvents, sendFireReaction } = useSignalR();

  // Fetches initial debate status and heatmap data
  useEffect(() => {
    // MODIFICATION: Directly set live status for immediate access to content.
    // In a production environment, you would use the fetch call below.
    setLiveStatus({ isLive: true, status: 'Live', debateSession: 'Test Debate', currentQuestion: 'Test Question' });
    setLoading(false);

    // Original logic (commented out for bypass):
    // fetch("http://localhost:5076/api/live-status")
    //   .then(res => res.json())
    //   .then(data => {
    //     setLiveStatus(data);
    //     setLoading(false);
    //
    //     if (data.isLive) {
    //       return fetch("http://localhost:5076/debate/heatmap")
    //         .then(res => res.json())
    //         .then(heatmapData => setTotal(heatmapData.total));
    //     }
    //   })
    //   .catch(err => {
    //     console.error(err);
    //     setLoading(false);
    //   });
  }, []);

  // Update total fires when new events are received from SignalR
  useEffect(() => {
    if (fireEvents.length > 0) {
      const latestEvent = fireEvents[fireEvents.length - 1];
      setTotal(latestEvent.total);
    }
  }, [fireEvents]);

  // Memoized callback to prevent HeatmapChart re-renders
  const handleHeatmapUpdate = useCallback((json) => {
    setTotal(json.total);
  }, []);

  // Memoize HeatmapChart props to prevent re-renders
  const heatmapProps = useMemo(() => ({
    fetchUrl: "http://localhost:5076/debate/heatmap-data",
    intervalSeconds: 10,
    onDataUpdate: handleHeatmapUpdate
  }), [handleHeatmapUpdate]);

  // Handle external fire reactions from SignalR for animations
  useEffect(() => {
    const handleExternalFire = (event) => {
      const { userName, x, y } = event.detail;
      const id = Date.now() + Math.random();
      setExternalFires(prev => [...prev, { id, x, y, userName }]);
      playSound('https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', 0.3);
      setTimeout(() => {
        setExternalFires(prev => prev.filter(f => f.id !== id));
      }, 3000);
    };

    window.addEventListener('externalFireReaction', handleExternalFire);
    return () => window.removeEventListener('externalFireReaction', handleExternalFire);
  }, []);

  // Keyboard shortcuts for firing
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.code === 'Space' || event.key.toLowerCase() === 'f') && !event.repeat && liveStatus.isLive) {
        event.preventDefault();
        const fakeEvent = {
          currentTarget: { getBoundingClientRect: () => ({ left: 100, top: 50 }) },
          clientX: 150,
          clientY: 75
        };
        sendFire(fakeEvent);
      }
    };

    if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [liveStatus.isLive]);

  // Simple sound effect for incoming fires
  const playSound = (url, volume = 0.5) => {
    try {
      const audio = new Audio(url);
      audio.volume = volume;
      audio.play().catch(err => console.log('Sound play failed:', err));
    } catch (err) {
      console.log('Sound creation failed:', err);
    }
  };

  // Web Audio API sound effect for self-fired explosions
  const playFireSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
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
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
      const id = Date.now();
      setBursts((prev) => [...prev, { id }]);
      setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== id));
      }, 1200);
      return;
    }

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
          setTotal(data.total);
          playFireSound();
          const id = Date.now();
          setFires((prev) => [...prev, { id, x, y }]);
          setTimeout(() => {
            setFires((prev) => prev.filter((f) => f.id !== id));
          }, 2000);
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

  // Live debate interface
  return (
    <div className="home-container">
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
                  top: `${fire.y}px`
                }}
              >
                🔥
              </span>
            ))}
            {externalFires.map((fire) => (
              <span
                key={fire.id}
                className="external-fire-emoji"
                style={{
                  left: `${Math.random() * 200}px`,
                  top: `${Math.random() * 50}px`,
                }}
                title={`Fire from ${fire.userName}`}
              >
                🌟
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

      <div className="police-strip"></div>

      <div className="section-card chart-card">
        <h2 className="chart-title">🔥 Heatmap Chart</h2>
        <HeatmapChart {...heatmapProps} />
      </div>
    </div>
  );
}