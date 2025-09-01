import React from "react";
import "../css/About.css";
import { Link } from "react-router-dom";

export default function About() {
    return (
        <div className="about-container">
            <h1 className="about-title">About Public Debates</h1>
            <p className="about-subtitle">
                Learn about our debate platform and what makes it unique
            </p>

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
                    <p>
                        The platform brings together diverse voices from across the community, creating an
                        inclusive space where every participant can contribute to the democratic process through
                        informed discussion and debate.
                    </p>
                </div>
            </div>

            <div className="about-section">
                <h2 className="section-heading">What's Unique About Heat?</h2>
                <div className="section-content">
                    <p>
                        The "Heat" system is our innovative approach to measuring and visualizing engagement
                        during live debates. Unlike traditional polling or voting mechanisms, Heat represents
                        the real-time emotional intensity and participation level of the debate community.
                    </p>

                    <div className="feature-grid">
                        <div className="feature-card">
                            <h3 className="feature-title">Real-Time Engagement</h3>
                            <p>
                                Heat levels rise and fall based on participant activity, creating a dynamic
                                visual representation of how compelling and engaging each topic is to the audience.
                            </p>
                        </div>

                        <div className="feature-card">
                            <h3 className="feature-title">Community-Driven</h3>
                            <p>
                                Every participant contributes to the Heat through their interactions, making it
                                a truly democratic measure of what topics resonate most with the community.
                            </p>
                        </div>

                        <div className="feature-card">
                            <h3 className="feature-title">Visual Analytics</h3>
                            <p>
                                Our Heat visualization helps moderators and participants understand discussion
                                patterns, peak engagement moments, and overall debate dynamics in real-time.
                            </p>
                        </div>

                        <div className="feature-card">
                            <h3 className="feature-title">Gamification Element</h3>
                            <p>
                                The Heat system adds an engaging, game-like element to debates while maintaining
                                the serious nature of political discourse and civic engagement.
                            </p>
                        </div>
                    </div>

                    <p>
                        This unique approach ensures that debates remain lively, participants stay engaged,
                        and the most important topics naturally rise to the forefront through community interest
                        rather than top-down editorial decisions.
                    </p>
                </div>
            </div>

            <div className="about-section">
                <h2 className="section-heading">How It Works</h2>
                <div className="section-content">
                    <div className="steps-container">
                        <div className="step-item">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <h4>Join a Live Debate</h4>
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

            <div className="about-cta">
                <h3>Ready to Join the Conversation?</h3>
                <p>
                    Head back to the home page to see what debates are currently live and join the discussion.
                </p>
                <Link to="/" className="home-button">
                    Leggo❤️‍🔥
                </Link>
            </div>
        </div>
    );
}