import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Text as RNText,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { changePassword, clearError } from "../store/slices/authSlice";
import { useLanguage } from "../utils/LanguageContext";
import { useTheme } from "../utils/ThemeContext";
import Input from "../components/ui/Input";

// Custom Text component with font
const Text = ({ style, ...props }) => {
  const { fontFamily } = useLanguage();
  return (
    <RNText
      style={[
        fontFamily?.regular ? { fontFamily: fontFamily.regular } : {},
        style,
      ]}
      {...props}
    />
  );
};

export default function ChangePassword() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { t, isRTL } = useLanguage();
  const { theme } = useTheme();
  const { loading, error } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [touched, setTouched] = useState({});

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleBlur = (field) => {
    setTouched({ ...touched, [field]: true });
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords({ ...showPasswords, [field]: !showPasswords[field] });
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.currentPassword) {
      errors.push(
        t("currentPasswordRequired") || "Current password is required"
      );
    }

    if (!formData.newPassword) {
      errors.push(t("newPasswordRequired") || "New password is required");
    } else if (formData.newPassword.length < 6) {
      errors.push(
        t("passwordMinLength") || "Password must be at least 6 characters"
      );
    }

    if (!formData.confirmPassword) {
      errors.push(
        t("confirmPasswordRequired") || "Confirm password is required"
      );
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors.push(t("passwordsDoNotMatch") || "Passwords do not match");
    }

    if (formData.currentPassword === formData.newPassword) {
      errors.push(
        t("newPasswordSameAsCurrent") ||
          "New password must be different from current password"
      );
    }

    return errors;
  };

  const handleSave = async () => {
    const validationErrors = validateForm();

    if (validationErrors.length > 0) {
      Alert.alert(
        t("validationError") || "Validation Error",
        validationErrors.join("\n")
      );
      return;
    }

    try {
      await dispatch(
        changePassword({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        })
      ).unwrap();

      Alert.alert(
        t("success") || "Success",
        t("passwordChanged") || "Password changed successfully",
        [
          {
            text: t("ok") || "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err) {
      Alert.alert(
        t("error") || "Error",
        err || t("passwordChangeFailed") || "Failed to change password"
      );
    }
  };

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: "", color: "#e0e0e0" };

    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    const labels = [
      "",
      t("weak") || "Weak",
      t("fair") || "Fair",
      t("good") || "Good",
      t("strong") || "Strong",
      t("veryStrong") || "Very Strong",
    ];

    const colors = [
      "#e0e0e0",
      "#FF3B30",
      "#FF9500",
      "#FFCC00",
      "#34C759",
      "#34C759",
    ];

    return {
      strength,
      label: labels[strength],
      color: colors[strength],
    };
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* Header */}
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
              name={isRTL ? "chevron-forward" : "chevron-back"}
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {t("changePassword") || "Change Password"}
          </Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView style={styles.scrollView}>
          {/* Info Section */}
          <View style={styles.infoSection}>
            <Ionicons
              name="information-circle-outline"
              size={24}
              color={theme.colors.primary}
            />
            <Text
              style={[styles.infoText, { color: theme.colors.textSecondary }]}
            >
              {t("passwordChangeInfo") ||
                "Your password must be at least 6 characters long and contain a mix of letters, numbers, and symbols for better security."}
            </Text>
          </View>
          {/* Form */}
          <View
            style={[
              styles.formContainer,
              { backgroundColor: theme.colors.card },
            ]}
          >
            {/* Current Password */}
            <View style={styles.inputGroup}>
              <Text
                style={[styles.label, { color: theme.colors.textSecondary }]}
              >
                {t("currentPassword") || "Current Password"}
              </Text>
              <View style={styles.passwordInputContainer}>
                <Input
                  style={[
                    styles.input,
                    styles.passwordInput,
                    {
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                      textAlign: isRTL ? "right" : "left",
                    },
                  ]}
                  value={formData.currentPassword}
                  onChangeText={(value) =>
                    handleInputChange("currentPassword", value)
                  }
                  onBlur={() => handleBlur("currentPassword")}
                  placeholder={
                    t("enterCurrentPassword") || "Enter current password"
                  }
                  secureTextEntry={!showPasswords.current}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => togglePasswordVisibility("current")}
                >
                  <Ionicons
                    name={
                      showPasswords.current ? "eye-off-outline" : "eye-outline"
                    }
                    size={22}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* New Password */}
            <View style={styles.inputGroup}>
              <Text
                style={[styles.label, { color: theme.colors.textSecondary }]}
              >
                {t("newPassword") || "New Password"}
              </Text>
              <View style={styles.passwordInputContainer}>
                <Input
                  style={[
                    styles.input,
                    styles.passwordInput,
                    {
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                      textAlign: isRTL ? "right" : "left",
                    },
                  ]}
                  value={formData.newPassword}
                  onChangeText={(value) =>
                    handleInputChange("newPassword", value)
                  }
                  onBlur={() => handleBlur("newPassword")}
                  placeholder={t("enterNewPassword") || "Enter new password"}
                  secureTextEntry={!showPasswords.new}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => togglePasswordVisibility("new")}
                >
                  <Ionicons
                    name={showPasswords.new ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Password Strength Indicator */}
              {formData.newPassword.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBarContainer}>
                    <View
                      style={[
                        styles.strengthBar,
                        {
                          width: `${(passwordStrength.strength / 5) * 100}%`,
                          backgroundColor: passwordStrength.color,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.strengthLabel,
                      { color: passwordStrength.color },
                    ]}
                  >
                    {passwordStrength.label}
                  </Text>
                </View>
              )}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text
                style={[styles.label, { color: theme.colors.textSecondary }]}
              >
                {t("confirmPassword") || "Confirm New Password"}
              </Text>
              <View style={styles.passwordInputContainer}>
                <Input
                  style={[
                    styles.input,
                    styles.passwordInput,
                    {
                      color: theme.colors.text,
                      borderColor:
                        touched.confirmPassword &&
                        formData.confirmPassword &&
                        formData.newPassword !== formData.confirmPassword
                          ? "#FF3B30"
                          : theme.colors.border,
                      textAlign: isRTL ? "right" : "left",
                    },
                  ]}
                  value={formData.confirmPassword}
                  onChangeText={(value) =>
                    handleInputChange("confirmPassword", value)
                  }
                  onBlur={() => handleBlur("confirmPassword")}
                  placeholder={
                    t("confirmNewPassword") || "Confirm new password"
                  }
                  secureTextEntry={!showPasswords.confirm}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => togglePasswordVisibility("confirm")}
                >
                  <Ionicons
                    name={
                      showPasswords.confirm ? "eye-off-outline" : "eye-outline"
                    }
                    size={22}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {touched.confirmPassword &&
                formData.confirmPassword &&
                formData.newPassword !== formData.confirmPassword && (
                  <Text style={styles.errorHelperText}>
                    {t("passwordsDoNotMatch") || "Passwords do not match"}
                  </Text>
                )}
            </View>
          </View>

          {/* Error Display */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#FF3B30" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: theme.colors.primary },
              loading && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>
                {t("changePassword") || "Change Password"}
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
    backgroundColor: "#f5f5f5",
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerButton: {
    padding: 8,
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 18,
    
    color: "#1a1a1a",
  },
  scrollView: {
    flex: 1,
  },
  infoSection: {
    flexDirection: "row",
    backgroundColor: "#E8F5E9",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    marginLeft: 12,
    lineHeight: 20,
  },
  formContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    
    color: "#666",
    marginBottom: 8,
  },
  passwordInputContainer: {
    position: "relative",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1a1a1a",
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: "absolute",
    right: 16,
    top: 12,
    padding: 4,
  },
  strengthContainer: {
    marginTop: 8,
  },
  strengthBarContainer: {
    height: 4,
    backgroundColor: "#e0e0e0",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 4,
  },
  strengthBar: {
    height: "100%",
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    
    marginTop: 4,
  },
  errorHelperText: {
    fontSize: 12,
    color: "#FF3B30",
    marginTop: 4,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFE5E5",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#FF3B30",
    marginLeft: 8,
    flex: 1,
  },
  saveButton: {
    marginHorizontal: 16,
    marginBottom: 32,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    
  },
});
