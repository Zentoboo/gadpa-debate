import React, { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem("token") || null);
    const [isAuthenticated, setIsAuthenticated] = useState(!!token);
    const [isDebateManager, setIsDebateManager] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        if (token) {
            try {
                const decodedToken = jwtDecode(token);

                const userRole =
                    decodedToken.role ||
                    decodedToken["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];

                setIsDebateManager(userRole === "DebateManager");
                setIsAdmin(userRole === "Admin");
                setIsAuthenticated(true);
            } catch (error) {
                console.error("Failed to decode token:", error);
                logout();
            }
        } else {
            setIsAuthenticated(false);
            setIsDebateManager(false);
            setIsAdmin(false);
        }
    }, [token]);

    const login = (newToken) => {
        localStorage.setItem("token", newToken);
        setToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem("token");
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{
            token,
            isAuthenticated,
            isAdmin,
            isDebateManager,
            login,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
