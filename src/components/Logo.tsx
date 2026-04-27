import { useTheme } from "../context/ThemeContext";

interface LogoProps {
  size?: "sm" | "md" | "lg" | number;
  onDark?: boolean;
  variant?: "dark" | "light" | "lockup";
  onClick?: () => void;
}

const SIZE_MAP = { sm: 20, md: 28, lg: 42 } as const;

const Logo = ({ size = "md", onDark, variant, onClick }: LogoProps) => {
  const { theme } = useTheme();

  const isLockup = variant === "lockup";
  const isDark = variant === "lockup"
    ? true
    : variant
      ? variant === "dark"
      : onDark !== undefined
        ? onDark
        : theme === "dark";

  const fs = typeof size === "number" ? size : SIZE_MAP[size];
  const showTm = fs >= 18;
  const tmFs = Math.max(7, Math.round(fs * 0.30));
  const taglineFs = Math.max(10, Math.round(fs * 0.38));
  const color = isDark ? "#FFFFFF" : "#0D1B2A";

  return (
    <span
      style={{
        letterSpacing: "-0.08em",
        fontFamily: "'Inter', sans-serif",
        display: "inline-flex",
        flexDirection: isLockup ? "column" : "row",
        alignItems: isLockup ? "flex-start" : "baseline",
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        whiteSpace: "nowrap",
        lineHeight: 1,
      }}
      onClick={onClick}
    >
      <span style={{ display: "inline-flex", alignItems: "baseline" }}>
        <span style={{ color, fontWeight: 400, fontSize: fs }}>
          Ideas
        </span>
        <span style={{ color, fontWeight: 600, fontSize: fs, position: "relative" }}>
          Out
          {showTm && (
            <span style={{
              color,
              fontSize: tmFs,
              fontWeight: 400,
              position: "absolute",
              top: "0.1em",
              right: Math.round(fs * -0.48),
              lineHeight: 1,
              letterSpacing: "0.02em",
              opacity: 0.65,
            }}>TM</span>
          )}
        </span>
      </span>
      {isLockup && (
        <span style={{
          color,
          fontWeight: 200,
          fontSize: taglineFs,
          letterSpacing: "-0.04em",
          marginTop: Math.max(4, Math.round(fs * 0.14)),
          opacity: 0.75,
          whiteSpace: "nowrap",
        }}>
          Out of your head and into the world.
        </span>
      )}
    </span>
  );
};

export default Logo;
