import { Code2 } from "lucide-react";
import { cn } from "../lib/utils";

export const Logo = ({ size = "md", withText = true, className, textClassName }) => {
  const box = size === "lg" ? "h-11 w-11 rounded-2xl" : "h-8 w-8 rounded-xl";
  const icon = size === "lg" ? 24 : 18;
  const text = size === "lg" ? "text-2xl" : "text-lg";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className={cn("flex items-center justify-center bg-lav-500 text-white shadow-sm", box)}>
        <Code2 size={icon} />
      </span>
      {withText && (
        <span className={cn("font-extrabold tracking-tight text-ink-900", text, textClassName)}>
          CodeCord
        </span>
      )}
    </span>
  );
};
