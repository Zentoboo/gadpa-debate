import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";

export default function AdminDashboard() {
  const { token, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [total, setTotal] = useState(0);
  const [bannedIps, setBannedIps] = useState([]);
  const [ip, setIp] = useState("");
  const [registerEnabled, setRegisterEnabled] = useState(true);

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

    authFetch("http://localhost:5076/admin/heatmap")
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data) => setTotal(data.total))
      .catch(console.error);

    refreshBannedIps();
    refreshRegisterStatus();
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

  const resetHeatmap = () => {
    authFetch("http://localhost:5076/admin/reset", { method: "POST" })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to reset');
        return res;
      })
      .then(() => setTotal(0))
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

      <h2>🔥 Heatmap</h2>
      <p>Total Fires: {total}</p>
      <button onClick={resetHeatmap}>Reset Heatmap</button>

      <h2>🚫 Banned IPs</h2>
      <ul>
        {bannedIps.length === 0 && <li>No banned IPs</li>}
        {bannedIps.map((ip) => (
          <li key={ip}>
            {ip} <button onClick={() => unbanIp(ip)}>Unban</button>
          </li>
        ))}
      </ul>

      <input
        type="text"
        placeholder="IP Address to ban"
        value={ip}
        onChange={(e) => setIp(e.target.value)}
      />
      <button onClick={banIp}>Ban IP</button>

      <h2>⚙️ Admin Registration</h2>
      <p>
        Current Status:{" "}
        <strong>{registerEnabled ? "Enabled" : "Disabled"}</strong>
      </p>
      <button onClick={toggleRegister}>
        {registerEnabled ? "Disable Registration" : "Enable Registration"}
      </button>
    </div>
  );
}