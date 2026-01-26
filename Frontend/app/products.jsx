import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Image,
  Dimensions,
  Text as RNText,
  Share,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { useLanguage } from "../utils/LanguageContext";
import { useTheme } from "../utils/ThemeContext";
import { fetchProducts } from "../store/slices/productsSlice";
import { fetchBrands } from "../store/slices/brandsSlice";
import { fetchCategories } from "../store/slices/categoriesSlice";
import InfoDialog from "../components/InfoDialog";
import { getProductImageUrl } from "../utils/productImages";

// Custom Text component with font
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

// Responsive layout hook
const useResponsiveLayout = () => {
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const { width, height } = dimensions;
  const isLandscape = width > height;

  const isSmallPhone = width <= 375;
  const isMediumPhone = width > 375 && width <= 414;
  const isLargePhone = width > 414;

  const horizontalPadding = isSmallPhone ? 12 : isMediumPhone ? 16 : 20;
  const cardGap = isSmallPhone ? 8 : 12;

  const columns = isLandscape ? 3 : 2;
  const totalGapWidth = cardGap * (columns - 1);
  const cardWidth = Math.floor(
    (width - horizontalPadding * 2 - totalGapWidth) / columns,
  );

  const productNameSize = isSmallPhone ? 12 : 13;
  const productPriceSize = isSmallPhone ? 14 : 16;

  return {
    width,
    height,
    isLandscape,
    isSmallPhone,
    isMediumPhone,
    isLargePhone,
    horizontalPadding,
    cardGap,
    cardWidth,
    productNameSize,
    productPriceSize,
  };
};

