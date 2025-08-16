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
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Register</h1>
        <p style={{ color: "#ccc", textAlign: "center", fontSize: "0.9rem", marginBottom: "1rem" }}>
          Registration is currently <strong style={{ color: "#16a34a" }}>enabled</strong>
        </p>

        {message && (
          <p className={`login-error ${isSuccess ? 'success' : ''}`}>
            {message}
          </p>
        )}

        <form onSubmit={handleRegister} className="login-form">
          <input
            type="text"
            placeholder="Username (min 3 characters)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="login-input"
            disabled={isLoading}
            maxLength={50}
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="login-input"
            disabled={isLoading}
            minLength={6}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="login-input"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? "Registering..." : "Register"}
          </button>
        </form>

        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <p style={{ color: "#ccc", fontSize: "0.9rem" }}>
            Already have an account?{" "}
            <button
              onClick={() => navigate("/admin/login")}
              style={{
                background: "none",
                border: "none",
                color: "#ff6666",
                cursor: "pointer",
                textDecoration: "underline",
                fontSize: "0.9rem"
              }}
            >
              Login here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}