import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import "../css/Tiles.css";

export default function PageWrapper({ children }) {
    const wrapperRef = useRef(null);
    const [columns, setColumns] = useState(0);
    const [rows, setRows] = useState(0);
    const [toggled, setToggled] = useState(false);

    const handleOnClick = () => {
        setToggled(!toggled);
        document.body.classList.toggle("toggled", !toggled);
    };

    const createGrid = () => {
        if (!wrapperRef.current) return;
        const size = document.body.clientWidth > 800 ? 100 : 50;
        const cols = Math.floor(document.body.clientWidth / size);
        const rws = Math.floor(document.body.clientHeight / size);
        setColumns(cols);
        setRows(rws);
    };

    useEffect(() => {
        createGrid();
        window.addEventListener("resize", createGrid);
        return () => window.removeEventListener("resize", createGrid);
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05,
            },
        },
    };

    const tileVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
    };

    return (
        <div className="page-wrapper">
            <motion.div
                id="tiles"
                ref={wrapperRef}
                style={{
                    gridTemplateColumns: `repeat(${columns}, 1fr)`,
                    gridTemplateRows: `repeat(${rows}, 1fr)`,
                }}
                onClick={handleOnClick}
                variants={containerVariants}
                initial="visible"
                animate={toggled ? "hidden" : "visible"}
            >
                {Array.from({ length: columns * rows }).map((_, index) => (
                    <motion.div
                        key={index}
                        className="tile"
                        variants={tileVariants}
                    />
                ))}
            </motion.div>

            <div className="page-content">{children}</div>
        </div>
    );
}