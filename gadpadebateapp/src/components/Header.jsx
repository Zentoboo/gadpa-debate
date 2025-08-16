import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/gadpa-logo.png";
import { useAuth } from "../hooks/AuthContext";

export default function Header({ registerEnabled }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const location = useLocation();
    const { isAdmin, logout } = useAuth(); // Now isAdmin exists

    useEffect(() => setMenuOpen(false), [location.pathname]);

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
                                Home
                            </Link>
                        </li>
                        {!isAdmin && (
                            <li>
                                <Link
                                    to="/admin/login"
                                    className={location.pathname === "/admin/login" ? "active" : ""}
                                >
                                    Login
                                </Link>
                            </li>
                        )}
                        {registerEnabled && !isAdmin && (
                            <li>
                                <Link
                                    to="/admin/register"
                                    className={location.pathname === "/admin/register" ? "active" : ""}
                                >
                                    Register
                                </Link>
                            </li>
                        )}
                        {isAdmin && (
                            <>
                                <li>
                                    <Link
                                        to="/admin/dashboard"
                                        className={location.pathname === "/admin/dashboard" ? "active" : ""}
                                    >
                                        Dashboard
                                    </Link>
                                </li>
                                <li>
                                    <button onClick={logout} className="login-button">Logout</button>
                                </li>
                            </>
                        )}
                    </ul>
                </nav>
            </div>
        </header>
    );
}