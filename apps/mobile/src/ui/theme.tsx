// থিম: লাইট / ডার্ক / সিস্টেম (§১৯.১)। রং যায় CSS ভেরিয়েবল হিসেবে (NativeWind vars),
// আর Expo Router-এর navigation theme-ও একই টোকেন থেকে।
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colorScheme as nativewindColorScheme, vars } from 'nativewind';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme, View, type ViewStyle } from 'react-native';

import { readPreference, writePreference } from '@/platform/preferences';

import { cssVariables, palettes, type ColorScheme, type Palette } from './tokens';

export type ThemeMode = 'light' | 'dark' | 'system';
export const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];
const PREF_KEY = 'theme';

type ThemeContextValue = {
  mode: ThemeMode;
  scheme: ColorScheme;
  colors: Palette;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && (THEME_MODES as readonly string[]).includes(value);
}

/** অ্যাপ চালুর আগে সেভ করা থিম পড়ে (ঝলক এড়াতে)। */
export async function loadThemeMode(): Promise<ThemeMode> {
  const saved = await readPreference(PREF_KEY);
  return isThemeMode(saved) ? saved : 'system';
}

const schemeVars: Record<ColorScheme, ReturnType<typeof vars>> = {
  light: vars(cssVariables('light')),
  dark: vars(cssVariables('dark')),
};

export function ThemeProvider({
  initialMode,
  children,
}: {
  initialMode: ThemeMode;
  children: ReactNode;
}) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(initialMode);
  const scheme: ColorScheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;

  useEffect(() => {
    // NativeWind-এর dark: ভ্যারিয়েন্টও একই অবস্থায় রাখা
    try {
      nativewindColorScheme.set(mode);
    } catch {
      // কিছু প্ল্যাটফর্মে ম্যানুয়াল সেট সমর্থিত নয়; CSS ভেরিয়েবল তবুও কাজ করে
    }
  }, [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      scheme,
      colors: palettes[scheme],
      setMode: (next) => {
        setModeState(next);
        void writePreference(PREF_KEY, next);
      },
    }),
    [mode, scheme],
  );

  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    const c = palettes[scheme];
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: c.primary,
        background: c.background,
        card: c.surface,
        text: c.text,
        border: c.border,
        notification: c.danger,
      },
    };
  }, [scheme]);

  return (
    <ThemeContext.Provider value={value}>
      <NavigationThemeProvider value={navigationTheme}>
        <View style={[{ flex: 1 }, schemeVars[scheme]]} className="bg-background">
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          {children}
        </View>
      </NavigationThemeProvider>
    </ThemeContext.Provider>
  );
}

/**
 * Modal/portal আলাদা গাছে রেন্ডার হয় (বিশেষ করে ওয়েবে), তাই সেখানে রঙের CSS ভেরিয়েবল পৌঁছায় না।
 * Modal-এর ভেতরের সবকিছু এটা দিয়ে মুড়ে দিন।
 */
export function ThemeScope({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { scheme } = useAppTheme();
  return <View style={[{ flex: 1 }, schemeVars[scheme], style]}>{children}</View>;
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used inside <ThemeProvider>');
  return ctx;
}
