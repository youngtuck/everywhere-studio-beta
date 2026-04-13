import { createContext, useContext, useLayoutEffect, ReactNode } from "react";

type Theme = "light";

interface ThemeCtx {
  theme: Theme;
  toggleTheme: () => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: "light",
  toggleTheme: () => {},
  toggle: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
    try {
      localStorage.setItem("ew-theme", "light");
    } catch {
      /* ignore */
    }
  }, []);

  const theme: Theme = "light";
  const noop = () => {};
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme: noop, toggle: noop }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
