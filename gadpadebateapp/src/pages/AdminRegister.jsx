import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";
import "./AuthForms.css";

export default function AdminRegister() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registerEnabled, setRegisterEnabled] = useState(null);
  const [statusError, setStatusError] = useState(false);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetch("http://localhost:5076/admin/register-status")
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch register status');
        }
        return res.json();
      })
      .then((data) => {
        setRegisterEnabled(data.enabled);
        setStatusError(false);
      })
      .catch(() => {
        setStatusError(true);
        setRegisterEnabled(true);
      });
  }, []);

  if (statusError) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">⚠️ Connection Issue</h1>
          <p className="auth-message error" style={{ marginBottom: "1.5rem" }}>
            Could not verify registration status. The server might be down.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={() => window.location.reload()} className="auth-button">
              Try Again
            </button>
            <button onClick={() => navigate("/admin/login")} className="auth-button">
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (registerEnabled === null) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Loading...</h1>
          <p className="small-text">Checking registration status...</p>
        </div>
      </div>
    );
  }

  if (registerEnabled === false) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Registration Disabled 🚫</h1>
          <p className="small-text" style={{ marginBottom: "1.5rem" }}>
            Registration is currently disabled.
          </p>
          <button onClick={() => navigate("/admin/login")} className="auth-button">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">You are already signed in ✅</h1>
          <button onClick={() => navigate("/admin/dashboard")} className="auth-button">
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

    if (!username.trim()) {
      setMessage("Username is required");
      setIsSuccess(false);
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters long");
      setIsSuccess(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      setIsSuccess(false);
      return;
    }

    setIsLoading(true);

    fetch("http://localhost:5076/admin/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), password }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Registration failed");
        }
        return data;
      })
      .then(() => {
        setMessage("Registration successful!");
        setIsSuccess(true);
        setUsername("");
        setPassword("");
        setConfirmPassword("");
        setTimeout(() => navigate("/admin/login"), 2000);
      })
      .catch((err) => {
        setMessage(err.message);
        setIsSuccess(false);
      })
      .finally(() => setIsLoading(false));
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Admin Register</h1>
        {message && <div className={`auth-message ${isSuccess ? "success" : "error"}`}>{message}</div>}
        <form onSubmit={handleRegister} className="auth-form">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="auth-input"
            disabled={isLoading}
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="auth-input"
            disabled={isLoading}
            minLength={6}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="auth-input"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? "Registering..." : "Register"}
          </button>
        </form>

        <p className="small-text">
          Already have an account?
          <button onClick={() => navigate("/admin/login")} className="link-button">
            Login here
          </button>
        </p>
      </div>
    </div>
  );
}