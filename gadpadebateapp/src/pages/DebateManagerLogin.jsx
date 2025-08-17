import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";
import "./AdminLogin.css";

export default function DebateManagerLogin() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [registerEnabled, setRegisterEnabled] = useState(null); // null = loading
    const navigate = useNavigate();
    const { login, isDebateManager } = useAuth();

    // Check if registration is enabled
    useEffect(() => {
        fetch("http://localhost:5076/debate-manager/register-status")
            .then((res) => {
                if (!res.ok) {
                    throw new Error('Failed to fetch register status');
                }
                return res.json();
            })
            .then((data) => {
                console.log('Register status in debate manager login:', data); // Debug log
                setRegisterEnabled(data.enabled);
            })
            .catch((error) => {
                console.error('Error fetching register status:', error);
                // Default to false if we can't check status
                setRegisterEnabled(false);
            });
    }, []);

    if (isDebateManager) {
        return (
            <div className="login-container">
                <div className="login-card">
                    <h1 className="login-title">You are already signed in ✅</h1>
                    <button onClick={() => navigate("/debate-manager/dashboard")} className="login-button">
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const handleLogin = (e) => {
        e.preventDefault();
        setError("");

        // Client-side validation
        if (!username.trim()) {
            setError("Username is required");
            return;
        }

        if (!password) {
            setError("Password is required");
            return;
        }

        setIsLoading(true);

        fetch("http://localhost:5076/debate-manager/login", {
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
                navigate("/debate-manager/dashboard");
            })
            .catch((err) => {
                setError(err.message);
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1 className="login-title">Debate Manager Login</h1>

                {error && <p className="login-error">{error}</p>}

                <form onSubmit={handleLogin} className="login-form">
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="login-input"
                        disabled={isLoading}
                        maxLength={50}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="login-input"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        className="login-button"
                        disabled={isLoading}
                    >
                        {isLoading ? "Logging in..." : "Login"}
                    </button>
                </form>

                {/* Only show registration link if registration is enabled */}
                {registerEnabled === true && (
                    <div style={{ marginTop: "1rem", textAlign: "center" }}>
                        <p style={{ color: "#ccc", fontSize: "0.9rem" }}>
                            Don't have an account?{" "}
                            <button
                                onClick={() => navigate("/debate-manager/register")}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "#ff6666",
                                    cursor: "pointer",
                                    textDecoration: "underline",
                                    fontSize: "0.9rem"
                                }}
                            >
                                Register here
                            </button>
                        </p>
                    </div>
                )}
                {registerEnabled === false && (
                    <div style={{ marginTop: "1rem", textAlign: "center" }}>
                        <p style={{ color: "#666", fontSize: "0.8rem" }}>
                            Registration is disabled
                        </p>
                    </div>
                )}
                {registerEnabled === null && (
                    <div style={{ marginTop: "1rem", textAlign: "center" }}>
                        <p style={{ color: "#666", fontSize: "0.8rem" }}>
                            Loading...
                        </p>
                    </div>
                )}

                <div style={{ marginTop: "1.5rem", textAlign: "center", borderTop: "1px solid #333", paddingTop: "1rem" }}>
                    <p style={{ color: "#888", fontSize: "0.8rem", marginBottom: "0.5rem" }}>
                        Are you an admin instead?
                    </p>
                    <button
                        onClick={() => navigate("/admin/login")}
                        style={{
                            background: "none",
                            border: "1px solid #666",
                            color: "#ccc",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "4px"
                        }}
                    >
                        Admin Login
                    </button>
                </div>
            </div>
        </div>
    );
}