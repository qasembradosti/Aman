import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Dimensions,
  RefreshControl,
  TextInput,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../utils/ThemeContext";
import { useLanguage } from "../../utils/LanguageContext";
import { Text } from "../../components/ui/Text";
import api from "../../services/apiService";
import { getProductImageUrl } from "../../utils/productImages";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function BrandProductsScreen() {
  const { id } = useLocalSearchParams();
  const [brand, setBrand] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name"); // name, price_low, price_high, newest
  const [viewMode, setViewMode] = useState("grid"); // grid, list
  const router = useRouter();
  const { theme } = useTheme();
  const { t, isRTL, locale } = useLanguage();
  const navigationInProgress = useRef(false);

  const rowDirection = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";

  // Responsive layout
  const cardWidth =
    viewMode === "grid" ? (SCREEN_WIDTH - 48) / 2 : SCREEN_WIDTH - 32;

  const fetchBrandProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/brands/${id}/products`);
      setBrand(response.data.brand);
      setProducts(response.data.data || []);
    } catch (error) {
      console.error("Error fetching brand products:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBrandProducts();
  }, [fetchBrandProducts]);
  // Helper function to get localized text
  const getLocalizedText = (product, field) => {
    if (!product) return "";
    
    // Ensure language has a default fallback
    const lang = locale || "en";
    const localizedField = `${field}_${lang}`;
    
    // Return the localized field, fallback to base field, or empty string
    return product[localizedField] || product[field] || "";
  };

  const applyFiltersAndSort = useCallback(() => {
    let filtered = [...products];

    // Apply search
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (p) =>
          (p.name_en || p.name || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (p.name_ku || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.name_ar || "").toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Apply sorting
    switch (sortBy) {
      case "price_low":
        filtered.sort(
          (a, b) =>
            (a.sell_price || a.base_price) - (b.sell_price || b.base_price),
        );
        break;
      case "price_high":
        filtered.sort(
          (a, b) =>
            (b.sell_price || b.base_price) - (a.sell_price || a.base_price),
        );
        break;
      case "newest":
        filtered.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at),
        );
        break;
      default: // name
        filtered.sort((a, b) => {
          const nameA = (a.name_en || a.name || "").toLowerCase();
          const nameB = (b.name_en || b.name || "").toLowerCase();
          return nameA.localeCompare(nameB);
        });
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, sortBy]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [applyFiltersAndSort]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBrandProducts();
    setRefreshing(false);
  };

  const handleProductPress = (product) => {
    if (!navigationInProgress.current) {
      navigationInProgress.current = true;
      const productId = product.id || product.product_id;
      console.log(
        "Product ID:",
        productId,
        "Navigating to:",
        `/product/${productId}`,
      );
      router.push(`/product/${productId}`);
      setTimeout(() => {
        navigationInProgress.current = false;
      }, 500);
    }
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === "grid" ? "list" : "grid");
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  if (loading) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ color: theme.colors.text, marginTop: 16 }}>
          {t("loading") || "Loading..."}
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <SafeAreaView
        edges={["top"]}
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        {/* Custom Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.colors.card,
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <View style={[styles.headerContent, { flexDirection: rowDirection }]}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.back()}
            >
              <Ionicons
                name={isRTL ? "arrow-forward" : "arrow-back"}
                size={24}
                color={theme.colors.text}
              />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {brand?.name || name || t("brand")}
            </Text>
            <View style={{ width: 40 }} />
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
        >
          {/* Search and Filter Bar */}
          <View
            style={[
              styles.searchSection,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Ionicons
                name="search"
                size={20}
                color={theme.colors.textSecondary}
              />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text }]}
                placeholder={t("searchProducts") || "Search products..."}
                placeholderTextColor={theme.colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={clearSearch}>
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>

            <View style={[styles.filterBar, { flexDirection: rowDirection }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    sortBy === "name" && {
                      backgroundColor: theme.colors.primary,
                    },
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => setSortBy("name")}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: sortBy === "name" ? "#fff" : theme.colors.text },
                    ]}
                  >
                    {t("name")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    sortBy === "price_low" && {
                      backgroundColor: theme.colors.primary,
                    },
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => setSortBy("price_low")}
                >
                  <Ionicons
                    name="arrow-up"
                    size={16}
                    color={sortBy === "price_low" ? "#fff" : theme.colors.text}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color:
                          sortBy === "price_low" ? "#fff" : theme.colors.text,
                      },
                    ]}
                  >
                    {t("lowestPrice")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    sortBy === "price_high" && {
                      backgroundColor: theme.colors.primary,
                    },
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => setSortBy("price_high")}
                >
                  <Ionicons
                    name="arrow-down"
                    size={16}
                    color={sortBy === "price_high" ? "#fff" : theme.colors.text}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color:
                          sortBy === "price_high" ? "#fff" : theme.colors.text,
                      },
                    ]}
                  >
                    {t("highestPrice")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    sortBy === "newest" && {
                      backgroundColor: theme.colors.primary,
                    },
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => setSortBy("newest")}
                >
                  <Ionicons
                    name="time"
                    size={16}
                    color={sortBy === "newest" ? "#fff" : theme.colors.text}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color: sortBy === "newest" ? "#fff" : theme.colors.text,
                      },
                    ]}
                  >
                    {t("newestFirst")}
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              <TouchableOpacity
                style={[
                  styles.viewModeButton,
                  { backgroundColor: theme.colors.background },
                ]}
                onPress={toggleViewMode}
              >
                <Ionicons
                  name={viewMode === "grid" ? "list" : "grid"}
                  size={20}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Products Section */}
          <View style={styles.productsSection}>
            <View
              style={[
                styles.sectionHeader,
                { paddingHorizontal: 16, flexDirection: rowDirection },
              ]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.text, textAlign },
                ]}
              >
                {filteredProducts.length} {t("products") || "Products"}
              </Text>
            </View>

            {filteredProducts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View
                  style={[
                    styles.emptyIconContainer,
                    { backgroundColor: theme.colors.primary + "15" },
                  ]}
                >
                  <Ionicons
                    name="cube-outline"
                    size={64}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={[styles.emptyText, { color: theme.colors.text }]}>
                  {searchQuery
                    ? t("noProductsFound") || "No products found"
                    : t("noProducts") || "No products available"}
                </Text>
                <Text
                  style={[
                    styles.emptySubtext,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {searchQuery
                    ? t("tryDifferentSearch") || "Try a different search"
                    : t("checkBackLater") || "Check back later"}
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.productsGrid,
                  viewMode === "list" && styles.productsList,
                ]}
              >
                {filteredProducts.map((item) => (
                  <Pressable
                    key={item.id || item.product_id}
                    style={({ pressed }) => [
                      viewMode === "grid"
                        ? styles.productCard
                        : styles.productCardList,
                      {
                        backgroundColor: theme.colors.card,
                        width: cardWidth,
                        borderColor: theme.colors.border,
                      },
                      pressed && {
                        transform: [{ scale: 0.98 }],
                        borderColor: theme.colors.primary,
                      },
                    ]}
                    onPress={() => handleProductPress(item)}
                  >
                    <View
                      style={[
                        viewMode === "grid"
                          ? styles.imageContainer
                          : styles.imageContainerList,
                      ]}
                    >
                      <Image
                        source={{
                          uri: getProductImageUrl(
                            item,
                            "https://via.placeholder.com/300",
                          ),
                        }}
                        style={
                          viewMode === "grid"
                            ? styles.productImage
                            : styles.productImageList
                        }
                        contentFit="cover"
                        transition={200}
                        cachePolicy="memory-disk"
                      />
                      {!item.in_stock && (
                        <View style={styles.outOfStockBadge}>
                          <Text style={styles.outOfStockText}>
                            {t("outOfStock") || "Out of Stock"}
                          </Text>
                        </View>
                      )}
                      {item.commission_price && item.commission_price > 0 && (
                        <View style={styles.commissionBadge}>
                          <Ionicons name="gift" size={12} color="#fff" />
                          <Text style={styles.commissionText}>
                            +{item.commission_price}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View
                      style={[
                        styles.productInfo,
                        viewMode === "list" && styles.productInfoList,
                      ]}
                    >
                      <Text
                        style={[
                          styles.productName,
                          {
                            color: theme.colors.text,
                            textAlign,
                          },
                        ]}
                        numberOfLines={viewMode === "grid" ? 2 : 3}
                      >
                        {getLocalizedText(item, "name")}
                      </Text>
                      {viewMode === "list" && item.product_code && (
                        <Text
                          style={[
                            styles.productCode,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {t("model")}: {item.product_code}
                        </Text>
                      )}
                      <View
                        style={[
                          styles.priceRow,
                          {
                            flexDirection: rowDirection,
                            justifyContent: "space-between",
                          },
                        ]}
                      >
                        <View>
                          <Text
                            style={[
                              styles.productPrice,
                              { color: theme.colors.primary },
                            ]}
                          >
                            {item.sell_price || item.base_price}{" "}
                            {isRTL ? "دینار" : "IQD"}
                          </Text>
                          {item.base_price &&
                            item.sell_price &&
                            item.base_price > item.sell_price && (
                              <Text
                                style={[
                                  styles.originalPrice,
                                  { color: theme.colors.textSecondary },
                                ]}
                              >
                                {item.base_price} {isRTL ? "دینار" : "IQD"}
                              </Text>
                            )}
                        </View>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  headerContent: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,

    flex: 1,
    textAlign: "center",
  },
  brandHeader: {
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  gradientBackground: {
    alignItems: "center",
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    padding: 16,
  },
  brandLogo: {
    width: "100%",
    height: "100%",
  },
  brandName: {
    fontSize: 28,

    marginBottom: 8,
    textAlign: "center",
  },
  brandDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  statsContainer: {
    marginTop: 16,
    gap: 32,
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  statNumber: {
    fontSize: 24,

    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  filterBar: {
    alignItems: "center",
    gap: 12,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    gap: 4,
  },
  filterChipText: {
    fontSize: 13,
  },
  viewModeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  productsSection: {
    paddingTop: 8,
    paddingBottom: 32,
  },
  sectionHeader: {
    marginBottom: 16,
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 16,
  },
  productsList: {
    flexDirection: "column",
  },
  productCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 0.5,
  },
  productCardList: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: 1,
  },
  imageContainerList: {
    position: "relative",
    width: 120,
    height: 120,
  },
  productImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f9f9f9",
  },
  productImageList: {
    width: 120,
    height: 120,
    backgroundColor: "#f9f9f9",
  },
  outOfStockBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  outOfStockText: {
    color: "#fff",
    fontSize: 12,

    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  commissionBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#34C759",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  commissionText: {
    color: "#fff",
    fontSize: 10,
  },
  productInfo: {
    padding: 12,
  },
  productInfoList: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  productName: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 18,
    minHeight: 36,
  },
  productCode: {
    fontSize: 11,
    marginBottom: 8,
  },
  priceRow: {
    alignItems: "center",
  },
  productPrice: {
    fontSize: 16,
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: "line-through",
    marginTop: 2,
  },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stockText: {
    fontSize: 11,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 18,

    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
