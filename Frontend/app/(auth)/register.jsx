import { useState, useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Text as RNText,
  Keyboard,
  InteractionManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { useDispatch } from "react-redux";
import {
  register as registerThunk,
  login as loginThunk,
  startPhoneVerification,
} from "../../store/slices/authSlice";
import Input from "../../components/ui/Input";
import { useTheme } from "../../utils/ThemeContext";
import { useResponsiveLayout } from "../../utils/useResponsiveLayout";
import { useLanguage } from "../../utils/LanguageContext";
import InfoDialog from "../../components/InfoDialog";

// Custom Text component with font like login
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

export default function Register() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const layout = useResponsiveLayout();
  const { t, isRTL, locale } = useLanguage();
  const dispatch = useDispatch();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState(null);
  const [errorDialogVisible, setErrorDialogVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: names+username, 2: email+phone+password
  // Refs for sequential focus
  const firstNameRef = useRef(null);
  const lastNameRef = useRef(null);
  const usernameRef = useRef(null);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const handleNext = () => {
    // Basic step validation
    if (!firstName || !lastName || !username) {
      setErrorMessage(t("fillAllFields") || "Please fill all fields");
      setErrorDialogVisible(true);
      return;
    }
    // Dismiss keyboard and defer the step change to avoid RN accessibilityState update glitches
    // when unmounting a pressed Touchable view.
    Keyboard.dismiss();
    InteractionManager.runAfterInteractions(() => {
      setStep(2);
    });
  };

  const handleBack = () => {
    Keyboard.dismiss();
    InteractionManager.runAfterInteractions(() => setStep(1));
  };

  const handleRegister = () => {
    // Defer heavy state changes and navigation until after press interactions finish
    Keyboard.dismiss();
    InteractionManager.runAfterInteractions(async () => {
      if (!email || !password || !phone) {
        setErrorMessage(t("fillAllFields") || "Please fill all fields including phone number");
        setErrorDialogVisible(true);
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage(t("passwordsDoNotMatch") || "Passwords do not match");
        setErrorDialogVisible(true);
        return;
      }

      // Validate phone format (7XX XXXXXXX -> digits must be 7XXXXXXXXX)
      const isValidLocalPhone = (value) => {
        if (!value) return false; // phone is now required
        const digits = String(value).replace(/\D/g, "");
        return /^7\d{9}$/.test(digits);
      };

      if (!isValidLocalPhone(phone)) {
        setErrorMessage(t("invalidPhone") || "Invalid phone format. Use 7XX XXXXXXX");
        setErrorDialogVisible(true);
        return;
      }

      try {
        setLoading(true);
        const body = {
          username: username || email.split("@")[0],
          email,
          password,
          first_name: firstName || null,
          last_name: lastName || null,
          phone: phone, // phone is required
          channel: "whatsapp",
          lang: locale,
          fallback: "no",
        };

        const result = await dispatch(registerThunk(body)).unwrap();
        // Phone is required - always proceed to verification flow
        // Login so we can call protected verify endpoints
        await dispatch(
          loginThunk({ username: body.username, password })
        ).unwrap();
        // If backend didn't send OTP during register, start it now
        if (!result?.otpSent) {
          try {
            await dispatch(
              startPhoneVerification({
                channel: "whatsapp",
                lang: locale,
                fallback: "no",
              })
            ).unwrap();
          } catch (e) {
            console.warn("Failed to auto-start phone verification:", e);
          }
        }
        router.replace("/(auth)/verify-phone");
      } catch (error) {
        let errMsg = "Registration failed";
        if (error?.data?.message) {
          errMsg = error.data.message;
        } else if (error?.message) {
          errMsg = error.message;
        }
        // Show error dialog
        setErrorMessage(errMsg);
        setErrorDialogVisible(true);
      } finally {
        setLoading(false);
      }
    });
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
          {/* Glass-like Card to match login */}
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
            {/* App logo on top */}
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
                marginBottom: layout.spacing.sm,
                textAlign: "center",
              }}
            >
              {t("createAccount") || "Create Account"}
            </Text>
            <Text
              style={{
                fontSize: layout.typography.sm,
                color: theme.colors.textSecondary,
                marginBottom: layout.spacing.lg,
                textAlign: "center",
              }}
            >
              {t("signUpToGetStarted") || "Sign up to get started"}
            </Text>

            {step === 1 ? (
              <>
                <View
                  style={[
                    styles.inputContainer,
                    { marginBottom: layout.spacing.md },
                  ]}
                >
                  <Text
                    style={[
                      styles.label,
                      {
                        color: theme.colors.textSecondary,
                        fontSize: layout.typography.sm,
                        
                        marginBottom: layout.spacing.xs,
                        textAlign: isRTL ? "right" : "left",
                      },
                    ]}
                  >
                    {t("firstName") || "First Name"}
                  </Text>
                  <Input
                    ref={firstNameRef}
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
                    placeholder={t("enterFirstName") || "Enter first name"}
                    value={firstName}
                    onChangeText={setFirstName}
                    returnKeyType="next"
                    onSubmitEditing={() => lastNameRef.current?.focus()}
                  />
                </View>
                <View
                  style={[
                    styles.inputContainer,
                    { marginBottom: layout.spacing.md },
                  ]}
                >
                  <Text
                    style={[
                      styles.label,
                      {
                        color: theme.colors.textSecondary,
                        fontSize: layout.typography.sm,
                        
                        marginBottom: layout.spacing.xs,
                        textAlign: isRTL ? "right" : "left",
                      },
                    ]}
                  >
                    {t("lastName") || "Last Name"}
                  </Text>
                  <Input
                    ref={lastNameRef}
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
                    placeholder={t("enterLastName") || "Enter last name"}
                    value={lastName}
                    onChangeText={setLastName}
                    returnKeyType="next"
                    onSubmitEditing={() => usernameRef.current?.focus()}
                  />
                </View>
                <View
                  style={[
                    styles.inputContainer,
                    { marginBottom: layout.spacing.lg },
                  ]}
                >
                  <Text
                    style={[
                      styles.label,
                      {
                        color: theme.colors.textSecondary,
                        fontSize: layout.typography.sm,
                        
                        marginBottom: layout.spacing.xs,
                        textAlign: isRTL ? "right" : "left",
                      },
                    ]}
                  >
                    {t("username") || "Username"}
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
                    placeholder={t("enterUsername") || "Enter a username"}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleNext}
                  />
                </View>
              </>
            ) : (
              <>
                <View
                  style={[
                    styles.inputContainer,
                    { marginBottom: layout.spacing.md },
                  ]}
                >
                  <Text
                    style={[
                      styles.label,
                      {
                        color: theme.colors.textSecondary,
                        fontSize: layout.typography.sm,
                        
                        marginBottom: layout.spacing.xs,
                        textAlign: isRTL ? "right" : "left",
                      },
                    ]}
                  >
                    {t("email") || "Email"}
                  </Text>
                  <Input
                    ref={emailRef}
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
                    placeholder={t("enterEmail") || "Enter your email"}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    returnKeyType="next"
                    onSubmitEditing={() => phoneRef.current?.focus()}
                  />
                </View>
                <View
                  style={[
                    styles.inputContainer,
                    { marginBottom: layout.spacing.md },
                  ]}
                >
                  <Text
                    style={[
                      styles.label,
                      {
                        color: theme.colors.textSecondary,
                        fontSize: layout.typography.sm,
                        
                        marginBottom: layout.spacing.xs,
                        textAlign: isRTL ? "right" : "left",
                      },
                    ]}
                  >
                    {t("phone") || "Phone Number"}
                  </Text>
                  <Input
                    ref={phoneRef}
                    style={[
                      styles.input,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                        color: theme.colors.text,
                        borderColor: phoneError
                          ? theme.colors.error || "#ff4d4f"
                          : "transparent",
                        borderRadius: 14,
                        paddingHorizontal: layout.spacing.md,
                        paddingVertical: layout.spacing.sm + 2,
                        fontSize: layout.typography.md,
                        minHeight: layout.touchTargets.md,
                      },
                    ]}
                    placeholder={t("enterPhone") || "7XX XXXXXXX"}
                    value={phone}
                    onChangeText={(text) => {
                      let digits = String(text).replace(/\D/g, "");
                      if (digits.length > 0 && digits[0] !== "7") {
                        return;
                      }
                      if (digits.length > 10) {
                        digits = digits.slice(0, 10);
                      }
                      let formatted = digits;
                      if (digits.length > 3) {
                        formatted = `${digits.slice(0, 3)} ${digits.slice(
                          3,
                          6
                        )}${
                          digits.length > 6 ? " " + digits.slice(6) : ""
                        }`.trim();
                      }
                      setPhone(formatted);
                      if (digits.length === 0) {
                        setPhoneError(null);
                      } else if (/^7\d{9}$/.test(digits)) {
                        setPhoneError(null);
                      } else {
                        setPhoneError(
                          t("invalidPhone") ||
                            "Invalid phone format. Use 7XX XXX XXXX"
                        );
                      }
                    }}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                  {phoneError && (
                    <Text
                      style={{
                        color: theme.colors.error || "#ff4d4f",
                        fontSize: layout.typography.xs,
                        marginTop: 6,
                      }}
                    >
                      {phoneError}
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    styles.inputContainer,
                    { marginBottom: layout.spacing.md },
                  ]}
                >
                  <Text
                    style={[
                      styles.label,
                      {
                        color: theme.colors.textSecondary,
                        fontSize: layout.typography.sm,
                        
                        marginBottom: layout.spacing.xs,
                        textAlign: isRTL ? "right" : "left",
                      },
                    ]}
                  >
                    {t("password") || "Password"}
                  </Text>
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
                      },
                    ]}
                    placeholder={t("enterPassword") || "Enter your password"}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => confirmRef.current?.focus()}
                  />
                </View>
                <View
                  style={[
                    styles.inputContainer,
                    { marginBottom: layout.spacing.lg },
                  ]}
                >
                  <Text
                    style={[
                      styles.label,
                      {
                        color: theme.colors.textSecondary,
                        fontSize: layout.typography.sm,
                        
                        marginBottom: layout.spacing.xs,
                        textAlign: isRTL ? "right" : "left",
                      },
                    ]}
                  >
                    {t("confirmPassword") || "Confirm Password"}
                  </Text>
                  <Input
                    ref={confirmRef}
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
                    placeholder={
                      t("confirmPasswordPlaceholder") || "Confirm your password"
                    }
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                  />
                </View>
              </>
            )}
            {/* Buttons */}
            {step === 1 ? (
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
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleNext}
                disabled={loading}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: layout.typography.md,
                    
                    letterSpacing: 0.5,
                  }}
                >
                  {t("continue") || "Continue"}
                </Text>
              </TouchableOpacity>
            ) : (
              <>
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
                    (loading || (phone.length > 0 && !!phoneError)) && styles.buttonDisabled,
                  ]}
                  onPress={handleRegister}
                  disabled={loading || (phone.length > 0 && !!phoneError)}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: layout.typography.md,
                      
                      letterSpacing: 0.5,
                    }}
                  >
                    {loading
                      ? t("loading") || "Loading..."
                      : t("register") || "Register"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    alignItems: "center",
                    borderRadius: 16,
                    paddingVertical: layout.spacing.md,
                    minHeight: layout.touchTargets.lg,
                    justifyContent: "center",
                    marginTop: layout.spacing.sm,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                  onPress={handleBack}
                  disabled={loading}
                >
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: layout.typography.md,
                      
                    }}
                  >
                    {t("back") || "Back"}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Divider */}
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

            {/* Link to login */}
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
                {t("alreadyHaveAccount") || "Already have an account?"}
              </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text
                    style={{
                      marginLeft: 6,
                      color: theme.colors.primary,
                      fontSize: layout.typography.sm,
                      
                    }}
                  >
                    {t("login") || "Login"}
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
      
      <InfoDialog
        visible={errorDialogVisible}
        title={t("error") || "Error"}
        message={errorMessage}
        okText={t("ok") || "OK"}
        onClose={() => setErrorDialogVisible(false)}
      />
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
  scrollView: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    maxWidth: 400, // Prevent stretching on tablets
    alignSelf: "center",
    width: "100%",
  },
  title: {
    
  },
  subtitle: {
    
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    // marginBottom handled inline
  },
  label: {
    
    // All other properties handled inline
  },
  input: {
    borderWidth: 1,
  },
  button: {
    alignItems: "center",
    // All other properties handled inline for responsiveness
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    
    // fontSize handled inline
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: {
    // All properties handled inline
  },
  loginLink: {
    
    // All other properties handled inline
  },
});
