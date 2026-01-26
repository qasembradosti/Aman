import { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../utils/ThemeContext";
import { useLanguage } from "../../utils/LanguageContext";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { fetchOrderById, clearCurrentOrder } from "../../store/slices/ordersSlice";

export default function OrderDetails() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { id } = useLocalSearchParams();
  const dispatch = useDispatch();
  
  const { currentOrder: order, loading, error } = useSelector((state) => state.orders);

  useEffect(() => {
    if (id) {
      dispatch(fetchOrderById(id));
    }

    return () => {
      dispatch(clearCurrentOrder());
    };
  }, [id, dispatch]);

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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.canGoBack?.() ? router.back() : router.replace('/(tabs)/home')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {t("orderDetails")}
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.canGoBack?.() ? router.back() : router.replace('/(tabs)/home')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {t("orderDetails")}
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>
            {t("orderNotFound")}
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
          {t("order")} #{order.id}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Status */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <View
            style={[
              styles.statusContainer,
              { backgroundColor: getStatusColor(order.status) + "20" },
            ]}
          >
            <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>
              {t("orderStatus")}
            </Text>
            <Text
              style={[
                styles.statusValue,
                { color: getStatusColor(order.status) },
              ]}
            >
              {t(order.status)}
            </Text>
          </View>
          <Text style={[styles.orderDate, { color: theme.colors.textSecondary }]}>
            {t("placedOn")} {formatDate(order.created_at)}
          </Text>
        </View>

        {/* Customer Information */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t("customerInformation")}
          </Text>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>
              {order.user_first_name} {order.user_last_name}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>
              {order.user_phone}
            </Text>
          </View>
          {order.user_email && (
            <View style={styles.infoRow}>
              <Ionicons name="mail" size={20} color={theme.colors.textSecondary} />
              <Text style={[styles.infoText, { color: theme.colors.text }]}>
                {order.user_email}
              </Text>
            </View>
          )}
        </View>

        {/* Shipping Address */}
        {order.shipping_address && (
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {t("shippingAddress")}
            </Text>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color={theme.colors.textSecondary} />
              <Text style={[styles.infoText, { color: theme.colors.text }]}>
                {typeof order.shipping_address === 'string' 
                  ? order.shipping_address 
                  : JSON.stringify(order.shipping_address)}
              </Text>
            </View>
          </View>
        )}

        {/* Order Items */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t("orderItems")}
          </Text>
          {order.items && order.items.length > 0 ? (
            order.items.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.itemCard,
                  { borderBottomColor: theme.colors.border },
                  index === order.items.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: theme.colors.text }]}>
                    {item.product_name || t("products")}
                  </Text>
                  <Text style={[styles.itemQuantity, { color: theme.colors.textSecondary }]}>
                    {t("quantity")}: {item.quantity}
                  </Text>
                </View>
                <Text style={[styles.itemPrice, { color: theme.colors.primary }]}>
                  {formatCurrency(item.price * item.quantity)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {t("noItemsInOrder")}
            </Text>
          )}
        </View>

        {/* Payment Information */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t("paymentSummary")}
          </Text>
          {order.payment_method && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                {t("paymentMethod")}
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                {order.payment_method.charAt(0).toUpperCase() + order.payment_method.slice(1)}
              </Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={[styles.totalLabel, { color: theme.colors.text }]}>
              {t("totalAmount")}
            </Text>
            <Text style={[styles.totalValue, { color: theme.colors.primary }]}>
              {formatCurrency(order.total_amount)}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {order.notes && (
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {t("orderNotes")}
            </Text>
            <Text style={[styles.notesText, { color: theme.colors.text }]}>
              {order.notes}
            </Text>
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
    fontWeight: "bold",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusContainer: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  orderDate: {
    fontSize: 14,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
  },
  itemCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 12,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "bold",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
  },
});
