/**
 * Layered ambient background for the landing page (pure CSS, GPU-friendly):
 *   1. Soft vertical base wash — white into the faintest lavender
 *   2. Three drifting "aurora" gradient blobs (transform-only animation)
 *   3. A fine engineering grid, radially masked so it fades toward the edges
 *   4. A hero spotlight glow
 *   5. Film-grain noise for texture depth
 * Everything is pointer-events-none and sits behind the interactive DotField.
 */

const NOISE_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

const AuroraBackground = () => (
  <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
    {/* 1 — base wash */}
    <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#fafafb_45%,#f4f1fa_100%)]" />

    {/* 2 — drifting aurora blobs (staggered durations keep them out of sync) */}
    <div className="absolute -left-[15%] -top-[20%] h-[70vh] w-[55vw] animate-aurora rounded-full bg-[radial-gradient(circle_at_center,rgba(188,176,218,0.5),transparent_65%)] blur-3xl will-change-transform motion-reduce:animate-none" />
    <div
      className="absolute -right-[12%] top-[10%] h-[65vh] w-[50vw] animate-aurora rounded-full bg-[radial-gradient(circle_at_center,rgba(143,122,184,0.32),transparent_65%)] blur-3xl will-change-transform motion-reduce:animate-none"
      style={{ animationDuration: "28s", animationDelay: "-8s" }}
    />
    <div
      className="absolute bottom-[-25%] left-[20%] h-[70vh] w-[60vw] animate-aurora rounded-full bg-[radial-gradient(circle_at_center,rgba(212,203,232,0.55),transparent_65%)] blur-3xl will-change-transform motion-reduce:animate-none"
      style={{ animationDuration: "34s", animationDelay: "-16s" }}
    />

    {/* 3 — masked grid */}
    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(143,122,184,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(143,122,184,0.07)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_55%_at_50%_35%,black_25%,transparent_78%)]" />

    {/* 4 — hero spotlight */}
    <div className="absolute inset-x-0 top-0 h-[70vh] bg-[radial-gradient(ellipse_55%_45%_at_50%_18%,rgba(232,227,244,0.85),transparent_70%)]" />

    {/* 5 — film grain */}
    <div
      className="absolute inset-0 opacity-[0.05] mix-blend-multiply"
      style={{ backgroundImage: NOISE_URI }}
    />

    {/* Bottom vignette so the footer settles into the page */}
    <div className="absolute inset-x-0 bottom-0 h-64 bg-[linear-gradient(to_top,rgba(244,241,250,0.9),transparent)]" />
  </div>
);

export default AuroraBackground;
