import { useRef, useEffect } from "react";
import "../css/FadeInSection.css";

export default function FadeInSection({ children, className = "" }) {
    const ref = useRef();

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.classList.add("show");
                } else {
                    el.classList.remove("show");
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <section ref={ref} className={`hidden ${className}`}>
            {children}
        </section>
    );
}
