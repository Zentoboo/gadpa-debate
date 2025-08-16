import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminRegister from "./pages/AdminRegister.jsx";
import NotFound from "./pages/NotFound.jsx";
import Header from "./components/Header.jsx";
import { AuthProvider } from "./hooks/AuthContext.jsx";

export default function App() {
  const [registerEnabled, setRegisterEnabled] = useState(null); // Start with null to show loading state

  useEffect(() => {
    // Fetch register status without requiring authentication
    fetch("http://localhost:5076/admin/register-status")
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch register status');
        }
        return res.json();
      })
      .then((data) => {
        console.log('Register status:', data); // Debug log
        setRegisterEnabled(data.enabled);
      })
      .catch((error) => {
        console.error('Error fetching register status:', error);
        // Default to true if we can't fetch the status
        setRegisterEnabled(true);
      });
  }, []);

  // Show loading while we determine register status
  if (registerEnabled === null) {
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
      <Header registerEnabled={registerEnabled} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        {/* Always render the register route - let the component handle the logic */}
        <Route path="/admin/register" element={<AdminRegister />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}