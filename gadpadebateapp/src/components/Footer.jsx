import React from "react";
import { FaGithub, FaEnvelope, FaTwitter, FaInstagram } from "react-icons/fa";
import "../css/Footer.css";
import logo from "../assets/gadpa-logo.png";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    // Social media links - you can update these with actual URLs
    const socialLinks = [
        {
            icon: FaInstagram,
            href: "https://www.instagram.com/gadpa.xmum/",
            label: "Instagram",
            ariaLabel: "Come and follow us on Instagram"
        },
        {
            icon: FaGithub,
            href: "https://github.com/gadpa-election",
            label: "GitHub",
            ariaLabel: "Visit our GitHub repository"
        },
        {
            icon: FaTwitter,
            href: "https://twitter.com/gadpa_xmum",
            label: "Twitter",
            ariaLabel: "Follow us on Twitter"
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

                {/* Quick Links Section */}
                <div className="footer-links">
                    <h3>Quick Links</h3>
                    <ul>
                        {navLinks.map((link, index) => (
                            <li key={index}>
                                <a
                                    href={link.href}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        const element = document.querySelector(link.href);
                                        if (element) {
                                            element.scrollIntoView({ behavior: 'smooth' });
                                        }
                                    }}
                                >
                                    {link.label}
                                </a>
                            </li>
                        ))}
                    </ul>
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
                <p>© {currentYear} GADPA – All Rights Reserved</p>
            </div>
        </footer>
    );
}