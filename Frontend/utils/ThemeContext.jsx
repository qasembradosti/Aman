import { createContext, useContext, useState, useEffect } from "react";
import { Colors } from "../constants/Colors";
import AsyncStorage from "@react-native-async-storage/async-storage";

const defaultTheme = {
  isDark: false,
  colors: {
    ...Colors.light,
    primary: Colors.primary,
    secondary: Colors.secondary,
    accent: Colors.accent,
    success: Colors.success,
    warning: Colors.warning,
    danger: Colors.danger,
    info: Colors.info,
  },
};

export const defaultThemeContextValue = {
  theme: defaultTheme,
  toggleTheme: async () => {},
  isDark: false,
};

export const ThemeContext = createContext(defaultThemeContextValue);

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("@app_theme");
      if (savedTheme !== null) {
        setIsDark(savedTheme === "dark");
      }
    } catch (error) {
      console.error("Error loading theme:", error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDark;
      setIsDark(newTheme);
      await AsyncStorage.setItem("@app_theme", newTheme ? "dark" : "light");
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  };

  const theme = {
    isDark,
    colors: isDark
      ? {
          // Dark mode colors from centralized Colors
          ...Colors.dark,
          primary: Colors.primary,
          secondary: Colors.secondary,
          accent: Colors.accent,
          success: Colors.success,
          warning: Colors.warning,
          danger: Colors.danger,
          info: Colors.info,
        }
      : {
          // Light mode colors from centralized Colors
          ...Colors.light,
          primary: Colors.primary,
          secondary: Colors.secondary,
          accent: Colors.accent,
          success: Colors.success,
          warning: Colors.warning,
          danger: Colors.danger,
          info: Colors.info,
        },
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  return useContext(ThemeContext);
};
