import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function FadeInBlock({ children }) {
    const ref = useRef(null);

    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["0.9 1", "0.4 0"],
    });

    const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);
    const y = useTransform(scrollYProgress, [0, 0.3], [50, 0]);
    const scale = useTransform(scrollYProgress, [0, 0.3], [0.9, 1]);

    return (
        <motion.div
            ref={ref}
            style={{ 
                opacity, 
                y, 
                scale,
                width: '100%',
                transformOrigin: 'center center'
            }}
            className="block"
        >
            {children}
        </motion.div>
    );
}