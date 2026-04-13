import { CSSProperties } from "react";

interface Props {
  size?: number;
  style?: CSSProperties;
  className?: string;
}

export default function EverywhereMarkIcon({ size = 32, style, className }: Props) {
  return (
    <>
      <style>{`
        @keyframes evMorph {
          0% { border-radius: 50%; transform: rotate(0deg) scale(1); }
          10% { border-radius: 33% 67% 50% 50% / 43% 39% 61% 57%; transform: rotate(8deg) scale(1.03); }
          20% { border-radius: 40% 60% 70% 30% / 50% 60% 40% 50%; transform: rotate(-5deg) scale(0.97); }
          30% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: rotate(12deg) scale(1.02); }
          40% { border-radius: 50% 50% 40% 60% / 35% 65% 35% 65%; transform: rotate(-8deg) scale(0.98); }
          50% { border-radius: 35% 65% 55% 45% / 55% 45% 55% 45%; transform: rotate(3deg) scale(1.04); }
          60% { border-radius: 65% 35% 45% 55% / 40% 60% 40% 60%; transform: rotate(-12deg) scale(0.96); }
          70% { border-radius: 45% 55% 60% 40% / 65% 35% 65% 35%; transform: rotate(6deg) scale(1.01); }
          80% { border-radius: 55% 45% 35% 65% / 50% 50% 50% 50%; transform: rotate(-3deg) scale(1.03); }
          90% { border-radius: 40% 60% 50% 50% / 45% 55% 45% 55%; transform: rotate(10deg) scale(0.99); }
          100% { border-radius: 50%; transform: rotate(0deg) scale(1); }
        }
        @keyframes evColorShift {
          0%, 100% { background: #C8961A; }
          33% { background: #D4A832; }
          66% { background: #BF8A15; }
        }
        @keyframes evBreathe {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.06); opacity: 1; }
        }
      `}</style>
      <div
        className={className}
        style={{
          display: "inline-flex",
          animation: "evBreathe 4s ease-in-out infinite",
          flexShrink: 0,
          ...style,
        }}
      >
        <div
          style={{
            width: size,
            height: size,
            background: "#C8961A",
            animation: "evMorph 12s ease-in-out infinite, evColorShift 15s ease-in-out infinite",
            boxShadow: "0 0 20px rgba(200, 150, 26, 0.15)",
          }}
        />
      </div>
    </>
  );
}
