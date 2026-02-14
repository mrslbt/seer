import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { en, ja } from './index';
import type { TranslationKey } from './en';

export type Language = 'en' | 'ja';

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'EN',
  ja: 'JA',
};

const translations: Record<Language, Record<TranslationKey, string>> = { en, ja };

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
});

const STORAGE_KEY = 'seer-lang';

function getSavedLang(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'ja') return saved;
  } catch {}
  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(getSavedLang);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    try { localStorage.setItem(STORAGE_KEY, newLang); } catch {}
    document.documentElement.lang = newLang;
  }, []);

  // Sync lang attribute on initial mount
  useEffect(() => {
    document.documentElement.lang = lang;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>): string => {
    let text = translations[lang][key] ?? translations.en[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
