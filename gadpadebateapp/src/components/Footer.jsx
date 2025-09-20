import React from "react";
import { FaLinkedin, FaYoutube, FaInstagram } from "react-icons/fa";
import "../css/Footer.css";
import logo from "../assets/gadpa-logo.png";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    // Social media links
    const socialLinks = [
        {
            icon: FaInstagram,
            href: "https://www.instagram.com/gadpa.xmum/",
            label: "Instagram",
            ariaLabel: "Come and follow us on Instagram"
        },
        {
            icon: FaYoutube,
            href: "https://www.youtube.com/channel/UCocSzqq8vP5GRHG4SAxbD8Q",
            label: "YouTube",
            ariaLabel: "See our Youtube vids"
        },
        {
            icon: FaLinkedin,
            href: "https://www.linkedin.com/company/gadpa-xmum/",
            label: "LinkedIn",
            ariaLabel: "See and Follow our LinkedIn profile"
        }
    ];

    // Navigation links
    const navLinks = [
        { href: "#about", label: "About" },
        { href: "#purpose", label: "Purpose" },
        { href: "#debates", label: "Debates" },
        { href: "#features", label: "Features" }
    ];

    return (
        <footer className="footer">
            <div className="footer-container">
                {/* Brand Section */}
                <div className="footer-brand">
                    <div className="logo">
                        <img src={logo} alt="GADPA logo" />
                        <span>GADPA Election 2025</span>
                    </div>
                    <h2>Kongres PPI XMUM</h2>
                    <p>
                        Indonesian Student Election Management System empowering
                        democratic participation and transparency in student governance.
                    </p>
                </div>

                {/* Social Links Section */}
                <div className="footer-socials">
                    <h3>Connect With Us</h3>
                    <div className="social-icons">
                        {socialLinks.map((social, index) => (
                            <a
                                key={index}
                                href={social.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={social.ariaLabel}
                                title={social.label}
                            >
                                <social.icon />
                            </a>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer Bottom */}
            <div className="footer-bottom">
                <p>{currentYear} GADPA - Persatuan Pelajar Indonesia Xiamen University Malaysia</p>
            </div>
        </footer>
    );
}