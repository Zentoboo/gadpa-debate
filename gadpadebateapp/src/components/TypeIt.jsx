import { useEffect, useRef } from "react";
import { gsap, Power4, Linear } from "gsap";
import { TextPlugin } from "gsap/TextPlugin";
import "../css/TypeIt.css";

gsap.registerPlugin(TextPlugin);

export default function TypeIt({
    elClass = "",
    rotateWords = false,
    rotateWordsOptions = {
        wordsList: [],
        cycle: false,
        clear: false,
        clearingDuration: 2,
        clear_background: "#000",
        clear_color: "#fff",
        original_background: "transparent",
        original_color: "#000",
        append: false,
        pause: false,
        pauseAfterComplete: 1.0,
        pauseAfterClear: 0.5,
    },
    word = "",
    cursorSign = "|",
    autoPlay = true,
    delay = 2,
    charterPerSecond = false,
    duration = 1.5,
    easing = Linear.easeNone,
}) {
    const elRef = useRef(null);
    const cursorRef = useRef(null);
    const wordIndex = useRef(0);
    const timelineRef = useRef(null);

    useEffect(() => {
        const el = elRef.current;
        const cursor = cursorRef.current;

        // Validate inputs
        if (!el || !cursor) return;

        const tl = gsap.timeline();
        timelineRef.current = tl;

        const words = rotateWordsOptions.wordsList;

        if (rotateWords && (!words || words.length === 0)) {
            console.warn("TypeIt: rotateWords is true but wordsList is empty");
            return;
        }

        function setCursorClass(className) {
            if (cursor) cursor.className = "gsapCursor " + className;
        }

        function getDuration(w) {
            return charterPerSecond ? w.length / charterPerSecond : duration;
        }

        function type() {
            gsap.delayedCall(0, setCursorClass, ["blink"]);
            gsap.delayedCall(delay, setCursorClass, [" "]);

            if (!rotateWords) {
                gsap.to(el, {
                    text: { value: word },
                    duration: getDuration(word),
                    delay,
                    ease: easing,
                    onComplete: () => setCursorClass("blink"),
                });
            } else {
                const idx = wordIndex.current;
                const currentWord = words[idx];
                const newWord = rotateWordsOptions.append && idx > 0
                    ? el.textContent + " " + currentWord
                    : currentWord;

                gsap.to(el, {
                    text: { value: newWord },
                    duration: getDuration(currentWord),
                    delay,
                    ease: easing,
                    onComplete: () => typeRotationCompleted(),
                });
            }
        }

        function backspace(word, onComplete) {
            setCursorClass("");
            if (!word || word.length === 0) {
                onComplete?.();
                return;
            }

            let i = word.length;
            const backspaceDuration = getDuration(word);
            const intervalDuration = backspaceDuration / word.length;

            gsap.to({}, {
                duration: intervalDuration,
                repeat: word.length,
                ease: "none",
                onRepeat: () => {
                    i--;
                    if (el) el.textContent = word.substring(0, i);
                },
                onComplete,
            });
        }

        function typeRotationCompleted() {
            setCursorClass("blink");

            const prevWordIndex = wordIndex.current;

            if (wordIndex.current >= words.length - 1) {
                if (rotateWordsOptions.cycle) {
                    wordIndex.current = 0;
                } else {
                    return;
                }
            } else {
                wordIndex.current++;
            }

            if (rotateWordsOptions.clear) {
                const wordToBackspace = words[prevWordIndex];
                gsap.delayedCall(rotateWordsOptions.pauseAfterComplete, () => {
                    backspace(wordToBackspace, () => {
                        if (!rotateWordsOptions.pause) {
                            gsap.delayedCall(rotateWordsOptions.pauseAfterClear, type);
                        }
                    });
                });
                return;
            }

            if (rotateWordsOptions.pause) {
                return;
            }

            gsap.delayedCall(rotateWordsOptions.pauseAfterClear, type);
        }

        function cleanup() {
            if (timelineRef.current) {
                timelineRef.current.kill();
            }
            gsap.killTweensOf(el);
            gsap.killTweensOf({});
        }

        if (autoPlay) {
            type();
        }

        return cleanup;
    }, [
        word,
        autoPlay,
        delay,
        duration,
        easing,
        charterPerSecond,
        rotateWords,
        rotateWordsOptions,
    ]);

    return (
        <span className={elClass}>
            <span ref={elRef}></span>
            <span ref={cursorRef} className="gsapCursor blink">
                {cursorSign}
            </span>
        </span>
    );
}