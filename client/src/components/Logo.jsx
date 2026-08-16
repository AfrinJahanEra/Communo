import { cn } from "../lib/utils";

/**
 * Communo mark: a hive cell (hexagon) with a chat bubble carved out of it —
 * community on the outside, conversation on the inside. Drawn as inline SVG
 * so it stays crisp at any size and needs no asset files.
 */
const HiveMark = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    className="drop-shadow-sm"
  >
    {/* Hexagon hive cell */}
    <path
      d="M12 1.8 20.8 6.9v10.2L12 22.2 3.2 17.1V6.9L12 1.8Z"
      fill="white"
    />
    {/* Chat bubble cut-out with typing dots */}
    <path
      d="M8.1 8.4h7.8c.94 0 1.7.76 1.7 1.7v3.2c0 .94-.76 1.7-1.7 1.7h-4.3l-2.9 2.3v-2.3h-.6c-.94 0-1.7-.76-1.7-1.7v-3.2c0-.94.76-1.7 1.7-1.7Z"
      fill="url(#hiveGrad)"
    />
    <circle cx="9.4" cy="11.7" r="0.95" fill="white" />
    <circle cx="12" cy="11.7" r="0.95" fill="white" />
    <circle cx="14.6" cy="11.7" r="0.95" fill="white" />
    <defs>
      <linearGradient id="hiveGrad" x1="6" y1="8" x2="18" y2="17" gradientUnits="userSpaceOnUse">
        <stop stopColor="#8f7ab8" />
        <stop offset="1" stopColor="#614f83" />
      </linearGradient>
    </defs>
  </svg>
);

export const Logo = ({ size = "md", withText = true, className, textClassName }) => {
  const box = size === "lg" ? "h-11 w-11 rounded-2xl" : "h-8 w-8 rounded-xl";
  const icon = size === "lg" ? 26 : 20;
  const text = size === "lg" ? "text-2xl" : "text-lg";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex items-center justify-center bg-[linear-gradient(135deg,#a795cc,#8f7ab8_55%,#614f83)] shadow-md shadow-lav-200",
          box
        )}
      >
        <HiveMark size={icon} />
      </span>
      {withText && (
        <span className={cn("font-display font-bold tracking-tight text-ink-900", text, textClassName)}>
          Commu
          <span className="bg-[linear-gradient(90deg,#8f7ab8,#614f83)] bg-clip-text text-transparent">
            no
          </span>
        </span>
      )}
    </span>
  );
};
