import React, { useEffect, useState } from "react";
import useAuth from "../hooks/useAuth";

export default function AdminDashboard() {
  const { token, logout } = useAuth(true);
  const [total, setTotal] = useState(0);
  const [bannedIps, setBannedIps] = useState([]);
  const [ip, setIp] = useState("");

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

    authFetch("http://localhost:5076/admin/banned-ips")
      .then(res => res.json())
      .then(data => setBannedIps(data))
      .catch(console.error);
  }, []);

  const resetHeatmap = () => {
    authFetch("http://localhost:5076/admin/reset", { method: "POST" })
      .then(res => res.json())
      .then(() => setTotal(0))
      .catch(console.error);
  };

  const banIp = () => {
    authFetch("http://localhost:5076/admin/ban-ip", {
      method: "POST",
      body: JSON.stringify({ ipAddress: ip })
    })
      .then(res => res.json())
      .then(() => {
        setBannedIps([...bannedIps, ip]);
        setIp("");
      })
      .catch(console.error);
  };

  const unbanIp = (ipToUnban) => {
    authFetch("http://localhost:5076/admin/unban-ip", {
      method: "POST",
      body: JSON.stringify({ ipAddress: ipToUnban })
    })
      .then(res => res.json())
      .then(() => setBannedIps(bannedIps.filter(x => x !== ipToUnban)))
      .catch(console.error);
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Admin Dashboard</h1>
      <button onClick={logout} style={{ marginBottom: "1rem" }}>Logout</button>
      <p>Total Fires: {total}</p>
      <button onClick={resetHeatmap}>Reset Heatmap</button>

      <h2>Banned IPs</h2>
      <ul>
        {bannedIps.map(ip => (
          <li key={ip}>
            {ip} <button onClick={() => unbanIp(ip)}>Unban</button>
          </li>
        ))}
      </ul>

      <input
        type="text"
        placeholder="IP Address"
        value={ip}
        onChange={(e) => setIp(e.target.value)}
      />
      <button onClick={banIp}>Ban IP</button>
    </div>
  );
}
