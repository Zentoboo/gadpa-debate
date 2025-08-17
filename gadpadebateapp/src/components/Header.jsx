import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/gadpa-logo.png";
import { useAuth } from "../hooks/AuthContext";
import "./Header.css";

export default function Header({ adminRegisterEnabled, debateManagerRegisterEnabled }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const location = useLocation();
    const { isAdmin, isDebateManager, logout, userRole } = useAuth();

    useEffect(() => setMenuOpen(false), [location.pathname]);

    const isAuthenticated = isAdmin || isDebateManager;

    return (
        <header className="header-container">
            <div className="header-inner">
                <Link to="/" className="logo">
                    <img src={logo} alt="gadpa logo" />
                    <span>Gadpa Election 2025</span>
                </Link>
                <button
                    className="menu-toggle lg-hidden"
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    ☰
                </button>
                <nav className={`main-nav ${menuOpen ? "open" : ""}`}>
                    <ul>
                        <li>
                            <Link to="/" className={location.pathname === "/" ? "active" : ""}>
                                home
                            </Link>
                        </li>

                        {/* Show auth options only if not logged in */}
                        {!isAuthenticated && (
                            <>
                                {/* Admin Auth Section */}
                                <li>
                                    <Link
                                        to="/admin/login"
                                        className={location.pathname === "/admin/login" ? "active" : ""}
                                    >
                                        admin login
                                    </Link>
                                </li>
                                {adminRegisterEnabled && (
                                    <li>
                                        <Link
                                            to="/admin/register"
                                            className={location.pathname === "/admin/register" ? "active" : ""}
                                        >
                                            admin register
                                        </Link>
                                    </li>
                                )}

                                {/* Debate Manager Auth Section */}
                                <li>
                                    <Link
                                        to="/debate-manager/login"
                                        className={location.pathname === "/debate-manager/login" ? "active" : ""}
                                    >
                                        debate manager
                                    </Link>
                                </li>
                                {debateManagerRegisterEnabled && (
                                    <li>
                                        <Link
                                            to="/debate-manager/register"
                                            className={location.pathname === "/debate-manager/register" ? "active" : ""}
                                        >
                                            dm register
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
                                        Admin
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
                                        Debate Manager
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
                    </ul>
                </nav>
            </div>
        </header>
    );
}