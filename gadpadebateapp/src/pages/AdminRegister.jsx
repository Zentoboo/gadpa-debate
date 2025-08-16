import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";
import "./AdminLogin.css";

export default function AdminRegister() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registerEnabled, setRegisterEnabled] = useState(null); // null = loading
  const [statusError, setStatusError] = useState(false);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  // Check if registration is enabled
  useEffect(() => {
    fetch("http://localhost:5076/admin/register-status")
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch register status');
        }
        return res.json();
      })
      .then((data) => {
        console.log('Register status in component:', data); // Debug log
        setRegisterEnabled(data.enabled);
        setStatusError(false);
      })
      .catch((error) => {
        console.error('Error fetching register status:', error);
        setStatusError(true);
        // Default to allowing registration if we can't check status
        setRegisterEnabled(true);
      });
  }, []);

  // If there was an error checking status, show a warning but allow registration
  if (statusError) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1 className="login-title">⚠️ Connection Issue</h1>
          <p style={{ color: "#ffbaba", textAlign: "center", marginBottom: "1.5rem" }}>
            Could not verify registration status. The server might be down.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={() => window.location.reload()} className="login-button">
              Try Again
            </button>
            <button onClick={() => navigate("/admin/login")} className="login-button">
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If still checking registration status
  if (registerEnabled === null) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1 className="login-title">Loading...</h1>
          <p style={{ color: "#ccc", textAlign: "center" }}>
            Checking registration status...
          </p>
        </div>
      </div>
    );
  }

  // If registration is disabled, show message and redirect
  if (registerEnabled === false) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1 className="login-title">Registration Disabled 🚫</h1>
          <p style={{ color: "#ccc", textAlign: "center", marginBottom: "1.5rem" }}>
            Registration is currently disabled.
          </p>
          <button onClick={() => navigate("/admin/login")} className="login-button">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // If already logged in as admin, redirect to dashboard
  if (isAdmin) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1 className="login-title">You are already signed in ✅</h1>
          <button onClick={() => navigate("/admin/dashboard")} className="login-button">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleRegister = (e) => {
    e.preventDefault();
    setMessage("");
    setIsSuccess(false);

    // Client-side validation
    if (!username.trim()) {
      setMessage("Username is required");
      return;
    }

    if (username.length < 3) {
      setMessage("Username must be at least 3 characters long");
      return;
    }

    if (!password) {
      setMessage("Password is required");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    setIsLoading(true);

    fetch("http://localhost:5076/admin/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), password })
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setMessage("✅ Registration successful! You can now login.");
          setIsSuccess(true);
          setUsername("");
          setPassword("");
          setConfirmPassword("");

          // Auto redirect to login after 2 seconds
          setTimeout(() => {
            navigate("/admin/login");
          }, 2000);
        } else {
          setMessage(`❌ ${data.message || "Failed to register"}`);
          setIsSuccess(false);
        }
      })
      .catch((error) => {
        console.error('Registration error:', error);
        setMessage("❌ Network error. Please try again.");
        setIsSuccess(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
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