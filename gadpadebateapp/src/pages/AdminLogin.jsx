import API_URL from "../config";
import React, { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../css/AuthForms.css";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [registerEnabled, setRegisterEnabled] = useState(null);
  const navigate = useNavigate();
  const { login, isAdmin } = useAuth();

  useEffect(() => {
    fetch(`${API_URL}/admin/register-status`)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch register status');
        }
        return res.json();
      })
      .then((data) => {
        setRegisterEnabled(data.enabled);
      })
      .catch(() => {
        setRegisterEnabled(false);
      });
  }, []);

  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Username is required");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }

    setIsLoading(true);
    fetch(`${API_URL}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), password }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || "Login failed");
        }
        return res.json();
      })
      .then((data) => {
        login(data.token);
        navigate("/admin/dashboard");
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Admin Login</h1>
        {error && <div className="auth-message error">{error}</div>}
        <form onSubmit={handleLogin} className="auth-form">
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
          <button
            type="submit"
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
        {registerEnabled === true && (
          <p className="small-text">
            Don't have an account?
            <button onClick={() => navigate("/admin/register")} className="link-button">
              Register here
            </button>
          </p>
        )}
        {registerEnabled === false && (
          <p className="small-text" style={{ color: "#666", fontSize: "0.8rem" }}>
            Registration is disabled
          </p>
        )}
        {registerEnabled === null && (
          <p className="small-text" style={{ color: "#666", fontSize: "0.8rem" }}>
            Loading...
          </p>
        )}
      </div>
    </div>
  );
}