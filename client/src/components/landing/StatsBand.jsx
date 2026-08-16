import { useEffect, useRef, useState } from "react";

/** Eases a number from 0 to `target` once the band scrolls into view. */
const CountUp = ({ target, duration = 1400 }) => {
  const ref = useRef(null);
  // Reduced-motion users jump straight to the final number.
  const [value, setValue] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? target : 0
  );
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || value === target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        observer.disconnect();

        const t0 = performance.now();
        const tick = (now) => {
          const progress = Math.min(1, (now - t0) / duration);
          const eased = 1 - Math.pow(1 - progress, 3);
          setValue(Math.round(target * eased));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [target, duration, value]);

  return <span ref={ref}>{value}</span>;
};

/**
 * A big numbers band — counters ease up from zero the first time the
 * section enters the viewport.
 */
const StatsBand = ({ stats }) => (
  <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
    {stats.map((stat) => (
      <div
        key={stat.label}
        className="pointer-events-auto card bg-white/70 p-6 text-center backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-md"
      >
        <div className="font-display text-3xl font-bold tracking-tight text-lav-600 sm:text-4xl">
          <CountUp target={stat.value} />
          {stat.suffix}
        </div>
        <div className="mt-1.5 text-xs font-medium uppercase tracking-wider text-ink-500">
          {stat.label}
        </div>
      </div>
    ))}
  </div>
);

export default StatsBand;
