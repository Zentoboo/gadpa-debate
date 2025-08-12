import React, { useState } from "react";

export default function AdminRegister() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleRegister = (e) => {
    e.preventDefault();
    fetch("http://localhost:5076/admin/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setMessage("✅ Registration successful");
          setUsername("");
          setPassword("");
        } else {
          setMessage(`❌ ${data.message || "Failed to register"}`);
        }
      })
      .catch(() => setMessage("❌ Failed to register"));
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Admin Register</h1>
      {message && <p>{message}</p>}
      <form onSubmit={handleRegister}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        /><br/>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        /><br/>
        <button type="submit">Register</button>
      </form>
    </div>
  );
}
