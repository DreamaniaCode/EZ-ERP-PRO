import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import fr from './locales/fr.json';
import ar from './locales/ar.json';

const initialLang = (typeof window !== 'undefined' && localStorage.getItem('erp_language')) || 'fr';
if (typeof window !== 'undefined' && !localStorage.getItem('erp_language')) {
  localStorage.setItem('erp_language', 'fr');
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      ar: { translation: ar },
    },
    lng: initialLang,
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'ar'],
    interpolation: {
      escapeValue: false,
    },
  });

// Apply RTL direction based on language
const applyDirection = (lng: string) => {
  const dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lng || 'fr');
};

applyDirection(initialLang);
i18n.on('languageChanged', applyDirection);

export default i18n;

