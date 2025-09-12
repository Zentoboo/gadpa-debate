import React, { useEffect, useRef } from "react";
import gsap from "gsap";

export default function SectionBackgroundPulse() {
    const pulseRef = useRef();

    useEffect(() => {
        if (!pulseRef.current) return;

        gsap.to(pulseRef.current, {
            opacity: 0.7,
            duration: 3,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
        });
    }, []);

    return (
        <div
            ref={pulseRef}
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: "radial-gradient(circle at center, rgba(255,255,255,0.12), transparent 70%)",
                opacity: 0.05,
                zIndex: 0,
                pointerEvents: "none"
            }}
        />
    );
}
