import React, { useEffect, useState } from "react";
import useAuth from "../hooks/useAuth";

export default function AdminDashboard() {
  const { token, logout } = useAuth(true);
  const [total, setTotal] = useState(0);
  const [bannedIps, setBannedIps] = useState([]);
  const [ip, setIp] = useState("");
  const [registerEnabled, setRegisterEnabled] = useState(true);

  const authFetch = (url, options = {}) =>
    fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    });

  useEffect(() => {
    authFetch("http://localhost:5076/admin/heatmap")
      .then(res => res.json())
      .then(data => setTotal(data.total))
      .catch(console.error);

    refreshBannedIps();
    refreshRegisterStatus();
  }, []);

  const refreshBannedIps = () => {
    authFetch("http://localhost:5076/admin/banned-ips")
      .then(res => res.json())
      .then(data => setBannedIps(data))
      .catch(console.error);
  };

  const refreshRegisterStatus = () => {
    authFetch("http://localhost:5076/admin/register-status")
      .then(res => res.json())
      .then(data => setRegisterEnabled(data.enabled))
      .catch(console.error);
  };

  const resetHeatmap = () => {
    authFetch("http://localhost:5076/admin/reset", { method: "POST" })
      .then(() => setTotal(0))
      .catch(console.error);
  };

  const banIp = () => {
    if (!ip.trim()) return;
    authFetch("http://localhost:5076/admin/ban-ip", {
      method: "POST",
      body: JSON.stringify({ ipAddress: ip })
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
      body: JSON.stringify({ ipAddress: ipToUnban })
    })
      .then(() => refreshBannedIps())
      .catch(console.error);
  };

  const toggleRegister = () => {
    authFetch("http://localhost:5076/admin/toggle-register", { method: "POST" })
      .then(res => res.json())
      .then(data => setRegisterEnabled(data.enabled))
      .catch(console.error);
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Admin Dashboard</h1>
      <button onClick={logout} style={{ marginBottom: "1rem" }}>Logout</button>

      <h2>🔥 Heatmap</h2>
      <p>Total Fires: {total}</p>
      <button onClick={resetHeatmap}>Reset Heatmap</button>

      <h2>🚫 Banned IPs</h2>
      <ul>
        {bannedIps.length === 0 && <li>No banned IPs</li>}
        {bannedIps.map(ip => (
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
      <p>Current Status: <strong>{registerEnabled ? "Enabled" : "Disabled"}</strong></p>
      <button onClick={toggleRegister}>
        {registerEnabled ? "Disable Registration" : "Enable Registration"}
      </button>
    </div>
  );
}
