import React, { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminRegister from "./pages/AdminRegister.jsx";
import Header from "./components/Header.jsx";

export default function App() {
  const [registerEnabled, setRegisterEnabled] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("http://localhost:5076/admin/register-status", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`
      }
    })
      .then((res) => res.json())
      .then((data) => setRegisterEnabled(data.enabled))
      .catch(() => setRegisterEnabled(false));

    const token = localStorage.getItem("token");
    if (token) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }, []);

  return (
    <div>
      <Header registerEnabled={registerEnabled} isAdmin={isAdmin} />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        {registerEnabled && (
          <Route path="/admin/register" element={<AdminRegister />} />
        )}
        {isAdmin && <Route path="/admin/dashboard" element={<AdminDashboard />} />}
      </Routes>
    </div>
  );
}
