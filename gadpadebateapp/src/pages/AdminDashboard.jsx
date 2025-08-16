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
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">🛠️ Admin Dashboard</h1>
        <button onClick={logout} className="logout-button">
          🚪 Logout
        </button>
      </div>

      <div className="dashboard-grid">
        {/* Heatmap Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>🔥 Fire Heatmap</h2>
          </div>
          <div className="card-content">
            <div className="stat-display">
              <span className="stat-number">{total}</span>
              <span className="stat-label">Total Fires</span>
            </div>
            <button onClick={resetHeatmap} className="action-button danger">
              Reset Heatmap
            </button>
          </div>
        </div>

        {/* Banned IPs Card */}
        <div className="dashboard-card wide">
          <div className="card-header">
            <h2>🚫 IP Management</h2>
          </div>
          <div className="card-content">
            <div className="ban-input-section">
              <input
                type="text"
                placeholder="IP Address to ban"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                className="ip-input"
              />
              <button onClick={banIp} className="action-button">
                Ban IP
              </button>
            </div>
            
            <div className="banned-list">
              <h3>Currently Banned IPs:</h3>
              {bannedIps.length === 0 ? (
                <div className="empty-state">No banned IPs</div>
              ) : (
                <ul className="banned-ip-list">
                  {bannedIps.map(bannedIp => (
                    <li key={bannedIp} className="banned-ip-item">
                      <span className="ip-address">{bannedIp}</span>
                      <button 
                        onClick={() => unbanIp(bannedIp)} 
                        className="unban-button"
                      >
                        Unban
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Registration Control Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>⚙️ Registration Control</h2>
          </div>
          <div className="card-content">
            <div className="status-display">
              <span className="status-label">Current Status:</span>
              <span className={`status-badge ${registerEnabled ? 'enabled' : 'disabled'}`}>
                {registerEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <button onClick={toggleRegister} className="action-button">
              {registerEnabled ? "Disable Registration" : "Enable Registration"}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .dashboard-container {
          min-height: 100vh;
          background: #1a1a1a;
          padding: 2rem;
          color: white;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 3px solid #333;
        }

        .dashboard-title {
          font-size: 2.5rem;
          margin: 0;
          color: #ff3030;
          text-shadow: 2px 2px 0px #000;
        }

        .logout-button {
          background: #6c757d;
          color: white;
          padding: 12px 24px;
          border: 3px solid #000;
          border-radius: 15px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 4px 4px 0px #000;
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }

        .logout-button:hover {
          background: #828a91;
          transform: translateY(-2px);
          box-shadow: 6px 6px 0px #000;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
          max-width: 1400px;
        }

        .dashboard-card {
          background: #1e1e1e;
          border: 4px solid #000;
          border-radius: 20px;
          box-shadow: 6px 6px 0px #000;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .dashboard-card:hover {
          transform: translateY(-4px);
          box-shadow: 8px 8px 0px #000;
        }

        .dashboard-card.wide {
          grid-column: span 2;
        }

        .card-header {
          background: #2a2a2a;
          padding: 1rem 1.5rem;
          border-bottom: 3px solid #333;
          border-radius: 16px 16px 0 0;
        }

        .card-header h2 {
          margin: 0;
          font-size: 1.5rem;
          color: #ff3030;
        }

        .card-content {
          padding: 1.5rem;
        }

        .stat-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .stat-number {
          font-size: 3rem;
          font-weight: bold;
          color: #ff3030;
          text-shadow: 2px 2px 0px #000;
        }

        .stat-label {
          font-size: 1rem;
          color: #ccc;
          margin-top: 0.5rem;
        }

        .action-button {
          background: #ff3030;
          color: white;
          padding: 12px 24px;
          border: 3px solid #000;
          border-radius: 15px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 4px 4px 0px #000;
          transition: transform 0.1s ease, box-shadow 0.1s ease;
          width: 100%;
        }

        .action-button:hover {
          background: #ff5050;
          transform: translateY(-2px);
          box-shadow: 6px 6px 0px #000;
        }

        .action-button.danger {
          background: #dc3545;
        }

        .action-button.danger:hover {
          background: #e55a6a;
        }

        .ban-input-section {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .ip-input {
          flex: 1;
          padding: 12px;
          border: 2px solid #333;
          border-radius: 10px;
          font-size: 16px;
          background: #2a2a2a;
          color: white;
          box-sizing: border-box;
        }

        .ip-input:focus {
          border-color: #ff3030;
          outline: none;
          background: #333;
        }

        .banned-list h3 {
          margin-bottom: 1rem;
          color: #ff3030;
        }

        .empty-state {
          text-align: center;
          color: #888;
          font-style: italic;
          padding: 2rem;
        }

        .banned-ip-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .banned-ip-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          margin-bottom: 8px;
          background: #2a2a2a;
          border: 2px solid #333;
          border-radius: 10px;
        }

        .ip-address {
          font-family: 'Courier New', monospace;
          color: #ff3030;
          font-weight: bold;
        }

        .unban-button {
          background: #28a745;
          color: white;
          padding: 6px 12px;
          border: 2px solid #000;
          border-radius: 8px;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 2px 2px 0px #000;
          transition: transform 0.1s ease;
        }

        .unban-button:hover {
          background: #34ce57;
          transform: translateY(-1px);
          box-shadow: 3px 3px 0px #000;
        }

        .status-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .status-label {
          font-size: 1rem;
          color: #ccc;
          margin-bottom: 0.5rem;
        }

        .status-badge {
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: bold;
          border: 2px solid;
        }

        .status-badge.enabled {
          background: rgba(40, 167, 69, 0.2);
          color: #28a745;
          border-color: #28a745;
        }

        .status-badge.disabled {
          background: rgba(220, 53, 69, 0.2);
          color: #dc3545;
          border-color: #dc3545;
        }

        @media (max-width: 768px) {
          .dashboard-card.wide {
            grid-column: span 1;
          }
          
          .ban-input-section {
            flex-direction: column;
          }
          
          .banned-ip-item {
            flex-direction: column;
            gap: 0.5rem;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
