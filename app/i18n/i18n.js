import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import { I18nManager } from 'react-native';
import * as Updates from 'expo-updates';
import * as SecureStore from 'expo-secure-store';

import en from '../locales/en.json';
import ar from '../locales/ar.json';

const resources = {
  en: { translation: en },
  ar: { translation: ar },
};

let initialLanguage = 'ar'; // Default to Arabic

const getLanguage = async () => {
  try {
    // First, try to get the saved language preference
    const savedLanguage = await SecureStore.getItemAsync('app.preferredLanguage');
    if (savedLanguage === 'ar' || savedLanguage === 'en') {
      initialLanguage = savedLanguage;
      return savedLanguage;
    }
  } catch (error) {
   
  }

  // Fall back to system locale
  const locales = RNLocalize.getLocales();
  const systemLanguage = locales?.[0]?.languageCode || 'ar';
  
  if (systemLanguage === 'ar') {
    initialLanguage = 'ar';
    return 'ar';
  }
  
  initialLanguage = 'en';
  return 'en';
};

// Initialize i18n with async support
const initializeI18n = async () => {
  const language = await getLanguage();
  
  i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false,
    },
  });

  // Handle RTL setup
  await handleRTL(language);
};

/* ✅ HANDLE RTL */
const handleRTL = async (lng) => {
  const isRTL = lng === 'ar';

  if (I18nManager.isRTL !== isRTL) {
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);

    // 🚀 reload immediately
    await Updates.reloadAsync();
  }
};

// Run initialization
initializeI18n().catch((error) => {
 
  // Fallback initialization
  i18n.use(initReactI18next).init({
    resources,
    lng: 'ar',
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false,
    },
  });
});

// Listen for language changes
i18n.on('languageChanged', handleRTL);

export default i18n;