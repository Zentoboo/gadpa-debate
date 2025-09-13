import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "../css/RevealSplitText.css";

gsap.registerPlugin(ScrollTrigger);

export default function RevealSplitText({
    children,
    className = "",
    tag: Tag = "h2",
    style = {}   // ✅ accept style as a prop
}) {
    const textRef = useRef(null);

    const splitWords = (el) => {
        el.dataset.splitText = el.textContent;
        el.innerHTML = el.textContent
            .split(/\s/)
            .map((word) =>
                word
                    .split("-")
                    .map((part) => `<span class="word">${part}</span>`)
                    .join('<span class="hyphen">-</span>')
            )
            .join('<span class="whitespace"> </span>');
    };

    const getLines = (el) => {
        const lines = [];
        let line = [];
        let lastTop = null;
        const words = el.querySelectorAll("span");

        words.forEach((word) => {
            if (word.offsetTop !== lastTop) {
                if (!word.classList.contains("whitespace")) {
                    lastTop = word.offsetTop;
                    line = [];
                    lines.push(line);
                }
            }
            line.push(word);
        });

        return lines;
    };

    const splitLines = (el) => {
        splitWords(el);
        const lines = getLines(el);

        const wrappedLines = lines
            .map(
                (wordsArr) =>
                    `<span class="line"><span class="words">${wordsArr
                        .map((word) => word.outerHTML)
                        .join("")}</span></span>`
            )
            .join("");

        el.innerHTML = wrappedLines;
    };

    useEffect(() => {
        if (!textRef.current) return;

        splitLines(textRef.current);

        const element = textRef.current;
        const lines = element.querySelectorAll(".words");

        gsap.set(element, { autoAlpha: 1 });

        gsap.from(lines, {
            yPercent: 100,
            ease: "power3.out",
            stagger: 0.25,
            delay: 0.2,
            duration: 1,
            scrollTrigger: {
                trigger: element,
                toggleActions: "restart none none reset",
            },
        });
    }, []);

    const defaultStyles = {
        h2: {
            fontSize: "2.4rem",
            fontWeight: "bold"
        },
        p: {
            fontSize: "1.2rem"
        },
    };

    return (
        <Tag
            ref={textRef}
            className={`reveal-text ${className}`}
            style={{ ...defaultStyles[Tag], ...style }}
        >
            {children}
        </Tag>
    );
}
