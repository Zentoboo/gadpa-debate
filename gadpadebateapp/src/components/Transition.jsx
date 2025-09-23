import React, { useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import gsap from "gsap";
import TransitionContext from "../contexts/TransitionContext";

const TransitionComponent = ({ children }) => {
    const location = useLocation();
    const { toggleCompleted } = useContext(TransitionContext);
    const containerRef = useRef(null);
    const [displayLocation, setDisplayLocation] = useState(location);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const currentAnimationRef = useRef(null);

    useEffect(() => {
        if (location.pathname !== displayLocation.pathname && !isTransitioning) {
            setIsTransitioning(true);
            toggleCompleted(false);

            const container = containerRef.current;
            if (!container) return;

            if (currentAnimationRef.current) {
                currentAnimationRef.current.kill();
            }

            const tl = gsap.timeline({
                onComplete: () => {
                    setIsTransitioning(false);
                    toggleCompleted(true);
                    currentAnimationRef.current = null;
                }
            });

            // exit → swap → enter
            tl.to(container, {
                opacity: 0,
                duration: 0.5,
                ease: "power2.out"
            })
                .call(() => {
                    setDisplayLocation(location);
                    window.scrollTo(0, 0);
                })
                .to({}, { duration: 0.05 })
                .to(container, {
                    opacity: 1,
                    duration: 0.5,
                    ease: "power2.out"
                });

            currentAnimationRef.current = tl;
        }
    }, [location, displayLocation, isTransitioning, toggleCompleted]);

    useEffect(() => {
        return () => {
            if (currentAnimationRef.current) {
                currentAnimationRef.current.kill();
            }
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                willChange: "opacity"
            }}
        >
            {typeof children === "function" ? children(displayLocation) : children}
        </div>
    );
};

export default TransitionComponent;
