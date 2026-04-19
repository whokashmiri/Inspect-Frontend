import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import { I18nManager } from 'react-native';

import en from '../locales/en.json';
import ar from '../locales/ar.json';

const resources = {
  en: { translation: en },
  ar: { translation: ar },
};

const getLanguage = () => {
  const locales = RNLocalize.getLocales();
  return locales?.[0]?.languageCode || 'en';
};

i18n.use(initReactI18next).init({
  resources,
  lng: getLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

/* ✅ HANDLE RTL */
const handleRTL = (lng) => {
  const isRTL = lng === 'ar';

  if (I18nManager.isRTL !== isRTL) {
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);

    // ⚠️ IMPORTANT: reload app after this
  }
};

// run once on startup
handleRTL(i18n.language);

// run on language change
i18n.on('languageChanged', handleRTL);

export default i18n;