import React, { useState } from "react";

export default function AdminRegister() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleRegister = (e) => {
    e.preventDefault();
    fetch("http://localhost:5076/admin/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setMessage("✅ Registration successful");
          setUsername("");
          setPassword("");
        } else {
          setMessage(`❌ ${data.message || "Failed to register"}`);
        }
      })
      .catch(() => setMessage("❌ Failed to register"));
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h1 className="register-title">Admin Register</h1>
        {message && (
          <p className={`register-message ${message.includes('✅') ? 'success' : 'error'}`}>
            {message}
          </p>
        )}
        <form onSubmit={handleRegister} className="register-form">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="register-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="register-input"
          />
          <button type="submit" className="register-button">
            Register
          </button>
        </form>
      </div>

      <style jsx>{`
        .register-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: calc(100vh - 200px);
          padding: 2rem;
          background: #1a1a1a;
        }

        .register-card {
          background: #1e1e1e;
          border: 4px solid #000;
          border-radius: 20px;
          padding: 2rem;
          max-width: 400px;
          width: 100%;
          box-shadow: 6px 6px 0px #000;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .register-card:hover {
          transform: translateY(-2px);
          box-shadow: 8px 8px 0px #000;
        }

        .register-title {
          text-align: center;
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
          color: #fff;
        }

        .register-message {
          padding: 12px;
          border-radius: 10px;
          margin-bottom: 1rem;
          text-align: center;
          font-weight: bold;
        }

        .register-message.success {
          color: #4ade80;
          background: rgba(74, 222, 128, 0.1);
          border: 2px solid #4ade80;
        }

        .register-message.error {
          color: #ff6b6b;
          background: rgba(255, 107, 107, 0.1);
          border: 2px solid #ff6b6b;
        }

        .register-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .register-input {
          width: 100%;
          padding: 12px;
          border: 2px solid #333;
          border-radius: 10px;
          font-size: 16px;
          background: #2a2a2a;
          color: white;
          box-sizing: border-box;
          transition: border-color 0.3s ease, background-color 0.3s ease;
        }

        .register-input:focus {
          border-color: #ff3030;
          outline: none;
          background: #333;
        }

        .register-input::placeholder {
          color: #888;
        }

        .register-button {
          width: 100%;
          padding: 12px 30px;
          background: #ff3030;
          color: white;
          border: 3px solid #000;
          border-radius: 15px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          margin-top: 0.5rem;
          box-shadow: 4px 4px 0px #000;
          transition: transform 0.1s ease, box-shadow 0.1s ease, background-color 0.3s ease;
        }

        .register-button:hover {
          background: #ff5050;
          transform: translateY(-2px);
          box-shadow: 6px 6px 0px #000;
        }

        .register-button:active {
          transform: translateY(0px);
          box-shadow: 2px 2px 0px #000;
        }
      `}</style>
    </div>
  );
}
