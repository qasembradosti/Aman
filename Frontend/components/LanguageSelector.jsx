import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/ThemeContext";
import { useLanguage } from "../utils/LanguageContext";
import Dialog from "./ui/Dialog";
import { Text } from "./ui/Text";

export default function LanguageSelector({ visible, onClose }) {
  const { locale, changeLanguage, t } = useLanguage();
  const { theme } = useTheme();

  const languages = [
    { code: "en", name: "English", nativeName: "English" },
    { code: "ar", name: "Arabic", nativeName: "العربية" },
    { code: "ku", name: "Kurdish", nativeName: "کوردی" },
  ];

  const handleLanguageSelect = async (langCode) => {
    if (langCode !== locale) {
      await changeLanguage(langCode);
      onClose();
    } else {
      onClose();
    }
  };

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={t("selectLanguage") || "Select Language"}
      presentation="center"
    >
      <View style={{ paddingBottom: 8 }}>
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.languageItem,
              locale === lang.code && styles.selectedLanguage,
            ]}
            onPress={() => handleLanguageSelect(lang.code)}
            activeOpacity={0.8}
          >
            <View style={styles.languageInfo}>
              <View>
                <Text
                  style={[styles.languageName, { color: theme.colors.text }]}
                >
                  {lang.name}
                </Text>
                <Text
                  style={[
                    styles.nativeName,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {lang.nativeName}
                </Text>
              </View>
            </View>
            {locale === lang.code && (
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={theme.colors.primary}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  languageItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e9e9ef",
  },
  selectedLanguage: {
    backgroundColor: "#F4F5FF",
  },
  languageInfo: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    gap: 12,
  },
  flag: {
    fontSize: 28,
  },
  languageName: {
    fontSize: 16,
    marginBottom: 2,
  },
  nativeName: {
    fontSize: 14,
  },
});
