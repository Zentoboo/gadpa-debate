import { useRef, useEffect } from "react";
import gsap from "gsap";

export default function FadeInSection({ children, className = "" }) {
    const ref = useRef();

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    gsap.to(el, {
                        opacity: 1,
                        y: 0,
                        duration: 1.2,
                        delay: 0.6,
                        ease: "power3.out"
                    });
                } else {
                    if (entry.boundingClientRect.top > 0) {
                        gsap.to(el, {
                            opacity: 0,
                            y: 50,
                            duration: 0.6,
                            ease: "power3.in"
                        });
                    }
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <section
            ref={ref}
            className={className}
            style={{ opacity: 0, transform: "translateY(50px)" }}
        >
            {children}
        </section>
    );
}
