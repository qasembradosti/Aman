import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text as RNText,
  TextInput,
  Modal,
  I18nManager,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { useLanguage } from "../../utils/LanguageContext";
import { useTheme } from "../../utils/ThemeContext";
import { useResponsiveLayout } from "../../utils/useResponsiveLayout";
import { fetchOrders as fetchOrdersThunk } from "../../store/slices/ordersSlice";

// Use theme.colors.primary instead of direct constant

// Custom Text component with font and RTL support
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

export default function Orders() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { t, isRTL, locale } = useLanguage();
  const { theme } = useTheme();
  const layout = useResponsiveLayout();
  const [activeTab, setActiveTab] = useState("all");

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState("all"); // all, today, week, month, custom
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [sortBy, setSortBy] = useState("date-desc"); // date-desc, date-asc, price-desc, price-asc
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { items: orders, loading } = useSelector((state) => state.orders);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch orders from database via Redux
  const fetchOrders = useCallback(() => {
    if (!isAuthenticated) {
      return;
    }
    const params = activeTab !== "all" ? { status: activeTab } : {};
    dispatch(fetchOrdersThunk(params));
  }, [dispatch, activeTab, isAuthenticated]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }, [fetchOrders]);

  // Fallback mock orders removed; using real Redux orders

  // Enhanced tabs with icons and counts - use real orders data
  const tabs = [
    {
      id: "all",
      label: t("allOrders"),
      icon: "apps-outline",
      count: orders.length,
    },
    {
      id: "pending",
      label: t("pending"),
      icon: "time-outline",
      count: orders.filter((order) => order.status === "pending").length,
    },
    {
      id: "processing",
      label: t("processing"),
      icon: "sync-outline",
      count: orders.filter((order) => order.status === "processing").length,
    },
    {
      id: "inroad",
      label: t("inroad"),
      icon: "car-outline",
      count: orders.filter((order) => order.status === "shipped").length,
    },
    {
      id: "completed",
      label: t("completed"),
      icon: "checkmark-circle-outline",
      count: orders.filter((order) => order.status === "delivered" || order.status === "completed").length,
    },
    {
      id: "cancelled",
      label: t("cancelled"),
      icon: "close-circle-outline",
      count: orders.filter((order) => order.status === "cancelled").length,
    },
  ];

  // Advanced filtering logic - use real orders data
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.id.toString().toLowerCase().includes(query) ||
          order.products.some((product) =>
            product.toLowerCase().includes(query)
          ) ||
          order.status.toLowerCase().includes(query)
      );
    }

    // Status filter (tabs + advanced filters)
    if (activeTab !== "all") {
      // Map "inroad" to "shipped" and "completed" to both "delivered" and "completed"
      if (activeTab === "inroad") {
        filtered = filtered.filter((order) => order.status === "shipped");
      } else if (activeTab === "completed") {
        filtered = filtered.filter((order) => order.status === "delivered" || order.status === "completed");
      } else {
        filtered = filtered.filter((order) => order.status === activeTab);
      }
    }

    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((order) =>
        selectedStatuses.includes(order.status)
      );
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.date);

        switch (dateFilter) {
          case "today":
            return orderDate >= today;
          case "week":
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return orderDate >= weekAgo;
          case "month":
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return orderDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    // Price range filter
    if (priceRange.min || priceRange.max) {
      filtered = filtered.filter((order) => {
        const price = order.total;
        const min = priceRange.min ? parseFloat(priceRange.min) : 0;
        const max = priceRange.max ? parseFloat(priceRange.max) : Infinity;
        return price >= min && price <= max;
      });
    }

    // Sort orders
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.date) - new Date(a.date);
        case "date-asc":
          return new Date(a.date) - new Date(b.date);
        case "price-desc":
          return b.total - a.total;
        case "price-asc":
          return a.total - b.total;
        default:
          return 0;
      }
    });

    return filtered;
  }, [
    orders,
    searchQuery,
    activeTab,
    selectedStatuses,
    dateFilter,
    priceRange,
    sortBy,
  ]);

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return theme.colors.success || "#34C759";
      case "processing":
        return theme.colors.primary || "#007AFF";
      case "pending":
        return theme.colors.warning || "#FF9500";
      case "cancelled":
        return theme.colors.danger || "#FF3B30";
      case "all":
        return theme.colors.primary || "#007AFF";
      default:
        return theme.colors.textSecondary || "#666";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return "checkmark-circle";
      case "processing":
        return "sync";
      case "pending":
        return "time";
      case "cancelled":
        return "close-circle";
      default:
        return "ellipse";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "completed":
        return t("completed");
      case "processing":
        return t("processing");
      case "pending":
        return t("pending");
      case "cancelled":
        return t("cancelled");
      default:
        return status;
    }
  };

  // Currency formatter that keeps numbers LTR while the UI can be RTL
  const formatCurrency = (value) => {
    try {
      // Always format in English (US); adjust currency if needed later
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(value));
      return formatted;
    } catch {
      // Fallback if Intl is not available
      const num = typeof value === "number" ? value : parseFloat(value || 0);
      return `$${num.toFixed(2)}`;
    }
  };

  // Helper functions for filters
  const clearAllFilters = () => {
    setSearchQuery("");
    setDateFilter("all");
    setPriceRange({ min: "", max: "" });
    setSortBy("date-desc");
    setSelectedStatuses([]);
    setActiveTab("all");
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (dateFilter !== "all") count++;
    if (priceRange.min || priceRange.max) count++;
    if (selectedStatuses.length > 0) count++;
    if (sortBy !== "date-desc") count++;
    return count;
  };

  const toggleStatusFilter = (status) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  // If not authenticated, show login prompt
  if (!isAuthenticated) {
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
        <View
          style={[styles.loginPrompt, { padding: layout.containerPadding }]}
        >
          <Ionicons
            name="lock-closed-outline"
            size={layout.iconSizes["2xl"]}
            color={theme.colors.primary}
          />
          <Text
            style={[
              styles.loginTitle,
              {
                color: theme.colors.text,
                fontSize: layout.typography["3xl"],
                marginTop: layout.spacing.lg,
                marginBottom: layout.spacing.xs,
                textAlign: "center",
              },
            ]}
          >
            {t("loginRequired")}
          </Text>
          <Text
            style={[
              styles.loginText,
              {
                color: theme.colors.textSecondary,
                fontSize: layout.typography.lg,
                textAlign: "center",
                marginBottom: layout.spacing.xl,
                lineHeight: layout.typography.lg * 1.4,
              },
            ]}
          >
            {t("pleaseLoginToViewOrders")}
          </Text>
          <TouchableOpacity
            style={[
              styles.loginButton,
              {
                backgroundColor: theme.colors.primary,
                paddingVertical: layout.spacing.md,
                paddingHorizontal: layout.spacing.xl,
                borderRadius: layout.borderRadius.md,
                marginBottom: layout.spacing.sm,
                width: layout.isTablet ? "60%" : "80%",
                minHeight: layout.touchTargets.lg,
                justifyContent: "center",
              },
            ]}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text
              style={[
                styles.loginButtonText,
                {
                  fontSize: layout.typography.lg,
                },
              ]}
            >
              {t("login")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.registerButton,
              {
                borderColor: theme.colors.primary,
                backgroundColor: theme.colors.card,
                paddingVertical: layout.spacing.md,
                paddingHorizontal: layout.spacing.xl,
                borderRadius: layout.borderRadius.md,
                borderWidth: 1,
                width: layout.isTablet ? "60%" : "80%",
                minHeight: layout.touchTargets.lg,
                justifyContent: "center",
              },
            ]}
            onPress={() => router.push("/(auth)/register")}
          >
            <Text
              style={[
                styles.registerButtonText,
                {
                  color: theme.colors.primary,
                  fontSize: layout.typography.lg,
                },
              ]}
            >
              {t("createAccount")}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.card,
            paddingHorizontal: layout.containerPadding,
            paddingTop: layout.spacing.lg,
            paddingBottom: layout.spacing.md,
          },
        ]}
      >
        <View
          style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: layout.spacing.lg,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.headerTitle,
                {
                  fontSize: layout.typography["3xl"],
                  
                  color: theme.colors.text,
                  textAlign: isRTL ? "right" : "left",
                  marginBottom: layout.spacing.xs,
                  letterSpacing: -0.5,
                },
              ]}
            >
              {t("orders")}
            </Text>
            <View
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                gap: layout.spacing.xs,
              }}
            >
              <View
                style={{
                  backgroundColor: theme.colors.primary + "15",
                  paddingHorizontal: layout.spacing.sm,
                  paddingVertical: 4,
                  borderRadius: layout.borderRadius.md,
                }}
              >
                <Text
                  style={{
                    fontSize: layout.typography.xs,
                    
                    color: theme.colors.primary,
                  }}
                >
                  {filteredOrders.length} {filteredOrders.length === 1 ? t("order") : t("orders")}
                </Text>
              </View>
              {getActiveFilterCount() > 0 && (
                <View
                  style={{
                    backgroundColor: theme.colors.warning + "15",
                    paddingHorizontal: layout.spacing.sm,
                    paddingVertical: 4,
                    borderRadius: layout.borderRadius.md,
                  }}
                >
                  <Text
                    style={{
                      fontSize: layout.typography.xs,
                      
                      color: theme.colors.warning,
                    }}
                  >
                    {getActiveFilterCount()} {t("filters")}
                  </Text>
                </View>
              )}
            </View>
          </View>
          {isAuthenticated && orders.length > 0 && (
            <TouchableOpacity
              style={{
                padding: layout.spacing.sm,
                borderRadius: layout.borderRadius.xl,
                backgroundColor:
                  getActiveFilterCount() > 0
                    ? theme.colors.primary
                    : theme.colors.background,
                borderWidth: 1,
                borderColor: getActiveFilterCount() > 0 ? theme.colors.primary : theme.colors.border,
                minWidth: 48,
                minHeight: 48,
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={() => setShowFilters(true)}
            >
              <Ionicons
                name={getActiveFilterCount() > 0 ? "funnel" : "funnel-outline"}
                size={22}
                color={
                  getActiveFilterCount() > 0
                    ? "#fff"
                    : theme.colors.text
                }
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Bar */}
        {isAuthenticated && orders.length > 0 && (
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: theme.colors.background,
                borderRadius: layout.borderRadius.xl,
                paddingHorizontal: layout.spacing.md,
                paddingVertical: layout.spacing.sm,
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                borderWidth: 2,
                borderColor: searchQuery
                  ? theme.colors.primary
                  : theme.colors.border,
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={layout.iconSizes.md}
              color={
                searchQuery ? theme.colors.primary : theme.colors.textSecondary
              }
              style={{
                marginRight: isRTL ? layout.spacing.sm : 0,
                marginLeft: isRTL ? 0 : layout.spacing.sm,
              }}
            />
            <TextInput
              style={[
                styles.searchInput,
                {
                  flex: 1,
                  fontSize: layout.typography.md,
                  color: theme.colors.text,
                  textAlign: isRTL ? "right" : "left",
                },
              ]}
              placeholder={t("searchOrders")}
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery && (
              <TouchableOpacity
                style={{ padding: layout.spacing.xs }}
                onPress={() => setSearchQuery("")}
              >
                <Ionicons
                  name="close-circle"
                  size={layout.iconSizes.md}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={styles.content}>
        {/* Enhanced Tabs */}
        <View
          style={[
            styles.tabsContainer,
            {
              backgroundColor: theme.colors.background,
              paddingVertical: layout.spacing.sm,
              paddingHorizontal: layout.containerPadding,
              borderBottomWidth: 0,
            },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: layout.spacing.xs,
              alignItems: "center",
            }}
          >
            {tabs.map((tab, index) => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tab,
                  {
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: layout.spacing.sm,
                    paddingHorizontal: layout.spacing.md,
                    borderRadius: layout.borderRadius.xl,
                    backgroundColor:
                      activeTab === tab.id
                        ? theme.colors.primary
                        : theme.colors.card,
                    height: 44,
                    borderWidth: 1,
                    borderColor: activeTab === tab.id ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setActiveTab(tab.id)}
              >
                <View
                  style={{
                    position: "relative",
                    marginRight: isRTL ? 0 : layout.spacing.xs,
                    marginLeft: isRTL ? layout.spacing.xs : 0,
                  }}
                >
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor:
                        activeTab === tab.id
                          ? "#fff" + "20"
                          : getStatusColor(tab.id) + "15",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name={tab.icon}
                      size={16}
                      style={{ borderRadius: 2 }}
                      color={
                        activeTab === tab.id ? "#fff" : getStatusColor(tab.id)
                      }
                    />
                  </View>
                  {/* Count Badge */}
                  {tab.count > 0 && (
                    <View
                      style={{
                        position: "absolute",
                        top: -3,
                        right: -3,
                        backgroundColor:
                          activeTab === tab.id ? "#fff" : theme.colors.primary,
                        borderRadius: 8,
                        minWidth: 16,
                        height: 16,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 3,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            activeTab === tab.id
                              ? theme.colors.primary
                              : "#fff",
                          fontSize: 9,
                        }}
                      >
                        {tab.count > 99 ? "99+" : tab.count}
                      </Text>
                    </View>
                  )}
                </View>

                <Text
                  style={[
                    styles.tabText,
                    {
                      fontSize: layout.typography.xs,
                      color: activeTab === tab.id ? "#fff" : theme.colors.text,
                      textAlign: "center",
                      maxWidth: layout.isTablet ? 80 : 60,
                    },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Orders List */}
        <ScrollView
          style={[
            styles.scrollView,
            {
              backgroundColor: theme.colors.background,
            },
          ]}
          contentContainerStyle={{
            paddingHorizontal: layout.containerPadding,
            paddingTop: layout.spacing.md,
            paddingBottom: layout.spacing.xl,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
        >
          {loading && !refreshing ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text
                style={{
                  marginTop: 12,
                  color: theme.colors.textSecondary,
                  fontSize: 14,
                }}
              >
                {t("loadingOrders") || "Loading orders..."}
              </Text>
            </View>
          ) : filteredOrders.length === 0 ? (
            <View
              style={[
                styles.emptyState,
                {
                  paddingTop: layout.spacing["5xl"],
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
            >
              <Ionicons
                name={
                  activeTab === "all" ? "receipt-outline" : "filter-outline"
                }
                size={layout.iconSizes["2xl"]}
                color={theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.emptyTitle,
                  {
                    fontSize: layout.typography["2xl"],

                    color: theme.colors.text,
                    marginTop: layout.spacing.lg,
                    marginBottom: layout.spacing.xs,
                    textAlign: "center",
                  },
                ]}
              >
                {activeTab === "all"
                  ? t("noOrdersYet")
                  : t("noOrdersInCategory", {
                      category: getStatusText(activeTab),
                    })}
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  {
                    fontSize: layout.typography.md,
                    color: theme.colors.textSecondary,
                    textAlign: "center",
                    lineHeight: layout.typography.md * 1.4,
                    paddingHorizontal: layout.spacing.lg,
                  },
                ]}
              >
                {activeTab === "all"
                  ? t("ordersWillAppearHere")
                  : t("noOrdersInCategoryDesc", {
                      status: getStatusText(activeTab).toLowerCase(),
                    })}
              </Text>
            </View>
          ) : (
            filteredOrders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={[
                  styles.orderCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderRadius: layout.borderRadius.xl,
                    padding: layout.spacing.lg,
                    marginBottom: layout.spacing.md,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    flexDirection: "column",
                  },
                ]}
                onPress={() => setSelectedOrder(order)}
              >
                <View
                  style={[
                    styles.orderHeader,
                    {
                      flexDirection: "row",
                      marginBottom: layout.spacing.sm,
                    },
                  ]}
                >
                  <View
                    style={{
                      flex: 1,
                      paddingRight: isRTL ? 0 : layout.spacing.sm,
                      paddingLeft: isRTL ? layout.spacing.sm : 0,
                    }}
                  >
                    <Text
                      style={[
                        styles.orderId,
                        {
                          fontSize: layout.typography.lg,
                          color: theme.colors.text,
                          marginBottom: layout.spacing.xs / 2,
                        },
                      ]}
                    >
                      {order.id}
                    </Text>
                    <Text
                      style={[
                        styles.orderDate,
                        {
                          fontSize: layout.typography.sm,
                          color: theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {formatDate(order.date)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: getStatusColor(order.status) + "20",
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: layout.spacing.xs / 2,
                        paddingHorizontal: layout.spacing.sm,
                        borderRadius: layout.borderRadius.xl,
                        gap: layout.spacing.xs / 2,
                      },
                    ]}
                  >
                    <Ionicons
                      name={getStatusIcon(order.status)}
                      size={layout.iconSizes.sm}
                      color={getStatusColor(order.status)}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: getStatusColor(order.status),
                          fontSize: layout.typography.xs,
                        },
                      ]}
                    >
                      {getStatusText(order.status)}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.orderDivider,
                    {
                      height: StyleSheet.hairlineWidth,
                      backgroundColor: theme.colors.border,
                      marginVertical: layout.spacing.sm,
                    },
                  ]}
                />

                <View
                  style={[
                    styles.orderDetails,
                    {
                      marginBottom: layout.spacing.sm,
                      width: "100%",
                    },
                  ]}
                >
                  {/* Product Preview */}
                  <View
                    style={{
                      marginBottom: layout.spacing.sm,
                      width: "100%",
                    }}
                  >
                    <Text
                      style={[
                        styles.orderLabel,
                        {
                          fontSize: layout.typography.sm,
                          color: theme.colors.textSecondary,
                          marginBottom: layout.spacing.xs / 2,
                        },
                      ]}
                    >
                      {t("products")}:
                    </Text>
                    <Text
                      style={[
                        styles.productPreview,
                        {
                          fontSize: layout.typography.sm,
                          color: theme.colors.text,
                          lineHeight: layout.typography.sm * 1.3,
                        },
                      ]}
                    >
                      {order.products.length > 2
                        ? `${order.products.slice(0, 2).join(", ")} +${
                            order.products.length - 2
                          } ${t("more")}`
                        : order.products.join(", ")}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.orderRow,
                      {
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: layout.spacing.xs,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.orderLabel,
                        {
                          fontSize: layout.typography.md,
                          color: theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {t("items")}:
                    </Text>
                    <Text
                      style={[
                        styles.orderValue,
                        {
                          fontSize: layout.typography.md,
                          color: theme.colors.text,
                        },
                      ]}
                    >
                      {order.items} {order.items === 1 ? t("item") : t("items")}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.orderRow,
                      {
                        flexDirection: "row",
                        alignItems: "center",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.orderLabel,
                        {
                          fontSize: layout.typography.md,
                          color: theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {t("total")}:
                    </Text>
                    <Text
                      style={[
                        styles.orderTotal,
                        {
                          color: theme.colors.primary,
                          fontSize: layout.typography.lg,
                          writingDirection: "ltr",
                        },
                      ]}
                    >
                      {formatCurrency(order.total)}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.viewDetailsButton,
                    {
                      flexDirection: isRTL ? "row-reverse" : "row",
                      alignItems: "center",
                      direction: isRTL ? "rtl" : "ltr",
                      justifyContent: isRTL ? "flex-end" : "flex-start",
                      paddingTop: layout.spacing.sm,
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: theme.colors.border,
                      minHeight: layout.touchTargets.md,
                      width: "100%",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.viewDetailsText,
                      {
                        color: theme.colors.primary,
                        fontSize: layout.typography.md,
                        marginRight: isRTL ? 0 : layout.spacing.xs / 2,
                        marginLeft: isRTL ? layout.spacing.xs / 2 : 0,
                        textAlign: isRTL ? "right" : "left",
                      },
                    ]}
                  >
                    {t("viewDetails")}
                  </Text>
                  <Ionicons
                    name={isRTL ? "chevron-back" : "chevron-forward"}
                    size={layout.iconSizes.md}
                    color={theme.colors.primary}
                  />
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      {/* Order Details Modal */}
      <Modal
        visible={!!selectedOrder}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedOrder(null)}
      >
        {selectedOrder && (
          <SafeAreaView
            style={[
              styles.modalContainer,
              {
                backgroundColor: theme.colors.background,
              },
            ]}
          >
            {/* Order Details Header */}
            <View
              style={[
                styles.modalHeader,
                {
                  backgroundColor: theme.colors.card,
                  paddingHorizontal: layout.containerPadding,
                  paddingTop: layout.spacing.md,
                  paddingBottom: layout.spacing.lg,
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                },
              ]}
            >
              <TouchableOpacity
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: layout.borderRadius.lg,
                  backgroundColor: theme.colors.background,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
                onPress={() => setSelectedOrder(null)}
              >
                <Ionicons
                  name={isRTL ? "chevron-forward" : "chevron-back"}
                  size={24}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
              
              <View style={{ flex: 1, alignItems: "center", paddingHorizontal: layout.spacing.md }}>
                <View
                  style={{
                    backgroundColor: getStatusColor(selectedOrder.status) + "15",
                    paddingHorizontal: layout.spacing.md,
                    paddingVertical: 6,
                    borderRadius: layout.borderRadius.xl,
                    marginBottom: layout.spacing.xs,
                  }}
                >
                  <Text
                    style={{
                      fontSize: layout.typography.xs,
                      
                      color: getStatusColor(selectedOrder.status),
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {selectedOrder.status}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: layout.typography.xl,
                    
                    color: theme.colors.text,
                    textAlign: "center",
                    marginBottom: 2,
                  }}
                >
                  {selectedOrder.id}
                </Text>
                <Text
                  style={{
                    fontSize: layout.typography.sm,
                    color: theme.colors.textSecondary,
                    textAlign: "center",
                  }}
                >
                  {formatDate(selectedOrder.date)}
                </Text>
              </View>
              
              <TouchableOpacity
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: layout.borderRadius.lg,
                  backgroundColor: theme.colors.primary + "15",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={() => {
                  // Share or export functionality
                }}
              >
                <Ionicons
                  name="share-social"
                  size={20}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Order Status Card */}
              <View
                style={{
                  marginHorizontal: layout.containerPadding,
                  marginTop: layout.spacing.lg,
                  marginBottom: layout.spacing.md,
                  backgroundColor: theme.colors.card,
                  borderRadius: layout.borderRadius.xl,
                  padding: layout.spacing.lg,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <View
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "flex-start",
                    marginBottom: layout.spacing.md,
                  }}
                >
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor:
                        getStatusColor(selectedOrder.status) + "15",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: isRTL ? 0 : layout.spacing.md,
                      marginLeft: isRTL ? layout.spacing.md : 0,
                    }}
                  >
                    <Ionicons
                      name={getStatusIcon(selectedOrder.status)}
                      size={28}
                      color={getStatusColor(selectedOrder.status)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: isRTL ? "row-reverse" : "row",
                        alignItems: "center",
                        marginBottom: layout.spacing.xs,
                        gap: layout.spacing.xs,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: layout.typography.xl,
                          
                          color: theme.colors.text,
                          textAlign: isRTL ? "right" : "left",
                        }}
                      >
                        {getStatusText(selectedOrder.status)}
                      </Text>
                      <View
                        style={{
                          backgroundColor:
                            getStatusColor(selectedOrder.status) + "20",
                          paddingVertical: 4,
                          paddingHorizontal: layout.spacing.sm,
                          borderRadius: layout.borderRadius.md,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            
                            color: getStatusColor(selectedOrder.status),
                          }}
                        >
                          {selectedOrder.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={{
                        fontSize: layout.typography.sm,
                        color: theme.colors.textSecondary,
                        textAlign: isRTL ? "right" : "left",
                        lineHeight: layout.typography.sm * 1.4,
                      }}
                    >
                      {t("orderPlaced")} {formatDate(selectedOrder.date)}
                    </Text>
                  </View>
                </View>

                {/* Progress Tracker */}
                <View
                  style={{
                    backgroundColor: theme.colors.background,
                    borderRadius: layout.borderRadius.lg,
                    padding: layout.spacing.lg,
                  }}
                >
                  <Text
                    style={{
                      fontSize: layout.typography.md,
                      
                      color: theme.colors.text,
                      marginBottom: layout.spacing.lg,
                      textAlign: isRTL ? "right" : "left",
                    }}
                  >
                    {t("orderProgress")}
                  </Text>

                  {[
                    {
                      status: "pending",
                      label: t("orderReceived"),
                      icon: "checkmark-circle",
                    },
                    {
                      status: "processing",
                      label: t("processing"),
                      icon: "sync",
                    },
                    {
                      status: "shipped",
                      label: t("shipped"),
                      icon: "airplane",
                    },
                    {
                      status: "inroad",
                      label: t("inroad"),
                      icon: "car",
                    },
                    {
                      status: "completed",
                      label: t("delivered"),
                      icon: "checkmark-done",
                    },
                  ].map((step, index) => {
                    const isActive =
                      ["pending", "processing", "inroad", "completed"].includes(
                        selectedOrder.status
                      ) &&
                      (index === 0 ||
                        (index === 1 &&
                          ["processing", "inroad", "completed"].includes(
                            selectedOrder.status
                          )) ||
                        (index === 2 && ["inroad", "completed"].includes(selectedOrder.status)) ||
                        (index === 3 && ["inroad", "completed"].includes(selectedOrder.status)) ||
                        (index === 4 && selectedOrder.status === "completed"));

                    const isCompleted =
                      index === 0 ||
                      (index === 1 &&
                        ["processing", "inroad", "completed"].includes(
                          selectedOrder.status
                        )) ||
                      (index === 2 && ["inroad", "completed"].includes(selectedOrder.status)) ||
                      (index === 3 && ["inroad", "completed"].includes(selectedOrder.status)) ||
                      (index === 4 && selectedOrder.status === "completed");

                    return (
                      <View
                        key={step.status}
                        style={{
                          flexDirection: isRTL ? "row-reverse" : "row",
                          alignItems: "center",
                          marginBottom: index < 4 ? layout.spacing.lg : 0,
                          position: "relative",
                        }}
                      >
                        {/* Connector Line */}
                        {index < 4 && (
                          <View
                            style={{
                              position: "absolute",
                              left: isRTL ? undefined : 15,
                              right: isRTL ? 15 : undefined,
                              top: 36,
                              width: 2,
                              height: layout.spacing.lg + 4,
                              backgroundColor: isCompleted
                                ? theme.colors.primary
                                : theme.colors.border,
                            }}
                          />
                        )}
                        
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: isCompleted
                              ? theme.colors.primary
                              : theme.colors.card,
                            borderWidth: isCompleted ? 0 : 2,
                            borderColor: theme.colors.border,
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: isRTL ? 0 : layout.spacing.md,
                            marginLeft: isRTL ? layout.spacing.md : 0,
                            zIndex: 1,
                          }}
                        >
                          <Ionicons
                            name={step.icon}
                            size={18}
                            color={
                              isCompleted ? "#fff" : theme.colors.textSecondary
                            }
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: layout.typography.md,
                              fontWeight: isCompleted ? "600" : "400",
                              color: isCompleted
                                ? theme.colors.text
                                : theme.colors.textSecondary,
                              textAlign: isRTL ? "right" : "left",
                            }}
                          >
                            {step.label}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Products List */}
              <View
                style={{
                  marginHorizontal: layout.containerPadding,
                  marginBottom: layout.spacing.md,
                  backgroundColor: theme.colors.card,
                  borderRadius: layout.borderRadius.xl,
                  padding: layout.spacing.lg,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <View
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: layout.spacing.lg,
                  }}
                >
                  <Text
                    style={{
                      fontSize: layout.typography.lg,
                      
                      color: theme.colors.text,
                      textAlign: isRTL ? "right" : "left",
                    }}
                  >
                    {t("orderItems")}
                  </Text>
                  <View
                    style={{
                      backgroundColor: theme.colors.primary + "15",
                      paddingVertical: 4,
                      paddingHorizontal: layout.spacing.sm,
                      borderRadius: layout.borderRadius.md,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: layout.typography.xs,
                        
                        color: theme.colors.primary,
                      }}
                    >
                      {selectedOrder.items} {selectedOrder.items === 1 ? t("item") : t("items")}
                    </Text>
                  </View>
                </View>

                {selectedOrder.products.map((product, index) => (
                  <View
                    key={index}
                    style={{
                      flexDirection: isRTL ? "row-reverse" : "row",
                      alignItems: "center",
                      paddingVertical: layout.spacing.md,
                      borderBottomWidth:
                        index < selectedOrder.products.length - 1
                          ? StyleSheet.hairlineWidth
                          : 0,
                      borderBottomColor: theme.colors.border,
                    }}
                  >
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: layout.borderRadius.lg,
                        backgroundColor: theme.colors.background,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: isRTL ? 0 : layout.spacing.md,
                        marginLeft: isRTL ? layout.spacing.md : 0,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                      }}
                    >
                      <Text
                        style={{ fontSize: 28, color: theme.colors.primary }}
                      >
                        📦
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: layout.typography.md,
                          
                          color: theme.colors.text,
                          marginBottom: layout.spacing.xs / 2,
                          textAlign: isRTL ? "right" : "left",
                        }}
                      >
                        {product}
                      </Text>
                      <View
                        style={{
                          flexDirection: isRTL ? "row-reverse" : "row",
                          alignItems: "center",
                          gap: layout.spacing.sm,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: layout.typography.sm,
                            color: theme.colors.textSecondary,
                          }}
                        >
                          {t("quantity")}: 1
                        </Text>
                        <View
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: theme.colors.textSecondary,
                          }}
                        />
                        <Text
                          style={{
                            fontSize: layout.typography.sm,
                            color: theme.colors.primary,
                            
                          }}
                        >
                          {formatCurrency(selectedOrder.total / selectedOrder.items)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* Order Summary */}
              <View
                style={{
                  marginHorizontal: layout.containerPadding,
                  marginBottom: layout.spacing.md,
                  backgroundColor: theme.colors.card,
                  borderRadius: layout.borderRadius.xl,
                  padding: layout.spacing.lg,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: layout.typography.lg,
                    
                    color: theme.colors.text,
                    marginBottom: layout.spacing.lg,
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
                  {t("orderSummary")}
                </Text>
                {[
                  {
                    label: t("subtotal"),
                    value: formatCurrency(selectedOrder.total * 0.9),
                    icon: "receipt-outline",
                  },
                  {
                    label: t("shipping"),
                    value: formatCurrency(selectedOrder.total * 0.05),
                    icon: "car-outline",
                  },
                  {
                    label: t("tax"),
                    value: formatCurrency(selectedOrder.total * 0.05),
                    icon: "document-text-outline",
                  },
                ].map((item, index) => (
                  <View
                    key={index}
                    style={{
                      flexDirection: isRTL ? "row-reverse" : "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: layout.spacing.sm,
                      backgroundColor: theme.colors.background,
                      paddingHorizontal: layout.spacing.md,
                      borderRadius: layout.borderRadius.md,
                      marginBottom: layout.spacing.xs,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: isRTL ? "row-reverse" : "row",
                        alignItems: "center",
                        gap: layout.spacing.sm,
                      }}
                    >
                      <Ionicons
                        name={item.icon}
                        size={18}
                        color={theme.colors.textSecondary}
                      />
                      <Text
                        style={{
                          fontSize: layout.typography.md,
                          color: theme.colors.text,
                          textAlign: isRTL ? "right" : "left",
                        }}
                      >
                        {item.label}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: layout.typography.md,
                        
                        color: theme.colors.text,
                        textAlign: isRTL ? "right" : "left",
                        writingDirection: "ltr",
                      }}
                    >
                      {item.value}
                    </Text>
                  </View>
                ))}

                <View
                  style={{
                    paddingTop: layout.spacing.md,
                    marginTop: layout.spacing.sm,
                    borderTopWidth: 2,
                    borderTopColor: theme.colors.border,
                    flexDirection: isRTL ? "row-reverse" : "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: theme.colors.primary + "10",
                    paddingHorizontal: layout.spacing.md,
                    paddingVertical: layout.spacing.md,
                    borderRadius: layout.borderRadius.lg,
                  }}
                >
                  <Text
                    style={{
                      fontSize: layout.typography.xl,
                      
                      color: theme.colors.text,
                      textAlign: isRTL ? "right" : "left",
                    }}
                  >
                    {t("total")}
                  </Text>
                  <Text
                    style={{
                      fontSize: layout.typography["2xl"],
                      
                      color: theme.colors.primary,
                      textAlign: isRTL ? "right" : "left",
                      writingDirection: "ltr",
                    }}
                  >
                    {formatCurrency(selectedOrder.total)}
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View
                style={{
                  marginHorizontal: layout.containerPadding,
                  marginBottom: layout.spacing["2xl"],
                  gap: layout.spacing.sm,
                }}
              >
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.colors.card,
                    paddingVertical: layout.spacing.md,
                    borderRadius: layout.borderRadius.xl,
                    alignItems: "center",
                    flexDirection: isRTL ? "row-reverse" : "row",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={layout.iconSizes.md}
                    color={theme.colors.primary}
                    style={{
                      marginRight: isRTL ? 0 : layout.spacing.sm,
                      marginLeft: isRTL ? layout.spacing.sm : 0,
                    }}
                  />
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: layout.typography.lg,
                      
                      textAlign: isRTL ? "right" : "left",
                    }}
                  >
                    {t("contactSupport")}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* Advanced Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <SafeAreaView
          style={[
            styles.modalContainer,
            {
              backgroundColor: theme.colors.background,
            },
          ]}
        >
          {/* Modal Header */}
          <View
            style={[
              styles.modalHeader,
              {
                backgroundColor: theme.colors.card,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.colors.border,
                paddingHorizontal: layout.containerPadding,
                paddingVertical: layout.spacing.md,
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                justifyContent: "space-between",
              },
            ]}
          >
            <TouchableOpacity
              style={{ padding: layout.spacing.xs }}
              onPress={() => setShowFilters(false)}
            >
              <Ionicons
                name="close"
                size={layout.iconSizes.lg}
                color={theme.colors.text}
              />
            </TouchableOpacity>
            <Text
              style={{
                fontSize: layout.typography.xl,

                color: theme.colors.text,
                flex: 1,
                textAlign: "center",
              }}
            >
              {t("filters")}
            </Text>
            <TouchableOpacity
              style={{ padding: layout.spacing.xs }}
              onPress={clearAllFilters}
            >
              <Text
                style={{
                  color: theme.colors.primary,
                  fontSize: layout.typography.md,
                }}
              >
                {t("clear")}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, padding: layout.containerPadding }}>
            {/* Sort Section */}
            <View
              style={[
                styles.filterSection,
                {
                  marginBottom: layout.spacing.xl,
                },
              ]}
            >
              <View
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  marginBottom: layout.spacing.lg,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: theme.colors.primary + "15",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: isRTL ? 0 : layout.spacing.sm,
                    marginLeft: isRTL ? layout.spacing.sm : 0,
                  }}
                >
                  <Ionicons
                    name="swap-vertical-outline"
                    size={18}
                    color={theme.colors.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.filterTitle,
                    {
                      fontSize: layout.typography.lg,

                      color: theme.colors.text,
                    },
                  ]}
                >
                  {t("sortBy")}
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: theme.colors.card,
                  borderRadius: layout.borderRadius.xl,
                  padding: layout.spacing.sm,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: layout.spacing.xs }}
                >
                  {[
                    {
                      value: "date-desc",
                      label: t("newestFirst"),
                      icon: "calendar-outline",
                    },
                    {
                      value: "date-asc",
                      label: t("oldestFirst"),
                      icon: "calendar",
                    },
                    {
                      value: "price-desc",
                      label: t("highestPrice"),
                      icon: "trending-up",
                    },
                    {
                      value: "price-asc",
                      label: t("lowestPrice"),
                      icon: "trending-down",
                    },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.sortOption,
                        {
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          paddingVertical: layout.spacing.sm,
                          paddingHorizontal: layout.spacing.md,
                          borderRadius: layout.borderRadius.lg,
                          backgroundColor:
                            sortBy === option.value
                              ? theme.colors.primary
                              : "transparent",
                          minHeight: 40,
                        },
                      ]}
                      onPress={() => setSortBy(option.value)}
                    >
                      <Ionicons
                        name={option.icon}
                        size={18}
                        color={
                          sortBy === option.value
                            ? "#fff"
                            : theme.colors.primary
                        }
                        style={{
                          marginRight: isRTL ? 0 : layout.spacing.xs,
                          marginLeft: isRTL ? layout.spacing.xs : 0,
                        }}
                      />
                      <Text
                        style={{
                          fontSize: layout.typography.sm,
                          color:
                            sortBy === option.value
                              ? "#fff"
                              : theme.colors.text,
                        }}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Date Filter Section */}
            <View
              style={[
                styles.filterSection,
                {
                  marginBottom: layout.spacing.xl,
                },
              ]}
            >
              <View
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  marginBottom: layout.spacing.lg,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: theme.colors.warning + "15",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: isRTL ? 0 : layout.spacing.sm,
                    marginLeft: isRTL ? layout.spacing.sm : 0,
                  }}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={theme.colors.warning || "#FF9500"}
                  />
                </View>
                <Text
                  style={[
                    styles.filterTitle,
                    {
                      fontSize: layout.typography.lg,

                      color: theme.colors.text,
                    },
                  ]}
                >
                  {t("dateRange")}
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: theme.colors.card,
                  borderRadius: layout.borderRadius.xl,
                  padding: layout.spacing.sm,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: layout.spacing.xs }}
                >
                  {[
                    {
                      value: "all",
                      label: t("allTime"),
                      icon: "infinite",
                      color: theme.colors.textSecondary,
                    },
                    {
                      value: "today",
                      label: t("today"),
                      icon: "today",
                      color: theme.colors.success,
                    },
                    {
                      value: "week",
                      label: t("pastWeek"),
                      icon: "calendar-outline",
                      color: theme.colors.primary,
                    },
                    {
                      value: "month",
                      label: t("pastMonth"),
                      icon: "calendar",
                      color: theme.colors.warning,
                    },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.dateOption,
                        {
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          paddingVertical: layout.spacing.sm,
                          paddingHorizontal: layout.spacing.md,
                          borderRadius: layout.borderRadius.lg,
                          backgroundColor:
                            dateFilter === option.value
                              ? option.color || theme.colors.primary
                              : "transparent",
                          minHeight: 40,
                        },
                      ]}
                      onPress={() => setDateFilter(option.value)}
                    >
                      <Ionicons
                        name={option.icon}
                        size={18}
                        color={
                          dateFilter === option.value
                            ? "#fff"
                            : option.color || theme.colors.primary
                        }
                        style={{
                          marginRight: isRTL ? 0 : layout.spacing.xs,
                          marginLeft: isRTL ? layout.spacing.xs : 0,
                        }}
                      />
                      <Text
                        style={{
                          fontSize: layout.typography.sm,
                          color:
                            dateFilter === option.value
                              ? "#fff"
                              : theme.colors.text,
                        }}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Price Range Section */}
            <View
              style={[
                styles.filterSection,
                {
                  marginBottom: layout.spacing.xl,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterTitle,
                  {
                    fontSize: layout.typography.lg,

                    color: theme.colors.text,
                    marginBottom: layout.spacing.md,
                  },
                ]}
              >
                {t("priceRange")}
              </Text>
              <View
                style={[
                  styles.priceRangeContainer,
                  {
                    flexDirection: "column",
                    gap: layout.spacing.lg,
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    backgroundColor: theme.colors.card,
                    borderRadius: layout.borderRadius.xl,
                    padding: layout.spacing.lg,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: theme.colors.primary + "15",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: isRTL ? 0 : layout.spacing.md,
                      marginLeft: isRTL ? layout.spacing.md : 0,
                    }}
                  >
                    <Ionicons
                      name="arrow-up"
                      size={20}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: layout.typography.sm,
                        color: theme.colors.textSecondary,
                        marginBottom: layout.spacing.xs,
                      }}
                    >
                      {t("minimumPrice")}
                    </Text>
                    <TextInput
                      style={[
                        styles.priceInput,
                        {
                          backgroundColor: "transparent",
                          borderWidth: 0,
                          padding: 0,
                          fontSize: layout.typography.lg,
                          color: theme.colors.text,
                        },
                      ]}
                      placeholder={t("minPrice")}
                      placeholderTextColor={theme.colors.textSecondary}
                      value={priceRange.min}
                      onChangeText={(text) =>
                        setPriceRange((prev) => ({ ...prev, min: text }))
                      }
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    backgroundColor: theme.colors.card,
                    borderRadius: layout.borderRadius.xl,
                    padding: layout.spacing.lg,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: theme.colors.primary + "15",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: isRTL ? 0 : layout.spacing.md,
                      marginLeft: isRTL ? layout.spacing.md : 0,
                    }}
                  >
                    <Ionicons
                      name="arrow-down"
                      size={20}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: layout.typography.sm,
                        color: theme.colors.textSecondary,
                        marginBottom: layout.spacing.xs,
                      }}
                    >
                      {t("maximumPrice")}
                    </Text>
                    <TextInput
                      style={[
                        styles.priceInput,
                        {
                          backgroundColor: "transparent",
                          borderWidth: 0,
                          padding: 0,
                          fontSize: layout.typography.lg,
                          color: theme.colors.text,
                        },
                      ]}
                      placeholder={t("maxPrice")}
                      placeholderTextColor={theme.colors.textSecondary}
                      value={priceRange.max}
                      onChangeText={(text) =>
                        setPriceRange((prev) => ({ ...prev, max: text }))
                      }
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Status Filter Section */}
            <View
              style={[
                styles.filterSection,
                {
                  marginBottom: layout.spacing.xl,
                },
              ]}
            >
              <View
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  marginBottom: layout.spacing.lg,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: theme.colors.success + "15",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: isRTL ? 0 : layout.spacing.sm,
                    marginLeft: isRTL ? layout.spacing.sm : 0,
                  }}
                >
                  <Ionicons
                    name="layers-outline"
                    size={18}
                    color={theme.colors.success || "#34C759"}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.filterTitle,
                      {
                        fontSize: layout.typography.lg,

                        color: theme.colors.text,
                      },
                    ]}
                  >
                    {t("status")}
                  </Text>
                  <Text
                    style={{
                      fontSize: layout.typography.xs,
                      color: theme.colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {t("selectMultiple")}
                  </Text>
                </View>
                {selectedStatuses.length > 0 && (
                  <View
                    style={{
                      backgroundColor: theme.colors.primary,
                      borderRadius: 12,
                      paddingHorizontal: layout.spacing.sm,
                      paddingVertical: layout.spacing.xs / 2,
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: layout.typography.xs,
                      }}
                    >
                      {selectedStatuses.length}
                    </Text>
                  </View>
                )}
              </View>

              <View
                style={{
                  backgroundColor: theme.colors.card,
                  borderRadius: layout.borderRadius.xl,
                  padding: layout.spacing.sm,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: layout.spacing.xs }}
                >
                  {[
                    {
                      value: "completed",
                      label: t("completed"),
                      icon: "checkmark-circle",
                      shortLabel: "✓",
                    },
                    {
                      value: "processing",
                      label: t("processing"),
                      icon: "sync",
                      shortLabel: "⟳",
                    },
                    {
                      value: "pending",
                      label: t("pending"),
                      icon: "time",
                      shortLabel: "⏱",
                    },
                    {
                      value: "cancelled",
                      label: t("cancelled"),
                      icon: "close-circle",
                      shortLabel: "✕",
                    },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.statusOption,
                        {
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          paddingVertical: layout.spacing.sm,
                          paddingHorizontal: layout.spacing.md,
                          borderRadius: layout.borderRadius.lg,
                          backgroundColor: selectedStatuses.includes(
                            option.value
                          )
                            ? getStatusColor(option.value)
                            : "transparent",
                          minHeight: 40,
                        },
                      ]}
                      onPress={() => toggleStatusFilter(option.value)}
                    >
                      <Ionicons
                        name={option.icon}
                        size={18}
                        color={
                          selectedStatuses.includes(option.value)
                            ? "#fff"
                            : getStatusColor(option.value)
                        }
                        style={{
                          marginRight: isRTL ? 0 : layout.spacing.xs,
                          marginLeft: isRTL ? layout.spacing.xs : 0,
                        }}
                      />
                      <Text
                        style={{
                          fontSize: layout.typography.sm,
                          color: selectedStatuses.includes(option.value)
                            ? "#fff"
                            : theme.colors.text,
                        }}
                      >
                        {option.label}
                      </Text>
                      {selectedStatuses.includes(option.value) && (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color="#fff"
                          style={{
                            marginLeft: isRTL ? 0 : layout.spacing.xs,
                            marginRight: isRTL ? layout.spacing.xs : 0,
                          }}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </ScrollView>

          {/* Apply Filters Button */}
          <View
            style={[
              styles.modalFooter,
              {
                backgroundColor: theme.colors.background,
                borderTopWidth: 0,
                padding: layout.containerPadding,
                paddingTop: layout.spacing.xl,
              },
            ]}
          >
            <View
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                gap: layout.spacing.md,
              }}
            >
              {getActiveFilterCount() > 0 && (
                <TouchableOpacity
                  style={[
                    styles.clearButton,
                    {
                      flex: 1,
                      backgroundColor: theme.colors.card,
                      paddingVertical: layout.spacing.lg,
                      borderRadius: layout.borderRadius.xl,
                      alignItems: "center",
                      minHeight: layout.touchTargets.lg,
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      flexDirection: isRTL ? "row-reverse" : "row",
                    },
                  ]}
                  onPress={clearAllFilters}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={layout.iconSizes.md}
                    color={theme.colors.textSecondary}
                    style={{
                      marginRight: isRTL ? 0 : layout.spacing.xs,
                      marginLeft: isRTL ? layout.spacing.xs : 0,
                    }}
                  />
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: layout.typography.md,
                    }}
                  >
                    {t("clear")}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.applyButton,
                  {
                    flex: getActiveFilterCount() > 0 ? 2 : 1,
                    backgroundColor: theme.colors.primary,
                    paddingVertical: layout.spacing.lg,
                    borderRadius: layout.borderRadius.xl,
                    alignItems: "center",
                    minHeight: layout.touchTargets.lg,
                    justifyContent: "center",
                    flexDirection: isRTL ? "row-reverse" : "row",
                  },
                ]}
                onPress={() => setShowFilters(false)}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={layout.iconSizes.md}
                  color="#fff"
                  style={{
                    marginRight: isRTL ? 0 : layout.spacing.xs,
                    marginLeft: isRTL ? layout.spacing.xs : 0,
                  }}
                />
                <Text
                  style={{
                    color: "#fff",
                    fontSize: layout.typography.lg,
                  }}
                >
                  {getActiveFilterCount() > 0
                    ? `${t("apply")} (${getActiveFilterCount()})`
                    : t("applyFilters")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    // All properties handled inline for responsiveness
  },
  headerTitle: {
    // All properties handled inline for responsiveness
  },
  content: {
    flex: 1,
    flexDirection: "column",
  },
  tabsContainer: {
    // All properties handled inline for responsiveness
  },
  tab: {
    // All properties handled inline for responsiveness
  },
  activeTab: {
    // backgroundColor applied inline via theme
  },
  tabText: {
    // All properties handled inline for responsiveness
  },
  activeTabText: {
    // All properties handled inline for responsiveness
  },
  scrollView: {
    // All properties handled inline for responsiveness
  },
  orderCard: {
    // All properties handled inline for responsiveness
  },
  orderHeader: {
    // All properties handled inline for responsiveness
  },
  orderId: {
    // All properties handled inline for responsiveness
  },
  orderDate: {
    // All properties handled inline for responsiveness
  },
  statusBadge: {
    // All properties handled inline for responsiveness
  },
  statusText: {
    // All properties handled inline for responsiveness
  },
  orderDivider: {
    // All properties handled inline for responsiveness
  },
  orderDetails: {
    // All properties handled inline for responsiveness
  },
  orderRow: {
    // All properties handled inline for responsiveness
  },
  orderLabel: {
    // All properties handled inline for responsiveness
  },
  orderValue: {
    // All properties handled inline for responsiveness
  },
  orderTotal: {
    // All properties handled inline for responsiveness
  },
  viewDetailsButton: {
    // All properties handled inline for responsiveness
  },
  viewDetailsText: {
    // All properties handled inline for responsiveness
  },
  emptyState: {
    // All properties handled inline for responsiveness
  },
  emptyTitle: {
    // All properties handled inline for responsiveness
  },
  emptyText: {
    // All properties handled inline for responsiveness
  },
  loginPrompt: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    // padding handled inline for responsiveness
  },
  loginTitle: {
    // All other properties handled inline for responsiveness
  },
  loginText: {
    // All properties handled inline for responsiveness
  },
  loginButton: {
    alignItems: "center",
    // All other properties handled inline for responsiveness
  },
  loginButtonText: {
    color: "#fff",

    // fontSize handled inline for responsiveness
  },
  registerButton: {
    alignItems: "center",
    // All other properties handled inline for responsiveness
  },
  registerButtonText: {
    // All other properties handled inline for responsiveness
  },
  productPreview: {
    // All properties handled inline for responsiveness
  },
  searchContainer: {
    // All properties handled inline for responsiveness
  },
  searchInput: {
    // All properties handled inline for responsiveness
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    // All properties handled inline for responsiveness
  },
  modalFooter: {
    // All properties handled inline for responsiveness
  },
  filterSection: {
    // All properties handled inline for responsiveness
  },
  filterTitle: {
    // All properties handled inline for responsiveness
  },
  sortOptions: {
    // All properties handled inline for responsiveness
  },
  sortOption: {
    // All properties handled inline for responsiveness
  },
  dateOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dateOption: {
    // All properties handled inline for responsiveness
  },
  priceRangeContainer: {
    // All properties handled inline for responsiveness
  },
  priceInput: {
    // All properties handled inline for responsiveness
  },
  statusOptions: {
    // All properties handled inline for responsiveness
  },
  statusOption: {
    // All properties handled inline for responsiveness
  },
  applyButton: {
    // All properties handled inline for responsiveness
  },
});
