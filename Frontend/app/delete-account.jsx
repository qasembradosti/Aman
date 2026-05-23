import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearError, deleteAccount } from "../store/slices/authSlice";
import { useLanguage } from "../utils/LanguageContext";
import { useTheme } from "../utils/ThemeContext";
import { Text } from "../components/ui/Text";
import Input from "../components/ui/Input";

export default function DeleteAccountScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { t, isRTL } = useLanguage();
  const { theme } = useTheme();
  const { loading, error } = useSelector((state) => state.auth);

  const [currentPassword, setCurrentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleDeleteAccount = () => {
    if (!currentPassword.trim()) {
      Alert.alert(
        t("validationError") || "Validation Error",
        t("currentPasswordRequired") || "Current password is required"
      );
      return;
    }

    Alert.alert(
      t("deleteAccountConfirmTitle"),
      t("deleteAccountConfirmMessage"),
      [
        {
          text: t("cancel") || "Cancel",
          style: "cancel",
        },
        {
          text: t("deleteAccountConfirmButton"),
          style: "destructive",
          onPress: async () => {
            try {
              await dispatch(deleteAccount({ currentPassword })).unwrap();
              router.replace("/(tabs)/home");
            } catch (deleteError) {
              Alert.alert(
                t("error") || "Error",
                deleteError || t("deleteAccountFailed") || "Failed to delete account"
              );
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.colors.card,
              flexDirection: isRTL ? "row-reverse" : "row",
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerButton}
          >
            <Ionicons
              name={"chevron-back"}
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {t("deleteAccount")}
          </Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.warningSection}>
            <Ionicons
              name="warning-outline"
              size={24}
              color="#D92D20"
            />
            <Text
              style={[styles.warningText, { color: theme.colors.textSecondary }]}
            >
              {t("deleteAccountPasswordInfo") ||
                "Enter your current password to permanently delete your account. This action cannot be undone."}
            </Text>
          </View>

          <View
            style={[
              styles.formCard,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              {t("currentPassword") || "Current Password"}
            </Text>
            <View style={styles.passwordInputContainer}>
              <Input
                style={[
                  styles.input,
                  {
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder={t("enterCurrentPassword") || "Enter current password"}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword((prev) => !prev)}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#FF3B30" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.deleteButton,
              loading && styles.deleteButtonDisabled,
            ]}
            onPress={handleDeleteAccount}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.deleteButtonText}>
                {t("deleteAccountConfirmButton")}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e0e0e0",
  },
  headerButton: {
    padding: 8,
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 18,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  warningSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#FFF1F0",
    borderRadius: 14,
    padding: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  formCard: {
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  label: {
    fontSize: 14,
  },
  passwordInputContainer: {
    position: "relative",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    paddingRight: 50,
  },
  eyeIcon: {
    position: "absolute",
    right: 14,
    top: 12,
    padding: 4,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFE5E5",
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: "#FF3B30",
  },
  deleteButton: {
    marginTop: 8,
    backgroundColor: "#D92D20",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
  },
});
