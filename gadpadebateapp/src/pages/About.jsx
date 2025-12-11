import React, { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import FadeInSection from "../components/FadeInSection";
import MapWithPingBackground from "../components/MapWithPingBackground";
import TypeIt from "../components/TypeIt";
import RevealSplitText from "../components/RevealSplitText";

export default function About() {
    const navigate = useNavigate();
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
                    <h1 className="about-hero-title">
                        GADPA{" "}
                        <TypeIt
                            rotateWords
                            autoPlay={true}
                            duration={2}
                            rotateWordsOptions={{
                                wordsList: ["Debate", "Election", "Community", ""],
                                cycle: false,
                                clear: true,
                                clearingDuration: 2,
                                pauseAfterComplete: 3,
                                pauseAfterClear: 0.5,
                            }}
                        />
                    </h1>
                </div>
                <div className="content-section">
                    <RevealSplitText tag="p" style={{ maxWidth: "1200px" }}>
                        Founded in 2019, the Indonesian Student Association of Xiamen University Malaysia (PPI Xiamen University Malaysia), known as Garuda Dwi Pantara (GADPA), is part of PPI Malaysia and a registered international student community under XMUM's Extra-Curricular Activities Department (ECA) with the ISA category. GADPA promotes Indonesian culture and traditions, while providing students opportunities to develop their talents and skills for the workforce. In 2024, after changing its category from clubs and societies, GADPA XMUM now focuses on the Indonesian student community at Xiamen University Malaysia.
                    </RevealSplitText>
                </div>
            </section>
            <FadeInSection className="video-section">
                <div class="video-text">
                    <h2>Check Out Our Latest Video</h2>
                    <p>
                        Stay updated with our recent content! Watch our newest release,
                        discover more videos, and don’t forget to follow us on socials
                        for behind-the-scenes updates.
                    </p>
                    <button
                        className="button-link-2-red" style={{ textTransform: "lowercase" }}
                        onClick={(e) => {
                            e.currentTarget.blur();
                            window.open(
                                "https://www.youtube.com/channel/UCocSzqq8vP5GRHG4SAxbD8Q",
                                "_blank"
                            );
                        }}
                    >
                        youtube.com/gadpa
                    </button>
                </div>

                <div class="video-embed">
                    <iframe src="https://www.youtube.com/embed/4BDlXXR1vnQ" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen ></iframe>
                </div>
            </FadeInSection>
            <FadeInSection className="content-section">
                <h2>How gadpa.live Works</h2>
                <div className="steps-section">
                    <div className="steps-section-cards" ref={cardsContainerRef}>
                        <div className="card step-card">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <h4 className="card-title">Check What’s Live</h4>
                                <p>Visit the homepage to see if any sessions are scheduled or currently live.</p>
                            </div>
                        </div>
                        <div className="card step-card">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <h4 className="card-title">Join the Session</h4>
                                <p>Enter the session — no password needed, unless specified.</p>
                            </div>
                        </div>
                        <div className="card step-card">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <h4 className="card-title">Raise the Heat</h4>
                                <p>Show your support by interacting and sending heat.</p>
                            </div>
                        </div>
                        <div className="card step-card">
                            <div className="step-number">4</div>
                            <div className="step-content">
                                <h4 className="card-title">Cast Your Vote</h4>
                                <p>Use your voting right to shape the future of XMUM’s Indonesian Community.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </FadeInSection>

            <FadeInSection className="content-section edgy-edges">
                <div>
                    <p>
                        <TypeIt
                            rotateWords
                            autoPlay={true}
                            rotateWordsOptions={{
                                wordsList: ["Dive into the heat of debate!", "Join the discussion.", "Make your voice heard!"],
                                cycle: true,
                                clear: true,
                                pauseAfterComplete: 3,
                                pauseAfterClear: 0.5,
                            }}
                        />
                    </p>
                    <button className="button-link-2" onClick={() => navigate("/")}>
                        Leggo
                    </button>
                </div>
            </FadeInSection>
        </main>
    );
}