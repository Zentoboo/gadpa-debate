import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/gadpa-logo.png";
import { useAuth } from "../contexts/AuthContext";
import "../css/Header.css";

export default function Header({ adminRegisterEnabled, debateManagerRegisterEnabled, onHide }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const location = useLocation();
    const { isAdmin, isDebateManager, logout } = useAuth();

    useEffect(() => setMenuOpen(false), [location.pathname]);

    const isAuthenticated = isAdmin || isDebateManager;

    return (
        <header className="header-container">
            <div className="header-inner">
                {/* Logo */}
                <Link to="/" className="logo">
                    <img src={logo} alt="gadpa logo" />
                    <span>Gadpa Election 2025</span>
                </Link>

                {/* Mobile Menu Toggle */}
                <button
                    className="menu-toggle lg-hidden"
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    ☰
                </button>

                {/* Navigation */}
                <nav className={`main-nav ${menuOpen ? "open" : ""}`}>
                    <ul>
                        <li>
                            <Link to="/" className={location.pathname === "/" ? "active" : ""}>
                                home
                            </Link>
                        </li>
                        <li>
                            <Link to="/about" className={location.pathname === "/about" ? "active" : ""}>
                                about
                            </Link>
                        </li>

                        {/* Auth Links (if not authenticated) */}
                        {!isAuthenticated && (
                            <>
                                {/* Admin Auth */}
                                <li>
                                    <Link
                                        to="/admin/login"
                                        className={location.pathname === "/admin/login" ? "active" : ""}
                                    >
                                        admin-login
                                    </Link>
                                </li>
                                {adminRegisterEnabled && (
                                    <li>
                                        <Link
                                            to="/admin/register"
                                            className={location.pathname === "/admin/register" ? "active" : ""}
                                        >
                                            admin-register
                                        </Link>
                                    </li>
                                )}

                                {/* Debate Manager Auth */}
                                <li>
                                    <Link
                                        to="/debate-manager/login"
                                        className={location.pathname === "/debate-manager/login" ? "active" : ""}
                                    >
                                        dm-login
                                    </Link>
                                </li>
                                {debateManagerRegisterEnabled && (
                                    <li>
                                        <Link
                                            to="/debate-manager/register"
                                            className={location.pathname === "/debate-manager/register" ? "active" : ""}
                                        >
                                            dm-register
                                        </Link>
                                    </li>
                                )}
                            </>
                        )}

                        {/* Admin Dashboard */}
                        {isAdmin && (
                            <>
                                <li>
                                    <span style={{ color: "#4ade80", fontSize: "0.8rem", textTransform: "uppercase" }}>
                                        admin
                                    </span>
                                </li>
                                <li>
                                    <Link
                                        to="/admin/dashboard"
                                        className={location.pathname === "/admin/dashboard" ? "active" : ""}
                                    >
                                        dashboard
                                    </Link>
                                </li>
                                <li>
                                    <button onClick={logout} className="nav-link-button">logout</button>
                                </li>
                            </>
                        )}

                        {/* Debate Manager Dashboard */}
                        {isDebateManager && (
                            <>
                                <li>
                                    <span style={{ color: "#fbbf24", fontSize: "0.8rem", textTransform: "uppercase" }}>
                                        debate-manager
                                    </span>
                                </li>
                                <li>
                                    <Link
                                        to="/debate-manager/dashboard"
                                        className={location.pathname === "/debate-manager/dashboard" ? "active" : ""}
                                    >
                                        dashboard
                                    </Link>
                                </li>
                                <li>
                                    <button onClick={logout} className="nav-link-button">logout</button>
                                </li>
                            </>
                        )}

                        {/* Hide Header (styled like a nav item) */}
                        <li>
                            <button onClick={onHide} style={{opacity: 0.1}} className="nav-link-button">hide</button>
                        </li>
                    </ul>
                </nav>
            </div>
        </header>
    );
}
