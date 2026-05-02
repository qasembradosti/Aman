import { useEffect, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text as RNText,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import {
  startPhoneVerification,
  verifyPhone,
  logout as logoutThunk,
} from "../../store/slices/authSlice";
import { useTheme } from "../../utils/ThemeContext";
import { useLanguage } from "../../utils/LanguageContext";
import { useResponsiveLayout } from "../../utils/useResponsiveLayout";
import { useRouter } from "expo-router";
import Input from "../../components/ui/Input";
import InfoDialog from "../../components/InfoDialog";

// Match login's Text usage to include custom font
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

export default function VerifyPhone() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const layout = useResponsiveLayout();
  const { t, isRTL, locale } = useLanguage();
  const {
    user,
    loading,
  } = useSelector((state) => state.auth);
  const [code, setCode] = useState("");
  const [resending, setResending] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);
  const [successVisible, setSuccessVisible] = useState(false);

  // Helper to check if phone is verified
  const isPhoneVerifiedCheck = (val) =>
    val === true || val === 1 || val === "1" || val === "true";
  const isActiveStatusCheck = (val) =>
    val === "active" || val === "ACTIVATED" || val === 1;

  // Redirect to home if user is already verified and active
  useEffect(() => {
    if (
      isPhoneVerifiedCheck(user?.phone_verified) &&
      isActiveStatusCheck(user?.status)
    ) {
      router.replace("/(tabs)/home");
    }
  }, [user?.phone_verified, user?.status, router]);

  const handleVerify = async () => {
    if (!code) {
      Alert.alert(t("codeRequired"), t("codeRequiredMessage"));
      return;
    }
    try {
      setVerifyError(null);
      setInfoMessage(null);
      const res = await dispatch(verifyPhone({ code })).unwrap();
      // Prefer server message when available
      const msg = res?.message || t("success") || "Success";
      // Show custom dialog instead of Alert; AuthGate will navigate after user state updates
      setInfoMessage(msg);
      setSuccessVisible(true);
    } catch (e) {
      const message =
        typeof e === "string"
          ? e
          : e?.message || t("verificationFailed") || "Verification failed";
      setVerifyError(message);
    }
  };

  const handleResend = async () => {
    if (!user?.phone) {
      Alert.alert(t("error") || "Error", t("enterPhone"));
      return;
    }
    try {
      setResending(true);
      await dispatch(
        startPhoneVerification({
          channel: "whatsapp",
          lang: locale,
          fallback: "no",
        }),
      ).unwrap();
      setVerifyError(null);
      setInfoMessage(
        t("sentMessage") || "A new verification code has been sent.",
      );
    } catch (e) {
      Alert.alert(t("failed"), String(e));
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    try {
      await dispatch(logoutThunk()).unwrap();
    } finally {
      router.replace("/(auth)/login");
    }
  };

  // Show loading/null while redirect is happening for verified users
  if (
    isPhoneVerifiedCheck(user?.phone_verified) &&
    isActiveStatusCheck(user?.status)
  ) {
    return null;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.mainArea}
      >
        <View
          style={[
            styles.mainInner,
            {
              paddingHorizontal: layout.containerPadding,
              paddingTop: layout.spacing.xl,
              paddingBottom: layout.spacing.lg,
            },
          ]}
        >
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: isDark ? "rgba(30,30,30,0.85)" : "transparent",
                maxWidth: 440,
                alignSelf: "center",
                width: "100%",
                padding: layout.spacing.lg,
              },
            ]}
          >
            <InfoDialog
              visible={successVisible}
              title={t("success") || "Success"}
              message={
                infoMessage ||
                t("phoneVerified") ||
                "Phone verified successfully"
              }
              okText={t("continue") || "Continue"}
              onClose={() => {
                setSuccessVisible(false);
                // AuthGate will auto-redirect to home
              }}
            />
            <View
              style={{ alignItems: "center", marginBottom: layout.spacing.lg }}
            >
              <Image
                source={require("../../assets/images/aman-app.png")}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 20,
                  opacity: 0.95,
                }}
                resizeMode="contain"
                accessible
                accessibilityLabel="App logo"
              />
            </View>

            <Text
              style={{
                color: theme.colors.text,
                fontSize: layout.typography["2xl"],
                marginBottom: layout.spacing.sm,
                textAlign: "center",
              }}
            >
              {t("verifyPhone") || t("verifyYourPhone") || "Verify Your Phone"}
            </Text>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: layout.typography.sm,
                marginBottom: layout.spacing.lg,
                textAlign: "center",
              }}
            >
              {(t("enterOtpMessage") || "Enter the code sent to") +
                " " +
                (user?.phone || t("phone"))}
            </Text>

            {/* Code input */}
            <View style={{ marginBottom: layout.spacing.md }}>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: layout.typography.sm,
                  marginBottom: layout.spacing.xs,
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {t("verificationCode") || "Verification Code"}
              </Text>
              <Input
                style={{
                  borderWidth: 1,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
                  color: theme.colors.text,
                  borderColor: "transparent",
                  borderRadius: 14,
                  paddingHorizontal: layout.spacing.md,
                  paddingVertical: layout.spacing.sm + 2,
                  fontSize: layout.typography.md,
                  minHeight: layout.touchTargets.md,
                  letterSpacing: 4,
                  textAlign: "center",
                }}
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={setCode}
                placeholder="••••••"
                placeholderTextColor={theme.colors.textSecondary}
                returnKeyType="done"
                onSubmitEditing={handleVerify}
              />
            </View>

            {/* Buttons */}
            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: theme.colors.primary,
                  borderRadius: 16,
                  paddingVertical: layout.spacing.md,
                  minHeight: layout.touchTargets.lg,
                  justifyContent: "center",
                  marginTop: layout.spacing.xs,
                  shadowColor: theme.colors.primary,
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 4,
                },
                (loading || !code) && styles.buttonDisabled,
              ]}
              onPress={handleVerify}
              disabled={loading || !code}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: layout.typography.md,
                  letterSpacing: 0.5,
                }}
              >
                {" "}
                {loading
                  ? t("loading") || "Loading..."
                  : t("verify") || "Verify"}{" "}
              </Text>
            </TouchableOpacity>
            {/* Inline feedback messages */}
            {verifyError && (
              <Text
                style={{
                  marginTop: layout.spacing.sm,
                  color: theme.colors.error || "#ff4d4f",
                  fontSize: layout.typography.xs,
                  textAlign: "center",
                }}
              >
                {verifyError}
              </Text>
            )}
            {infoMessage && !verifyError && (
              <Text
                style={{
                  marginTop: layout.spacing.sm,
                  color: theme.colors.success || theme.colors.primary,
                  fontSize: layout.typography.xs,
                  textAlign: "center",
                }}
              >
                {infoMessage}
              </Text>
            )}
            <TouchableOpacity
              style={{ alignItems: "center", marginTop: layout.spacing.md }}
              onPress={handleResend}
              disabled={resending}
            >
              <Text
                style={{
                  color: theme.colors.primary,
                  fontSize: layout.typography.sm,
                }}
              >
                {" "}
                {resending
                  ? t("sending") || "Sending..."
                  : t("resendCode") || "Resend Code"}{" "}
              </Text>
            </TouchableOpacity>

            {/* Logout / Switch account */}
            <TouchableOpacity
              style={{ alignItems: "center", marginTop: layout.spacing.sm }}
              onPress={handleLogout}
              accessibilityRole="button"
              accessibilityLabel={t("logout") || "Logout"}
            >
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: layout.typography.sm,
                }}
              >
                {t("logout") || "Logout"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainArea: { flex: 1 },
  mainInner: { flex: 1, justifyContent: "space-between" },
  formCard: {
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {},
  subtitle: {},
  input: { borderWidth: 1 },
  button: { alignItems: "center" },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff" },
  linkButton: { alignItems: "center" },
});
