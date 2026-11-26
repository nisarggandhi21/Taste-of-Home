import { createContext, useCallback, useEffect, useState } from 'react';

export const THEMES = ['light', 'dark', 'glass'];

const systemTheme = () =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

// The same choice the script in index.html makes before first paint.
const initialTheme = () => {
  try {
    const saved = localStorage.getItem('theme');
    if (THEMES.includes(saved)) return saved;
  } catch {
    // Storage can be unavailable (private mode); fall through to the system setting.
  }
  return systemTheme();
};

export const ThemeContext = createContext({ theme: 'light', setTheme: () => {} });

export const ThemeContextProvider = ({ children }) => {
  const [theme, setThemeState] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Until the visitor picks a theme themselves, follow the system setting as it changes.
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!query) return;
    const follow = () => {
      let saved = null;
      try {
        saved = localStorage.getItem('theme');
      } catch {
        // ignore
      }
      if (!THEMES.includes(saved)) setThemeState(systemTheme());
    };
    query.addEventListener('change', follow);
    return () => query.removeEventListener('change', follow);
  }, []);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      // The choice still applies for this visit.
    }
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
};
