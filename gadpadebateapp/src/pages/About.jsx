import React, { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import FadeInSection from "../components/FadeInSection";
import MapWithPingBackground from "../components/MapWithPingBackground";

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
        window.scrollTo(0, 0);
    }, [location.pathname]);

    return (
        <main className="top-8">
            {/* Hero section with SVG background */}
            <section className="hero-section">
                <MapWithPingBackground />
                <div className="hero-content">
                    <div className="header-section">
                        <h1 className="title">About Public Debates</h1>
                    </div>
                </div>
                <div className="content-section">
                    <h2>What is Gadpa?</h2>
                    <p>
                        Founded in 2019, the Indonesian Student Association of Xiamen University Malaysia (PPI Xiamen University Malaysia), known as Garuda Dwi Pantara (GADPA), is part of PPI Malaysia and a registered international student community under XMUM's Extra-Curricular Activities Department (ECA) with the ISA category. GADPA promotes Indonesian culture and traditions, while providing students opportunities to develop their talents and skills for the workforce. In 2024, after changing its category from clubs and societies, GADPA XMUM now focuses on the Indonesian student community at Xiamen University Malaysia.
                    </p>
                    {/* <iframe
                        width="560"
                        height="315"
                        src="https://www.youtube.com/embed/4BDlXXR1vnQ"
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                    ></iframe> */}
                </div>
            </section>

            <FadeInSection className="content-section">
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
                        <div className="card step-card">
                            <div className="step-number">4</div>
                            <div className="step-content">
                                <h4 className="card-title">Make Impact</h4>
                                <p>Influence public opinion and contribute to meaningful democratic discourse.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </FadeInSection>

            <FadeInSection className="content-section">
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
        </main>
    );
}