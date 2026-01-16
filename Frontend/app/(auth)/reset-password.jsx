import { useState, useRef } from "react";
import { View, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Text as RNText, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { resetPasswordWithCode } from "../../store/slices/authSlice";
import Input from "../../components/ui/Input";
import { useLanguage } from "../../utils/LanguageContext";
import { useTheme } from "../../utils/ThemeContext";
import { useResponsiveLayout } from "../../utils/useResponsiveLayout";

const Text = ({ style, ...props }) => {
  const { fontFamily } = useLanguage();
  return <RNText style={[fontFamily?.regular ? { fontFamily: fontFamily.regular } : {}, style]} {...props} />;
};

export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const dispatch = useDispatch();
  const { t, isRTL } = useLanguage();
  const { theme, isDark } = useTheme();
  const layout = useResponsiveLayout();
  const { loading } = useSelector((s) => s.auth);

  const [identifier, setIdentifier] = useState(params?.value || "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);

  const codeRef = useRef(null);
  const newPassRef = useRef(null);
  const confirmPassRef = useRef(null);

  const handleReset = async () => {
    if (!identifier || !code || !newPassword || !confirmPassword) {
      setError(t("fillAllFields") || "Please fill all fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("passwordsDoNotMatch") || "Passwords do not match");
      return;
    }
    setError(null);
    try {
      await dispatch(resetPasswordWithCode({ identifier, code, newPassword })).unwrap();
      router.replace('/(auth)/login');
    } catch (e) {
      setError(e || (t("somethingWentWrong") || "Something went wrong"));
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.mainArea}>
        <View style={[styles.mainInner, { paddingHorizontal: layout.containerPadding, paddingTop: layout.spacing.xl, paddingBottom: layout.spacing.lg }]}>
          <View style={[styles.formCard, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'transparent', maxWidth: 440, alignSelf: 'center', width: '100%', padding: layout.spacing.lg }]}> 
            <View style={{ alignItems: 'center', marginBottom: layout.spacing.lg }}>
              <Image source={require('../../assets/images/aman-app.png')} style={{ width: 96, height: 96, borderRadius: 20, opacity: 0.95 }} resizeMode='contain' accessible accessibilityLabel='App logo' />
            </View>
            <Text style={{ fontSize: layout.typography['2xl'], color: theme.colors.text, marginBottom: layout.spacing.sm, textAlign: 'center' }}>
              {t('resetPassword') || 'Reset Password'}
            </Text>
            <Text style={{ fontSize: layout.typography.sm, color: theme.colors.textSecondary, marginBottom: layout.spacing.lg, textAlign: 'center' }}>
              {t('enterResetDetails') || 'Enter the code sent and your new password'}
            </Text>

            <View style={{ marginBottom: layout.spacing.md }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: layout.typography.sm, fontWeight: '600', marginBottom: layout.spacing.xs, textAlign: isRTL ? 'right' : 'left' }}>
                {t('identifier') || 'Identifier'}
              </Text>
              <Input
                style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: theme.colors.text, borderColor: 'transparent', borderRadius: 14, paddingHorizontal: layout.spacing.md, paddingVertical: layout.spacing.sm + 2, fontSize: layout.typography.md, minHeight: layout.touchTargets.md }]}
                placeholder={t('usernameEmailOrPhone') || 'Username / Email / Phone'}
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize='none'
                returnKeyType='next'
                onSubmitEditing={() => codeRef.current?.focus()}
              />
            </View>

            <View style={{ marginBottom: layout.spacing.md }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: layout.typography.sm, fontWeight: '600', marginBottom: layout.spacing.xs, textAlign: isRTL ? 'right' : 'left' }}>
                {t('verificationCode') || 'Verification Code'}
              </Text>
              <Input
                ref={codeRef}
                style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: theme.colors.text, borderColor: 'transparent', borderRadius: 14, paddingHorizontal: layout.spacing.md, paddingVertical: layout.spacing.sm + 2, fontSize: layout.typography.md, minHeight: layout.touchTargets.md }]}
                placeholder={t('enterCode') || 'Enter code'}
                value={code}
                onChangeText={setCode}
                keyboardType='number-pad'
                returnKeyType='next'
                onSubmitEditing={() => newPassRef.current?.focus()}
              />
            </View>

            <View style={{ marginBottom: layout.spacing.md }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: layout.typography.sm, fontWeight: '600', marginBottom: layout.spacing.xs, textAlign: isRTL ? 'right' : 'left' }}>
                {t('newPassword') || 'New Password'}
              </Text>
              <Input
                ref={newPassRef}
                style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: theme.colors.text, borderColor: 'transparent', borderRadius: 14, paddingHorizontal: layout.spacing.md, paddingVertical: layout.spacing.sm + 2, fontSize: layout.typography.md, minHeight: layout.touchTargets.md }]}
                placeholder={t('enterNewPassword') || 'Enter new password'}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize='none'
                returnKeyType='next'
                onSubmitEditing={() => confirmPassRef.current?.focus()}
              />
            </View>

            <View style={{ marginBottom: layout.spacing.md }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: layout.typography.sm, fontWeight: '600', marginBottom: layout.spacing.xs, textAlign: isRTL ? 'right' : 'left' }}>
                {t('confirmPassword') || 'Confirm Password'}
              </Text>
              <Input
                ref={confirmPassRef}
                style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: theme.colors.text, borderColor: 'transparent', borderRadius: 14, paddingHorizontal: layout.spacing.md, paddingVertical: layout.spacing.sm + 2, fontSize: layout.typography.md, minHeight: layout.touchTargets.md }]}
                placeholder={t('confirmPasswordPlaceholder') || 'Confirm new password'}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize='none'
                returnKeyType='done'
                onSubmitEditing={handleReset}
              />
            </View>

            {!!error && (
              <Text style={{ color: theme.colors.error || '#ff4d4f', fontSize: layout.typography.xs, marginBottom: layout.spacing.sm }}>
                {error}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.colors.primary, borderRadius: 16, paddingVertical: layout.spacing.md, minHeight: layout.touchTargets.lg, justifyContent: 'center', marginTop: layout.spacing.xs, shadowColor: theme.colors.primary, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 }, (loading || !code || !newPassword || !confirmPassword) && styles.buttonDisabled]}
              onPress={handleReset}
              disabled={loading || !code || !newPassword || !confirmPassword}
            >
              <Text style={{ color: '#fff', fontSize: layout.typography.md, fontWeight: '700', letterSpacing: 0.5 }}>
                {loading ? (t('loading') || 'Loading...') : (t('resetPassword') || 'Reset Password')}
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
  mainInner: { flex: 1, justifyContent: 'space-between' },
  formCard: { shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  input: { borderWidth: 1 },
  button: { alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
});
