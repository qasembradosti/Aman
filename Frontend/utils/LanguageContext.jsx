import { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18nManager, DevSettings, Platform } from "react-native";
import * as Updates from "expo-updates";
import { translations } from "./translations";
import { getFontFamily } from "./fonts";

const defaultLocale = "en";
const defaultFonts = getFontFamily(defaultLocale);

export const defaultLanguageContextValue = {
  locale: defaultLocale,
  changeLanguage: async () => {},
  t: (key) => translations[defaultLocale]?.[key] || key,
  isRTL: false,
  fontFamily: defaultFonts,
  fontFamilyName: defaultFonts?.regular,
};

export const LanguageContext = createContext(defaultLanguageContextValue);

export const LanguageProvider = ({ children }) => {
  const [locale, setLocale] = useState("en");
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      // First, enable RTL support globally
      I18nManager.allowRTL(true);

      const savedLanguage = await AsyncStorage.getItem("@app_language");

      if (savedLanguage) {
        const shouldBeRTL = savedLanguage === "ar" || savedLanguage === "ku";
        setLocale(savedLanguage);
        setIsRTL(shouldBeRTL);

        // If the current native RTL setting doesn't match desired, toggle and reload app
        if (I18nManager.isRTL !== shouldBeRTL) {
          I18nManager.allowRTL(true);
          I18nManager.forceRTL(shouldBeRTL);
          // A full app reload is required for RTL changes to take effect safely
          await reloadAppSafely();
        }
      } else {
        // Default to English (LTR)
        console.log("No saved language, using default (en)");
      }
    } catch (error) {
      console.error("Error loading language:", error);
    }
  };

  const changeLanguage = async (newLocale) => {
    try {
      // Save to storage
      await AsyncStorage.setItem("@app_language", newLocale);

      const shouldBeRTL = newLocale === "ar" || newLocale === "ku";

      // Update native RTL flag (takes full effect on next cold start,
      // but all UI already uses the isRTL state flag so no reload needed)
      if (I18nManager.isRTL !== shouldBeRTL) {
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(shouldBeRTL);
      }

      // Update state — re-renders all components with correct translations + direction
      setLocale(newLocale);
      setIsRTL(shouldBeRTL);

      console.log("Language changed successfully");
    } catch (error) {
      console.error("Error changing language:", error);
    }
  };

  // Reload helper that works in dev and prod without noisy warnings
  const reloadAppSafely = async () => {
    // Web: just do a dev reload
    if (Platform.OS === "web") {
      try {
        DevSettings.reload();
      } catch (_e) {
        // ignore
      }
      return;
    }

    // In development (Expo Go / Metro), prefer DevSettings.reload
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      try {
        DevSettings.reload();
        return;
      } catch (_e) {
        // ignore and continue to try Updates.reloadAsync
      }
    }

    // Production-like: try Updates.reloadAsync()
    try {
      if (typeof Updates?.reloadAsync === "function") {
        await Updates.reloadAsync();
        return;
      }
    } catch (_e) {
      // Avoid logging native error details that can be noisy in dev
      // Fallback below
    }

    // Final fallback
    try {
      DevSettings.reload();
    } catch (_e) {
      // ignore
    }
  };

  const t = (key) => {
    return translations[locale]?.[key] || translations.en[key] || key;
  };

  // Get font family config based on current locale
  const fonts = getFontFamily(locale);
  const fontFamilyName = fonts?.regular;

  return (
    <LanguageContext.Provider
      value={{ locale, changeLanguage, t, isRTL, fontFamily: fonts, fontFamilyName }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  return useContext(LanguageContext);
};
