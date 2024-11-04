import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enTranslation from "./locales/en.json";
import fiTranslation from "./locales/fi.json";

const initI18n = async (): Promise<void> => {
  try {
    await i18n
      .use(initReactI18next) // passes i18n down to react-i18next
      .init({
        resources: {
          en: { translation: enTranslation },
          fi: { translation: fiTranslation }
        },
        lng: "fi", // default language
        fallbackLng: "fi", // fallback language
        interpolation: {
          escapeValue: false
        }
      });
  } catch (error) {
    console.error("Error initializing i18n:", error);
  }
};

// Explicitly call the async function
void initI18n();

export default i18n;
