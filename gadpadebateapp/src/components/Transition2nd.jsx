import React, { useContext, useEffect, useRef, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';
import TransitionContext from '../contexts/TransitionContext';

const TransitionComponent = ({ children }) => {
    const location = useLocation();
    const { toggleCompleted } = useContext(TransitionContext);
    const wrapperRef = useRef(null);
    const oldPageRef = useRef(null);
    const newPageRef = useRef(null);
    const [displayLocation, setDisplayLocation] = useState(location);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [showNewPage, setShowNewPage] = useState(false);
    const currentAnimationRef = useRef(null);

    // Current page content
    const currentPageContent = useMemo(() => {
        return React.cloneElement(children, { location: displayLocation });
    }, [children, displayLocation]);

    // New page content (only during transition)
    const newPageContent = useMemo(() => {
        if (!showNewPage) return null;
        return React.cloneElement(children, { location });
    }, [children, location, showNewPage]);

    useEffect(() => {
        if (location.pathname !== displayLocation.pathname && !isTransitioning) {
            setIsTransitioning(true);
            setShowNewPage(true);
            toggleCompleted(false);

            const wrapper = wrapperRef.current;
            const oldPage = oldPageRef.current;
            const newPage = newPageRef.current;

            if (!wrapper || !oldPage || !newPage) return;

            // Kill any existing animations
            if (currentAnimationRef.current) {
                currentAnimationRef.current.kill();
            }

            // Set initial positions
            gsap.set(oldPage, { x: 0, opacity: 1 });
            gsap.set(newPage, { x: '100%', opacity: 0 });

            // Create transition timeline
            const tl = gsap.timeline({
                onComplete: () => {
                    setDisplayLocation(location);
                    setShowNewPage(false);
                    setIsTransitioning(false);
                    toggleCompleted(true);
                    currentAnimationRef.current = null;

                    // Reset positions
                    gsap.set([oldPage, newPage], { x: 0, opacity: 1 });
                }
            });

            // Slide transition
            tl.to(oldPage, {
                x: '-100%',
                opacity: 0,
                duration: 0.3,
                ease: "power2.inOut"
            })
                .to(newPage, {
                    x: 0,
                    opacity: 1,
                    duration: 0.3,
                    ease: "power2.inOut"
                }, "-=0.15"); // Start new page animation before old page finishes

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
            ref={wrapperRef}
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                overflow: 'hidden'
            }}
        >
            {/* Current/Old Page */}
            <div
                ref={oldPageRef}
                style={{
                    position: isTransitioning ? 'absolute' : 'relative',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    willChange: 'transform, opacity'
                }}
            >
                {currentPageContent}
            </div>

            {/* New Page (only during transition) */}
            {showNewPage && (
                <div
                    ref={newPageRef}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        willChange: 'transform, opacity'
                    }}
                >
                    {newPageContent}
                </div>
            )}
        </div>
    );
};

export default TransitionComponent;