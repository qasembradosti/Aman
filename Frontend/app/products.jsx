import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Dimensions,
  Text as RNText,
  Share,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
} from "react-native";
import { Image } from "react-native";
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
import { ListFilter } from "lucide-react-native";

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
  const { category: routeCategory, brand: routeBrand } = useLocalSearchParams();
  const dispatch = useDispatch();
  const { t, isRTL, language, locale } = useLanguage();
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
  const [selectedBrand, setSelectedBrand] = useState(routeBrand || "all");
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
    if (selectedCategory && selectedCategory !== "all") {
      fetchParams.category_id = selectedCategory;
    }

    // Include brand filter in API request if brand is selected
    if (selectedBrand && selectedBrand !== "all") {
      fetchParams.brand_id = selectedBrand;
    }

    dispatch(fetchProducts(fetchParams))
      .unwrap()
      .then((response) => {
        const dataLength = response?.data?.length || response?.length || 0;
        setOffset(pageSize);
        setHasMore(dataLength >= pageSize);
      })
      .catch((error) => {
        console.error("Error fetching products:", error);
        setOffset(pageSize);
        setHasMore(false);
      });

    dispatch(fetchBrands({ limit: 100 }));
    dispatch(fetchCategories({ limit: 100 }));
  }, [dispatch, selectedCategory, selectedBrand]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    const fetchParams = { limit: pageSize, offset: 0 };

    if (selectedCategory && selectedCategory !== "all") {
      fetchParams.category_id = selectedCategory;
    }

    if (selectedBrand && selectedBrand !== "all") {
      fetchParams.brand_id = selectedBrand;
    }

    dispatch(fetchProducts(fetchParams))
      .unwrap()
      .then((response) => {
        const dataLength = response?.data?.length || response?.length || 0;
        setOffset(pageSize);
        setHasMore(dataLength >= pageSize);
      })
      .catch((error) => {
        console.error("Error refreshing products:", error);
      })
      .finally(() => {
        setRefreshing(false);
      });
  }, [dispatch, selectedCategory, selectedBrand]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || productsLoading) return;

    setLoadingMore(true);
    const fetchParams = { limit: pageSize, offset, append: true };

    if (selectedCategory && selectedCategory !== "all") {
      fetchParams.category_id = selectedCategory;
    }

    if (selectedBrand && selectedBrand !== "all") {
      fetchParams.brand_id = selectedBrand;
    }

    console.log("Loading more products with params:", fetchParams);

    dispatch(fetchProducts(fetchParams))
      .unwrap()
      .then((response) => {
        const newItems = response?.data || response || [];
        const dataLength = newItems.length;
        console.log(`Loaded ${dataLength} more products`);
        setOffset((prev) => prev + pageSize);
        setHasMore(dataLength >= pageSize);
      })
      .catch((error) => {
        console.error("Error loading more products:", error);
        setHasMore(false);
      })
      .finally(() => {
        setLoadingMore(false);
      });
  }, [
    dispatch,
    loadingMore,
    hasMore,
    offset,
    selectedCategory,
    selectedBrand,
    productsLoading,
  ]);

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
    // Use commission_price if available
    if (typeof p?.commission_price === "number" && p.commission_price > 0) {
      return p.commission_price;
    }
    if (typeof p?.bonus === "number") return p.bonus;
    const priceNum = typeof p?.price === "number" ? p.price : Number(p?.price);
    if (!isNaN(priceNum)) return Math.round(priceNum * 0.1 * 100) / 100;
    return undefined;
  };

  const getLocalizedProductName = (product, field) => {
    // Ensure language has a default fallback
    const lang = locale;
    const localizedField = `${field}_${lang}`;
    return product[localizedField] || product[field] || "";
  };

  const getFilteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];

    let filtered = [...products];

    // Filter by search query (client-side only)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((product) => {
        const name = getLocalizedProductName(product, "name").toLowerCase();
        const description = (product.description || "").toLowerCase();
        return name.includes(query) || description.includes(query);
      });
    }

    // Note: Brand and category filtering are now handled by the backend API
    // Only search and sorting are done client-side

    // Sort products (client-side)
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
  }, [products, searchQuery, sortBy, language]);

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
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.card,
            flexDirection: isRTL ? "row-reverse" : "row",
          },
        ]}
      >
        <TouchableOpacity
          onPress={() =>
            router.canGoBack?.()
              ? router.back()
              : router.replace("/(tabs)/home")
          }
          style={styles.backButton}
        >
          <Ionicons
            name={isRTL ? "arrow-forward" : "arrow-back"}
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            { color: theme.colors.text, textAlign: "center" },
          ]}
        >
          {t("allProducts") || "All Products"}
        </Text>
        <TouchableOpacity
          onPress={() => setFilterModalVisible(true)}
          style={styles.filterIconButton}
        >
          <ListFilter size={24} color={theme.colors.text} />
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
                  pressed && styles.productCardPressed,
                ]}
                onPress={() => {
                  if (!navigationInProgress.current) {
                    navigationInProgress.current = true;
                    router.push(`/product/${product.id}`);
                    setTimeout(() => {
                      navigationInProgress.current = false;
                    }, 500);
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
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                  />
                  {(() => {
                    const bonus = computeBonus(product);
                    return typeof bonus === "number" ? (
                      <View
                        style={[
                          styles.bonusTag,
                          {
                            backgroundColor: theme.colors.success || "#34C759",
                          },
                        ]}
                      >
                        <Text style={styles.bonusTagText}>
                          +{bonus} {isRTL ? "دینار" : "IQD"}
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
                    {getLocalizedProductName(product, "name")}
                  </Text>
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
                          getLocalizedProductName(product, "name"),
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
            <View style={[styles.modalHeader]}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  {t("filters") || "Filters"}
                </Text>
                {(() => {
                  const activeFilters =
                    (selectedBrand !== "all" ? 1 : 0) +
                    (selectedCategory !== "all" ? 1 : 0) +
                    (sortBy !== "latest" ? 1 : 0) +
                    (searchQuery.trim() !== "" ? 1 : 0);
                  return activeFilters > 0 ? (
                    <View
                      style={[
                        styles.filterBadge,
                        { backgroundColor: theme.colors.primary },
                      ]}
                    >
                      <Text style={styles.filterBadgeText}>
                        {activeFilters}
                      </Text>
                    </View>
                  ) : null;
                })()}
              </View>
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
                      },
                    ]}
                    onPress={() => setSelectedBrand("all")}
                  >
                    <View style={styles.filterOptionContent}>
                      {selectedBrand === "all" && (
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color="#fff"
                          style={{ marginRight: 6 }}
                        />
                      )}
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
                    </View>
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
                        },
                      ]}
                      onPress={() => setSelectedBrand(String(brand.id))}
                    >
                      <View style={styles.filterOptionContent}>
                        {selectedBrand === String(brand.id) && (
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color="#fff"
                            style={{ marginRight: 6 }}
                          />
                        )}
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
                      </View>
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
            <View style={[styles.modalFooter]}>
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
  },
  paginationButtonText: {
    fontSize: 14,
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
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  filterText: {
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    letterSpacing: 0.3,
  },
  modalCloseButton: {
    padding: 6,
    borderRadius: 20,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  filterSection: {
    marginBottom: 28,
  },
  filterSectionTitle: {
    fontSize: 17,
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  filterOptionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    marginBottom: 0,
  },
  filterOptionText: {
    fontSize: 14,
  },
  filterOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 18,
    paddingBottom: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 16,
  },
});
