import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";

export default function AdminDashboard() {
  const { token, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [bannedIps, setBannedIps] = useState([]);
  const [ip, setIp] = useState("");
  const [registerEnabled, setRegisterEnabled] = useState(true);
  const [debateManagerRegisterEnabled, setDebateManagerRegisterEnabled] = useState(true);
  const [currentLiveDebate, setCurrentLiveDebate] = useState(null);

  // Helper fetch with auth header
  const authFetch = (url, options = {}) =>
    fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

  // Redirect if not logged in
  useEffect(() => {
    if (!isAuthenticated || !token) {
      navigate("/admin/login");
    }
  }, [isAuthenticated, token, navigate]);

  // Initial fetch
  useEffect(() => {
    if (!token || !isAuthenticated) return;

    refreshBannedIps();
    refreshRegisterStatus();
    refreshDebateManagerRegisterStatus();
    refreshCurrentDebate();
  }, [token, isAuthenticated]);

  const refreshBannedIps = () => {
    authFetch("http://localhost:5076/admin/banned-ips")
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data) => setBannedIps(data))
      .catch(console.error);
  };

  const refreshRegisterStatus = () => {
    authFetch("http://localhost:5076/admin/register-status")
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data) => setRegisterEnabled(data.enabled))
      .catch(console.error);
  };

  const refreshDebateManagerRegisterStatus = () => {
    fetch("http://localhost:5076/debate-manager/register-status")
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data) => setDebateManagerRegisterEnabled(data.enabled))
      .catch(console.error);
  };

  const refreshCurrentDebate = () => {
    fetch("http://localhost:5076/debate/current")
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data) => {
        setCurrentLiveDebate(data.isLive ? data.debate : null);
      })
      .catch(console.error);
  };

  const banIp = () => {
    if (!ip.trim()) return;
    authFetch("http://localhost:5076/admin/ban-ip", {
      method: "POST",
      body: JSON.stringify({ ipAddress: ip }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to ban IP');
        return res;
      })
      .then(() => {
        setIp("");
        refreshBannedIps();
      })
      .catch(console.error);
  };

  const unbanIp = (ipToUnban) => {
    authFetch("http://localhost:5076/admin/unban-ip", {
      method: "POST",
      body: JSON.stringify({ ipAddress: ipToUnban }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to unban IP');
        return res;
      })
      .then(() => refreshBannedIps())
      .catch(console.error);
  };

  const toggleRegister = () => {
    authFetch("http://localhost:5076/admin/toggle-register", { method: "POST" })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to toggle register');
        return res.json();
      })
      .then((data) => setRegisterEnabled(data.enabled))
      .catch(console.error);
  };

  const toggleDebateManagerRegister = () => {
    authFetch("http://localhost:5076/admin/toggle-debate-manager-register", { method: "POST" })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to toggle debate manager register');
        return res.json();
      })
      .then((data) => setDebateManagerRegisterEnabled(data.enabled))
      .catch(console.error);
  };

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  // Don't render if not authenticated
  if (!isAuthenticated || !token) {
    return null;
  }

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Admin Dashboard</h1>
      <button onClick={handleLogout} style={{ marginBottom: "1rem" }}>
        Logout
      </button>

      <h2>📊 Current Live Debate Status</h2>
      {currentLiveDebate ? (
        <div style={{ padding: "1rem", background: "#2a2a2a", borderRadius: "8px", marginBottom: "1rem" }}>
          <h3 style={{ color: "#4ade80", margin: "0 0 0.5rem 0" }}>🔴 LIVE</h3>
          <p><strong>Title:</strong> {currentLiveDebate.title}</p>
          <p><strong>Description:</strong> {currentLiveDebate.description || "No description"}</p>
          <p><strong>Current Round:</strong> {currentLiveDebate.currentRound} of {currentLiveDebate.totalRounds}</p>
          <p><strong>Current Question:</strong> {currentLiveDebate.currentQuestion}</p>
          <button onClick={refreshCurrentDebate} style={{ marginTop: "0.5rem" }}>
            Refresh Status
          </button>
        </div>
      ) : (
        <div style={{ padding: "1rem", background: "#333", borderRadius: "8px", marginBottom: "1rem" }}>
          <p style={{ color: "#888" }}>No debate is currently live</p>
          <button onClick={refreshCurrentDebate}>
            Refresh Status
          </button>
        </div>
      )}

      <h2>🚫 Banned IPs</h2>
      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="IP Address to ban"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          style={{ marginRight: "0.5rem", padding: "0.5rem" }}
        />
        <button onClick={banIp}>Ban IP</button>
      </div>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {bannedIps.length === 0 && (
          <li style={{ color: "#888", fontStyle: "italic" }}>No banned IPs</li>
        )}
        {bannedIps.map((bannedIp) => (
          <li key={bannedIp} style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.5rem",
            margin: "0.25rem 0",
            background: "#2a2a2a",
            borderRadius: "4px"
          }}>
            <span>{bannedIp}</span>
            <button onClick={() => unbanIp(bannedIp)} style={{ marginLeft: "1rem" }}>
              Unban
            </button>
          </li>
        ))}
      </ul>

      <h2>⚙️ Admin Registration</h2>
      <div style={{ marginBottom: "1rem", padding: "1rem", background: "#2a2a2a", borderRadius: "8px" }}>
        <p>
          Current Status:{" "}
          <strong style={{ color: registerEnabled ? "#4ade80" : "#ff6b6b" }}>
            {registerEnabled ? "Enabled" : "Disabled"}
          </strong>
        </p>
        <button onClick={toggleRegister}>
          {registerEnabled ? "Disable Registration" : "Enable Registration"}
        </button>
      </div>

      <h2>👨‍⚖️ Debate Manager Registration</h2>
      <div style={{ padding: "1rem", background: "#2a2a2a", borderRadius: "8px" }}>
        <p>
          Current Status:{" "}
          <strong style={{ color: debateManagerRegisterEnabled ? "#4ade80" : "#ff6b6b" }}>
            {debateManagerRegisterEnabled ? "Enabled" : "Disabled"}
          </strong>
        </p>
        <button onClick={toggleDebateManagerRegister}>
          {debateManagerRegisterEnabled ? "Disable Debate Manager Registration" : "Enable Debate Manager Registration"}
        </button>
      </div>
    </div>
  );
}