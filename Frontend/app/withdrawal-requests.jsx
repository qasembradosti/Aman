import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../utils/LanguageContext";
import { useTheme } from "../utils/ThemeContext";
import { useSelector } from "react-redux";
import { useResponsiveLayout } from "../utils/useResponsiveLayout";
import api from "../services/apiService";

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

const statusColors = {
  pending: { bg: "#FEF3C7", text: "#92400E", icon: "time-outline" },
  approved: { bg: "#D1FAE5", text: "#065F46", icon: "checkmark-circle" },
  rejected: { bg: "#FEE2E2", text: "#991B1B", icon: "close-circle" },
};

export default function WithdrawalRequestsScreen() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const { theme, isDark } = useTheme();
  const layout = useResponsiveLayout();
  const { user } = useSelector((state) => state.auth);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    if (!user?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get("/api/withdrawals", {
        params: { user_id: user.id },
      });
      
      if (response.data && response.data.requests) {
        setRequests(response.data.requests);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error("Failed to fetch withdrawal requests:", error);
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount) => {
    return `${Number(amount || 0).toLocaleString()} ${t("currency") || "IQD"}`;
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
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
            name={isRTL ? "arrow-back" : "arrow-forward"}
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t("withdrawalRequests") || "Withdrawal Requests"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingHorizontal: layout.containerPadding }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="document-text-outline"
              size={64}
              color={theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.emptyText,
                { color: theme.colors.textSecondary, marginTop: 16 },
              ]}
            >
              {t("noWithdrawalRequests") || "No withdrawal requests yet"}
            </Text>
          </View>
        ) : (
          <View style={{ paddingVertical: layout.spacing.md }}>
            {requests.map((request) => {
              const status = statusColors[request.status] || statusColors.pending;
              return (
                <View
                  key={request.id}
                  style={[
                    styles.requestCard,
                    {
                      backgroundColor: isDark
                        ? "rgba(30,30,30,0.85)"
                        : theme.colors.card,
                      marginBottom: layout.spacing.md,
                      padding: layout.spacing.md,
                      borderRadius: 16,
                    },
                  ]}
                >
                  {/* Header Row */}
                  <View style={styles.requestHeader}>
                    <Text
                      style={[
                        styles.requestId,
                        {
                          color: theme.colors.textSecondary,
                          fontSize: layout.typography.sm,
                        },
                      ]}
                    >
                      #{request.id}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: status.bg,
                          paddingHorizontal: 12,
                          paddingVertical: 4,
                          borderRadius: 12,
                          flexDirection: "row",
                          alignItems: "center",
                        },
                      ]}
                    >
                      <Ionicons
                        name={status.icon}
                        size={14}
                        color={status.text}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: status.text,
                            fontSize: layout.typography.xs,
                          },
                        ]}
                      >
                        {request.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Amount */}
                  <View style={{ marginVertical: layout.spacing.md }}>
                    <Text
                      style={[
                        styles.amountLabel,
                        {
                          color: theme.colors.textSecondary,
                          fontSize: layout.typography.sm,
                          marginBottom: 4,
                        },
                      ]}
                    >
                      {t("amount") || "Amount"}
                    </Text>
                    <Text
                      style={[
                        styles.amountValue,
                        {
                          color: theme.colors.primary,
                          fontSize: layout.typography["2xl"],
                        },
                      ]}
                    >
                      {formatCurrency(request.amount)}
                    </Text>
                  </View>

                  {/* Payment Details */}
                  {request.payment_details && (
                    <View
                      style={{
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.03)",
                        padding: layout.spacing.sm,
                        borderRadius: 12,
                        marginBottom: layout.spacing.sm,
                      }}
                    >
                      <Text
                        style={[
                          styles.detailLabel,
                          {
                            color: theme.colors.textSecondary,
                            fontSize: layout.typography.xs,
                            marginBottom: 4,
                          },
                        ]}
                      >
                        {t("phoneNumber") || "Phone Number"}
                      </Text>
                      <Text
                        style={[
                          styles.detailValue,
                          {
                            color: theme.colors.text,
                            fontSize: layout.typography.sm,
                          },
                        ]}
                      >
                        {typeof request.payment_details === "string"
                          ? JSON.parse(request.payment_details).phone
                          : request.payment_details.phone}
                      </Text>
                    </View>
                  )}

                  {/* Date */}
                  <View style={styles.dateRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={14}
                      color={theme.colors.textSecondary}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.dateText,
                        {
                          color: theme.colors.textSecondary,
                          fontSize: layout.typography.xs,
                        },
                      ]}
                    >
                      {formatDate(request.created_at)}
                    </Text>
                  </View>

                  {/* Admin Note (if rejected) */}
                  {request.status === "rejected" && request.admin_note && (
                    <View
                      style={{
                        marginTop: layout.spacing.sm,
                        padding: layout.spacing.sm,
                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                        borderRadius: 12,
                        borderLeftWidth: 3,
                        borderLeftColor: "#EF4444",
                      }}
                    >
                      <Text
                        style={[
                          styles.noteLabel,
                          {
                            color: "#DC2626",
                            fontSize: layout.typography.xs,
                            marginBottom: 4,
                          },
                        ]}
                      >
                        {t("adminNote") || "Admin Note"}:
                      </Text>
                      <Text
                        style={[
                          styles.noteText,
                          {
                            color: theme.colors.text,
                            fontSize: layout.typography.sm,
                          },
                        ]}
                      >
                        {request.admin_note}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
  requestCard: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  requestId: {},
  statusBadge: {},
  statusText: {},
  amountLabel: {},
  amountValue: {},
  detailLabel: {},
  detailValue: {},
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  dateText: {},
  noteLabel: {},
  noteText: {},
});
