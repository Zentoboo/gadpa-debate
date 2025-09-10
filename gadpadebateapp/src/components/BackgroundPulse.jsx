import React, { useEffect, useRef } from "react";
import gsap from "gsap";

export default function BackgroundPulse() {
    const pulseRef = useRef();

    useEffect(() => {
        if (!pulseRef.current) return;

        // Animate opacity for a subtle breathing glow
        gsap.to(pulseRef.current, {
            opacity: 0.7,     // max glow strength
            duration: 3,       // breathing speed
            repeat: -1,        // infinite loop
            yoyo: true,        // back and forth
            ease: "sine.inOut" // smooth easing
        });
    }, []);

    return (
        <>
            {/* Base background gradient */}
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    background: "linear-gradient(135deg, #0f0f12, #131316)",
                    zIndex: -10,
                }}
            />

            {/* Pulsing radial glow */}
            <div
                ref={pulseRef}
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    background: "radial-gradient(circle at center, rgba(255,255,255,0.12), transparent 70%)",
                    opacity: 0.05,
                    zIndex: -9,
                }}
            />
        </>
    );
}
