import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./NotFound.css";

export default function NotFound() {
    const navigate = useNavigate();
    const location = useLocation();

    const handleGoHome = () => {
        navigate("/");
    };

    return (
        <div className="notfound-container">
            <div className="notfound-card">
                <div className="notfound-emoji">🔥💥</div>
                <h1 className="notfound-title">Oops! Page Exploded! 💣</h1>
                <p className="notfound-message">
                    The page <strong>"{location.pathname}"</strong> doesn't exist.
                    <br />
                    It might have been consumed by the flames! 🔥
                </p>
                <button onClick={handleGoHome} className="notfound-button">
                    🏠 Take Me Home
                </button>
            </div>

            {/* Floating fire emojis */}
            <div className="floating-fires">
                <span className="fire-float fire-1">🔥</span>
                <span className="fire-float fire-2">🔥</span>
                <span className="fire-float fire-3">🔥</span>
                <span className="fire-float fire-4">🔥</span>
                <span className="fire-float fire-5">🔥</span>
            </div>
        </div>
    );
}