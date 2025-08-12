import React, { useEffect, useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminRegister from "./pages/AdminRegister.jsx";

export default function App() {
  const [registerEnabled, setRegisterEnabled] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5076/admin/register-status", {
      headers: {
        // optional: if you want to allow checking without login, remove Authorization
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`
      }
    })
      .then(res => res.json())
      .then(data => setRegisterEnabled(data.enabled))
      .catch(() => setRegisterEnabled(false));
  }, []);

  return (
    <div>
      <nav style={{ padding: "1rem", borderBottom: "1px solid #ccc" }}>
        <Link to="/" style={{ marginRight: "1rem" }}>Home</Link>
        <Link to="/admin/login" style={{ marginRight: "1rem" }}>Admin Login</Link>
        {registerEnabled && (
          <Link to="/admin/register" style={{ marginRight: "1rem" }}>
            Admin Register
          </Link>
        )}
        <Link to="/admin/dashboard">Admin Dashboard</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        {registerEnabled && <Route path="/admin/register" element={<AdminRegister />} />}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
    </div>
  );
}
