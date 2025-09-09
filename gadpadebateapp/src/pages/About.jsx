import React, { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";

// Fade-in wrapper component for scroll animations
function FadeInSection({ children }) {
    const ref = useRef();

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.classList.add("show");
                } else {
                    el.classList.remove("show");
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <section ref={ref} className="hidden">
            {children}
        </section>
    );
}

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
