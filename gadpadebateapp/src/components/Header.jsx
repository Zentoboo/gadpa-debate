import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/gadpa-logo.png";


export default function Header({ registerEnabled, isAdmin }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const location = useLocation();

    const toggleMenu = () => setMenuOpen(!menuOpen);

    // Close mobile nav on route change
    useEffect(() => {
        setMenuOpen(false);
    }, [location.pathname]);

    return (
        <header className="header-container">
            <div className="header-inner">
                {/* Logo */}
                <Link to="/" className="logo">
                    <img
                        src={logo}
                        alt="gadpa logo"
                    />
                    <span>Gadpa Election 2025</span>
                </Link>

                {/* Mobile Menu Button */}
                <button
                    className="menu-toggle lg-hidden"
                    aria-label="Toggle navigation"
                    onClick={toggleMenu}
                >
                    ☰
                </button>

                {/* Navigation */}
                <nav className={`main-nav ${menuOpen ? "open" : ""}`}>
                    <ul>
                        <li>
                            <Link
                                to="/"
                                className={location.pathname === "/" ? "active" : ""}
                            >
                                Home
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/vote"
                                className={location.pathname === "/vote" ? "active" : ""}
                            >
                                Vote
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/results"
                                className={location.pathname === "/results" ? "active" : ""}
                            >
                                Results
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/admin/login"
                                className={location.pathname === "/admin/login" ? "active" : ""}
                            >
                                Login
                            </Link>
                        </li>
                        {registerEnabled && (
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
                            <li>
                                <Link
                                    to="/admin/dashboard"
                                    className={location.pathname === "/admin/dashboard" ? "active" : ""}
                                >
                                    Dashboard
                                </Link>
                            </li>
                        )}
                    </ul>
                </nav>
            </div>
        </header>
    );
}