import { useEffect, useRef, useState } from "react";

/**
 * Wraps children in a container that slides them up + fades them in the
 * first time they enter the viewport. `delay` staggers siblings.
 * With prefers-reduced-motion everything is shown immediately.
 */
const Reveal = ({ children, delay = 0, className = "" }) => {
  const ref = useRef(null);
  // Reduced-motion users see content immediately; no animation is applied.
  const [visible, setVisible] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "reveal-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

export default Reveal;
