import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  I18nManager,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../utils/LanguageContext";
import { useTheme } from "../utils/ThemeContext";
import { useDispatch, useSelector } from "react-redux";
import { createWithdrawalRequest, fetchWallet } from "../store/slices/walletSlice";
import { useResponsiveLayout } from "../utils/useResponsiveLayout";
import Input from "../components/ui/Input";
import InfoDialog from "../components/InfoDialog";
import ConfirmDialog from "../components/ui/ConfirmDialog";

// Simple Text with font support
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

export default function WithdrawScreen() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const { theme, isDark } = useTheme();
  const layout = useResponsiveLayout();
  const dispatch = useDispatch();

  const { balance: walletBalance, loading: walletLoading } = useSelector((state) => state.wallet);
  const { user } = useSelector((state) => state.auth);
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [infoDialog, setInfoDialog] = useState({
    visible: false,
    title: "",
    message: "",
  });
  const [confirmDialog, setConfirmDialog] = useState({
    visible: false,
    message: "",
  });

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchWallet({ user_id: user.id }));
    }
  }, [user?.id]);

  useEffect(() => {
    if (typeof walletBalance === "number") {
      setBalance(walletBalance);
    }
  }, [walletBalance]);

  // Quick withdrawal amounts
  const quickAmounts = [50000, 100000, 250000, 500000, 1000000];

  const handleQuickAmount = (quickAmount) => {
    if (balance && quickAmount <= balance) {
      setAmount(quickAmount.toString());
    }
  };

  const handleIncrement = () => {
    const currentAmount = parseFloat(amount) || 0;
    const newAmount = currentAmount + 1000;
    if (balance && newAmount <= balance) {
      setAmount(newAmount.toString());
    } else if (balance) {
      setAmount(balance.toString());
    }
  };

  const handleDecrement = () => {
    const currentAmount = parseFloat(amount) || 0;
    const newAmount = Math.max(0, currentAmount - 1000);
    setAmount(newAmount.toString());
  };

  const handleWithdraw = async () => {
    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      setInfoDialog({
        visible: true,
        title: t("error") || "Error",
        message: t("enterValidAmount") || "Please enter a valid amount",
      });
      return;
    }

    if (!phoneNumber || phoneNumber.trim().length < 10) {
      setInfoDialog({
        visible: true,
        title: t("error") || "Error",
        message: t("enterValidPhone") || "Please enter a valid phone number",
      });
      return;
    }

    const withdrawAmount = parseFloat(amount);
    if (balance && withdrawAmount > balance) {
      setInfoDialog({
        visible: true,
        title: t("error") || "Error",
        message: t("insufficientBalance") || "Insufficient balance",
      });
      return;
    }

    // Confirm withdrawal
    setConfirmDialog({
      visible: true,
      message: `${t("withdrawRequest") || "Request Withdrawal"}: ${withdrawAmount} ${
        t("currency") || "IQD"
      }\n${t("toPhone") || "To"}: ${phoneNumber}\n\n${
        t("withdrawalNote") || "Your request will be reviewed by the admin."
      }`,
    });
  };

  const handleConfirmWithdraw = async () => {
    setConfirmDialog({ visible: false, message: "" });
    setIsSubmitting(true);

    const withdrawAmount = parseFloat(amount);

    try {
      await dispatch(
        createWithdrawalRequest({
          amount: withdrawAmount,
          payment_details: {
            phone: phoneNumber,
            method: "mobile_money",
          },
          user_note: `Withdrawal request for ${withdrawAmount}`,
        })
      ).unwrap();

      setInfoDialog({
        visible: true,
        title: t("success") || "Success",
        message:
          t("withdrawalRequestSuccess") || 
          "Withdrawal request submitted successfully! Please wait for admin approval.",
      });

      // Clear form
      setAmount("");
      setPhoneNumber("");
      
      // Refresh wallet balance
      if (user?.id) {
        dispatch(fetchWallet({ user_id: user.id }));
      }
    } catch (error) {
      setInfoDialog({
        visible: true,
        title: t("error") || "Error",
        message:
          error ||
          t("withdrawalFailed") ||
          "Withdrawal request failed. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.colors.card,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.canGoBack?.() ? router.back() : router.replace('/(tabs)/home')}
            style={styles.backButton}
          >
            <Ionicons
              name={isRTL ? "arrow-forward" : "arrow-back"}
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {t("withdraw")}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingHorizontal: layout.containerPadding }}
        >
          {/* Main Card Container */}
          <View
            style={[
              styles.mainCard,
              {
                backgroundColor: isDark
                  ? "rgba(30,30,30,0.85)"
                  : theme.colors.card,
                alignSelf: "center",
                width: "100%",
                marginTop: layout.spacing.lg,
                marginBottom: layout.spacing.lg,
                padding: layout.spacing.lg,
                borderRadius: 20,
              },
            ]}
          >
            {/* Wallet Balance Section */}
            <View
              style={[
                styles.balanceSection,
                { marginBottom: layout.spacing.lg },
              ]}
            >
              <View
                style={{
                  alignItems: "center",
                  marginBottom: layout.spacing.md,
                }}
              >
                <Ionicons
                  name="wallet-outline"
                  size={48}
                  color={theme.colors.primary}
                  style={{ marginBottom: layout.spacing.sm }}
                />
                <Text
                  style={[
                    styles.balanceLabel,
                    {
                      color: theme.colors.textSecondary,
                      fontSize: layout.typography.sm,
                      marginBottom: layout.spacing.xs,
                      textAlign: "center",
                    },
                  ]}
                >
                  {t("availableBalance") || "Available Balance"}
                </Text>
                <Text
                  style={[
                    styles.balanceAmount,
                    {
                      color: theme.colors.primary,
                      fontSize: layout.typography["3xl"],
                      letterSpacing: 0.5,
                      textAlign: "center",
                    },
                  ]}
                >
                  {balance?.toLocaleString() || "0"}{" "}
                  <Text style={{ fontSize: layout.typography.lg }}>
                    {t("currency") || "IQD"}
                  </Text>
                </Text>
              </View>

              <View
                style={{
                  height: 1,
                  backgroundColor: theme.colors.border,
                  marginVertical: layout.spacing.md,
                }}
              />
            </View>

            {/* Withdrawal Form */}
            <View style={styles.formContainer}>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: theme.colors.text,
                    fontSize: layout.typography.xl,
                    marginBottom: layout.spacing.md,
                    width: "100%",
                  },
                ]}
              >
                {t("withdrawalDetails") || "Withdrawal Details"}
              </Text>

              {/* Amount Input */}
              <View
                style={[
                  styles.inputGroup,
                  { marginBottom: layout.spacing.md, width: "100%" },
                ]}
              >
                <Text
                  style={[
                    styles.inputLabel,
                    {
                      color: theme.colors.textSecondary,
                      fontSize: layout.typography.sm,
                      marginBottom: layout.spacing.xs,
                      width: "100%",
                    },
                  ]}
                >
                  {t("amount") || "Amount"} *
                </Text>
                <View
                  style={[
                    styles.inputWithButton,
                    { flexDirection: isRTL ? "row-reverse" : "row" },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.incrementButton,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                        borderColor: "transparent",
                        opacity: isSubmitting ? 0.6 : 1,
                      },
                    ]}
                    onPress={handleDecrement}
                    disabled={isSubmitting}
                  >
                    <Ionicons
                      name="remove"
                      size={20}
                      color={theme.colors.text}
                    />
                  </TouchableOpacity>
                  <Input
                    style={[
                      styles.inputFlex,
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
                      },
                    ]}
                    placeholder={t("enterAmount") || "Enter amount"}
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={(val) => {
                      // Clamp typed amount to [0, balance]
                      const parsed = parseFloat(String(val).replace(/[^0-9.]/g, "")) || 0;
                      if (!balance || parsed <= 0) {
                        setAmount(parsed ? String(parsed) : "");
                        return;
                      }
                      const clamped = Math.min(parsed, Number(balance));
                      setAmount(String(clamped));
                    }}
                    editable={!isSubmitting}
                  />
                  <TouchableOpacity
                    style={[
                      styles.incrementButton,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                        borderColor: "transparent",
                        opacity: isSubmitting ? 0.6 : 1,
                      },
                    ]}
                    onPress={handleIncrement}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="add" size={20} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Quick Amount Tags */}
                <View
                  style={[
                    styles.quickAmountsContainer,
                    {
                      marginTop: layout.spacing.sm,
                    },
                  ]}
                >
                  {quickAmounts.map((quickAmount) => {
                    const isDisabled =
                      !balance || quickAmount > balance;
                    return (
                      <TouchableOpacity
                        key={quickAmount}
                        style={[
                          styles.quickAmountTag,
                          {
                            backgroundColor: isDisabled
                              ? isDark
                                ? "rgba(255,255,255,0.05)"
                                : "rgba(0,0,0,0.05)"
                              : theme.colors.primary + "20",
                            borderColor: isDisabled
                              ? "transparent"
                              : theme.colors.primary,
                            borderRadius: 12,
                            paddingHorizontal: layout.spacing.sm + 4,
                            paddingVertical: layout.spacing.xs + 2,
                          },
                        ]}
                        onPress={() => handleQuickAmount(quickAmount)}
                        disabled={isDisabled || isSubmitting}
                      >
                        <Text
                          style={[
                            styles.quickAmountText,
                            {
                              color: isDisabled
                                ? theme.colors.textSecondary
                                : theme.colors.primary,
                              fontSize: layout.typography.xs,
                            },
                          ]}
                        >
                          {quickAmount.toLocaleString()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Phone Number Input */}
              <View
                style={[
                  styles.inputGroup,
                  {
                    marginBottom: layout.spacing.md,
                    width: "100%",
                    direction: isRTL ? "rtl" : "ltr",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.inputLabel,
                    {
                      color: theme.colors.textSecondary,
                      fontSize: layout.typography.sm,
                      marginBottom: layout.spacing.xs,
                      width: "100%",
                    },
                  ]}
                >
                  {t("phoneNumber") || "Phone Number"} *
                </Text>
                <Input
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
                    },
                  ]}
                  placeholder={
                    t("enterPhoneNumber") ||
                    "Enter phone number (07XX XXX XXXX)"
                  }
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  editable={!isSubmitting}
                />
              </View>

              {/* Info Box */}
              <View
                style={[
                  styles.infoBox,
                  {
                    backgroundColor: theme.colors.primary + "15",
                    borderRadius: 12,
                    padding: layout.spacing.sm + 2,
                    marginBottom: layout.spacing.md,
                  },
                ]}
              >
                <Ionicons
                  name="information-circle"
                  size={20}
                  color={theme.colors.primary}
                  style={{ marginTop: 2 }}
                />
                <Text
                  style={[
                    styles.infoText,
                    {
                      color: theme.colors.text,
                      fontSize: layout.typography.xs,
                      lineHeight: 18,
                      marginLeft: isRTL ? 0 : layout.spacing.xs,
                      marginRight: isRTL ? layout.spacing.xs : 0,
                    },
                  ]}
                >
                  {t("withdrawalInfo") ||
                    "The withdrawal amount will be transferred to the provided phone number within 24-48 hours."}
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: theme.colors.primary,
                    borderRadius: 16,
                    paddingVertical: layout.spacing.md,
                    minHeight: layout.touchTargets.lg,
                    opacity: isSubmitting ? 0.6 : 1,
                  },
                ]}
                onPress={handleWithdraw}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.submitButtonText,
                      {
                        fontSize: layout.typography.md,

                        letterSpacing: 0.5,
                      },
                    ]}
                  >
                    {t("submitWithdrawal") || "Submit Withdrawal"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Info Dialog */}
        <InfoDialog
          visible={infoDialog.visible}
          title={infoDialog.title}
          message={infoDialog.message}
          okText={t("ok") || "OK"}
          onClose={() =>
            setInfoDialog({ visible: false, title: "", message: "" })
          }
        />

        {/* Confirm Dialog */}
        <ConfirmDialog
          visible={confirmDialog.visible}
          title={t("confirmWithdrawal") || "Confirm Withdrawal"}
          message={confirmDialog.message}
          confirmText={t("confirm") || "Confirm"}
          cancelText={t("cancel") || "Cancel"}
          onConfirm={handleConfirmWithdraw}
          onCancel={() => setConfirmDialog({ visible: false, message: "" })}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
  },
  scrollView: {
    flex: 1,
  },
  inputWithButton: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  inputFlex: {
    flex: 1,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
  },
  incrementButton: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  quickAmountsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickAmountTag: {
    borderWidth: 1,
  },
  quickAmountText: {},
  infoBox: {
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
  },
  submitButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "#fff",
  },
});
