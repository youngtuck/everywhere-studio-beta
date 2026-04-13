import { useTheme } from "../context/ThemeContext";

interface LogoProps {
  size?: "sm" | "md" | "lg" | number;
  onDark?: boolean;
  variant?: "dark" | "light";
  onClick?: () => void;
}

const SIZE_MAP = { sm: 20, md: 28, lg: 42 } as const;

const Logo = ({ size = "md", onDark, variant, onClick }: LogoProps) => {
  const { theme } = useTheme();

  const isDark = variant
    ? variant === "dark"
    : onDark !== undefined
      ? onDark
      : theme === "dark";

  const fs = typeof size === "number" ? size : SIZE_MAP[size];
  const tmFs = Math.max(7, Math.round(fs * 0.32));
  const studioColor = isDark ? "#F5C642" : "#1A1A1A";

  return (
    <span
      style={{
        letterSpacing: "-1px",
        fontFamily: "'Afacad Flux', sans-serif",
        display: "inline-flex",
        alignItems: "baseline",
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        whiteSpace: "nowrap",
        lineHeight: 1,
      }}
      onClick={onClick}
    >
      <span style={{ color: "#4A90D9", fontWeight: 700, fontSize: fs, textTransform: "uppercase" }}>
        EVERYWHERE
      </span>
      <span style={{ display: "inline-block", width: Math.max(2, Math.round(fs * 0.12)) }} />
      <span style={{ color: studioColor, fontWeight: 300, fontSize: fs }}>
        Studio
        <span style={{ color: studioColor, fontSize: tmFs, verticalAlign: "10px", marginLeft: 1, opacity: 0.75 }}>™</span>
      </span>
    </span>
  );
};

export default Logo;
