import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
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

export default function App() {
  const [adminRegisterEnabled, setAdminRegisterEnabled] = useState(null);
  const [debateManagerRegisterEnabled, setDebateManagerRegisterEnabled] = useState(null);

  useEffect(() => {
    // Fetch admin register status
    fetch("http://localhost:5076/admin/register-status")
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch admin register status');
        }
        return res.json();
      })
      .then((data) => {
        console.log('Admin register status:', data);
        setAdminRegisterEnabled(data.enabled);
      })
      .catch((error) => {
        console.error('Error fetching admin register status:', error);
        setAdminRegisterEnabled(true);
      });

    // Fetch debate manager register status
    fetch("http://localhost:5076/debate-manager/register-status")
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch debate manager register status');
        }
        return res.json();
      })
      .then((data) => {
        console.log('Debate manager register status:', data);
        setDebateManagerRegisterEnabled(data.enabled);
      })
      .catch((error) => {
        console.error('Error fetching debate manager register status:', error);
        setDebateManagerRegisterEnabled(true);
      });
  }, []);

  // Show loading while we determine register statuses
  if (adminRegisterEnabled === null || debateManagerRegisterEnabled === null) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        color: '#fff',
        fontSize: '1.2rem'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <AuthProvider>
      <Header
        adminRegisterEnabled={adminRegisterEnabled}
        debateManagerRegisterEnabled={debateManagerRegisterEnabled}
      />
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
        <Route path="/debate-manager/live" element={<LiveDebatePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}