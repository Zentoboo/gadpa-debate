import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import "../css/HeroTitle.css";

function HomeHeroTitle() {
    const containerRef = useRef(null);
    const subtitleRef = useRef(null);

    useEffect(() => {
        const targets = containerRef.current.querySelectorAll(".herotitle-inner");
        if (!targets.length) return;

        const duration = 0.8;
        const pause = 0.75;
        const tl = gsap.timeline({ repeat: 0 });

        targets.forEach((target, index) => {
            tl.fromTo(
                target,
                { y: 40, opacity: 0 },
                { y: 0, opacity: 1, duration, ease: "power2.out" }
            );

            if (index < targets.length - 1) {
                tl.to(target, {
                    y: -40,
                    opacity: 0,
                    duration,
                    delay: pause,
                    ease: "power2.in"
                });
            } else {
                tl.fromTo(
                    subtitleRef.current,
                    { y: 40, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" },
                    "<"
                );
            }
        });

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

export default HomeHeroTitle;
