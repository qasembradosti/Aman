import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
import { updateProfile, clearError } from "../store/slices/authSlice";
import { useLanguage } from "../utils/LanguageContext";
import { useTheme } from "../utils/ThemeContext";

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

const toLocalIraqPhoneDigits = (value = "") => {
  let digits = String(value ?? "").replace(/\D/g, "");

  if (digits.startsWith("00964")) {
    digits = digits.slice(5);
  } else if (digits.startsWith("964")) {
    digits = digits.slice(3);
  }

  if (digits.startsWith("07")) {
    digits = digits.slice(1);
  }

  return digits;
};

const formatLocalPhone = (digits = "") => {
  if (!digits) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
};

export default function EditProfile() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { t, isRTL } = useLanguage();
  const { theme } = useTheme();
  const { user, loading, error } = useSelector((state) => state.auth);

  // Form state
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });

  const [touched, setTouched] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        phone: formatLocalPhone(toLocalIraqPhoneDigits(user.phone || "")),
      });
    }
  }, [user]);

  // Track changes
  useEffect(() => {
    if (user) {
      const formPhoneDigits = toLocalIraqPhoneDigits(formData.phone || "");
      const userPhoneDigits = toLocalIraqPhoneDigits(user.phone || "");

      const changed =
        formData.first_name !== (user.first_name || "") ||
        formData.last_name !== (user.last_name || "") ||
        formData.email !== (user.email || "") ||
        formPhoneDigits !== userPhoneDigits;
      setHasChanges(changed);
    }
  }, [formData, user]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleInputChange = (field, value) => {
    if (field === "phone") {
      let digits = toLocalIraqPhoneDigits(value);

      if (!digits) {
        setFormData({ ...formData, phone: "" });
        return;
      }

      // Only Iraqi mobile local format: 7XXXXXXXXX
      if (digits[0] !== "7") {
        return;
      }

      if (digits.length > 10) {
        digits = digits.slice(0, 10);
      }

      setFormData({ ...formData, phone: formatLocalPhone(digits) });
      return;
    }
    setFormData({ ...formData, [field]: value });
  };

  const handleBlur = (field) => {
    setTouched({ ...touched, [field]: true });
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.first_name.trim()) {
      errors.push(t("firstNameRequired") || "First name is required");
    }

    if (!formData.last_name.trim()) {
      errors.push(t("lastNameRequired") || "Last name is required");
    }

    if (!formData.email.trim()) {
      errors.push(t("emailRequired") || "Email is required");
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.push(t("invalidEmail") || "Invalid email format");
    }

    if (formData.phone?.trim()) {
      const digits = toLocalIraqPhoneDigits(formData.phone);
      if (!/^7\d{9}$/.test(digits)) {
        errors.push(
          t("invalidPhone") ||
            "Invalid phone format. Use 7XX XXX XXXX (or +9647XXXXXXXX)",
        );
      }
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

    if (!hasChanges) {
      Alert.alert(
        t("noChanges") || "No Changes",
        t("noChangesMessage") || "You haven't made any changes to save."
      );
      return;
    }

    try {
      const phoneDigits = toLocalIraqPhoneDigits(formData.phone);
      const payload = {
        ...formData,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone: phoneDigits ? phoneDigits : "",
      };

      await dispatch(updateProfile(payload)).unwrap();
      Alert.alert(
        t("success") || "Success",
        t("profileUpdated") || "Profile updated successfully",
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
        err || t("profileUpdateFailed") || "Failed to update profile"
      );
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        t("discardChanges") || "Discard Changes?",
        t("discardChangesMessage") ||
          "You have unsaved changes. Are you sure you want to go back?",
        [
          {
            text: t("cancel") || "Cancel",
            style: "cancel",
          },
          {
            text: t("discard") || "Discard",
            style: "destructive",
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
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
            onPress={handleCancel}
            style={styles.headerButton}
          >
            <Ionicons
              name={isRTL ? "chevron-forward" : "chevron-back"}
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {t("editProfile") || "Edit Profile"}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.headerButton}
            disabled={loading || !hasChanges}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text
                style={[
                  styles.saveButtonText,
                  {
                    color: hasChanges
                      ? theme.colors.primary
                      : theme.colors.textSecondary,
                  },
                ]}
              >
                {t("save") || "Save"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView}>
          {/* Profile Picture Section */}
          <View style={styles.avatarSection}>
            <View
              style={[
                styles.avatar,
                { borderColor: theme.colors.primary },
              ]}
            >
              <Ionicons
                name="person"
                size={50}
                color={theme.colors.primary}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.changePhotoButton,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.changePhotoText}>
                {t("changePhoto") || "Change Photo"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View
            style={[
              styles.formContainer,
              { backgroundColor: theme.colors.card },
            ]}
          >
            {/* First Name */}
            <View style={styles.inputGroup}>
              <Text
                style={[
                  styles.label,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t("firstName") || "First Name"}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
                value={formData.first_name}
                onChangeText={(value) =>
                  handleInputChange("first_name", value)
                }
                onBlur={() => handleBlur("first_name")}
                placeholder={t("enterFirstName") || "Enter first name"}
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            {/* Last Name */}
            <View style={styles.inputGroup}>
              <Text
                style={[
                  styles.label,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t("lastName") || "Last Name"}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
                value={formData.last_name}
                onChangeText={(value) =>
                  handleInputChange("last_name", value)
                }
                onBlur={() => handleBlur("last_name")}
                placeholder={t("enterLastName") || "Enter last name"}
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text
                style={[
                  styles.label,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t("email") || "Email"}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
                value={formData.email}
                onChangeText={(value) => handleInputChange("email", value)}
                onBlur={() => handleBlur("email")}
                placeholder={t("enterEmail") || "Enter email"}
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text
                style={[
                  styles.label,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t("phone") || "Phone Number"}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
                value={formData.phone}
                onChangeText={(value) => handleInputChange("phone", value)}
                onBlur={() => handleBlur("phone")}
                placeholder={t("enterPhone") || "Enter phone number"}
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>

            {/* Username (Read-only) */}
            <View style={styles.inputGroup}>
              <Text
                style={[
                  styles.label,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t("username") || "Username"}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.readOnlyInput,
                  {
                    color: theme.colors.textSecondary,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.background,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
                value={user?.username || ""}
                editable={false}
              />
              <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
                {t("usernameCannotBeChanged") || "Username cannot be changed"}
              </Text>
            </View>
          </View>

          {/* Change Password Button */}
          <TouchableOpacity
            style={[
              styles.changePasswordButton,
              { backgroundColor: theme.colors.card },
            ]}
            onPress={() => router.push("/change-password")}
          >
            <View
              style={[
                styles.changePasswordContent,
                { flexDirection: isRTL ? "row-reverse" : "row" },
              ]}
            >
              <View
                style={[
                  styles.changePasswordIcon,
                  { backgroundColor: theme.colors.primary + "20" },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={24}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.changePasswordTextContainer}>
                <Text
                  style={[
                    styles.changePasswordTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  {t("changePassword") || "Change Password"}
                </Text>
                <Text
                  style={[
                    styles.changePasswordSubtitle,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t("updateYourPassword") || "Update your account password"}
                </Text>
              </View>
              <Ionicons
                name={isRTL ? "chevron-back" : "chevron-forward"}
                size={20}
                color={theme.colors.textSecondary}
              />
            </View>
          </TouchableOpacity>

          {/* Error Display */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#FF3B30" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
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
  saveButtonText: {
    fontSize: 16,
    
  },
  scrollView: {
    flex: 1,
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E8E9F8",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    marginBottom: 16,
  },
  changePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  changePhotoText: {
    color: "#fff",
    fontSize: 14,
    
    marginLeft: 8,
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
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1a1a1a",
  },
  readOnlyInput: {
    backgroundColor: "#f5f5f5",
    color: "#999",
  },
  helperText: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  changePasswordButton: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  changePasswordContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  changePasswordIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  changePasswordTextContainer: {
    flex: 1,
  },
  changePasswordTitle: {
    fontSize: 16,
    
    color: "#1a1a1a",
    marginBottom: 2,
  },
  changePasswordSubtitle: {
    fontSize: 12,
    color: "#666",
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
});
