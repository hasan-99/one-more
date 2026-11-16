import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { Platform, useColorScheme } from 'react-native';

import { loadLocale, translations, type Locale } from '@/i18n';
import { useToast } from '@/components/toast/ToastProvider';
import { themeTokens, type ThemeColors, type ThemeMode } from '@/theme/tokens';

export type ThemePreference = 'system' | ThemeMode;

type AppPreferences = {
  themePreference: ThemePreference;
  theme: ThemeMode;
  colors: ThemeColors;
  locale: Locale;
  preferencesReady: boolean;
  setThemePreference: (value: ThemePreference) => void;
  setLocale: (value: Locale) => void;
};

const THEME_KEY = 'one-more.theme';
const LOCALE_KEY = 'one-more.locale';
const PreferencesContext = createContext<AppPreferences | null>(null);

export function AppPreferencesProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const pathname = usePathname();
  const { showToast } = useToast();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [locale, setLocaleState] = useState<Locale>('en');
  const [preferencesReady, setPreferencesReady] = useState(false);
  const theme: ThemeMode =
    themePreference === 'system' ? (systemScheme ?? 'dark') : themePreference;
  const colors = themeTokens[theme];

  useEffect(() => {
    let active = true;
    void Promise.all([AsyncStorage.getItem(THEME_KEY), AsyncStorage.getItem(LOCALE_KEY)])
      .then(async ([savedTheme, savedLocale]) => {
        // Greek copy is loaded on demand: wait for it before showing the saved Greek locale.
        if (savedLocale === 'el') await loadLocale('el');
        if (!active) return;
        if (savedTheme === 'system' || savedTheme === 'dark' || savedTheme === 'light') {
          setThemePreferenceState(savedTheme);
        }
        if (savedLocale === 'en' || savedLocale === 'el') setLocaleState(savedLocale);
        setPreferencesReady(true);
      })
      .catch(() => {
        if (active) {
          showToast(translations.en.preferencesSavedError, 'error');
          setPreferencesReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [showToast]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const root = document.documentElement;
    root.lang = locale;
    root.style.colorScheme = theme;
    root.style.setProperty('--app-background', colors.background);
    root.style.setProperty('--app-text', colors.textPrimary);
    root.style.setProperty('--app-focus', colors.focusRing);
    root.style.setProperty('--app-border', colors.border);
    document.body.style.backgroundColor = colors.background;
    document.body.style.color = colors.textPrimary;
    return () => {
      root.style.removeProperty('--app-background');
      root.style.removeProperty('--app-text');
      root.style.removeProperty('--app-focus');
      root.style.removeProperty('--app-border');
    };
  }, [colors.background, colors.border, colors.focusRing, colors.textPrimary, locale, theme]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.title =
      pathname === '/design-review' ? 'ONE MORE. · Design review' : 'ONE MORE. · Find your game';
  }, [pathname]);

  const setThemePreference = useCallback(
    (value: ThemePreference) => {
      if (value === themePreference) return;
      setThemePreferenceState(value);
      void AsyncStorage.setItem(THEME_KEY, value)
        .then(() => showToast(translations[locale].preferencesThemeSaved, 'success'))
        .catch(() => showToast(translations[locale].preferencesSavedError, 'error'));
    },
    [locale, showToast, themePreference],
  );
  const setLocale = useCallback(
    (value: Locale) => {
      if (value === locale) return;
      void loadLocale(value)
        .then(() => {
          setLocaleState(value);
          return AsyncStorage.setItem(LOCALE_KEY, value);
        })
        .then(() => showToast(translations[value].preferencesLanguageSaved, 'success'))
        .catch(() => showToast(translations[value].preferencesSavedError, 'error'));
    },
    [locale, showToast],
  );

  const value = useMemo(
    () => ({
      themePreference,
      theme,
      colors,
      locale,
      preferencesReady,
      setThemePreference,
      setLocale,
    }),
    [themePreference, theme, colors, locale, preferencesReady, setThemePreference, setLocale],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useAppPreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('useAppPreferences must be used inside AppPreferencesProvider');
  return value;
}
