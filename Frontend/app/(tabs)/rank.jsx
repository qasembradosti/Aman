import React, { useEffect, useMemo, useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { Text } from "../../components/ui/Text";
import apiService from "../../services/apiService";
import { useLanguage } from "../../utils/LanguageContext";
import { useTheme } from "../../utils/ThemeContext";
import { getApiBaseUrl } from "../../utils/apiConfig";
// Use theme.colors.primary instead of direct constant
import * as Haptics from "expo-haptics";

const getDisplayName = (user) => {
  const firstName = user?.first_name || user?.firstName;
  return firstName?.trim() || user?.username || "";
};

function SegmentedControl({ options, value, onChange, theme }) {
  return (
    <View
      style={[
        styles.segment,
        {
          backgroundColor: theme.colors.inputBackground,
          borderColor: theme.colors.border,
        },
      ]}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.segmentItem,
              active && {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.primary,
              },
            ]}
            onPress={() => {
              if (opt.value !== value) {
                Haptics.selectionAsync();
                onChange(opt.value);
              }
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentLabel,
                {
                  color: active
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
                },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Podium({ top3, theme }) {
  if (!top3?.length) return null;
  const [first, second, third] = top3;
  const API_BASE_URL = getApiBaseUrl();

  const getUserAvatarUrl = (user) => {
    if (user?.avatar_url) {
      return user.avatar_url.startsWith("http")
        ? user.avatar_url
        : `${API_BASE_URL}${user.avatar_url}`;
    }
    return null;
  };

  const PodiumCard = ({ user, rank, size = 64, accent = "#C0C0C0" }) => (
    <View style={[styles.podiumCard, { backgroundColor: theme.colors.card }]}>
      <View style={{ alignItems: "center" }}>
        <View style={{ position: "absolute", top: -10, zIndex: 1 }}>
          {rank === 1 ? (
            <FontAwesome6 name="crown" size={20} color="#F5C542" />
          ) : (
            <FontAwesome6
              name="medal"
              size={18}
              color={rank === 2 ? "#C0C0C0" : "#CD7F32"}
            />
          )}
        </View>
        {getUserAvatarUrl(user) ? (
          <Image
            source={{ uri: getUserAvatarUrl(user) }}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: 2,
              borderColor: accent,
            }}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="person-circle" size={size} color={accent} />
        )}
        <Text
          style={[styles.podiumName, { color: theme.colors.text }]}
          numberOfLines={1}
        >
          {getDisplayName(user)}
        </Text>
        <Text style={[styles.balance, { color: theme.colors.primary }]}>
          {Number(user.balance)}
        </Text>
      </View>
      <View style={[styles.podiumBase, rank === 1 && styles.podiumBaseFirst]}>
        <Text
          style={[
            styles.rankText,
            rank === 1 && { color: theme.colors.primary },
          ]}
        >
          {rank}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.podiumWrap}>
      {second && (
        <View style={{ flex: 1, alignItems: "center" }}>
          <PodiumCard user={second} rank={2} size={58} accent="#C0C0C0" />
        </View>
      )}
      {first && (
        <View style={{ flex: 1.2, alignItems: "center" }}>
          <PodiumCard user={first} rank={1} size={72} accent="#F5C542" />
        </View>
      )}
      {third && (
        <View style={{ flex: 1, alignItems: "center" }}>
          <PodiumCard user={third} rank={3} size={54} accent="#CD7F32" />
        </View>
      )}
    </View>
  );
}

function RankItem({ item, highlight, theme }) {
  const API_BASE_URL = getApiBaseUrl();

  const getUserAvatarUrl = (user) => {
    if (user?.avatar_url) {
      return user.avatar_url.startsWith("http")
        ? user.avatar_url
        : `${API_BASE_URL}${user.avatar_url}`;
    }
    return null;
  };

  return (
    <View style={[styles.item, { backgroundColor: theme.colors.card }]}>
      <View style={[styles.rankBadge, highlight && styles.rankBadgeHighlight]}>
        <Text style={[styles.rankText, highlight && styles.rankTextHighlight]}>
          {item.rank}
        </Text>
      </View>
      <View style={styles.avatar}>
        {getUserAvatarUrl(item) ? (
          <Image
            source={{ uri: getUserAvatarUrl(item) }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: highlight ? theme.colors.primary : "#ddd",
            }}
            resizeMode="cover"
          />
        ) : (
          <Ionicons
            name="person-circle"
            size={36}
            color={highlight ? theme.colors.primary : "#999"}
          />
        )}
      </View>
      <View style={styles.info}>
        <Text
          style={[styles.username, { color: theme.colors.text }]}
          numberOfLines={1}
        >
          {getDisplayName(item)}
        </Text>
      </View>
      <View style={styles.balanceWrap}>
        <Text style={[styles.balance, { color: theme.colors.primary }]}>
          {Number(item.balance)}
        </Text>
      </View>
    </View>
  );
}

