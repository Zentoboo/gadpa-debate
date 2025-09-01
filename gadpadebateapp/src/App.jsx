import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import About from "./pages/About.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminRegister from "./pages/AdminRegister.jsx";
import DebateManagerLogin from "./pages/DebateManagerLogin.jsx";
import DebateManagerRegister from "./pages/DebateManagerRegister.jsx";
import DebateManagerDashboard from "./pages/DebateManagerDashboard.jsx";
import NotFound from "./pages/NotFound.jsx";
import Header from "./components/Header.jsx";
import LiveDebatePage from "./pages/LiveDebatePage.jsx";
import DebatePage from "./pages/DebatePage.jsx";
import { AuthProvider } from "./hooks/AuthContext.jsx";
import UserQuestionsPage from "./pages/UserQuestionsPage.jsx";

export default function App() {
  const [adminRegisterEnabled, setAdminRegisterEnabled] = useState(null);
  const [debateManagerRegisterEnabled, setDebateManagerRegisterEnabled] = useState(null);
  const [showHeader, setShowHeader] = useState(true);

  // Keyboard shortcut: Ctrl+H / Cmd+H
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
    // Fetch admin register status
    fetch("http://localhost:5076/admin/register-status")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch admin register status");
        }
        return res.json();
      })
      .then((data) => setAdminRegisterEnabled(data.enabled))
      .catch(() => setAdminRegisterEnabled(true));

    // Fetch debate manager register status
    fetch("http://localhost:5076/debate-manager/register-status")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch debate manager register status");
        }
        return res.json();
      })
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
    <AuthProvider>
      {showHeader && (
        <Header
          adminRegisterEnabled={adminRegisterEnabled}
          debateManagerRegisterEnabled={debateManagerRegisterEnabled}
          onHide={() => setShowHeader(false)}
        />
      )}

      {/* Restore button - only visible when header is hidden */}
      {!showHeader && (
        <button
          className="header-restore-btn"
          onClick={() => setShowHeader(true)}
        >
          Show Header
        </button>
      )}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/debate/:debateId" element={<DebatePage />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/register" element={<AdminRegister />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        {/* Debate Manager Routes */}
        <Route path="/debate-manager/login" element={<DebateManagerLogin />} />
        <Route path="/debate-manager/register" element={<DebateManagerRegister />} />
        <Route path="/debate-manager/dashboard" element={<DebateManagerDashboard />} />
        <Route path="/debate-manager/debates/:id/user-questions" element={<UserQuestionsPage />} />
        <Route path="/debate-manager/user-questions" element={<Navigate to="/debate-manager/dashboard" replace />} />
        <Route path="/debate-manager/live" element={<LiveDebatePage />} />
        {/* Other */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}