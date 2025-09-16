import React, { useContext, useEffect, useRef, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';
import TransitionContext from '../contexts/TransitionContext';

const TransitionComponent = ({ children }) => {
    const location = useLocation();
    const { toggleCompleted } = useContext(TransitionContext);
    const containerRef = useRef(null);
    const [displayLocation, setDisplayLocation] = useState(location);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const currentAnimationRef = useRef(null);

    // Memoize rendered children
    const renderedChildren = useMemo(() => {
        return React.cloneElement(children, { location: displayLocation });
    }, [children, displayLocation]);

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

            // Exit animation
            tl.to(container, {
                opacity: 0,
                duration: 0.5,
                ease: "power2.out"
            })
                .call(() => {
                    setDisplayLocation(location);
                })
                .to({}, { duration: 0.05 })
                // Enter animation
                .to(container, {
                    opacity: 1,
                    duration: 0.5,
                    ease: "power2.out"
                });

            currentAnimationRef.current = tl;
        }
    }, [location.pathname, displayLocation.pathname, isTransitioning, toggleCompleted, location]);

    // Cleanup on unmount
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
                width: '100%',
                height: '100%',
                willChange: 'opacity'
            }}
        >
            {renderedChildren}
        </div>
    );
};

export default TransitionComponent;