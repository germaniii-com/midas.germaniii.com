import { createContext, useContext, useState, useCallback, createElement, type ReactNode } from 'react';
import {
  PREFERENCES_KEY,
  DEFAULT_PREFERENCES,
  type Preferences,
  type NumberLocale,
  type DateFormat,
  type FirstDayOfWeek,
} from '../constants/preferences';

function loadPreferences(): Preferences {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
  } catch {}
  return { ...DEFAULT_PREFERENCES };
}

function savePreferences(prefs: Preferences) {
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
}

interface PreferencesContextType extends Preferences {
  setNumberLocale: (v: NumberLocale) => void;
  setDateFormat: (v: DateFormat) => void;
  setFirstDayOfWeek: (v: FirstDayOfWeek) => void;
  setShowMoney: (v: boolean) => void;
}

const PreferencesContext = createContext<PreferencesContextType | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(loadPreferences);

  const update = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      savePreferences(next);
      return next;
    });
  }, []);

  const setNumberLocale = useCallback((v: NumberLocale) => update('numberLocale', v), [update]);
  const setDateFormat = useCallback((v: DateFormat) => update('dateFormat', v), [update]);
  const setFirstDayOfWeek = useCallback((v: FirstDayOfWeek) => update('firstDayOfWeek', v), [update]);
  const setShowMoney = useCallback((v: boolean) => update('showMoney', v), [update]);

  return createElement(
    PreferencesContext.Provider,
    { value: { ...prefs, setNumberLocale, setDateFormat, setFirstDayOfWeek, setShowMoney } },
    children,
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within a PreferencesProvider');
  return ctx;
}
