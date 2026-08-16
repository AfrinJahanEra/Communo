import { useNavigate, useLocation, useResolvedPath } from "react-router-dom";

/**
 * Button-based stand-in for react-router's `NavLink`/`Link`, used for
 * internal app navigation (sidebar/rail items). It matches the familiar
 * `to` / `end` / `onClick` / render-prop `className` API, but renders a
 * real `<button>` instead of an `<a href>` — so hovering it doesn't reveal
 * the target route in the browser's status bar.
 */
export const NavButton = ({ to, end = false, onClick, className, children, ...rest }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname: targetPath } = useResolvedPath(to);

  const isActive = end
    ? location.pathname === targetPath
    : location.pathname === targetPath || location.pathname.startsWith(`${targetPath}/`);

  return (
    <button
      type="button"
      onClick={(e) => {
        onClick?.(e);
        navigate(to);
      }}
      className={typeof className === "function" ? className({ isActive }) : className}
      {...rest}
    >
      {children}
    </button>
  );
};
