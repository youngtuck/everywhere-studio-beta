import React, { useEffect, useRef, useState } from "react";
import { EASE } from "../../styles/marketing";

// Shared IntersectionObserver: one instance for all Reveals on a page.
const sharedCallbacks = new Map<Element, (visible: boolean) => void>();
let sharedObserver: IntersectionObserver | null = null;

function getSharedObserver() {
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const cb = sharedCallbacks.get(entry.target);
          if (cb && entry.isIntersecting) {
            cb(true);
            sharedObserver?.unobserve(entry.target);
            sharedCallbacks.delete(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
  }
  return sharedObserver;
}

export function useScrollReveal(_threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = getSharedObserver();
    sharedCallbacks.set(el, setIsVisible);
    obs.observe(el);
    return () => {
      obs.unobserve(el);
      sharedCallbacks.delete(el);
    };
  }, []);
  return { ref, isVisible };
}

export default function Reveal({
  children, delay = 0, threshold = 0.12, style,
}: {
  children: React.ReactNode;
  delay?: number;
  threshold?: number;
  style?: React.CSSProperties;
}) {
  const { ref, isVisible } = useScrollReveal(threshold);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (isVisible && !settled) {
      const t = setTimeout(() => setSettled(true), 650 + delay);
      return () => clearTimeout(t);
    }
  }, [isVisible, settled, delay]);

  return (
    <div ref={ref} style={{
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? "translate3d(0,0,0)" : "translate3d(0,28px,0)",
      transition: settled ? "none" : `opacity 0.5s ${EASE} ${delay}ms, transform 0.5s ${EASE} ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  );
}
