/**
 * Light/dark theme. Writes `data-theme` on <html> and remembers the choice;
 * index.html applies the stored theme before first paint. Every caller shares
 * the same value (overflow menu, command palette).
 */

import { useCallback, useSyncExternalStore } from 'react';

export type ThemeName = 'bench' | 'bench-dark';
export const THEME_STORAGE_KEY = 'qa-helper-theme';

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getTheme(): ThemeName {
  return document.documentElement.dataset.theme === 'bench-dark' ? 'bench-dark' : 'bench';
}

export function setTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage unavailable: the theme lasts for this page only.
  }
  listeners.forEach((listener) => listener());
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme);
  const toggleTheme = useCallback(() => setTheme(getTheme() === 'bench' ? 'bench-dark' : 'bench'), []);
  return { theme, toggleTheme };
}
