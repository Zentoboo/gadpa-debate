import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";
import "../css/AuthForms.css";

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
        setRegisterEnabled(true); // Default to enabled if check fails
      });
  }, []);

  useEffect(() => {
    if (isAdmin) {
      navigate("/admin/dashboard");
    }
  }, [isAdmin, navigate]);

  const handleRegister = (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      setIsSuccess(false);
      return;
    }

    setIsLoading(true);
    setMessage("");

    fetch("http://localhost:5076/admin/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Registration failed: ${res.status}`);
        }
        return res.json();
      })
      .then(() => {
        setMessage("✅ Admin account created successfully! Redirecting...");
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

  // Loading state while checking registration status
  if (registerEnabled === null) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="loading-message">
            {statusError ? "⚠️ Could not verify registration status" : "Loading..."}
          </div>
        </div>
      </div>
    );
  }

  // Registration is disabled
  if (!registerEnabled) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Admin Registration</h1>
          <div className="auth-message error">
            ⚠️ Admin registration is currently disabled.
          </div>
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button 
              onClick={() => navigate("/admin/login")} 
              className="auth-button secondary"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="auth-input"
            disabled={isLoading}
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
            className="auth-button primary" 
            disabled={isLoading}
          >
            {isLoading ? "Creating Account..." : "Register"}
          </button>
        </form>
        
        <div className="auth-links">
          <span>Already have an account? </span>
          <button 
            onClick={() => navigate("/admin/login")}
            className="auth-link-button"
            disabled={isLoading}
          >
            Login here
          </button>
        </div>
      </div>
    </div>
  );
}