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
import { Image } from "expo-image";
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
import { buildPublicProductUrl } from "../utils/productLinks";

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

const normalizeFilterValue = (value) => {
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized ? String(normalized) : "all";
};

const normalizeBooleanParam = (value) => {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (normalized === undefined || normalized === null || normalized === "") {
    return false;
  }

  const lowered = String(normalized).toLowerCase();
  return lowered === "1" || lowered === "true" || lowered === "yes";
};

export default function Products() {
  const router = useRouter();
  const {
    category: routeCategory,
    brand: routeBrand,
    is_trend: routeIsTrend,
    trending: routeTrending,
    is_important: routeIsImportant,
  } = useLocalSearchParams();
  const dispatch = useDispatch();
  const { t, isRTL, locale } = useLanguage();
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
  const [selectedBrand, setSelectedBrand] = useState(() =>
    normalizeFilterValue(routeBrand),
  );
  const [selectedCategory, setSelectedCategory] = useState(() =>
    normalizeFilterValue(routeCategory),
  );
  const [selectedSubcategory, setSelectedSubcategory] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const trendingOnly =
    normalizeBooleanParam(routeIsTrend) || normalizeBooleanParam(routeTrending);
  const importantOnly = normalizeBooleanParam(routeIsImportant);

  const { items: products, loading: productsLoading } = useSelector(
    (state) => state.products,
  );
  const { items: brands } = useSelector(
    (state) => state.brands,
  );
  const { items: categories } = useSelector(
    (state) => state.categories,
  );
  useEffect(() => {
    const nextBrand = normalizeFilterValue(routeBrand);
    const nextCategory = normalizeFilterValue(routeCategory);

    setSelectedBrand((prev) => (prev === nextBrand ? prev : nextBrand));
    setSelectedCategory((prev) =>
      prev === nextCategory ? prev : nextCategory,
    );
    setSelectedSubcategory("all");
  }, [routeBrand, routeCategory]);

  const buildFetchParams = useCallback(
    ({ limit = pageSize, offset: currentOffset = 0, append = false } = {}) => {
      const fetchParams = { limit, offset: currentOffset };

      if (append) {
        fetchParams.append = true;
      }

      // Subcategory takes precedence over parent category
      if (selectedSubcategory && selectedSubcategory !== "all") {
        fetchParams.category_id = selectedSubcategory;
      } else if (selectedCategory && selectedCategory !== "all") {
        fetchParams.category_id = selectedCategory;
      }

      if (selectedBrand && selectedBrand !== "all") {
        fetchParams.brand_id = selectedBrand;
      }

      if (trendingOnly) {
        fetchParams.is_trend = 1;
      }

      if (importantOnly) {
        fetchParams.is_important = 1;
      }

      return fetchParams;
    },
    [
      pageSize,
      selectedSubcategory,
      selectedCategory,
      selectedBrand,
      trendingOnly,
      importantOnly,
    ],
  );

  useEffect(() => {
    if (!brands?.length) {
      dispatch(fetchBrands({ limit: 100 }));
    }

    if (!categories?.length) {
      dispatch(fetchCategories({ limit: 100 }));
    }
  }, [dispatch, brands?.length, categories?.length]);

  useEffect(() => {
    const fetchParams = buildFetchParams({ limit: pageSize, offset: 0 });

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
  }, [dispatch, buildFetchParams, pageSize]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    const fetchParams = buildFetchParams({ limit: pageSize, offset: 0 });

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
  }, [dispatch, buildFetchParams, pageSize]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || productsLoading) return;

    setLoadingMore(true);
    const fetchParams = buildFetchParams({
      limit: pageSize,
      offset,
      append: true,
    });

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
    productsLoading,
    buildFetchParams,
    pageSize,
  ]);

  const handleScroll = (event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    if (contentSize.height <= layoutMeasurement.height) return;
    const paddingToBottom = 220;
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;

    if (isCloseToBottom) {
      loadMore();
    }
  };

  const handleShareProduct = async (id, name, storeId) => {
    try {
      const productUrl = buildPublicProductUrl(id);

      await Share.share({
        title: name,
        message: `${name}\n\n${productUrl}`,
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

  // Get available subcategories based on selected brand and category
  const availableSubcategories = useMemo(() => {
    if (!categories || categories.length === 0) return [];
    
    // Filter categories that are subcategories
    let subcats = [];
    
    if (selectedCategory && selectedCategory !== "all") {
      // Show all subcategories of the selected parent category
      // Don't filter by uniqueCategoryIds here because products might be filtered on server side
      subcats = categories.filter(cat => 
        cat.parent_id && String(cat.parent_id) === String(selectedCategory)
      );
      
      // If no subcategories found with parent_id match, check if selected is itself a subcategory
      // In that case, don't show subcategories
      if (subcats.length === 0) {
        const selectedCat = categories.find(c => String(c.id) === String(selectedCategory));
        if (selectedCat && selectedCat.parent_id) {
          // Selected category is a subcategory, don't show any subcategories
          subcats = [];
        }
      }
    } else if (selectedBrand && selectedBrand !== "all") {
      // When a brand is selected but no category, show all subcategories
      // (products will be filtered by brand on backend)
      subcats = categories.filter(cat => cat.parent_id);
    } else {
      // When both "all" brand and "all" category are selected
      // Only show subcategories that have products in current view
      let relevantProducts = products || [];
      const uniqueCategoryIds = [...new Set(relevantProducts.map(p => p.category_id).filter(Boolean))];
      subcats = categories.filter(cat => 
        cat.parent_id && uniqueCategoryIds.includes(cat.id)
      );
    }
    
    return subcats;
  }, [products, categories, selectedBrand, selectedCategory]);

  // Reset subcategory when brand or category changes
  useEffect(() => {
    setSelectedSubcategory("all");
  }, [selectedBrand, selectedCategory]);

  const getFilteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];

    let filtered = [...products];

    // Filter by search query (client-side only)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((product) => {
        const searchableText = [
          product?.name,
          product?.name_en,
          product?.name_ar,
          product?.name_ku,
          product?.description,
          product?.description_en,
          product?.description_ar,
          product?.description_ku,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(query);
      });
    }

    // Note: Brand, category, and subcategory filtering are now handled by the backend API
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
  }, [products, searchQuery, sortBy]);

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
            name={"arrow-back"}
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
          {trendingOnly
            ? t("trendingProducts") || "Trending Products"
            : t("allProducts") || "All Products"}
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
        scrollEventThrottle={16}
      >
        {/* Search Input */}
        <View
          style={[
            styles.searchWrapper,
            {
              paddingHorizontal: layout.horizontalPadding,
              marginBottom: availableSubcategories.length > 0 ? 8 : 16,
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

        {/* Subcategory Filter Badges */}
        {availableSubcategories.length > 0 && (
          <View
            style={[
              styles.subcategoryWrapper,
              {
                paddingHorizontal: layout.horizontalPadding,
                marginBottom: 16,
              },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                flexDirection: isRTL ? 'row-reverse' : 'row',
                gap: 8,
              }}
            >
              {/* All Subcategories Badge */}
              <TouchableOpacity
                style={[
                  styles.subcategoryBadge,
                  {
                    backgroundColor:
                      selectedSubcategory === "all"
                        ? theme.colors.primary
                        : theme.colors.card,
                    borderColor: theme.colors.primary,
                  },
                ]}
                onPress={() => setSelectedSubcategory("all")}
              >
                <Text
                  style={[
                    styles.subcategoryBadgeText,
                    {
                      color:
                        selectedSubcategory === "all"
                          ? "#fff"
                          : theme.colors.text,
                    },
                  ]}
                >
                  {t("all") || "All"}
                </Text>
              </TouchableOpacity>

              {/* Subcategory Badges */}
              {availableSubcategories.map((subcat) => (
                <TouchableOpacity
                  key={subcat.id}
                  style={[
                    styles.subcategoryBadge,
                    {
                      backgroundColor:
                        selectedSubcategory === String(subcat.id)
                          ? theme.colors.primary
                          : theme.colors.card,
                      borderColor: theme.colors.primary,
                    },
                  ]}
                  onPress={() => setSelectedSubcategory(String(subcat.id))}
                >
                  <Text
                    style={[
                      styles.subcategoryBadgeText,
                      {
                        color:
                          selectedSubcategory === String(subcat.id)
                            ? "#fff"
                            : theme.colors.text,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {getLocalizedProductName(subcat,"name") }
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

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
                          product.store_id,
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
      </ScrollView>

      <InfoDialog
        visible={dialog.visible}
        title={dialog.title}
        message={dialog.message}
        onClose={closeDialog}
      />

      {/* Filter Modal */}
      {filterModalVisible ? (
        <Modal
          visible
          transparent
          animationType="slide"
          onRequestClose={() => setFilterModalVisible(false)}
        >
          <View
            style={[
              styles.modalOverlay,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
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
                    (trendingOnly ? 1 : 0) +
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
      ) : null}
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
  subcategoryWrapper: {
    // Wrapper for subcategory badges
  },
  subcategoryBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  subcategoryBadgeText: {
    fontSize: 13,
  },
});
