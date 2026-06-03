import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import { dark, light, type ThemeColors } from "./tokens";

type ThemeValue = { colors: ThemeColors; isDark: boolean; toggle: () => void };

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [override, setOverride] = useState<boolean | null>(null);
  const isDark = override ?? system === "dark";

  const value = useMemo<ThemeValue>(
    () => ({
      colors: isDark ? dark : light,
      isDark,
      toggle: () => setOverride((prev) => !(prev ?? isDark)),
    }),
    [isDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
