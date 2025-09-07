import React from "react";
import { FaGithub, FaEnvelope, FaTwitter } from "react-icons/fa";
import "../css/Footer.css";
import logo from "../assets/gadpa-logo.png";

export default function Footer() {
    return (
        <footer className="footer">
            <div className="footer-container">
                {/* Left: Brand */}
                <div className="footer-brand">
                    <div className="logo">
                        <img src={logo} alt="GADPA logo" />
                        <span>Gadpa Election 2025</span>
                    </div>
                    <h2>Kongres PPI XMUM</h2>
                    <p>Election Management System by GADPA</p>
                </div>

                {/* Middle: Quick Links */}
                <div className="footer-links">
                    <h3>Quick Links</h3>
                    <ul>
                        <li><a href="#about">About</a></li>
                        <li><a href="#purpose">Purpose</a></li>
                        <li><a href="#debates">Debates</a></li>
                    </ul>
                </div>

                {/* Right: Socials */}
                <div className="footer-socials">
                    <h3>Connect</h3>
                    <div className="social-icons">
                        <a href="mailto:your@email.com" target="_blank" rel="noreferrer">
                            <FaEnvelope />
                        </a>
                        <a href="https://github.com/yourprofile" target="_blank" rel="noreferrer">
                            <FaGithub />
                        </a>
                        <a href="https://twitter.com/yourprofile" target="_blank" rel="noreferrer">
                            <FaTwitter />
                        </a>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <p>© {new Date().getFullYear()} GADPA – All Rights Reserved</p>
            </div>
        </footer>
    );
}