export default function Products() {
  const router = useRouter();
  const { category: routeCategory } = useLocalSearchParams();
  const dispatch = useDispatch();
  const { t, isRTL, language } = useLanguage();
  const { theme } = useTheme();
  const layout = useResponsiveLayout();
  const navigationInProgress = useRef(false);

  const [dialog, setDialog] = useState({
    visible: false,
    title: "",
    message: "",
  });
  const closeDialog = () =>
    setDialog({ visible: false, title: "", message: "" });
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 20;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState(
    routeCategory || "all",
  );
  const [sortBy, setSortBy] = useState("latest");
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const { items: products, loading: productsLoading } = useSelector(
    (state) => state.products,
  );
  const { items: brands, loading: brandsLoading } = useSelector(
    (state) => state.brands,
  );
  const { items: categories, loading: categoriesLoading } = useSelector(
    (state) => state.categories,
  );
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    const fetchParams = { limit: pageSize, offset: 0 };

    // Include category filter in API request if category is selected
    if (routeCategory && routeCategory !== "all") {
      fetchParams.category_id = routeCategory;
    }

    dispatch(fetchProducts(fetchParams));
    dispatch(fetchBrands({ limit: 10 }));
    dispatch(fetchCategories({ limit: 100 }));
    setOffset(pageSize);
    setHasMore(true);
  }, [dispatch, routeCategory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    const fetchParams = { limit: pageSize, offset: 0 };
    if (routeCategory && routeCategory !== "all") {
      fetchParams.category_id = routeCategory;
    }
    dispatch(fetchProducts(fetchParams))
      .then((result) => {
        setOffset(pageSize);
        setHasMore(result.payload?.items?.length >= pageSize);
        setRefreshing(false);
      })
      .catch(() => setRefreshing(false));
  }, [dispatch, routeCategory]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || productsLoading) return;

    setLoadingMore(true);
    const fetchParams = { limit: pageSize, offset, append: true };
    if (routeCategory && routeCategory !== "all") {
      fetchParams.category_id = routeCategory;
    }

    dispatch(fetchProducts(fetchParams))
      .then((result) => {
        const newItems = result.payload?.items || [];
        setOffset((prev) => prev + pageSize);
        setHasMore(newItems.length >= pageSize);
        setLoadingMore(false);
      })
      .catch(() => setLoadingMore(false));
  }, [dispatch, loadingMore, hasMore, offset, routeCategory, productsLoading]);

  const handleScroll = (event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;

    if (isCloseToBottom) {
      loadMore();
    }
  };

  const handleShareProduct = async (id, name) => {
    try {
      const userId = user?.id || "unknown";
      const checkoutUrl = `https://checkout.aman-store.com/checkout?userId=${userId}&productId=${id}`;

      await Share.share({
        title: name,
        message: `${name}\n\n${checkoutUrl}`,
      });
    } catch (_e) {
      setDialog({
        visible: true,
        title: "Error",
        message: "Unable to share product",
      });
    }
  };

  const computeBonus = (p) => {
    if (typeof p?.bonus === "number") return p.bonus;
    const priceNum = typeof p?.price === "number" ? p.price : Number(p?.price);
    if (!isNaN(priceNum)) return Math.round(priceNum * 0.1 * 100) / 100;
    return undefined;
  };

  const getLocalizedProductName = (product, lang) => {
    if (!product) return "Product";

    try {
      let name = "";

      // Check if localized fields exist
      const titleAr = product?.name_ar?.trim();
      const titleEn = product?.name_en?.trim();
      const titleKu = product?.name_ku?.trim();
      // Determine language and set name with fallbacks
      if (lang === "ar") {
        name = titleAr || titleEn || titleKu;
      } else if (lang === "en") {
        name = titleEn || titleAr || titleKu;
      } else if (lang === "ku") {
        name = titleKu || titleEn || titleAr;
      } else if (lang === "om") {
        name = titleOm || titleEn || titleAr;
      } else {
        name = titleEn || titleAr || titleKu;
      }

      return name || "Product";
    } catch (error) {
      console.warn("Error getting localized product name:", error);
      return product?.title || "Product";
    }
  };

  const getFilteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];

    let filtered = [...products];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((product) => {
        const name = getLocalizedProductName(product, language).toLowerCase();
        const description = (product.description || "").toLowerCase();
        return name.includes(query) || description.includes(query);
      });
    }

    // Filter by selected brand
    if (selectedBrand !== "all") {
      filtered = filtered.filter(
        (product) => String(product.brand_id) === String(selectedBrand),
      );
    }

    // Filter by selected category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (product) => String(product.category_id) === String(selectedCategory),
      );
    }

    // Sort products
    if (sortBy === "price-low") {
      filtered.sort((a, b) => (a.sell_price || 0) - (b.sell_price || 0));
    } else if (sortBy === "price-high") {
      filtered.sort((a, b) => (b.sell_price || 0) - (a.sell_price || 0));
    } else if (sortBy === "rating") {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === "latest") {
      filtered.sort((a, b) => (b.id || 0) - (a.id || 0));
    }

    return filtered;
  }, [
    products,
    searchQuery,
    selectedBrand,
    selectedCategory,
    sortBy,
    language,
  ]);

  const renderStars = (rating) => {
    const stars = [];
    const full = Math.floor(rating);
    const hasHalf = rating - full >= 0.5;
    for (let i = 0; i < full; i++) {
      stars.push(
        <Ionicons key={`full-${i}`} name="star" size={12} color="#FFB800" />,
      );
    }
    if (hasHalf) {
      stars.push(
        <Ionicons key="half" name="star-half" size={12} color="#FFB800" />,
      );
    }
    const remaining = 5 - stars.length;
    for (let i = 0; i < remaining; i++) {
      stars.push(
        <Ionicons
          key={`empty-${i}`}
          name="star-outline"
          size={12}
          color="#FFB800"
        />,
      );
    }
    return stars;
  };

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
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
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
          {t("allProducts") || "All Products"}
        </Text>
        <TouchableOpacity
          onPress={() => setFilterModalVisible(true)}
          style={styles.filterIconButton}
        >
          <Ionicons name="funnel" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScroll={handleScroll}
        scrollEventThrottle={400}
      >
        {/* Search Input */}
        <View
          style={[
            styles.searchWrapper,
            {
              paddingHorizontal: layout.horizontalPadding,
              marginBottom: 16,
              marginTop: 8,
            },
          ]}
        >
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                shadowColor: theme.colors.shadow || "#000",
              },
            ]}
          >
            <Ionicons
              name="search"
              size={20}
              color={theme.colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={[
                styles.searchInput,
                {
                  color: theme.colors.text,
                },
              ]}
              placeholder={t("searchProducts") || "Search products..."}
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              selectionColor={theme.colors.primary}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={styles.clearButton}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Brand Filter */}
        {/* Moved to Modal */}

        <View
          style={[
            styles.productsGrid,
            {
              flexDirection: isRTL ? "row-reverse" : "row",
              paddingHorizontal: layout.horizontalPadding,
              gap: layout.cardGap,
            },
          ]}
        >
          {productsLoading && getFilteredProducts.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : getFilteredProducts.length > 0 ? (
            getFilteredProducts.map((product) => (
              <Pressable
                key={product.id}
                style={({ pressed }) => [
                  styles.productCard,
                  {
                    backgroundColor: theme.colors.card,
                    width: layout.cardWidth,
                  },
                  {
                    borderColor: theme.colors.border,
                    borderWidth: StyleSheet.hairlineWidth,
                  },
                  pressed && styles.productCardPressed,
                  pressed && { borderColor: theme.colors.primary },
                ]}
                onPress={() => {
                  if (!navigationInProgress.current) {
                    navigationInProgress.current = true;
                    router.push(`/product/${product.id}`);
                    setTimeout(() => { navigationInProgress.current = false; }, 500);
                  }
                }}
              >
                <View
                  style={[
                    styles.productImage,
                    {
                      height: layout.isSmallPhone
                        ? 100
                        : layout.isMediumPhone
                          ? 110
                          : 120,
                    },
                  ]}
                >
                  <Image
                    source={{
                      uri: getProductImageUrl(
                        product,
                        "https://via.placeholder.com/400",
                      ),
                    }}
                    style={styles.productImageImg}
                    resizeMode="cover"
                  />
                  {(() => {
                    const bonus = computeBonus(product);
                    return typeof bonus === "number" ? (
                      <View
                        style={[
                          styles.bonusTag,
                          { backgroundColor: theme.colors.primary },
                        ]}
                      >
                        <Text style={styles.bonusTagText}>
                          {t("sellerBonus")}: ${bonus}
                        </Text>
                      </View>
                    ) : null;
                  })()}
                </View>

                <View style={styles.productInfo}>
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.productName,
                      {
                        color: theme.colors.text,
                        fontSize: layout.productNameSize,
                        textAlign: isRTL ? "right" : "left",
                        direction: isRTL ? "rtl" : "ltr",
                      },
                    ]}
                  >
                    {getLocalizedProductName(product, language)}
                  </Text>

                  <View
                    style={[
                      styles.ratingRow,
                      { flexDirection: isRTL ? "row-reverse" : "row" },
                    ]}
                  >
                    <View style={styles.starsRow}>
                      {renderStars(product.rating || 4.0)}
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.ratingText,
                        {
                          color: theme.colors.textSecondary,
                          marginLeft: isRTL ? 0 : 6,
                          marginRight: isRTL ? 6 : 0,
                        },
                      ]}
                    >
                      {product.rating || 4.0}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.bottomRow,
                      { flexDirection: isRTL ? "row-reverse" : "row" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.productPrice,
                        {
                          color: theme.colors.primary,
                          fontSize: layout.productPriceSize,
                          textAlign: isRTL ? "right" : "left",
                        },
                      ]}
                    >
                      {typeof product.price === "number"
                        ? product.sell_price
                        : Number(product.sell_price)}{" "}
                      IQD
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.shareButton,
                        {
                          backgroundColor: theme.colors.primary,
                          width: layout.isSmallPhone ? 32 : 36,
                          height: layout.isSmallPhone ? 32 : 36,
                          borderRadius: layout.isSmallPhone ? 16 : 18,
                          marginLeft: isRTL ? 0 : 8,
                          marginRight: isRTL ? 8 : 0,
                        },
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleShareProduct(
                          product.id,
                          getLocalizedProductName(product, language),
                        );
                      }}
                    >
                      <Ionicons
                        name="share-outline"
                        size={layout.isSmallPhone ? 16 : 18}
                        color="#fff"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t("noProductsFound") || "No products found"}
              </Text>
            </View>
          )}
        </View>

        {/* Load More Indicator */}
        {loadingMore && (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text
              style={{
                color: theme.colors.textSecondary,
                marginTop: 8,
                fontSize: 12,
              }}
            >
              {t("loadingMore") || "Loading more products..."}
            </Text>
          </View>
        )}

        {!hasMore && products.length > 0 && (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
              {t("noMoreProducts") || "No more products to load"}
            </Text>
          </View>
        )}
      </ScrollView>

      <InfoDialog
        visible={dialog.visible}
        title={dialog.title}
        message={dialog.message}
        onClose={closeDialog}
      />

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View
          style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.background },
            ]}
          >
            {/* Modal Header */}
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: theme.colors.border },
              ]}
            >
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {t("filters") || "Filters"}
              </Text>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={28} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Brand Filter Section */}
              <View style={styles.filterSection}>
                <Text
                  style={[
                    styles.filterSectionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  {t("brand") || "Brand"}
                </Text>
                <View style={styles.filterOptionsContainer}>
                  {/* All Brands Option */}
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      {
                        backgroundColor:
                          selectedBrand === "all"
                            ? theme.colors.primary
                            : theme.colors.card,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={() => setSelectedBrand("all")}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        {
                          color:
                            selectedBrand === "all"
                              ? "#fff"
                              : theme.colors.text,
                        },
                      ]}
                    >
                      {t("all") || "All"}
                    </Text>
                  </TouchableOpacity>

                  {/* Brand Options */}
                  {brands.map((brand) => (
                    <TouchableOpacity
                      key={brand.id}
                      style={[
                        styles.filterOption,
                        {
                          backgroundColor:
                            selectedBrand === String(brand.id)
                              ? theme.colors.primary
                              : theme.colors.card,
                          borderColor: theme.colors.border,
                        },
                      ]}
                      onPress={() => setSelectedBrand(String(brand.id))}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          {
                            color:
                              selectedBrand === String(brand.id)
                                ? "#fff"
                                : theme.colors.text,
                          },
                        ]}
                      >
                        {brand.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Category Filter Section */}
              <View style={styles.filterSection}>
                <Text
                  style={[
                    styles.filterSectionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  {t("category") || "Category"}
                </Text>
                <View style={styles.filterOptionsContainer}>
                  {/* All Categories Option */}
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      {
                        backgroundColor:
                          selectedCategory === "all"
                            ? theme.colors.primary
                            : theme.colors.card,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={() => setSelectedCategory("all")}
                  >
                    <View style={styles.filterOptionContent}>
                      <Ionicons
                        name="apps"
                        size={16}
                        color={
                          selectedCategory === "all"
                            ? "#fff"
                            : theme.colors.primary
                        }
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.filterOptionText,
                          {
                            color:
                              selectedCategory === "all"
                                ? "#fff"
                                : theme.colors.text,
                          },
                        ]}
                      >
                        {t("all") || "All"}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Category Options */}
                  {categories && categories.length > 0 ? (
                    categories.map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.filterOption,
                          {
                            backgroundColor:
                              selectedCategory === String(category.id)
                                ? theme.colors.primary
                                : theme.colors.card,
                            borderColor: theme.colors.border,
                          },
                        ]}
                        onPress={() => setSelectedCategory(String(category.id))}
                      >
                        <View style={styles.filterOptionContent}>
                          {category.icon ? (
                            <Ionicons
                              name={category.icon}
                              size={16}
                              color={
                                selectedCategory === String(category.id)
                                  ? "#fff"
                                  : theme.colors.primary
                              }
                              style={{ marginRight: 6 }}
                            />
                          ) : (
                            <Ionicons
                              name="folder"
                              size={16}
                              color={
                                selectedCategory === String(category.id)
                                  ? "#fff"
                                  : theme.colors.primary
                              }
                              style={{ marginRight: 6 }}
                            />
                          )}
                          <Text
                            style={[
                              styles.filterOptionText,
                              {
                                color:
                                  selectedCategory === String(category.id)
                                    ? "#fff"
                                    : theme.colors.text,
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {category.name}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text
                      style={[
                        styles.filterOptionText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {t("noCategories") || "No categories available"}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.filterSection}>
                <Text
                  style={[
                    styles.filterSectionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  {t("sortBy") || "Sort By"}
                </Text>
                <View style={styles.filterOptionsContainer}>
                  {[
                    { key: "latest", label: "Latest" },
                    { key: "price-low", label: "Price: Low to High" },
                    { key: "price-high", label: "Price: High to Low" },
                    { key: "rating", label: "Top Rated" },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.filterOption,
                        {
                          backgroundColor:
                            sortBy === option.key
                              ? theme.colors.primary
                              : theme.colors.card,
                          borderColor: theme.colors.border,
                        },
                      ]}
                      onPress={() => setSortBy(option.key)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          {
                            color:
                              sortBy === option.key
                                ? "#fff"
                                : theme.colors.text,
                          },
                        ]}
                      >
                        {t(option.key) || option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer Actions */}
            <View
              style={[
                styles.modalFooter,
                { borderTopColor: theme.colors.border },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.border },
                ]}
                onPress={() => {
                  setSelectedBrand("all");
                  setSelectedCategory("all");
                  setSortBy("latest");
                  setSearchQuery("");
                }}
              >
                <Text
                  style={[styles.modalButtonText, { color: theme.colors.text }]}
                >
                  {t("reset") || "Reset"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: "#fff" }]}>
                  {t("apply") || "Apply"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 4,
  },
  filterIconButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    flex: 1,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    paddingTop: 16,
  },
  productCard: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    position: "relative",
    elevation: 0,
  },
  productCardPressed: {
    transform: [{ translateY: -1 }],
  },
  productImage: {
    width: "100%",
    backgroundColor: "#f5f5f5",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    elevation: 0,
  },
  bonusTag: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  bonusTagText: {
    color: "#fff",
    fontSize: 11,
  },
  productImageImg: {
    width: "100%",
    height: "100%",
  },
  productInfo: {
    padding: 10,
    flex: 1,
    justifyContent: "space-between",
  },
  productName: {
    fontSize: 13,

    marginBottom: 4,
    minHeight: 32,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "auto",
  },
  productPrice: {
    fontSize: 16,
  },
  ratingText: {
    fontSize: 12,

    marginLeft: 4,
    flexShrink: 1,
  },
  starsRow: {
    flexDirection: "row",
  },
  shareButton: {
    justifyContent: "center",
    alignItems: "center",
    elevation: 0,
  },
  loadingContainer: {
    width: "100%",
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    width: "100%",
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 24,
    paddingBottom: 32,
    gap: 12,
  },
  paginationButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  pageIndicator: {
    minWidth: 50,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  pageNumber: {
    fontSize: 16,

    textAlign: "center",
  },
  brandsSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,

    marginBottom: 12,
  },
  brandsList: {
    flexDirection: "row",
  },
  brandCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
    height: 130,
  },
  brandLogo: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  brandName: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  searchWrapper: {
    // Wrapper for proper spacing
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 2,
    borderWidth: 1,
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 6,
    marginLeft: 8,
    marginRight: -4,
  },
  filterContainer: {
    marginVertical: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  filterOptionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  filterOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
