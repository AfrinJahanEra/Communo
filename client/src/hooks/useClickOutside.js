import { useEffect, useRef } from "react";

/** Calls `onOutside` when a pointer-down lands outside the returned ref. */
export const useClickOutside = (onOutside, active = true) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!active) return undefined;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onOutside?.();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOutside, active]);
  return ref;
};
