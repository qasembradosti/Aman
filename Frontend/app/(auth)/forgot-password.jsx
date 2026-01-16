import { useState, useRef } from "react";
import { View, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Text as RNText, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { requestPasswordReset } from "../../store/slices/authSlice";
import Input from "../../components/ui/Input";
import { useLanguage } from "../../utils/LanguageContext";
import { useTheme } from "../../utils/ThemeContext";
import { useResponsiveLayout } from "../../utils/useResponsiveLayout";

const Text = ({ style, ...props }) => {
  const { fontFamily } = useLanguage();
  return <RNText style={[fontFamily?.regular ? { fontFamily: fontFamily.regular } : {}, style]} {...props} />;
};

export default function ForgotPassword() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { t, isRTL, locale } = useLanguage();
  const { theme, isDark } = useTheme();
  const layout = useResponsiveLayout();

  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const { loading } = useSelector((s) => s.auth);

  const resolveIdentifierType = (value) => {
    const v = String(value).trim();
    const digits = v.replace(/\D/g, "");
    if (/^7\d{9}$/.test(digits)) return { type: "phone", value: digits };
    if (v.includes("@")) return { type: "email", value: v };
    return { type: "username", value: v };
  };

  const handleSend = async () => {
    const v = String(identifier).trim();
    if (!v) {
      setError(t("fillAllFields") || "Please enter your username, email, or phone");
      return;
    }
    setError(null);
    try {
      const { type, value } = resolveIdentifierType(v);
      const res = await dispatch(requestPasswordReset({ identifier: value, channel: 'whatsapp', lang: locale, fallback: 'no' })).unwrap();
      // Go to reset-password and carry the identifier
      router.push({ pathname: "/(auth)/reset-password", params: { type, value } });
    } catch (e) {
      setError(e || (t("somethingWentWrong") || "Something went wrong"));
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.mainArea}>
        <View style={[styles.mainInner, { paddingHorizontal: layout.containerPadding, paddingTop: layout.spacing.xl, paddingBottom: layout.spacing.lg }]}>
          <View style={[styles.formCard, { backgroundColor: isDark ? "rgba(30,30,30,0.85)" : "transparent", maxWidth: 440, alignSelf: "center", width: "100%", padding: layout.spacing.lg }]}> 
            <View style={{ alignItems: "center", marginBottom: layout.spacing.lg }}>
              <Image source={require("../../assets/images/aman-app.png")} style={{ width: 96, height: 96, borderRadius: 20, opacity: 0.95 }} resizeMode="contain" accessible accessibilityLabel="App logo" />
            </View>

            <Text style={{ fontSize: layout.typography["2xl"], color: theme.colors.text, marginBottom: layout.spacing.sm, textAlign: "center" }}>
              {t("forgotPassword") || "Forgot Password"}
            </Text>
            <Text style={{ fontSize: layout.typography.sm, color: theme.colors.textSecondary, marginBottom: layout.spacing.lg, textAlign: "center" }}>
              {t("enterIdentifierToReset") || "Enter your username, email, or phone (7XX XXX XXXX)"}
            </Text>

            <View style={{ marginBottom: layout.spacing.md }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: layout.typography.sm,  marginBottom: layout.spacing.xs, textAlign: isRTL ? "right" : "left" }}>
                {t("usernameEmailOrPhone") || "Username / Email / Phone"}
              </Text>
              <Input
                ref={inputRef}
                style={[styles.input, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", color: theme.colors.text, borderColor: error ? (theme.colors.error || '#ff4d4f') : 'transparent', borderRadius: 14, paddingHorizontal: layout.spacing.md, paddingVertical: layout.spacing.sm + 2, fontSize: layout.typography.md, minHeight: layout.touchTargets.md }]}
                placeholder={t("enterIdentifier") || "Enter username, email, or phone"}
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleSend}
              />
              {!!error && (
                <Text style={{ color: theme.colors.error || '#ff4d4f', fontSize: layout.typography.xs, marginTop: 6 }}>
                  {error}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.colors.primary, borderRadius: 16, paddingVertical: layout.spacing.md, minHeight: layout.touchTargets.lg, justifyContent: "center", marginTop: layout.spacing.xs, shadowColor: theme.colors.primary, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 }, (!identifier || loading) && styles.buttonDisabled]}
              onPress={handleSend}
              disabled={!identifier || loading}
            >
              <Text style={{ color: "#fff", fontSize: layout.typography.md,  letterSpacing: 0.5 }}>
                {loading ? (t("loading") || "Loading...") : (t("sendCode") || "Send Code")}
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
  formCard: { shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  input: { borderWidth: 1 },
  button: { alignItems: "center" },
  buttonDisabled: { opacity: 0.6 },
});
