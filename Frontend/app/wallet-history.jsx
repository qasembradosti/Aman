import React, { useEffect, useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Text as RNText } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { fetchWalletHistory, fetchWallet } from "../store/slices/walletSlice";
import { useLanguage } from "../utils/LanguageContext";
import { useTheme } from "../utils/ThemeContext";

const Text = ({ style, ...props }) => {
  const { fontFamily } = useLanguage();
  return <RNText style={[fontFamily?.regular ? { fontFamily: fontFamily.regular } : {}, style]} {...props} />;
};

export default function WalletHistory() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { t, isRTL } = useLanguage();
  const { theme } = useTheme();
  const { user } = useSelector((state) => state.auth);
  const { history, loading } = useSelector((state) => state.wallet);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!user?.id) return;
    try {
      await dispatch(fetchWallet({ user_id: user.id }));
      await dispatch(fetchWalletHistory({ user_id: user.id, limit: 50, offset: 0 }));
    } catch (_) {}
  }, [dispatch, user?.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}> 
        <TouchableOpacity onPress={() =>  router.push('/')} style={styles.backButton}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t("history") || "History"}
        </Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={theme.colors.primary} />
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={{ padding: 16 }}>
          <View style={{ gap: 12 }}>
            {Array.isArray(history) && history.length > 0 ? (
              history.map((tx) => {
                const isDebit = String(tx.type).toLowerCase() === "debit";
                const amount = Number(tx.amount || 0);
                const createdAt = tx.created_at ? new Date(tx.created_at) : null;
                const dateStr = createdAt ? createdAt.toLocaleString() : "";
                let subtitle = dateStr;
                try {
                  const meta = tx.metadata ? JSON.parse(tx.metadata) : null;
                  if (meta?.type === "withdrawal" && meta.phone) {
                    subtitle = `${dateStr} • ${t("toPhone") || "To"}: ${meta.phone}`;
                  }
                } catch (_) {}

                return (
                  <View key={tx.id} style={[styles.txItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}> 
                    <View style={styles.txIconWrap}>
                      <Ionicons name={isDebit ? "arrow-up-outline" : "arrow-down-outline"} size={18} color={isDebit ? "#D9534F" : "#28A745"} />
                    </View>
                    <View style={[styles.txInfo, { alignItems: isRTL ? "flex-end" : "flex-start" }]}> 
                      <Text style={[styles.txTitle, { color: theme.colors.text }]}>
                        {isDebit ? (t("withdraw") || "Withdraw") : (t("deposit") || "Deposit")}
                      </Text>
                      <Text style={[styles.txSubtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
                    </View>
                    <View style={styles.txAmountWrap}>
                      <Text style={[styles.txAmount, { color: isDebit ? "#D9534F" : theme.colors.primary }]}>
                        {isDebit ? "-" : "+"}{amount.toLocaleString()} {t("currency") || "IQD"}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={{ alignItems: "center", marginTop: 24 }}>
                <Text style={{ color: theme.colors.textSecondary }}>
                  {t("noTransactions") || "No transactions yet"}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18 },
  refreshButton: { padding: 4 },
  scrollView: { flex: 1 },
  txItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 12,
  },
  txIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  txInfo: { flex: 1 },
  txTitle: { fontSize: 14 },
  txSubtitle: { fontSize: 11 },
  txAmountWrap: { },
  txAmount: { fontSize: 14 },
});
