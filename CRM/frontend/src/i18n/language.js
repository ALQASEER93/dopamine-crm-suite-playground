export const LANGUAGE_STORAGE_KEY = 'dpm.language';

export const LANGUAGES = {
  ar: { code: 'ar', label: 'العربية', dir: 'rtl' },
  en: { code: 'en', label: 'English', dir: 'ltr' },
};

export const resolveInitialLanguage = () => {
  if (typeof window === 'undefined') return 'ar';
  try {
    const stored = window.localStorage?.getItem(LANGUAGE_STORAGE_KEY);
    return stored === 'en' ? 'en' : 'ar';
  } catch (_error) {
    return 'ar';
  }
};

export const applyDocumentLanguage = language => {
  const resolved = language === 'en' ? LANGUAGES.en : LANGUAGES.ar;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = resolved.code;
    document.documentElement.dir = resolved.dir;
  }
  return resolved;
};
