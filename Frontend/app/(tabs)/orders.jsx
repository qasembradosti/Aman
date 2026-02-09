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
  Share,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { useLanguage } from "../../utils/LanguageContext";
import { useTheme } from "../../utils/ThemeContext";
import { useResponsiveLayout } from "../../utils/useResponsiveLayout";
import {
  fetchOrders as fetchOrdersThunk,
  fetchOrderById,
} from "../../store/slices/ordersSlice";
import { getApiBaseUrl } from "../../utils/apiConfig";
import { Image } from "react-native";
import InfoDialog from "../../components/InfoDialog";
import ChatSupport from "../../components/ChatSupport";
import ChatHeaderButton from "../../components/ChatHeaderButton";

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
  const [customDateRange, setCustomDateRange] = useState({ from: "", to: "" });
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [sortBy, setSortBy] = useState("date-desc"); // date-desc, date-asc, price-desc, price-asc
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [dialog, setDialog] = useState({ visible: false, title: "", message: "" });
  const [showChat, setShowChat] = useState(false);
  const [chatOrderId, setChatOrderId] = useState(null);

  const { isAuthenticated } = useSelector((state) => state.auth);
  const {
    items: orders = [],
    loading,
    error,
    currentOrder,
  } = useSelector((state) => state.orders);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Fetch orders from database via Redux
  const fetchOrders = useCallback(() => {
    if (!isAuthenticated) {
      console.log("⚠️ User not authenticated, skipping orders fetch");
      return;
    }
    const params = activeTab !== "all" ? { status: activeTab } : {};
    dispatch(fetchOrdersThunk(params));
  }, [dispatch, activeTab, isAuthenticated]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Display error if orders fetch fails
  useEffect(() => {
    if (error) {
      console.error("❌ Orders error:", error);
      setDialog({ visible: true, title: t("error") || "Error", message: error });
    }
  }, [error, t]);

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
      id: "shipped",
      label: t("shipped"),
      icon: "car-outline",
      count: orders.filter((order) => order.status === "shipped").length,
    },
    {
      id: "delivered",
      label: t("delivered"),
      icon: "checkmark-circle-outline",
      count: orders.filter((order) => order.status === "delivered").length,
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
          (order.user_first_name &&
            order.user_first_name.toLowerCase().includes(query)) ||
          (order.user_last_name &&
            order.user_last_name.toLowerCase().includes(query)) ||
          (order.user_phone &&
            order.user_phone.toLowerCase().includes(query)) ||
          order.status.toLowerCase().includes(query),
      );
    }

    // Status filter (tabs + advanced filters)
    if (activeTab !== "all") {
      filtered = filtered.filter((order) => order.status === activeTab);
    }

    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((order) =>
        selectedStatuses.includes(order.status),
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
          case "custom":
            if (customDateRange.from || customDateRange.to) {
              const fromDate = customDateRange.from ? new Date(customDateRange.from) : null;
              const toDate = customDateRange.to ? new Date(customDateRange.to) : null;
              
              if (fromDate && toDate) {
                return orderDate >= fromDate && orderDate <= toDate;
              } else if (fromDate) {
                return orderDate >= fromDate;
              } else if (toDate) {
                return orderDate <= toDate;
              }
            }
            return true;
          default:
            return true;
        }
      });
    }

    // Price range filter
    if (priceRange.min || priceRange.max) {
      filtered = filtered.filter((order) => {
        const price = order.total || 0;
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
    customDateRange,
    priceRange,
    sortBy,
  ]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "N/A";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "delivered":
        return theme.colors.success || "#34C759";
      case "shipped":
        return "#9C27B0";
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
      case "delivered":
        return "checkmark-circle";
      case "shipped":
        return "car";
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
      case "delivered":
        return t("delivered");
      case "shipped":
        return t("shipped");
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
      const num = typeof value === "number" ? value : parseFloat(value || 0);
      // Format for Iraqi Dinar
      return `${num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} IQD`;
    } catch {
      // Fallback if Intl is not available
      const num = typeof value === "number" ? value : parseFloat(value || 0);
      return `${Math.round(num).toLocaleString()} IQD`;
    }
  };

  const getOrderCommissionTotal = (order) => {
    // For list view, use pre-calculated commission_total from backend
    if (typeof order?.items === 'number' || !Array.isArray(order?.items)) {
      const total = Number(order?.commission_total || 0);
      return total;
    }

    // For detail view with items array, calculate from items
    if (order.items.length === 0) {
      return 0;
    }

    const total = order.items.reduce((sum, item) => {
      const commission = Number(item?.commission_price || 0);
      const quantity = Number(item?.quantity || 1);
      return sum + commission * quantity;
    }, 0);
    
    return total;
  };

  // Fetch order details when clicking on an order
  const handleOrderClick = async (order) => {
    setSelectedOrder(order);
    setLoadingDetails(true);
    try {
      console.log("📦 Fetching details for order:", order.id);
      await dispatch(fetchOrderById(order.id)).unwrap();
    } catch (error) {
      console.error("❌ Error fetching order details:", error);
      setDialog({
        visible: true,
        title: t("error") || "Error",
        message: t("failedToLoadOrderDetails") || "Failed to load order details",
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  // Share order details
  const handleShareOrder = async (order) => {
    try {
      const subtotal =
        Array.isArray(order.items) && order.items.length > 0
          ? order.items.reduce(
              (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
              0,
            )
          : order.total || 0;
      const shipping = order.shipping_cost || order.delivery_cost || 5000;
      const total = subtotal + shipping;

      const itemsList =
        Array.isArray(order.items) && order.items.length > 0
          ? order.items
              .map(
                (item, index) =>
                  `${index + 1}. ${item.product_name || item.name || "Product"} - ${formatCurrency(item.price || 0)} x ${item.quantity || 1}`,
              )
              .join("\n")
          : "No items";

      const message = `
${t("orderDetails") || "Order Details"}
━━━━━━━━━━━━━━━━━━━━━
${t("orderNumber") || "Order"} #${order.id}
${t("status") || "Status"}: ${order.status || "N/A"}
${t("date") || "Date"}: ${order.created_at ? new Date(order.created_at).toLocaleDateString(locale || "en-US") : "N/A"}

${t("items") || "Items"}:
${itemsList}

━━━━━━━━━━━━━━━━━━━━━
${t("subtotal") || "Subtotal"}: ${formatCurrency(subtotal)}
${t("delivery") || "Delivery"}: ${formatCurrency(shipping)}
${t("total") || "Total"}: ${formatCurrency(total)}
      `.trim();

      await Share.share({
        message: message,
        title: `${t("orderDetails") || "Order Details"} #${order.id}`,
      });
    } catch (error) {
      console.error("Error sharing order:", error);
      setDialog({
        visible: true,
        title: t("error") || "Error",
        message: t("unableToShareOrder") || "Unable to share order",
      });
    }
  };

  // Update selectedOrder with full details when currentOrder changes
  useEffect(() => {
    if (currentOrder && selectedOrder && currentOrder.id === selectedOrder.id) {
      setSelectedOrder(currentOrder);
    }
  }, [currentOrder]);

  // Helper functions for filters
  const clearAllFilters = () => {
    setSearchQuery("");
    setDateFilter("all");
    setCustomDateRange({ from: "", to: "" });
    setPriceRange({ min: "", max: "" });
    setSortBy("date-desc");
    setSelectedStatuses([]);
    setActiveTab("all");
  };

  // Date picker helpers
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(locale || 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return dateString;
    }
  };

  const handleFromDateChange = (event, selectedDate) => {
    setShowFromDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      setCustomDateRange((prev) => ({ ...prev, from: dateString }));
    }
  };

  const handleToDateChange = (event, selectedDate) => {
    setShowToDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      setCustomDateRange((prev) => ({ ...prev, to: dateString }));
    }
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
        : [...prev, status],
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
                  {filteredOrders.length}{" "}
                  {filteredOrders.length === 1 ? t("order") : t("orders")}
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
            <>
              <ChatHeaderButton onPress={() => {
                setShowChat(true);
                setChatOrderId(null);
              }} />
              <TouchableOpacity
              style={{
                padding: layout.spacing.sm,
                borderRadius: layout.borderRadius.xl,
                backgroundColor:
                  getActiveFilterCount() > 0
                    ? theme.colors.primary
                    : theme.colors.background,
                borderWidth: 1,
                borderColor:
                  getActiveFilterCount() > 0
                    ? theme.colors.primary
                    : theme.colors.border,
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
                color={getActiveFilterCount() > 0 ? "#fff" : theme.colors.text}
              />
            </TouchableOpacity>
            </>
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
                    borderColor:
                      activeTab === tab.id
                        ? theme.colors.primary
                        : theme.colors.border,
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
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor:
                        activeTab === tab.id
                          ? "rgba(255, 255, 255, 0.2)"
                          : getStatusColor(tab.id) + "20",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name={tab.icon}
                      size={18}
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
                    borderRadius: 20,
                    marginBottom: layout.spacing.md,
                    borderColor: theme.colors.border,
                    shadowColor: theme.colors.shadow || "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2,
                    overflow: "hidden",
                  },
                ]}
                onPress={() => handleOrderClick(order)}
              >
                {/* Card Content */}
                <View style={{ padding: layout.spacing.lg }}>
                  {/* Header Section */}
                  <View
                    style={{
                      flexDirection: isRTL ? "row-reverse" : "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: layout.spacing.md,
                    }}
                  >
                    {/* Order Info */}
                    <View
                      style={{
                        flex: 1,
                        alignItems: isRTL ? "flex-end" : "flex-start",
                      }}
                    >
                      <View
                        style={{
                          flexDirection: isRTL ? "row-reverse" : "row",
                          alignItems: "center",
                          marginBottom: layout.spacing.xs,
                          gap: layout.spacing.xs,
                        }}
                      >
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: layout.borderRadius.lg,
                            backgroundColor: theme.colors.primary + "15",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Ionicons
                            name="receipt-outline"
                            size={20}
                            color={theme.colors.primary}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: layout.typography.lg,
                              color: theme.colors.text,
                              textAlign: isRTL ? "right" : "left",
                            }}
                          >
                            {t("order")} #{order.id}
                          </Text>
                          <Text
                            style={{
                              fontSize: layout.typography.xs,
                              color: theme.colors.textSecondary,
                              marginTop: 2,
                              textAlign: isRTL ? "right" : "left",
                            }}
                          >
                            {formatDate(order.date)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Status Badge */}
                    <View
                      style={{
                        backgroundColor: getStatusColor(order.status) + "15",
                        paddingVertical: layout.spacing.xs,
                        paddingHorizontal: layout.spacing.sm,
                        borderRadius: layout.borderRadius.md,
                        borderWidth: 1.5,
                        borderColor: getStatusColor(order.status) + "40",
                        flexDirection: isRTL ? "row-reverse" : "row",
                        alignItems: "center",
                        gap: layout.spacing.xs / 2,
                      }}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: getStatusColor(order.status),
                        }}
                      />
                      <Text
                        style={{
                          color: getStatusColor(order.status),
                          fontSize: layout.typography.xs,
                        }}
                      >
                        {getStatusText(order.status)}
                      </Text>
                    </View>
                  </View>

                  {/* Divider */}
                  <View
                    style={{
                      height: 1,
                      backgroundColor: theme.colors.border,
                      marginVertical: layout.spacing.sm,
                    }}
                  />

                  {/* Order Details Section */}
                  <View style={{ gap: layout.spacing.sm }}>
                    {/* Product Preview */}
                    {order.products && order.products.length > 0 && (
                      <View
                        style={{
                          backgroundColor: theme.colors.background,
                          padding: layout.spacing.sm,
                          borderRadius: layout.borderRadius.lg,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: isRTL ? "row-reverse" : "row",
                            alignItems: "center",
                            gap: layout.spacing.xs,
                            marginBottom: layout.spacing.xs / 2,
                          }}
                        >
                          <Ionicons
                            name="cube-outline"
                            size={14}
                            color={theme.colors.textSecondary}
                          />
                          <Text
                            style={{
                              fontSize: layout.typography.xs,
                              color: theme.colors.textSecondary,
                              textAlign: isRTL ? "right" : "left",
                            }}
                          >
                            {t("products")}
                          </Text>
                        </View>
                        <Text
                          style={{
                            fontSize: layout.typography.sm,
                            color: theme.colors.text,
                            lineHeight: layout.typography.sm * 1.4,
                            textAlign: isRTL ? "right" : "left",
                          }}
                        >
                          {order.products.length > 2
                            ? `${order.products.slice(0, 2).join(", ")} +${
                                order.products.length - 2
                              } ${t("more")}`
                            : order.products.join(", ")}
                        </Text>
                      </View>
                    )}

                    {/* Items and Total Row */}
                    <View
                      style={{
                        flexDirection: isRTL ? "row-reverse" : "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: layout.spacing.md,
                      }}
                    >
                      {/* Items Count */}
                      <View
                        style={{
                          flex: 1,
                          backgroundColor: theme.colors.background,
                          padding: layout.spacing.sm,
                          borderRadius: layout.borderRadius.lg,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          flexDirection: isRTL ? "row-reverse" : "row",
                          alignItems: "center",
                          gap: layout.spacing.xs,
                        }}
                      >
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: layout.borderRadius.md,
                            backgroundColor: theme.colors.primary + "10",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Ionicons
                            name="cart-outline"
                            size={16}
                            color={theme.colors.primary}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: layout.typography.xs,
                              color: theme.colors.textSecondary,
                              textAlign: isRTL ? "right" : "left",
                            }}
                          >
                            {t("items")}
                          </Text>
                          <View
                            style={{
                              flexDirection: isRTL ? "row-reverse" : "row",
                              alignItems: "center",
                              gap: layout.spacing.xs,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: layout.typography.md,
                                color: theme.colors.text,
                                textAlign: isRTL ? "right" : "left",
                              }}
                            >
                              {order.items || 0}
                            </Text>
                            {getOrderCommissionTotal(order) > 0 && (
                              <View
                                style={{
                                  backgroundColor: theme.colors.primary + "15",
                                  paddingHorizontal: 6,
                                  paddingVertical: 3,
                                  borderRadius: layout.borderRadius.md,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: layout.typography.xs - 1,
                                    color: theme.colors.primary,
                                  }}
                                >
                                  +{formatCurrency(getOrderCommissionTotal(order))}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>

                      {/* Total Price */}
                      <View
                        style={{
                          flex: 1,
                          backgroundColor: theme.colors.primary + "08",
                          padding: layout.spacing.sm,
                          borderRadius: layout.borderRadius.lg,
                          borderWidth: 1.5,
                          borderColor: theme.colors.primary + "20",
                          flexDirection: isRTL ? "row-reverse" : "row",
                          alignItems: "center",
                          gap: layout.spacing.xs,
                        }}
                      >
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: layout.borderRadius.md,
                            backgroundColor: theme.colors.primary + "15",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Ionicons
                            name="cash-outline"
                            size={16}
                            color={theme.colors.primary}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: layout.typography.xs,
                              color: theme.colors.textSecondary,
                              textAlign: isRTL ? "right" : "left",
                            }}
                          >
                            {t("total")}
                          </Text>
                          <Text
                            style={{
                              fontSize: layout.typography.md,
                              color: theme.colors.primary,
                              writingDirection: "ltr",
                              textAlign: isRTL ? "right" : "left",
                            }}
                          >
                            {formatCurrency(order.total || 0)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* View Details Footer */}
                  <View
                    style={{
                      marginTop: layout.spacing.md,
                      paddingTop: layout.spacing.sm,
                      flexDirection: isRTL ? "row-reverse" : "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: layout.spacing.xs,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.primary,
                        fontSize: layout.typography.sm,
                      }}
                    >
                      {t("viewDetails")}
                    </Text>
                    <Ionicons
                      name={isRTL ? "chevron-back" : "chevron-forward"}
                      size={16}
                      color={theme.colors.primary}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Floating Chat Button */}
        {isAuthenticated && (
          <TouchableOpacity
            style={{
              position: "absolute",
              bottom: layout.spacing.xl,
              right: isRTL ? undefined : layout.spacing.lg,
              left: isRTL ? layout.spacing.lg : undefined,
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: theme.colors.primary,
              justifyContent: "center",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
            onPress={() => {
              setChatOrderId(null);
              setShowChat(true);
            }}
          >
            <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
          </TouchableOpacity>
        )}
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

              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingHorizontal: layout.spacing.md,
                }}
              >
                <View
                  style={{
                    backgroundColor:
                      getStatusColor(selectedOrder.status) + "15",
                    paddingHorizontal: layout.spacing.md,
                    paddingVertical: 6,
                    borderRadius: layout.borderRadius.xl,
                    marginBottom: layout.spacing.xs,
                  }}
                >
                  <Text
                    style={{
                      fontSize: layout.typography.xs,
                      color: getStatusColor(selectedOrder.status || "pending"),
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
                onPress={() => handleShareOrder(selectedOrder)}
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
                        getStatusColor(selectedOrder.status || "pending") +
                        "15",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: isRTL ? 0 : layout.spacing.md,
                      marginLeft: isRTL ? layout.spacing.md : 0,
                    }}
                  >
                    <Ionicons
                      name={getStatusIcon(selectedOrder.status || "pending")}
                      size={28}
                      color={getStatusColor(selectedOrder.status || "pending")}
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
                        {getStatusText(selectedOrder.status || "pending")}
                      </Text>
                      <View
                        style={{
                          backgroundColor:
                            getStatusColor(selectedOrder.status || "pending") +
                            "20",
                          paddingVertical: 4,
                          paddingHorizontal: layout.spacing.sm,
                          borderRadius: layout.borderRadius.md,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,

                            color: getStatusColor(
                              selectedOrder.status || "pending",
                            ),
                          }}
                        >
                          {(selectedOrder.status || "pending").toUpperCase()}
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
                      status: "delivered",
                      label: t("delivered"),
                      icon: "checkmark-done",
                    },
                  ].map((step, index) => {
                    const isActive =
                      [
                        "pending",
                        "processing",
                        "shipped",
                        "delivered",
                      ].includes(selectedOrder.status) &&
                      (index === 0 ||
                        (index === 1 &&
                          ["processing", "shipped", "delivered"].includes(
                            selectedOrder.status,
                          )) ||
                        (index === 2 &&
                          ["shipped", "delivered"].includes(
                            selectedOrder.status,
                          )) ||
                        (index === 3 && selectedOrder.status === "delivered"));

                    const isCompleted =
                      index === 0 ||
                      (index === 1 &&
                        ["processing", "shipped", "delivered"].includes(
                          selectedOrder.status,
                        )) ||
                      (index === 2 &&
                        ["shipped", "delivered"].includes(
                          selectedOrder.status,
                        )) ||
                      (index === 3 && selectedOrder.status === "delivered");

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
                      {Array.isArray(selectedOrder.items)
                        ? selectedOrder.items.length
                        : selectedOrder.items || 0}{" "}
                      {(Array.isArray(selectedOrder.items)
                        ? selectedOrder.items.length
                        : selectedOrder.items || 0) === 1
                        ? t("item")
                        : t("items")}
                    </Text>
                  </View>
                </View>

                {loadingDetails ? (
                  <View
                    style={{
                      paddingVertical: layout.spacing.xl,
                      alignItems: "center",
                    }}
                  >
                    <ActivityIndicator
                      size="large"
                      color={theme.colors.primary}
                    />
                    <Text
                      style={{
                        color: theme.colors.textSecondary,
                        fontSize: layout.typography.sm,
                        marginTop: layout.spacing.sm,
                      }}
                    >
                      {t("loadingOrderDetails")}
                    </Text>
                  </View>
                ) : Array.isArray(selectedOrder.items) &&
                  selectedOrder.items.length > 0 ? (
                  selectedOrder.items.map((item, index) => (
                    <View
                      key={item.id || index}
                      style={{
                        flexDirection: isRTL ? "row-reverse" : "row",
                        alignItems: "center",
                        paddingVertical: layout.spacing.md,
                        borderBottomWidth:
                          index < selectedOrder.items.length - 1
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
                          overflow: "hidden",
                        }}
                      >
                        {item.image ? (
                          <Image
                            source={{ uri: `${getApiBaseUrl()}${item.image}` }}
                            style={{ width: "100%", height: "100%" }}
                            contentFit="cover"
                            transition={200}
                            cachePolicy="memory-disk"
                          />
                        ) : (
                          <Text
                            style={{
                              fontSize: 28,
                              color: theme.colors.primary,
                            }}
                          >
                            📦
                          </Text>
                        )}
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
                          {item.product_name || t("product")}
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
                            {t("quantity")}: {item.quantity || 1}
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
                            {formatCurrency(item.price || 0)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))
                ) : (
                  <View
                    style={{
                      paddingVertical: layout.spacing.lg,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.textSecondary,
                        fontSize: layout.typography.sm,
                      }}
                    >
                      {t("noProductDetailsAvailable")}
                    </Text>
                  </View>
                )}
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
                {(() => {
                  // Calculate subtotal from actual items if available
                  const subtotal =
                    Array.isArray(selectedOrder.items) &&
                    selectedOrder.items.length > 0
                      ? selectedOrder.items.reduce(
                          (sum, item) =>
                            sum + (item.price || 0) * (item.quantity || 1),
                          0,
                        )
                      : selectedOrder.total || 0;

                  // Get shipping/delivery cost from order data if available
                  const shipping =
                    selectedOrder.shipping_cost ||
                    selectedOrder.delivery_cost ||
                    5000; // Default 5000 IQD if not set

                  // Calculate and store the order total
                  window.orderTotal = subtotal + shipping;

                  return [
                    {
                      label: t("subtotal"),
                      value: formatCurrency(subtotal),
                      icon: "receipt-outline",
                    },
                    {
                      label: t("delivery") || t("shipping"),
                      value: formatCurrency(shipping),
                      icon: "car-outline",
                    },
                  ];
                })().map((item, index) => (
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
                    {formatCurrency(
                      window.orderTotal || selectedOrder.total || 0,
                    )}
                  </Text>
                </View>
              </View>

              {/* Contact Support Button */}
              <View
                style={{
                  marginHorizontal: layout.containerPadding,
                  marginVertical: layout.spacing.lg,
                }}
              >
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.colors.primary,
                    paddingVertical: layout.spacing.md,
                    borderRadius: layout.borderRadius.lg,
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: layout.spacing.sm,
                    shadowColor: theme.colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                  onPress={() => {
                    setChatOrderId(selectedOrder.id);
                    setShowChat(true);
                  }}
                >
                  <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: layout.typography.md,
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
                    {
                      value: "custom",
                      label: t("customRange"),
                      icon: "calendar-number-outline",
                      color: theme.colors.danger,
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
              
              {/* Custom Date Range Inputs */}
              {dateFilter === "custom" && (
                <View
                  style={{
                    marginTop: layout.spacing.lg,
                    gap: layout.spacing.md,
                  }}
                >
                  {/* From Date */}
                  <TouchableOpacity
                    style={{
                      flexDirection: isRTL ? "row-reverse" : "row",
                      alignItems: "center",
                      backgroundColor: theme.colors.card,
                      borderRadius: layout.borderRadius.xl,
                      padding: layout.spacing.lg,
                      borderWidth: 1,
                      borderColor: customDateRange.from ? theme.colors.primary : theme.colors.border,
                    }}
                    onPress={() => setShowFromDatePicker(true)}
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
                        name="calendar-outline"
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
                        {t("fromDate")}
                      </Text>
                      <Text
                        style={{
                          fontSize: layout.typography.lg,
                          color: customDateRange.from ? theme.colors.text : theme.colors.textSecondary,
                        }}
                      >
                        {customDateRange.from ? formatDateForDisplay(customDateRange.from) : t("selectDate")}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={theme.colors.textSecondary}
                      style={{
                        marginLeft: isRTL ? 0 : layout.spacing.sm,
                        marginRight: isRTL ? layout.spacing.sm : 0,
                      }}
                    />
                  </TouchableOpacity>

                  {/* To Date */}
                  <TouchableOpacity
                    style={{
                      flexDirection: isRTL ? "row-reverse" : "row",
                      alignItems: "center",
                      backgroundColor: theme.colors.card,
                      borderRadius: layout.borderRadius.xl,
                      padding: layout.spacing.lg,
                      borderWidth: 1,
                      borderColor: customDateRange.to ? theme.colors.primary : theme.colors.border,
                    }}
                    onPress={() => setShowToDatePicker(true)}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: theme.colors.danger + "15",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: isRTL ? 0 : layout.spacing.md,
                        marginLeft: isRTL ? layout.spacing.md : 0,
                      }}
                    >
                      <Ionicons
                        name="calendar"
                        size={20}
                        color={theme.colors.danger}
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
                        {t("toDate")}
                      </Text>
                      <Text
                        style={{
                          fontSize: layout.typography.lg,
                          color: customDateRange.to ? theme.colors.text : theme.colors.textSecondary,
                        }}
                      >
                        {customDateRange.to ? formatDateForDisplay(customDateRange.to) : t("selectDate")}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={theme.colors.textSecondary}
                      style={{
                        marginLeft: isRTL ? 0 : layout.spacing.sm,
                        marginRight: isRTL ? layout.spacing.sm : 0,
                      }}
                    />
                  </TouchableOpacity>
                </View>
              )}
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
                    color={theme.colors.success}
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
                      value: "delivered",
                      label: t("delivered"),
                      icon: "checkmark-circle",
                      shortLabel: "✓",
                    },
                    {
                      value: "shipped",
                      label: t("shipped"),
                      icon: "car",
                      shortLabel: "🚗",
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
                            option.value,
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

      {/* Date Pickers */}
      {showFromDatePicker && (
        <DateTimePicker
          value={customDateRange.from ? new Date(customDateRange.from) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleFromDateChange}
          maximumDate={customDateRange.to ? new Date(customDateRange.to) : undefined}
        />
      )}
      
      {showToDatePicker && (
        <DateTimePicker
          value={customDateRange.to ? new Date(customDateRange.to) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleToDateChange}
          minimumDate={customDateRange.from ? new Date(customDateRange.from) : undefined}
        />
      )}

      {/* Info Dialog */}
      <InfoDialog
        visible={dialog.visible}
        title={dialog.title}
        message={dialog.message}
        onClose={() => setDialog({ visible: false, title: "", message: "" })}
      />

      {/* Chat Support */}
      <ChatSupport
        visible={showChat}
        onClose={() => {
          setShowChat(false);
          setChatOrderId(null);
        }}
        orderId={chatOrderId}
      />
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
  tabText: {
    // All properties handled inline for responsiveness
  },
  scrollView: {
    // All properties handled inline for responsiveness
  },
  orderCard: {
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
  statusOption: {
    // All properties handled inline for responsiveness
  },
  applyButton: {
    // All properties handled inline for responsiveness
  },
});
