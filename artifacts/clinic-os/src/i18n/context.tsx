import React, { createContext, useContext, useEffect, useState } from 'react';
import en from './en';
import ar from './ar';

export type Language = 'en' | 'ar';

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isRtl: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(
    (localStorage.getItem('clinic-os-lang') as Language) || 'en'
  );

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('clinic-os-lang', newLang);
  };

  const t = (key: string, params?: Record<string, string | number>) => {
    const dict: any = lang === 'ar' ? ar : en;
    const keys = key.split('.');
    let value = dict;
    
    for (const k of keys) {
      if (value[k] === undefined) {
        // Fallback to EN
        if (lang === 'ar') {
           let enValue: any = en;
           for (const enK of keys) {
               if (enValue[enK] === undefined) return key;
               enValue = enValue[enK];
           }
           if (typeof enValue === 'string') {
             value = enValue;
             break;
           } else {
             return key;
           }
        } else {
           return key;
        }
      } else {
        value = value[k];
      }
    }
    
    if (typeof value !== 'string') return key;
    
    if (params) {
      return Object.entries(params).reduce(
        (acc, [k, v]) => acc.replace(`{{${k}}}`, String(v)),
        value
      );
    }
    return value;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t, isRtl: lang === 'ar' }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useTranslation = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used within I18nProvider');
  return ctx;
};
