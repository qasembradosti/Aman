import { useState, useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text as RNText,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { login, clearError } from "../../store/slices/authSlice";
import Input from "../../components/ui/Input";
// Use theme.colors.primary instead of direct constant
import { useLanguage } from "../../utils/LanguageContext";
import { useTheme } from "../../utils/ThemeContext";
import { useResponsiveLayout } from "../../utils/useResponsiveLayout";
import InfoDialog from "@/components/InfoDialog";

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

export default function Login() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { t, isRTL } = useLanguage();
  const { theme, isDark } = useTheme();
  const layout = useResponsiveLayout();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);

  const { loading, error, isAuthenticated, user } = useSelector(
    (state) => state.auth
  );

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Navigation after login is handled by AuthGate in _layout.jsx
  // Removing duplicate redirect here to prevent infinite update loop

  useEffect(() => {
    if (error) {
      Alert.alert(t("error") || "Error", error);
      dispatch(clearError());
    }
  }, [error]);

  const handleLogin = async () => {
    if (!username || !password) {
      InfoDialog({
        title: t("error") || "Error",
        message: t("enterUsernamePassword") || "Please enter username and password.",
      });
      return;
    }
    try {
      await dispatch(login({ username, password })).unwrap();
    } catch (e) {
      // handled by error effect
    }
  };

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
          {/* Top App Logo */}

          {/* Glass-like Card */}
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
                fontSize: layout.typography["2xl"],
                color: theme.colors.text,
                marginBottom: layout.spacing.md,
                textAlign: "center",
              }}
            >
              {t("login")}
            </Text>

            {/* Username */}
            <View style={{ marginBottom: layout.spacing.md }}>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: layout.typography.sm,
                  
                  marginBottom: layout.spacing.xs,
                }}
              >
                {t("username")}
              </Text>
              <Input
                ref={usernameRef}
                style={[
                  styles.input,
                  {
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
                  },
                ]}
                placeholder={t("enterUsername") || t("username")}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>

            {/* Password */}
            <View style={{ marginBottom: layout.spacing.sm }}>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: layout.typography.sm,
                  
                  marginBottom: layout.spacing.xs,
                }}
              >
                {t("password")}
              </Text>
              <View style={{ position: "relative" }}>
                <Input
                  ref={passwordRef}
                  style={[
                    styles.input,
                    {
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
                      paddingRight: layout.spacing.xl + 12,
                    },
                  ]}
                  placeholder={t("password")}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!passwordVisible}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={() => setPasswordVisible((v) => !v)}
                  style={{
                    position: "absolute",
                    right: layout.spacing.sm,
                    top: layout.spacing.sm,
                    padding: 8,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    passwordVisible
                      ? t("hidePassword") || "Hide password"
                      : t("showPassword") || "Show password"
                  }
                >
                  <Text
                    style={{
                      color: theme.colors.primary,
                      fontSize: layout.typography.sm,
                      
                    }}
                  >
                    {passwordVisible
                      ? t("hidePassword") || "Hide"
                      : t("showPassword") || "Show"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={{ marginBottom: layout.spacing.md, alignSelf: "flex-end" }}
              onPress={() => router.push("/(auth)/forgot-password")}
            >
              <Text
                style={{
                  color: theme.colors.primary,
                  fontSize: layout.typography.sm,
                  
                }}
              >
                {t("forgotPassword")}
              </Text>
            </TouchableOpacity>

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
                (loading || !username || !password) && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading || !username || !password}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: layout.typography.md,

                  letterSpacing: 0.5,
                }}
              >
                {loading ? t("loading") || "Loading..." : t("login")}
              </Text>
            </TouchableOpacity>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginVertical: layout.spacing.lg,
              }}
            >
              <View
                style={{
                  flex: 1,
                  height: 1,
                  backgroundColor: theme.colors.border,
                }}
              />
              <Text
                style={{
                  marginHorizontal: layout.spacing.sm,
                  color: theme.colors.textSecondary,
                  fontSize: layout.typography.xs,
                }}
              >
                {t("or") || "OR"}
              </Text>
              <View
                style={{
                  flex: 1,
                  height: 1,
                  backgroundColor: theme.colors.border,
                }}
              />
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: layout.typography.sm,
                }}
              >
                {t("dontHaveAccount")}
              </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text
                    style={{
                      marginLeft: 6,
                      color: theme.colors.primary,
                      fontSize: layout.typography.sm,
                    }}
                  >
                    {t("register")}
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainArea: {
    flex: 1,
  },
  mainInner: {
    flex: 1,
    justifyContent: "space-between",
  },
  formCard: {
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  input: {
    borderWidth: 1,
  },
  button: {
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
