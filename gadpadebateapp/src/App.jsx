import React, { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminRegister from "./pages/AdminRegister.jsx";
import Header from "./components/Header.jsx";
import BpuDashboard from "./pages/BpuDashboard.jsx";
import VotingPage from "./pages/VotingPage.jsx";
import VoteResults from "./pages/VoteResults.jsx";
import DebateControlCenter from "./pages/DebateControlSimple.jsx";

export default function App() {
  const [registerEnabled, setRegisterEnabled] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Always enable registration for initial setup
    setRegisterEnabled(true);
    
    // Check if user is admin
    const token = localStorage.getItem("token");
    if (token) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
    
    // Optional: Check register status from server
    // fetch("http://localhost:5076/admin/register-status", {
    //   headers: {
    //     Authorization: `Bearer ${localStorage.getItem("token") || ""}`
    //   }
    // })
    //   .then(res => res.json())
    //   .then(data => setRegisterEnabled(data.enabled))
    //   .catch(() => setRegisterEnabled(true));
  }, []);

  return (
    <div>
      <Header registerEnabled={registerEnabled} isAdmin={isAdmin} />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/vote" element={<VotingPage />} />
        <Route path="/results" element={<VoteResults />} />
        <Route path="/bpu" element={<BpuDashboard />} />
        <Route path="/debate-control" element={<DebateControlCenter />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        {registerEnabled && (
          <Route path="/admin/register" element={<AdminRegister />} />
        )}
        {isAdmin && <Route path="/admin/dashboard" element={<AdminDashboard />} />}
      </Routes>
    </div>
  );
}