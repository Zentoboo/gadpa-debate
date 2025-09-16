import React, { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import BackgroundPulse from "../components/BackgroundPulse";
import FadeInSection from "../components/FadeInSection";

export default function About() {
    const location = useLocation();
    const cardsContainerRef = useRef(null);

    useEffect(() => {
        const handleMouseMove = e => {
            if (!cardsContainerRef.current) return;

            const cards = cardsContainerRef.current.getElementsByClassName("step-card");
            for (const card of cards) {
                const rect = card.getBoundingClientRect(),
                    x = e.clientX - rect.left,
                    y = e.clientY - rect.top;

                card.style.setProperty("--mouse-x", `${x}px`);
                card.style.setProperty("--mouse-y", `${y}px`);
            };
        };

        const container = cardsContainerRef.current;
        if (container) {
            container.addEventListener("mousemove", handleMouseMove);
        }

        return () => {
            if (container) {
                container.removeEventListener("mousemove", handleMouseMove);
            }
        };
    }, []);

    useEffect(() => {
        // Scroll to the top when the component mounts
        window.scrollTo(0, 0);
    }, [location.pathname]);

    return (
        <div>
            <BackgroundPulse />
            <section>
                <div className="header-section">
                    <h1 className="title">About Public Debates</h1>
                    <p className="subtitle">Learn about our debate platform and what makes it unique</p>
                </div>
                <div className="content-section">
                    <h2>What is Gadpa Election 2025-2026?</h2>
                    <p>
                        The Gadpa Election 2025-2026 is a groundbreaking online platform dedicated to fostering
                        healthy, respectful, and engaging public debates. We believe that open discussion is vital for
                        a well-informed society, and our platform is designed to make it easy for users to connect,
                        share their perspectives, and engage with others on important topics. Our core mission is to
                        redefine online discourse by providing a space where diverse viewpoints can be expressed without
                        fear of personal attacks or harassment.
                    </p>
                    <h2>What is Gadpa?</h2>
                    <p>
                        The Indonesian Student Association of Xiamen University Malaysia (PPI Xiamen University Malaysia), known as Garuda Dwi Pantara (GADPA), is an Indonesian Student Association under the Indonesian Students Association of Malaysia (PPI Malaysia) and is one of the registered International Students Community under Xiamen University Malaysia's Extra- Curricular Activities Department (ECA) with International Student Ambassadors (ISA) category. PPI Xiamen University Malaysia was founded in 2019 with the aim of promoting and introducing Indonesian culture and traditions to students at Xiamen University Malaysia. Apart from that, PPI Xiamen University Malaysia is also a platform for students to develop their talents and abilities in order to improve their quality when they enter the workforce. In 2024, GADPA XMUM after we change category from clubs and societies. We are focusing on the Indonesian Students Community at Xiamen University Malaysia.
                    </p>
                </div>
            </section>
            <FadeInSection>
                <h2>How It Works</h2>
                <div className="steps-section">
                    <div className="steps-section-cards" ref={cardsContainerRef}>
                        <div className="card step-card">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <h4 className="card-title">Choose Your Side</h4>
                                <p>Join a debate by selecting your preferred side of a public topic or election issue.</p>
                            </div>
                        </div>
                        <div className="card step-card">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <h4 className="card-title">Participate & Engage</h4>
                                <p>Contribute to the Heat by participating actively in the discussion rounds.</p>
                            </div>
                        </div>
                        <div className="card step-card">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <h4 className="card-title">Watch the Heat Rise</h4>
                                <p>See real-time visualizations of community engagement and debate intensity.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </FadeInSection>
            <FadeInSection>
                <div className="cta-section">
                    <h3>Ready to Join the Conversation?</h3>
                    <p>
                        Head back to the home page to see what debates are currently live and join the discussion.
                    </p>
                    <Link to="/" className="home-button">
                        Leggo❤️‍🔥
                    </Link>
                </div>
            </FadeInSection>
        </div>
    );
}
