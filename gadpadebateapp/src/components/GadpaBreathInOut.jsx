import React, { useEffect, useRef } from "react";
import gsap from "gsap";

export default function SectionBackgroundPulse() {
    const pulseRef = useRef();

    useEffect(() => {
        if (!pulseRef.current) return;

        gsap.set(pulseRef.current, { opacity: 0.07, scale: 0.8 });

        const tl = gsap.timeline({ repeat: -1 });

        tl.to(pulseRef.current, {
            scale: 0.78,
            opacity: 0.05,
            duration: 4,
            ease: "sine.out",
        })
            .to(pulseRef.current, {
                scale: 0.8,
                opacity: 0.07,
                duration: 6,
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
                backgroundImage: "url(/src/assets/gadpa-logo.png)",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                backgroundSize: "contain",
                transformOrigin: "center",
                willChange: "transform, opacity",
                pointerEvents: "none",
                zIndex: 1,
            }}
        />
    );
}
