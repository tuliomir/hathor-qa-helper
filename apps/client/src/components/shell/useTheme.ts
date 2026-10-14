/**
 * Light/dark theme toggle. Writes `data-theme` on <html> and remembers the
 * choice; index.html applies the stored theme before first paint.
 */

import { useCallback, useEffect, useState } from 'react';

export type ThemeName = 'bench' | 'bench-dark';
export const THEME_STORAGE_KEY = 'qa-helper-theme';

function currentTheme(): ThemeName {
  return document.documentElement.dataset.theme === 'bench-dark' ? 'bench-dark' : 'bench';
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeName>(currentTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage unavailable: the theme lasts for this page only.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'bench' ? 'bench-dark' : 'bench')), []);
  return { theme, toggleTheme };
}
