import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/ThemeContext";
import { useLanguage } from "../utils/LanguageContext";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { fetchOrders } from "../store/slices/ordersSlice";

export default function Orders() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const dispatch = useDispatch();
  const { items: orders, loading } = useSelector((state) => state.orders);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all"); // all, pending, delivered, cancelled

  const loadOrders = useCallback(() => {
    const params = filter !== "all" ? { status: filter } : {};
    dispatch(fetchOrders(params));
  }, [filter, dispatch]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchOrders(filter !== "all" ? { status: filter } : {}));
    setRefreshing(false);
  }, [filter, dispatch]);

  const getStatusColor = (status) => {
    const colors = {
      pending: "#FFA500",
      processing: "#2196F3",
      shipped: "#9C27B0",
      delivered: "#4CAF50",
      cancelled: "#F44336",
    };
    return colors[status] || "#757575";
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: "time-outline",
      processing: "hourglass-outline",
      shipped: "car-outline",
      delivered: "checkmark-circle-outline",
      cancelled: "close-circle-outline",
    };
    return icons[status] || "information-circle-outline";
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {["all", "pending", "processing", "shipped", "delivered", "cancelled"].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              filter === status && {
                backgroundColor: theme.colors.primary,
              },
            ]}
            onPress={() => setFilter(status)}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === status ? "#fff" : theme.colors.text },
              ]}
            >
              {t(status === "all" ? "all" : status)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderOrderCard = (order) => (
    <TouchableOpacity
      key={order.id}
      style={[styles.orderCard, { backgroundColor: theme.colors.card }]}
      onPress={() => router.push(`/order/${order.id}`)}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderIdContainer}>
          <Text style={[styles.orderId, { color: theme.colors.text }]}>
            {t("order")} #{order.id}
          </Text>
          <Text style={[styles.orderDate, { color: theme.colors.textSecondary }]}>
            {formatDate(order.created_at)}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(order.status) + "20" },
          ]}
        >
          <Ionicons
            name={getStatusIcon(order.status)}
            size={14}
            color={getStatusColor(order.status)}
          />
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(order.status) },
            ]}
          >
            {t(order.status)}
          </Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Ionicons
            name="person-outline"
            size={16}
            color={theme.colors.textSecondary}
          />
          <Text style={[styles.detailText, { color: theme.colors.text }]}>
            {order.user_first_name} {order.user_last_name}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons
            name="call-outline"
            size={16}
            color={theme.colors.textSecondary}
          />
          <Text style={[styles.detailText, { color: theme.colors.text }]}>
            {order.user_phone}
          </Text>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <View style={styles.totalContainer}>
          <Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>
            {t("total")}
          </Text>
          <Text style={[styles.totalAmount, { color: theme.colors.primary }]}>
            {formatCurrency(order.total_amount)}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.viewButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => router.push(`/order/${order.id}`)}
        >
          <Text style={styles.viewButtonText}>{t("viewDetails")}</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.canGoBack?.() ? router.back() : router.replace('/(tabs)/home')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {t("orders")}
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            {t("loading")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack?.() ? router.back() : router.replace('/(tabs)/home')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t("orders")}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {renderFilterButtons()}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="bag-outline"
              size={80}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              {filter === "all" ? t("noOrdersYet") : t("noOrdersFound")}
            </Text>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {filter === "all"
                ? t("ordersWillAppearHere")
                : `${t("noOrdersFound")}`}
            </Text>
            {filter === "all" && (
              <TouchableOpacity
                style={[styles.shopButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => router.push("/products")}
              >
                <Text style={styles.shopButtonText}>{t("startShopping")}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.ordersContainer}>
            {orders.map((order) => renderOrderCard(order))}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
  },
  placeholder: {
    width: 40,
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: "#f0f0f0",
  },
  filterText: {
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  ordersContainer: {
    padding: 20,
  },
  orderCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderIdContainer: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
  },
  orderDetails: {
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 14,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 18,
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  viewButtonText: {
    color: "#fff",
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  shopButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    color: "#fff",
    fontSize: 16,
  },
});
