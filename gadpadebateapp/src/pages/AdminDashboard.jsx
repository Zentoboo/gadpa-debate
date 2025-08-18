import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";
import "./Dashboard.css";

export default function AdminDashboard() {
  const { token, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [bannedIps, setBannedIps] = useState([]);
  const [ip, setIp] = useState("");
  const [registerEnabled, setRegisterEnabled] = useState(true);
  const [debateManagerRegisterEnabled, setDebateManagerRegisterEnabled] = useState(true);
  const [liveDebates, setLiveDebates] = useState([]); // Changed to an array

  const authFetch = (url, options = {}) =>
    fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

  useEffect(() => {
    if (!isAuthenticated || !token) {
      navigate("/admin/login");
    }
  }, [isAuthenticated, token, navigate]);

  useEffect(() => {
    if (!token || !isAuthenticated) return;
    refreshBannedIps();
    refreshRegisterStatus();
    refreshDebateManagerRegisterStatus();
    refreshLiveDebates(); // Call new function to get all live debates
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
        if (!res.ok) {
          throw new Error('Failed to fetch register status');
        }
        return res.json();
      })
      .then((data) => setRegisterEnabled(data.enabled))
      .catch((error) => console.error('Error fetching register status:', error));
  };

  const refreshDebateManagerRegisterStatus = () => {
    authFetch("http://localhost:5076/debate-manager/register-status")
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch debate manager register status');
        }
        return res.json();
      })
      .then((data) => setDebateManagerRegisterEnabled(data.enabled))
      .catch((error) => console.error('Error fetching debate manager register status:', error));
  };

  const refreshLiveDebates = () => {
    authFetch("http://localhost:5076/admin/live/all-status") // Use the new admin endpoint
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch live status');
        return res.json();
      })
      .then(data => {
        setLiveDebates(data); // Set the array of debates
      })
      .catch(console.error);
  };

  const toggleRegister = () => {
    authFetch("http://localhost:5076/admin/toggle-register", {
      method: "POST",
      body: JSON.stringify({})
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to toggle registration');
        return res.json();
      })
      .then((data) => {
        setRegisterEnabled(data.enabled);
        alert(`Registration is now ${data.enabled ? 'enabled' : 'disabled'}`);
      })
      .catch(console.error);
  };

  const toggleDebateManagerRegister = () => {
    authFetch("http://localhost:5076/admin/toggle-debate-manager-register", {
      method: "POST",
      body: JSON.stringify({})
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to toggle debate manager registration');
        return res.json();
      })
      .then((data) => {
        setDebateManagerRegisterEnabled(data.enabled);
        alert(`Debate Manager Registration is now ${data.enabled ? 'enabled' : 'disabled'}`);
      })
      .catch(console.error);
  };

  const banIp = () => {
    if (!ip.trim()) return;
    authFetch("http://localhost:5076/admin/ban-ip", {
      method: "POST",
      body: JSON.stringify({ ipAddress: ip })
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to ban IP');
        return res.json();
      })
      .then(() => {
        refreshBannedIps();
        setIp("");
      })
      .catch(console.error);
  };

  const unbanIp = (ipToUnban) => {
    authFetch("http://localhost:5076/admin/unban-ip", {
        method: "POST",
        body: JSON.stringify({ ipAddress: ipToUnban })
    })
        .then((res) => {
            if (!res.ok) throw new Error('Failed to unban IP');
            return res.json();
        })
        .then(() => refreshBannedIps())
        .catch(console.error);
};

  if (!isAuthenticated || !token) {
    return null;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Admin Dashboard</h1>
      </div>

      <h2 className="section-title">Live Debates</h2>
      <div className="live-status">
        {liveDebates.length === 0 ? (
          <p>
            <strong className="text-error">No live debates currently.</strong>
          </p>
        ) : (
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Current Round</th>
                <th>Total Rounds</th>
                <th>Debate Manager ID</th>
              </tr>
            </thead>
            <tbody>
              {liveDebates.map(debateItem => (
                <tr key={debateItem.debate.id}>
                  <td>{debateItem.debate.title}</td>
                  <td>{debateItem.debate.currentRound}</td>
                  <td>{debateItem.debate.totalRounds}</td>
                  <td>{debateItem.debate.debateManagerId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2 className="section-title">IP Management</h2>
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="IP Address to ban"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            style={{ flex: 1, padding: "0.5rem", background: "#374151", border: "1px solid #4b5563", color: "#fff", borderRadius: "4px" }}
          />
          <button onClick={banIp} className="table-button primary">
            Ban IP
          </button>
        </div>
      </div>
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Banned IPs</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {bannedIps.length === 0 ? (
            <tr>
              <td colSpan="2" style={{ textAlign: "center" }}>No banned IPs.</td>
            </tr>
          ) : (
            bannedIps.map((bannedIp, index) => (
              <tr key={index}>
                <td>{bannedIp}</td>
                <td>
                  <button onClick={() => unbanIp(bannedIp)} className="table-button secondary">
                    Unban
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <h2 className="section-title">Registration Status</h2>
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>User Type</th>
            <th>Current Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Admin</td>
            <td>
              <strong className={registerEnabled ? "text-success" : "text-error"}>
                {registerEnabled ? "Enabled" : "Disabled"}
              </strong>
            </td>
            <td>
              <button className="table-button secondary" onClick={toggleRegister}>
                {registerEnabled ? "Disable" : "Enable"}
              </button>
            </td>
          </tr>
          <tr>
            <td>Debate Manager</td>
            <td>
              <strong className={debateManagerRegisterEnabled ? "text-success" : "text-error"}>
                {debateManagerRegisterEnabled ? "Enabled" : "Disabled"}
              </strong>
            </td>
            <td>
              <button className="table-button secondary" onClick={toggleDebateManagerRegister}>
                {debateManagerRegisterEnabled ? "Disable" : "Enable"}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}