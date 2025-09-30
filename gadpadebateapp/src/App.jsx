import API_URL from "./config.jsx";
import React, { useState, useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { API_CONFIG } from './config/api.js';
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { TransitionProvider } from "./contexts/TransitionContext.jsx"
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Layout from "./components/Layout.jsx";
import Router from "./routes/Router.jsx";

export default function App() {
  const [adminRegisterEnabled, setAdminRegisterEnabled] = useState(null);
  const [debateManagerRegisterEnabled, setDebateManagerRegisterEnabled] = useState(null);
  const [showHeader, setShowHeader] = useState(true);

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "h") {
        setShowHeader((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/admin/register-status`)
      .then((res) => res.json())
      .then((data) => setAdminRegisterEnabled(data.enabled))
      .catch(() => setAdminRegisterEnabled(true));

    fetch(`${API_URL}/debate-manager/register-status`)
      .then((res) => res.json())
      .then((data) => setDebateManagerRegisterEnabled(data.enabled))
      .catch(() => setDebateManagerRegisterEnabled(true));
  }, []);

  if (adminRegisterEnabled === null || debateManagerRegisterEnabled === null) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        color: "#fff",
        fontSize: "1.2rem"
      }}>
        Loading...
      </div>
    );
  }

  return (
    <ErrorBoundary>
        <AuthProvider>
          <TransitionProvider>
            <Layout
              showHeader={showHeader}
              onShowHeader={() => setShowHeader(true)}
              onHideHeader={() => setShowHeader(false)}
              adminRegisterEnabled={adminRegisterEnabled}
              debateManagerRegisterEnabled={debateManagerRegisterEnabled}
            >
              <ErrorBoundary>
                <Router
                  adminRegisterEnabled={adminRegisterEnabled}
                  debateManagerRegisterEnabled={debateManagerRegisterEnabled}
                />
              </ErrorBoundary>
            </Layout>
          </TransitionProvider>
        </AuthProvider>
    </ErrorBoundary>
  );
}