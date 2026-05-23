import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useDeferredValue,
} from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
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
import { fetchBrands } from "../store/slices/brandsSlice";
import { fetchCategories } from "../store/slices/categoriesSlice";
import InfoDialog from "../components/InfoDialog";
import { getProductImageUrl } from "../utils/productImages";
import { ListFilter } from "lucide-react-native";
import { buildPublicProductUrl } from "../utils/productLinks";
import apiService from "../services/apiService";

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
    columns,
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

const extractProductsResponseData = (responseData) => {
  const items = Array.isArray(responseData?.data)
    ? responseData.data
    : Array.isArray(responseData)
      ? responseData
      : [];
  const meta =
    responseData?.meta && typeof responseData.meta === "object"
      ? responseData.meta
      : null;

  return { items, meta };
};

const mergeUniqueProducts = (currentItems, nextItems) => {
  const existingIds = new Set(currentItems.map((item) => String(item.id)));
  const uniqueNextItems = nextItems.filter(
    (item) => !existingIds.has(String(item.id)),
  );

  return uniqueNextItems.length > 0
    ? [...currentItems, ...uniqueNextItems]
    : currentItems;
};

const mergeUniqueProductsFromLists = (lists) => {
  const mergedItems = [];
  const seenIds = new Set();

  lists.flat().forEach((item) => {
    const itemId = String(item?.id ?? "");
    if (!itemId || seenIds.has(itemId)) {
      return;
    }

    seenIds.add(itemId);
    mergedItems.push(item);
  });

  return mergedItems;
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
  const currencyLabel = t("currency") || "IQD";
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
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
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
  const [draftBrand, setDraftBrand] = useState(() =>
    normalizeFilterValue(routeBrand),
  );
  const [draftCategory, setDraftCategory] = useState(() =>
    normalizeFilterValue(routeCategory),
  );
  const [draftSortBy, setDraftSortBy] = useState("latest");
  const trendingOnly =
    normalizeBooleanParam(routeIsTrend) || normalizeBooleanParam(routeTrending);
  const importantOnly = normalizeBooleanParam(routeIsImportant);
  const activeProductsRequest = useRef(0);
  const loadMoreRequestInFlight = useRef(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = deferredSearchQuery.trim();
  const { user } = useSelector((state) => state.auth);
  const { items: brands } = useSelector(
    (state) => state.brands,
  );
  const { items: categories } = useSelector(
    (state) => state.categories,
  );
  const topLevelCategories = useMemo(
    () => categories.filter((category) => !category?.parent_id),
    [categories],
  );

  const selectedCategoryGroupIds = useMemo(() => {
    if (!selectedCategory || selectedCategory === "all") {
      return [];
    }

    if (selectedSubcategory && selectedSubcategory !== "all") {
      return [String(selectedSubcategory)];
    }

    const childCategoryIds = categories
      .filter(
        (category) =>
          category?.parent_id &&
          String(category.parent_id) === String(selectedCategory),
      )
      .map((category) => String(category.id));

    return childCategoryIds.length > 0
      ? [String(selectedCategory), ...childCategoryIds]
      : [String(selectedCategory)];
  }, [categories, selectedCategory, selectedSubcategory]);

  const shouldExpandSelectedCategory = useMemo(
    () =>
      selectedCategory !== "all" &&
      selectedSubcategory === "all" &&
      selectedCategoryGroupIds.length > 1,
    [selectedCategory, selectedSubcategory, selectedCategoryGroupIds.length],
  );

  useEffect(() => {
    const nextBrand = normalizeFilterValue(routeBrand);
    const nextCategory = normalizeFilterValue(routeCategory);

    setSelectedBrand((prev) => (prev === nextBrand ? prev : nextBrand));
    setSelectedCategory((prev) =>
      prev === nextCategory ? prev : nextCategory,
    );
    setDraftBrand((prev) => (prev === nextBrand ? prev : nextBrand));
    setDraftCategory((prev) => (prev === nextCategory ? prev : nextCategory));
    setSelectedSubcategory("all");
  }, [routeBrand, routeCategory]);

  useEffect(() => {
    if (!filterModalVisible) {
      return;
    }

    setDraftBrand(selectedBrand);
    setDraftCategory(selectedCategory);
    setDraftSortBy(sortBy);
  }, [filterModalVisible, selectedBrand, selectedCategory, sortBy]);

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

      if (normalizedSearchQuery) {
        fetchParams.q = normalizedSearchQuery;
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
      normalizedSearchQuery,
    ],
  );

  const buildCommonFetchParams = useCallback(() => {
    const fetchParams = {};

    if (selectedBrand && selectedBrand !== "all") {
      fetchParams.brand_id = selectedBrand;
    }

    if (trendingOnly) {
      fetchParams.is_trend = 1;
    }

    if (importantOnly) {
      fetchParams.is_important = 1;
    }

    if (normalizedSearchQuery) {
      fetchParams.q = normalizedSearchQuery;
    }

    return fetchParams;
  }, [selectedBrand, trendingOnly, importantOnly, normalizedSearchQuery]);

  useEffect(() => {
    if (!brands?.length) {
      dispatch(fetchBrands({ limit: 100 }));
    }

    if (!categories?.length) {
      dispatch(fetchCategories({ limit: 100 }));
    }
  }, [dispatch, brands?.length, categories?.length]);

  const fetchAllProductsForCategoryIds = useCallback(
    async (categoryIds) => {
      const CATEGORY_GROUP_BATCH_SIZE = 100;
      const commonFetchParams = buildCommonFetchParams();

      const loadCategoryProducts = async (categoryId) => {
        let categoryOffset = 0;
        let hasCategoryMore = true;
        let collectedItems = [];

        while (hasCategoryMore) {
          const response = await apiService.get("/api/products", {
            params: {
              ...commonFetchParams,
              category_id: categoryId,
              limit: CATEGORY_GROUP_BATCH_SIZE,
              offset: categoryOffset,
            },
          });

          const { items, meta } = extractProductsResponseData(response?.data);
          collectedItems = [...collectedItems, ...items];
          categoryOffset += items.length;

          hasCategoryMore =
            items.length > 0 &&
            (typeof meta?.total === "number"
              ? categoryOffset < meta.total
              : items.length >= CATEGORY_GROUP_BATCH_SIZE);
        }

        return collectedItems;
      };

      const groupedResults = await Promise.all(
        categoryIds.map((categoryId) => loadCategoryProducts(categoryId)),
      );

      return mergeUniqueProductsFromLists(groupedResults);
    },
    [buildCommonFetchParams],
  );

  const fetchProductsList = useCallback(async ({
    refreshingList = false,
  } = {}) => {
    const fetchParams = buildFetchParams({ limit: pageSize, offset: 0 });
    const requestId = activeProductsRequest.current + 1;
    activeProductsRequest.current = requestId;
    loadMoreRequestInFlight.current = false;
    setLoadingMore(false);

    if (refreshingList) {
      setRefreshing(true);
    } else {
      setProductsLoading(true);
      setProducts([]);
      setOffset(0);
      setHasMore(true);
    }

    try {
      let items = [];
      let meta = null;

      if (shouldExpandSelectedCategory) {
        items = await fetchAllProductsForCategoryIds(selectedCategoryGroupIds);
      } else {
        const response = await apiService.get("/api/products", {
          params: fetchParams,
        });
        const extractedResponse = extractProductsResponseData(response?.data);
        items = extractedResponse.items;
        meta = extractedResponse.meta;
      }

      if (requestId !== activeProductsRequest.current) {
        return;
      }

      setProducts(items);
      setOffset(items.length);
      setHasMore(
        shouldExpandSelectedCategory
          ? false
          : typeof meta?.total === "number"
          ? items.length < meta.total
          : items.length >= pageSize,
      );
    } catch (error) {
      if (requestId !== activeProductsRequest.current) {
        return;
      }

      console.error("Error fetching products:", error);
      setProducts([]);
      setOffset(0);
      setHasMore(false);
    } finally {
      if (requestId !== activeProductsRequest.current) {
        return;
      }

      setProductsLoading(false);
      setRefreshing(false);
    }
  }, [
    buildFetchParams,
    fetchAllProductsForCategoryIds,
    pageSize,
    selectedCategoryGroupIds,
    shouldExpandSelectedCategory,
  ]);

  useEffect(() => {
    fetchProductsList();
  }, [fetchProductsList]);

  const onRefresh = useCallback(() => {
    fetchProductsList({ refreshingList: true })
      .catch((error) => {
        console.error("Error refreshing products:", error);
      });
  }, [fetchProductsList]);

  const loadMore = useCallback(() => {
    if (
      loadingMore ||
      loadMoreRequestInFlight.current ||
      !hasMore ||
      productsLoading
    ) {
      return;
    }

    const requestId = activeProductsRequest.current;
    loadMoreRequestInFlight.current = true;
    setLoadingMore(true);
    const fetchParams = buildFetchParams({
      limit: pageSize,
      offset,
    });

    apiService
      .get("/api/products", { params: fetchParams })
      .then((response) => {
        if (requestId !== activeProductsRequest.current) {
          return;
        }

        const { items: nextItems, meta } = extractProductsResponseData(
          response?.data,
        );
        const mergedItems = mergeUniqueProducts(products, nextItems);

        setProducts(mergedItems);
        setOffset(mergedItems.length);
        setHasMore(
          typeof meta?.total === "number"
            ? mergedItems.length < meta.total
            : nextItems.length >= pageSize,
        );
      })
      .catch((error) => {
        if (requestId !== activeProductsRequest.current) {
          return;
        }

        console.error("Error loading more products:", error);
        setHasMore(false);
      })
      .finally(() => {
        loadMoreRequestInFlight.current = false;
        setLoadingMore(false);
      });
  }, [
    loadingMore,
    hasMore,
    offset,
    products,
    productsLoading,
    buildFetchParams,
    pageSize,
  ]);

  const handleShareProduct = useCallback(async (id, name, storeId) => {
    try {
      const productUrl = buildPublicProductUrl(id, user?.id);

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
  }, [user?.id]);

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

  const getLocalizedProductName = useCallback((product, field) => {
    // Ensure language has a default fallback
    const lang = locale;
    const localizedField = `${field}_${lang}`;
    return product[localizedField] || product[field] || "";
  }, [locale]);

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

  const activeFilterCount = useMemo(
    () =>
      (selectedBrand !== "all" ? 1 : 0) +
      (selectedCategory !== "all" ? 1 : 0) +
      (selectedSubcategory !== "all" ? 1 : 0) +
      (trendingOnly ? 1 : 0) +
      (sortBy !== "latest" ? 1 : 0) +
      (searchQuery.trim() !== "" ? 1 : 0),
    [
      searchQuery,
      selectedBrand,
      selectedCategory,
      selectedSubcategory,
      sortBy,
      trendingOnly,
    ],
  );

  const draftActiveFilterCount = useMemo(
    () =>
      (draftBrand !== "all" ? 1 : 0) +
      (draftCategory !== "all" ? 1 : 0) +
      (selectedSubcategory !== "all" ? 1 : 0) +
      (trendingOnly ? 1 : 0) +
      (draftSortBy !== "latest" ? 1 : 0) +
      (searchQuery.trim() !== "" ? 1 : 0),
    [
      draftBrand,
      draftCategory,
      draftSortBy,
      searchQuery,
      selectedSubcategory,
      trendingOnly,
    ],
  );

  const openFilterModal = useCallback(() => {
    setDraftBrand(selectedBrand);
    setDraftCategory(selectedCategory);
    setDraftSortBy(sortBy);
    setFilterModalVisible(true);
  }, [selectedBrand, selectedCategory, sortBy]);

  const applyDraftFilters = useCallback(() => {
    const shouldResetSubcategory =
      draftCategory !== selectedCategory || draftBrand !== selectedBrand;

    setSelectedBrand(draftBrand);
    setSelectedCategory(draftCategory);
    setSortBy(draftSortBy);

    if (shouldResetSubcategory) {
      setSelectedSubcategory("all");
    }

    setFilterModalVisible(false);
  }, [
    draftBrand,
    draftCategory,
    draftSortBy,
    selectedBrand,
    selectedCategory,
  ]);

  const resetDraftFilters = useCallback(() => {
    setDraftBrand("all");
    setDraftCategory("all");
    setDraftSortBy("latest");
    setSelectedSubcategory("all");
    setSearchQuery("");
  }, []);

  const productsListKey = useMemo(
    () =>
      [
        "products",
        layout.columns,
        isRTL ? "rtl" : "ltr",
        selectedBrand,
        selectedCategory,
        selectedSubcategory,
        sortBy,
        normalizedSearchQuery || "all",
        trendingOnly ? "trend" : "regular",
        importantOnly ? "important" : "normal",
      ].join(":"),
    [
      importantOnly,
      isRTL,
      layout.columns,
      normalizedSearchQuery,
      selectedBrand,
      selectedCategory,
      selectedSubcategory,
      sortBy,
      trendingOnly,
    ],
  );

  const getFilteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];

    let filtered = [...products];

    // Brand, category, subcategory, and search are handled by the backend API.
    // Only sorting is done client-side.

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
  }, [products, sortBy]);

  const productImageHeight = layout.isSmallPhone
    ? 100
    : layout.isMediumPhone
      ? 110
      : 120;

  const renderProductItem = useCallback(
    ({ item: product }) => (
      <Pressable
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
              height: productImageHeight,
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
                  +{bonus} {currencyLabel}
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
    ),
    [
      currencyLabel,
      getLocalizedProductName,
      handleShareProduct,
      isRTL,
      layout.cardWidth,
      layout.isSmallPhone,
      layout.productNameSize,
      layout.productPriceSize,
      productImageHeight,
      router,
      theme.colors.card,
      theme.colors.primary,
      theme.colors.success,
      theme.colors.text,
    ],
  );

  const renderProductsHeader = useCallback(
    () => (
      <>
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
                flexDirection: isRTL ? "row-reverse" : "row",
                gap: 8,
              }}
            >
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
                    {getLocalizedProductName(subcat, "name")}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </>
    ),
    [
      availableSubcategories,
      getLocalizedProductName,
      isRTL,
      layout.horizontalPadding,
      searchQuery,
      selectedSubcategory,
      t,
      theme.colors.card,
      theme.colors.primary,
      theme.colors.text,
      theme.colors.textSecondary,
    ],
  );

  const renderProductsFooter = useCallback(
    () =>
      loadingMore ? (
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
      ) : (
        <View style={{ height: 12 }} />
      ),
    [loadingMore, t, theme.colors.primary, theme.colors.textSecondary],
  );

  const renderProductsEmpty = useCallback(
    () =>
      productsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
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
      ),
    [productsLoading, t, theme.colors.primary, theme.colors.textSecondary],
  );

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
          onPress={openFilterModal}
          style={styles.filterIconButton}
        >
          <ListFilter size={24} color={theme.colors.text} />
          {activeFilterCount > 0 ? (
            <View
              style={[
                styles.headerFilterBadge,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <FlatList
        key={productsListKey}
        style={styles.scrollView}
        data={getFilteredProducts}
        renderItem={renderProductItem}
        keyExtractor={(item) => String(item.id)}
        numColumns={layout.columns}
        columnWrapperStyle={{
          justifyContent: "space-between",
          paddingHorizontal: layout.horizontalPadding,
          marginBottom: 16,
        }}
        ListHeaderComponent={renderProductsHeader}
        ListFooterComponent={renderProductsFooter}
        ListEmptyComponent={renderProductsEmpty}
        onEndReached={hasMore ? loadMore : undefined}
        onEndReachedThreshold={0.35}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 12 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

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
                {draftActiveFilterCount > 0 ? (
                  <View
                    style={[
                      styles.filterBadge,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  >
                    <Text style={styles.filterBadgeText}>
                      {draftActiveFilterCount}
                    </Text>
                  </View>
                ) : null}
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
                          draftBrand === "all"
                            ? theme.colors.primary
                            : theme.colors.card,
                      },
                    ]}
                    onPress={() => setDraftBrand("all")}
                  >
                    <View style={styles.filterOptionContent}>
                      {draftBrand === "all" && (
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
                              draftBrand === "all"
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
                            draftBrand === String(brand.id)
                              ? theme.colors.primary
                              : theme.colors.card,
                        },
                      ]}
                      onPress={() => setDraftBrand(String(brand.id))}
                    >
                      <View style={styles.filterOptionContent}>
                        {draftBrand === String(brand.id) && (
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
                                draftBrand === String(brand.id)
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
                          draftCategory === "all"
                            ? theme.colors.primary
                            : theme.colors.card,
                      },
                    ]}
                    onPress={() => setDraftCategory("all")}
                  >
                    <View style={styles.filterOptionContent}>
                      <Ionicons
                        name="apps"
                        size={16}
                        color={
                          draftCategory === "all"
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
                              draftCategory === "all"
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
                  {topLevelCategories.length > 0 ? (
                    topLevelCategories.map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.filterOption,
                          {
                            backgroundColor:
                              draftCategory === String(category.id)
                                ? theme.colors.primary
                                : theme.colors.card,
                          },
                        ]}
                        onPress={() => setDraftCategory(String(category.id))}
                      >
                        <View style={styles.filterOptionContent}>
                          {category.icon ? (
                            <Ionicons
                              name={category.icon}
                              size={16}
                              color={
                                draftCategory === String(category.id)
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
                                draftCategory === String(category.id)
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
                                  draftCategory === String(category.id)
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
                            draftSortBy === option.key
                              ? theme.colors.primary
                              : theme.colors.card,
                        },
                      ]}
                      onPress={() => setDraftSortBy(option.key)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          {
                            color:
                              draftSortBy === option.key
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
                onPress={resetDraftFilters}
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
                onPress={applyDraftFilters}
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
    position: "relative",
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
  filterBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  headerFilterBadge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    color: "#fff",
    fontSize: 11,
    textAlign: "center",
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
