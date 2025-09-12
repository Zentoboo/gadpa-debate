import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";

function HeroTitle() {
    const containerRef = useRef(null);
    const subtitleRef = useRef(null);

    useEffect(() => {
        const targets = containerRef.current.querySelectorAll(".herotitle-inner");
        if (!targets.length) return;

        const tl = gsap.timeline({ repeat: 0 });

        // Animate each title
        targets.forEach((target, index) => {
            tl.fromTo(
                target,
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.5 }
            );

            if (index < targets.length - 1) {
                tl.to(target, { y: -30, opacity: 0, duration: 0.5, delay: 0.75 });
            }
        });

        // Animate subtitle AFTER all titles
        tl.fromTo(
            subtitleRef.current,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
        );

        return () => tl.kill();
    }, []);

    return (
        <div className="title">
            <div className="herotitle" ref={containerRef}>
                <div className="herotitle-outer">
                    <div className="herotitle-inner">Xiamen University Malaysia</div>
                </div>
                <div className="herotitle-outer">
                    <div className="herotitle-inner">Garuda Dwi Pantara</div>
                </div>
                <div className="herotitle-outer">
                    <div className="herotitle-inner">PPI XMUM</div>
                </div>
                <div className="herotitle-outer">
                    <div className="herotitle-inner">Gadpa Election 2025-2026</div>
                </div>
            </div>
            <p ref={subtitleRef}>Indonesian Student Election Management System</p>
        </div>
    );
}

export default HeroTitle;
