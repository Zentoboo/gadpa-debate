import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function useAuth(requireAuth = false) {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);

  useEffect(() => {
    if (requireAuth && !token) {
      navigate("/admin/login");
    }
  }, [requireAuth, token, navigate]);

  const login = (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setIsAuthenticated(false);
    navigate("/admin/login");
  };

  return { token, isAuthenticated, login, logout };
}
