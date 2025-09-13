import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem("token") || null);
    const [isAuthenticated, setIsAuthenticated] = useState(!!token);
    const [isDebateManager, setIsDebateManager] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    const logoutTimerRef = useRef(null);

    // Logout logic
    const logout = () => {
        localStorage.removeItem("token");
        setToken(null);
        setIsAuthenticated(false);
        setIsDebateManager(false);
        setIsAdmin(false);

        if (logoutTimerRef.current) {
            clearTimeout(logoutTimerRef.current);
            logoutTimerRef.current = null;
        }
    };

    // Schedule auto logout based on JWT expiry
    const scheduleLogout = (exp) => {
        const expiryTime = exp * 1000;
        const timeout = expiryTime - Date.now();

        if (timeout > 0) {
            logoutTimerRef.current = setTimeout(() => {
                logout();
            }, timeout);
        } else {
            logout();
        }
    };

    // Build Axios instance that reacts to token changes
    const api = axios.create({
        baseURL: "http://localhost:5076",
        headers: { "Content-Type": "application/json" },
    });

    // Add interceptors for auth
    useEffect(() => {
        // Request interceptor → attach token
        const requestInterceptor = api.interceptors.request.use((config) => {
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });

        // Response interceptor → auto logout on 401
        const responseInterceptor = api.interceptors.response.use(
            (res) => res,
            (err) => {
                if (err.response?.status === 401) {
                    logout();
                }
                return Promise.reject(err);
            }
        );

        return () => {
            api.interceptors.request.eject(requestInterceptor);
            api.interceptors.response.eject(responseInterceptor);
        };
    }, [token]);

    // Token decode + role setup
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

                if (decodedToken.exp) {
                    scheduleLogout(decodedToken.exp);
                } else {
                    logout();
                }
            } catch (error) {
                console.error("Failed to decode token:", error);
                logout();
            }
        } else {
            logout();
        }
    }, [token]);

    const login = (newToken) => {
        localStorage.setItem("token", newToken);
        setToken(newToken);
    };

    return (
        <AuthContext.Provider
            value={{
                token,
                isAuthenticated,
                isAdmin,
                isDebateManager,
                login,
                logout,
                api,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}