export default function Rank() {
  const { t, isRTL } = useLanguage();
  const { theme } = useTheme();
  const currentUser = useSelector((state) => state.auth?.user);
  const [data, setData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters (UI only for now)
  const [period, setPeriod] = useState("allTime"); // 'weekly' | 'monthly' | 'yearly' | 'allTime'

  // Check if current user is admin or superadmin
  const isAdminUser = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

  const fetchLeaderboard = useCallback(
    async (selectedPeriod = period) => {
      setLoading(true);
      setError(null);
      try {
        const apiPeriod = selectedPeriod === "allTime" ? "all" : selectedPeriod; // map UI to API
        const res = await apiService.get("/api/wallet/leaderboard", {
          params: { limit: 50, period: apiPeriod },
        });
        const rows = Array.isArray(res.data) ? res.data : [];
        // Filter out admin and superadmin users and normalize
        const normalized = rows
          .filter((r) => r.role !== "superadmin" && r.role !== "admin") // Filter out admin and superadmin
          .map((r) => ({
            id: r.id,
            username: r.username,
            first_name: r.first_name || null,
            balance: r.balance,
            rank: r.rank,
            netChange: r.netChange,
            avatar_url: r.avatar_url || null,
          }));
        setData(normalized);
      } catch (e) {
        setError(e.message || "Failed to load leaderboard");
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    [period],
  );

  useEffect(() => {
    fetchLeaderboard(period);
  }, [fetchLeaderboard, period]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeaderboard(period);
    setRefreshing(false);
  };

  const top3 = useMemo(() => data.slice(0, 3), [data]);
  const rest = useMemo(() => data.slice(3), [data]);

  const periodOptions = [
    { value: "weekly", label: t?.("weekly") || "Weekly" },
    { value: "monthly", label: t?.("monthly") || "Monthly" },
    { value: "yearly", label: t?.("yearly") || "Yearly" },
    { value: "allTime", label: t?.("allTime") || "All-time" },
  ];
  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          direction: isRTL ? "rtl" : "ltr",
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t?.("rankings") || "Top Users"}</Text>
        <Text style={styles.subtitleText}>
          {t?.("leaderboardSubtitle") || "Highest wallet balances"}
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        <SegmentedControl
          options={periodOptions}
          value={period}
          onChange={setPeriod}
          theme={theme}
        />
      </View>

      {!!top3.length && (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <Podium top3={top3} theme={theme} />
        </View>
      )}

      <FlatList
        data={rest}
        keyExtractor={(item) => String(item.id) + "-" + String(item.rank)}
        renderItem={({ item }) => (
          <RankItem item={item} highlight={false} theme={theme} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 24,
          paddingTop: 4,
        }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={() => (
          <View style={styles.center}>
            <Text>
              {loading
                ? t?.("loading") || "Loading..."
                : t?.("noUsersYet") || "No users yet"}
            </Text>
          </View>
        )}
        ListFooterComponent={
          !isAdminUser ? () => (
          <View style={{ marginTop: 12 }}>
            <View style={[styles.item, { backgroundColor: theme.colors.card }]}>
              <View style={[styles.rankBadge, styles.rankBadgeHighlight]}>
                <Ionicons
                  name="person"
                  size={16}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.avatar}>
                <Ionicons name="person-circle" size={36} color="#999" />
              </View>
              <View style={styles.info}>
                <Text
                  style={[styles.username, { color: theme.colors.text }]}
                  numberOfLines={1}
                >
                  {t?.("yourPosition") || "Your position"}
                </Text>
                <Text
                  style={[
                    styles.subtitle,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  #{data.findIndex((u) => u.id === currentUser?.id) + 1} {t?.("of") || "of"}{" "}
                  {data.length}
                </Text>
                {period !== "allTime" && (
                  <Text
                    style={[
                      styles.subtitle,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {period === "weekly"
                      ? t?.("thisWeek") || "This week"
                      : period === "monthly"
                        ? t?.("thisMonth") || "This month"
                        : t?.("thisYear") || "This year"}
                    :{" "}
                    {typeof data.find(u => u.id === currentUser?.id)?.netChange === "number"
                      ? (data.find(u => u.id === currentUser?.id).netChange >= 0 ? "+" : "") +
                        "$" +
                        data.find(u => u.id === currentUser?.id).netChange.toFixed(2)
                      : "—"}
                  </Text>
                )}
              </View>
              <View style={styles.balanceWrap}>
                <Text style={[styles.balance, { color: theme.colors.primary }]}>
                  {Number(data.find(u => u.id === currentUser?.id)?.balance || 0)}
                </Text>
              </View>
            </View>
            {!!error && (
              <View style={{ marginTop: 8, alignItems: "center" }}>
                <Text
                  style={{ fontSize: 12, color: theme.colors.textSecondary }}
                >
                  {t?.("errorLoadingLeaderboard") ||
                    "Error loading leaderboard"}
                  : {error}
                </Text>
              </View>
            )}
          </View>
        ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 22 },
  subtitleText: { fontSize: 12, color: "#666", marginTop: 2 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  segment: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 2,
  },
  segmentLabel: { fontSize: 13 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFEFF8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rankBadgeHighlight: { backgroundColor: "#E8E9F8" },
  rankText: { fontSize: 16, color: "#333" },
  rankTextHighlight: {
    /* color applied inline via theme when used */
  },
  avatar: { marginRight: 12 },
  info: { flex: 1 },
  username: { fontSize: 16 },
  subtitle: { fontSize: 12 },
  balanceWrap: { marginLeft: 8 },
  balance: { fontSize: 16 /* color applied inline via theme */ },
  podiumWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingVertical: 8,
    gap: 6,
  },
  podiumCard: {
    width: "100%",
    borderRadius: 16,
    paddingTop: 16,
    paddingHorizontal: 8,
    paddingBottom: 8,
    alignItems: "center",
  },
  podiumBase: {
    marginTop: 8,
    width: "100%",
    height: 26,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: "#EFEFF8",
    alignItems: "center",
    justifyContent: "center",
  },
  podiumBaseFirst: { height: 32, backgroundColor: "#E8E9F8" },
  podiumName: { marginTop: 6, fontSize: 14 },
});
