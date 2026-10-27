import { useEffect, useRef, useState } from "react";

// Counts up to `value` the first time it scrolls into view.
export default function AnimatedNumber({
  value = 0,

  duration = 1300,

  suffix = "",

  prefix = "",
}) {
  const [displayValue, setDisplayValue] = useState(0);

  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    let frame = null;

    let started = false;

    const startAnimation = () => {
      if (started) return;

      started = true;

      const target = Math.max(0, Number(value) || 0);

      const start = performance.now();

      const animate = (time) => {
        const elapsed = time - start;

        const progress = Math.min(elapsed / duration, 1);

        const eased = 1 - Math.pow(1 - progress, 4);

        const current = Math.round(target * eased);

        setDisplayValue(current);

        if (progress < 1) {
          frame = requestAnimationFrame(animate);
        }
      };

      frame = requestAnimationFrame(animate);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startAnimation();

          observer.disconnect();
        }
      },

      {
        threshold: 0.25,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();

      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [value, duration]);

  return (
    <span ref={ref}>
      {prefix}

      {displayValue.toLocaleString("en-US")}

      {suffix}
    </span>
  );
}
