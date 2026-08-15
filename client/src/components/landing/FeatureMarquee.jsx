import { useState } from "react";

const FeatureCard = ({ icon: Icon, title, body }) => (
  <div className="card pointer-events-auto w-80 shrink-0 bg-cream-50/90 p-7 backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md">
    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-lav-100 text-lav-600">
      <Icon size={24} />
    </span>
    <h3 className="mt-4 text-lg font-bold text-ink-900">{title}</h3>
    <p className="mt-2 text-sm leading-relaxed text-ink-500">{body}</p>
  </div>
);

/**
 * Feature cards sit side by side in a continuously scrolling strip. The list
 * is duplicated once so translating the track by exactly -50% loops
 * seamlessly. Falls back to a static grid for prefers-reduced-motion.
 */
export const FeatureMarquee = ({ features }) => {
  const [reducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  if (reducedMotion) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <FeatureCard key={f.title} {...f} />
        ))}
      </div>
    );
  }

  const track = [...features, ...features];

  return (
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div className="flex w-max animate-marquee gap-4">
        {track.map((f, i) => (
          <FeatureCard key={`${f.title}-${i}`} {...f} />
        ))}
      </div>
    </div>
  );
};
