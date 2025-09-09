import React, { useRef, useEffect } from "react";
import "../css/About.css";
import { Link } from "react-router-dom";

// Fade-in wrapper component for scroll animations
function FadeInSection({ children, className = "" }) {
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
        <section ref={ref} className={`hidden ${className}`}>
            {children}
        </section>
    );
}

export default function About() {
    return (
        <div className="about-container">
            <section>
                <div>
                    <h1 className="about-title">About Public Debates</h1>
                    <p className="about-subtitle">
                        Learn about our debate platform and what makes it unique
                    </p>
                </div>
                <div className="about-section">
                    <h2 className="section-heading">What is Gadpa Election 2025-2026?</h2>
                    <div className="section-content">
                        <p>
                            The Gadpa Election 2025-2026 represents a pivotal moment in democratic participation,
                            where public discourse and debate play a crucial role in shaping the future. Our platform
                            serves as a digital town hall, enabling citizens to engage in meaningful discussions about
                            the issues that matter most.
                        </p>
                        <p>
                            During this election cycle, we facilitate live debates on key topics ranging from economic
                            policy to social reform, environmental initiatives to technological advancement. Each debate
                            is structured to promote constructive dialogue and help participants better understand
                            different perspectives on complex issues.
                        </p>
                    </div>
                </div>
            </section>

            <FadeInSection>
                <div className="about-section">
                    <h2 className="section-heading">Key Features</h2>
                    <div className="section-content">
                        <div className="feature-grid">
                            <div className="feature-card">
                                <h3 className="feature-title">Interactive Debates</h3>
                                <p>
                                    Engage in live, moderated debates with real-time Q&A sessions.
                                </p>
                            </div>
                            <div className="feature-card">
                                <h3 className="feature-title">Transparent Process</h3>
                                <p>
                                    Access candidate profiles, debate transcripts, and voting information.
                                </p>
                            </div>
                            <div className="feature-card">
                                <h3 className="feature-title">Community Driven</h3>
                                <p>
                                    Shape the conversation by suggesting topics and participating in polls.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </FadeInSection>

            <FadeInSection>
                <div className="about-section">
                    <h2 className="section-heading">How It Works</h2>
                    <div className="section-content">
                        <div className="steps-container">
                            <div className="step-item">
                                <div className="step-number">1</div>
                                <div className="step-content">
                                    <h4>Find a Debate</h4>
                                    <p>Browse available debates on the home page and join one that interests you.</p>
                                </div>
                            </div>

                            <div className="step-item">
                                <div className="step-number">2</div>
                                <div className="step-content">
                                    <h4>Participate & Engage</h4>
                                    <p>Contribute to the Heat by participating actively in the discussion rounds.</p>
                                </div>
                            </div>

                            <div className="step-item">
                                <div className="step-number">3</div>
                                <div className="step-content">
                                    <h4>Watch the Heat Rise</h4>
                                    <p>See real-time visualizations of community engagement and debate intensity.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </FadeInSection>

            <FadeInSection>
                <div className="about-cta">
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