import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Pressable,
  Image,
  Dimensions,
  Text as RNText,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { useLanguage } from "../../utils/LanguageContext";
import { useTheme } from "../../utils/ThemeContext";
import { fetchProducts } from "../../store/slices/productsSlice";
import { fetchCategories } from "../../store/slices/categoriesSlice";
import { getApiBaseUrl } from "../../utils/apiConfig";
import { getProductImageUrl } from "../../utils/productImages";
// Colors are provided via ThemeContext; avoid importing Colors directly here
import InfoDialog from "../../components/InfoDialog";
import HomeHeader from "../../components/HomeHeader";
import BannerSlider from "../../components/BannerSlider";
import DiscountProductSlider from "../../components/DiscountProductSlider";
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

  // Device type detection
  const isSmallPhone = width <= 375; // iPhone SE, iPhone 12 mini
  const isMediumPhone = width > 375 && width <= 414; // iPhone XR, 11, 12, 13, 14
  const isLargePhone = width > 414; // iPhone Pro Max models, iPhone 15/16 Plus
  const language = useLanguage();
  // Responsive values
  const horizontalPadding = isSmallPhone ? 12 : isMediumPhone ? 16 : 20;
  const cardGap = isSmallPhone ? 8 : 12;

  // Calculate card width based on screen size
  const columns = isLandscape ? 3 : isLargePhone ? 3 : 2;
  const totalGapWidth = cardGap * (columns - 1);
  const cardWidth = Math.floor(
    (width - horizontalPadding * 2 - totalGapWidth) / columns
  );

  // Responsive dimensions
  const categoryIconSize = isSmallPhone ? 20 : 24;
  const categoryCardWidth = isSmallPhone ? 70 : 80;
  const categoryIconContainerSize = isSmallPhone ? 45 : 50;

  // Wallet dimensions
  const walletPadding = isSmallPhone ? 12 : 16;
  const walletActionButtonSize = isSmallPhone ? 40 : 44;

  // Text sizes
  const sectionTitleSize = isSmallPhone ? 16 : 18;
  const productNameSize = isSmallPhone ? 12 : 13;
  const productPriceSize = isSmallPhone ? 14 : 16;
  const walletBalanceSize = isSmallPhone ? 24 : 28;

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
    categoryIconSize,
    categoryCardWidth,
    categoryIconContainerSize,
    walletPadding,
    walletActionButtonSize,
    sectionTitleSize,
    productNameSize,
    productPriceSize,
    walletBalanceSize,
  };
};

export default function Home() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { t, isRTL, language } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();
  const layout = useResponsiveLayout();
  const API_BASE_URL = getApiBaseUrl();

  // Helper function to get localized text
  const getLocalizedText = (product, field) => {
    if (!product) return '';
    
    const languageMap = {
      'ar': 'ar',
      'en': 'en',
      'ku': 'ku',
      'om': 'om'
    };
    
    const lang = languageMap[language] || 'en';
    const fieldWithLang = `${field}_${lang}`;
    
    // Try language-specific field first
    if (product[fieldWithLang]) {
      return product[fieldWithLang];
    }
    
    // Fallback to base field
    if (product[field]) {
      return product[field];
    }
    
    // Fallback to English if available
    if (lang !== 'en' && product[`${field}_en`]) {
      return product[`${field}_en`];
    }
    
    return '';
  };
  // Dialog state for errors/info
  const [dialog, setDialog] = useState({
    visible: false,
    title: "",
    message: "",
  });
  const closeDialog = () =>
    setDialog({ visible: false, title: "", message: "" });

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Redux selectors
  const {
    items: products,
    loading: productsLoading,
    meta,
  } = useSelector((state) => state.products);
  const { items: categories, loading: categoriesLoading } = useSelector(
    (state) => state.categories
  );
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  // State for selected category and subcategories
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [categoryProductsLoading, setCategoryProductsLoading] = useState(false);
  const [categoryProductsOffset, setCategoryProductsOffset] = useState(0);
  const [categoryProductsTotal, setCategoryProductsTotal] = useState(0);
  const [loadingMoreCategory, setLoadingMoreCategory] = useState(false);

  // Get parent categories (categories with no parent_id)
  const parentCategories = categories.filter((cat) => cat.parent_id === null);

  // Get subcategories for the selected category
  const subCategories = selectedCategory
    ? categories.filter((cat) => cat.parent_id === selectedCategory.id)
    : [];

  // Infinite scroll state
  const [loadingMore, setLoadingMore] = useState(false);

  const pageLimit = 10;
  const hasMore =
    typeof meta?.total === "number" ? products.length < meta.total : true;

  // Fetch data on component mount
  useEffect(() => {
    dispatch(fetchProducts({ limit: pageLimit, offset: 0 }));
    dispatch(fetchCategories({})); // Fetch all categories without limit
  }, [dispatch]);

  // Fetch category products when category is selected
  useEffect(() => {
    if (selectedCategory) {
      setCategoryProductsLoading(true);
      setCategoryProducts([]);
      setCategoryProductsOffset(0);
      
      // Get all category IDs including subcategories
      const categoryIds = [selectedCategory.id];
      const subs = categories.filter((cat) => cat.parent_id === selectedCategory.id);
      if (subs.length > 0) {
        categoryIds.push(...subs.map(sub => sub.id));
      }
      
      dispatch(fetchProducts({ 
        limit: pageLimit, 
        offset: 0,
        category_id: categoryIds.join(',') 
      }))
        .unwrap()
        .then((result) => {
          setCategoryProducts(result.items || []);
          setCategoryProductsTotal(result.total || 0);
          setCategoryProductsOffset(pageLimit);
        })
        .catch(() => {
          setCategoryProducts([]);
          setCategoryProductsTotal(0);
        })
        .finally(() => setCategoryProductsLoading(false));
    } else {
      setCategoryProducts([]);
      setCategoryProductsTotal(0);
      setCategoryProductsOffset(0);
    }
  }, [selectedCategory, categories, dispatch]);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      dispatch(fetchProducts({ limit: pageLimit, offset: 0 })),
      dispatch(fetchCategories({})), // Fetch all categories
    ])
      .catch(() => {})
      .finally(() => setRefreshing(false));
  };

  const loadMoreProducts = useCallback(() => {
    if (loadingMore) return;
    if (productsLoading) return;
    if (!hasMore) return;
    if (products.length < pageLimit) return; // avoid firing before initial page is filled
    setLoadingMore(true);
    dispatch(
      fetchProducts({ limit: pageLimit, offset: products.length, append: true })
    )
      .unwrap()
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [dispatch, loadingMore, hasMore, products.length, productsLoading]);

  const loadMoreCategoryProducts = useCallback(() => {
    if (!selectedCategory) return;
    if (loadingMoreCategory) return;
    if (categoryProductsLoading) return;
    if (categoryProducts.length >= categoryProductsTotal) return;
    
    const categoryIds = [selectedCategory.id];
    const subs = categories.filter((cat) => cat.parent_id === selectedCategory.id);
    if (subs.length > 0) {
      categoryIds.push(...subs.map(sub => sub.id));
    }
    
    setLoadingMoreCategory(true);
    dispatch(
      fetchProducts({ 
        limit: pageLimit, 
        offset: categoryProductsOffset,
        category_id: categoryIds.join(',')
      })
    )
      .unwrap()
      .then((result) => {
        setCategoryProducts(prev => [...prev, ...(result.items || [])]);
        setCategoryProductsOffset(prev => prev + pageLimit);
      })
      .catch(() => {})
      .finally(() => setLoadingMoreCategory(false));
  }, [selectedCategory, loadingMoreCategory, categoryProductsLoading, categoryProducts.length, categoryProductsTotal, categoryProductsOffset, categories, dispatch]);

  const resolveCategoryImageUri = (category) => {
    const imageUrl = category?.image_url || category?.image;
    if (imageUrl) {
      return imageUrl.startsWith("http")
        ? imageUrl
        : `${API_BASE_URL}${imageUrl}`;
    }

    return "https://via.placeholder.com/400";
  };

  const handleShareProduct = async (id, name) => {
    try {
      const userId = user?.id || 'unknown';
      const checkoutUrl = `https://checkout.aman-store.com/checkout?userId=${userId}&productId=${id}`;
      
      const result = await Share.share({
        message: `${name}\n\n${checkoutUrl}`,
        title: name,
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log("Shared with activity type:", result.activityType);
        } else {
          console.log("Shared successfully");
        }
      } else if (result.action === Share.dismissedAction) {
        console.log("Share dismissed");
      }
    } catch (error) {
      setDialog({
        visible: true,
        title: "Error",
        message: "Unable to share product",
      });
      console.error("Share error:", error);
    }
  };

  // Helper: compute seller bonus for a product (prefer explicit field, else 10% of price)
  const computeBonus = (p) => {
    return p?.seller_bonus || p?.price * 0.1;
  };

  const renderStars = (rating) => {
    const stars = [];
    const full = Math.floor(rating);
    const hasHalf = rating - full >= 0.5;
    for (let i = 0; i < full; i++) {
      stars.push(
        <Ionicons key={`full-${i}`} name="star" size={12} color="#FFB800" />
      );
    }
    if (hasHalf) {
      stars.push(
        <Ionicons key="half" name="star-half" size={12} color="#FFB800" />
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
        />
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
      <HomeHeader onToggleTheme={toggleTheme} />

      <ScrollView
        style={styles.scrollView}
        onScroll={({ nativeEvent }) => {
          const { contentSize, contentOffset, layoutMeasurement } = nativeEvent;
          const paddingToBottom = 160; // preload before exact bottom
          if (
            contentOffset.y + layoutMeasurement.height + paddingToBottom >=
            contentSize.height
          ) {
            loadMoreProducts();
          }
        }}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Banner Slider */}
        <BannerSlider />

        {/* Discount Products Slider */}
        <DiscountProductSlider />

        {/* Categories */}
        <View style={styles.section}>
          <View
            style={[
              styles.sectionHeader,
              { paddingHorizontal: layout.horizontalPadding },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.colors.text,
                  fontSize: layout.sectionTitleSize,
                },
              ]}
            >
              {t("categories")}
            </Text>
            <TouchableOpacity onPress={() => router.push("/categories")}>
              <Text
                style={[
                  styles.seeAll,
                  {
                    color: theme.colors.primary,
                    fontSize: layout.isSmallPhone ? 13 : 14,
                  },
                ]}
              >
                {t("seeAll")}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[
              styles.categoriesScroll,
              { paddingLeft: layout.horizontalPadding },
            ]}
          >
            {categoriesLoading ? (
              <View style={{ flexDirection: "row", gap: 12 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <View key={i} style={styles.categoryCard}>
                    <View
                      style={[
                        styles.categoryImageContainer,
                        {
                          backgroundColor: theme.colors.border,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.categoryText,
                        {
                          width: 60,
                          height: 10,
                          backgroundColor: theme.colors.border,
                          borderRadius: 4,
                          marginTop: 6,
                        },
                      ]}
                    />
                  </View>
                ))}
              </View>
            ) : parentCategories.length > 0 ? (
              parentCategories.map((category) => (
                <Pressable
                  key={category.id}
                  style={({ pressed }) => [
                    styles.categoryCard,
                    selectedCategory?.id === category.id && {
                      opacity: 1,
                    },
                    pressed && {
                      transform: [{ scale: 0.95 }],
                    },
                  ]}
                  onPress={() => {
                    if (selectedCategory?.id === category.id) {
                      setSelectedCategory(null);
                    } else {
                      setSelectedCategory(category);
                    }
                  }}
                  onLongPress={() => router.push(`/category/${category.slug}`)}
                >
                  {({ pressed }) => (
                    <View>
                      <View
                        style={[
                          styles.categoryImageContainer,
                          {
                            borderColor:
                              selectedCategory?.id === category.id
                                ? theme.colors.primary
                                : theme.colors.border,
                            borderWidth:
                              selectedCategory?.id === category.id ? 2 : 1,
                            elevation: pressed ? 0 : 3,
                            shadowOpacity: pressed ? 0 : 0.1,
                          },
                        ]}
                      >
                        <Image
                          source={{ uri: resolveCategoryImageUri(category) }}
                          style={styles.categoryImage}
                          resizeMode="cover"
                        />
                        {/* Gradient overlay */}
                        <View
                          style={[
                            styles.categoryOverlay,
                            {
                              backgroundColor:
                                selectedCategory?.id === category.id
                                  ? `${theme.colors.primary}99`
                                  : `${theme.colors.primary}66`,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.categoryText,
                          {
                            color: theme.colors.text,
                            fontSize: 11,
                            fontWeight:
                              selectedCategory?.id === category.id
                                ? "600"
                                : "500",
                          },
                        ]}
                      >
                        {category.name}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))
            ) : null}
          </ScrollView>

          {/* Subcategories */}
          {selectedCategory && subCategories.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: theme.colors.text,
                    fontSize: layout.sectionTitleSize - 2,
                    paddingHorizontal: layout.horizontalPadding,
                    marginBottom: 8,
                  },
                ]}
              >
                {t("subCategories")}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ paddingLeft: layout.horizontalPadding }}
              >
                {subCategories.map((subCategory) => (
                  <TouchableOpacity
                    key={subCategory.id}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      backgroundColor: theme.colors.card,
                      borderRadius: 20,
                      marginRight: 10,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                    onPress={() => router.push(`/category/${subCategory.slug}`)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: 13,
                      }}
                    >
                      {subCategory.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Category Products Section */}
        {selectedCategory && (
          <View style={styles.section}>
            <View
              style={[
                styles.sectionHeader,
                { paddingHorizontal: layout.horizontalPadding },
              ]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: theme.colors.text,
                    fontSize: layout.sectionTitleSize,
                  },
                ]}
              >
                {selectedCategory.name} {t("products")}
              </Text>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                {categoryProducts.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => router.push(`/products?category=${selectedCategory.id}`)}
                  >
                    <Text
                      style={[
                        styles.seeAll,
                        {
                          color: theme.colors.primary,
                          fontSize: layout.isSmallPhone ? 13 : 14,
                        },
                      ]}
                    >
                      {t("seeAll")}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setSelectedCategory(null)}>
                  <Ionicons 
                    name="close-circle-outline" 
                    size={24} 
                    color={theme.colors.primary} 
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            {categoryProductsLoading && categoryProducts.length === 0 ? (
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
                {[1, 2, 3, 4].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.productCard,
                      {
                        backgroundColor: theme.colors.card,
                        width: layout.cardWidth,
                        borderColor: theme.colors.border,
                        borderWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
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
                          backgroundColor: theme.colors.border,
                        },
                      ]}
                    />
                    <View style={styles.productInfo}>
                      <View
                        style={{
                          width: "100%",
                          height: 14,
                          backgroundColor: theme.colors.border,
                          borderRadius: 4,
                          marginBottom: 8,
                        }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            ) : categoryProducts.length > 0 ? (
              <>
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
                  {categoryProducts.map((product) => (
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
                      onPress={() => router.push(`/product/${product.id}`)}
                    >
                      <View
                        style={[
                          styles.productImage,
                          {
                            height: layout.isSmallPhone
                              ? 90
                              : layout.isMediumPhone
                              ? 100
                              : 110,
                          },
                        ]}
                      >
                        <Image
                          source={{
                            uri: getProductImageUrl(
                              product,
                              "https://via.placeholder.com/400"
                            ),
                          }}
                          style={styles.productImageImg}
                          resizeMode="cover"
                        />
                        <View
                          style={[
                            styles.bonusTag,
                            { backgroundColor: theme.colors.primary },
                          ]}
                        >
                          <Text style={styles.bonusTagText}>
                            IQD {product.commission_price}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.productInfo}>
                        <Text
                          numberOfLines={2}
                          style={[
                            styles.productName,
                            {
                              color: theme.colors.text,
                              fontSize: layout.productNameSize,
                            },
                          ]}
                        >
                          {getLocalizedText(product, 'title') || getLocalizedText(product, 'name') || product.name}
                        </Text>
                        <View style={styles.ratingRow}>
                          <View style={styles.starsRow}>
                            {renderStars(product.rating || 4.0)}
                          </View>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.ratingText,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            {product.rating || 4.0}
                          </Text>
                        </View>
                        <View style={styles.bottomRow}>
                          <Text
                            style={[
                              styles.productPrice,
                              {
                                color: theme.colors.primary,
                                fontSize: layout.productPriceSize,
                              },
                            ]}
                          >
                            IQD {product.sell_price}
                          </Text>
                          <TouchableOpacity
                            style={[
                              styles.shareButton,
                              {
                                backgroundColor: theme.colors.primary,
                                width: layout.isSmallPhone ? 32 : 36,
                                height: layout.isSmallPhone ? 32 : 36,
                                borderRadius: layout.isSmallPhone ? 16 : 18,
                              },
                            ]}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleShareProduct(product.id, getLocalizedText(product, 'title') || getLocalizedText(product, 'name') || product.title);
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
                  ))}
                </View>
                {loadingMoreCategory && (
                  <View
                    style={{
                      paddingVertical: 12,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: theme.colors.textSecondary }}>
                      {t("loadingMore")}...
                    </Text>
                  </View>
                )}
                {categoryProducts.length < categoryProductsTotal && (
                  <View
                    style={{
                      paddingVertical: 12,
                      alignItems: "center",
                      paddingHorizontal: layout.horizontalPadding,
                    }}
                  >
                    <TouchableOpacity
                      onPress={loadMoreCategoryProducts}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 24,
                        backgroundColor: theme.colors.primary,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: 14 }}>
                        {t("loadMore")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                {categoryProducts.length >= categoryProductsTotal && categoryProducts.length > 0 && (
                  <View style={{ paddingVertical: 8, alignItems: "center" }}>
                    <Text style={{ color: theme.colors.textSecondary }}>
                      {t("noMoreItems")}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={{ paddingVertical: 24, alignItems: "center" }}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>
                  {t("noProductsFound")}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Recently Added (last 3 days) — moved after Categories */}
        {(() => {
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          const withDates = (products || []).filter((p) => !!p?.created_at);
          const sortedByDateDesc = withDates.sort((a, b) => {
            const da = new Date(a.created_at).getTime();
            const db = new Date(b.created_at).getTime();
            return db - da;
          });
          const recentOnly = sortedByDateDesc.filter((p) => {
            const d = new Date(p.created_at);
            return !isNaN(d) && d >= threeDaysAgo;
          });
          const recentProducts =
            recentOnly.length > 0 ? recentOnly : sortedByDateDesc.slice(0, 10);
          return recentProducts.length > 0 ? (
            <View style={styles.section}>
              <View
                style={[
                  styles.sectionHeader,
                  { paddingHorizontal: layout.horizontalPadding },
                ]}
              >
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: theme.colors.text,
                      fontSize: layout.sectionTitleSize,
                    },
                  ]}
                >
                  {t("recentlyAdded")}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ paddingLeft: layout.horizontalPadding }}
                contentContainerStyle={{
                  paddingRight: layout.horizontalPadding,
                }}
              >
                {recentProducts.map((product) => (
                  <Pressable
                    key={product.id}
                    style={({ pressed }) => [
                      styles.recentCard,
                      { backgroundColor: theme.colors.card },
                      pressed && styles.productCardPressed,
                    ]}
                    onPress={() => router.push(`/product/${product.id}`)}
                  >
                    <View style={styles.recentImage}>
                      <Image
                        source={{
                          uri: getProductImageUrl(
                            product,
                            "https://via.placeholder.com/400"
                          ),
                        }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    </View>
                    <View style={styles.recentInfo}>
                      <Text
                        numberOfLines={1}
                        style={{
                          color: theme.colors.text,
                          fontSize: layout.isSmallPhone ? 12 : 13,
                        }}
                      >
                        {getLocalizedText(product, 'title') || getLocalizedText(product, 'name') || product.name}
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.primary,
                          fontSize: layout.isSmallPhone ? 13 : 14,
                        }}
                      >
                        {typeof product?.sell_price === "number"
                          ? product.sell_price
                          : typeof product?.price === "number"
                          ? product.price
                          : product?.base_price} IQD
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null;
        })()}

        {/* Featured Products */}
        <View style={styles.section}>
          <View
            style={[
              styles.sectionHeader,
              { paddingHorizontal: layout.horizontalPadding },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.colors.text,
                  fontSize: layout.sectionTitleSize,
                },
              ]}
            >
              {t("featuredProducts")}
            </Text>
            <TouchableOpacity onPress={() => router.push("/products")}>
              <Text
                style={[
                  styles.seeAll,
                  {
                    color: theme.colors.primary,
                    fontSize: layout.isSmallPhone ? 13 : 14,
                  },
                ]}
              >
                {t("seeAll")}
              </Text>
            </TouchableOpacity>
          </View>
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
            {productsLoading && products.length === 0 ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.productCard,
                      {
                        backgroundColor: theme.colors.card,
                        width: layout.cardWidth,
                        borderColor: theme.colors.border,
                        borderWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
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
                          backgroundColor: theme.colors.border,
                        },
                      ]}
                    />
                    <View style={styles.productInfo}>
                      <View
                        style={{
                          width: "100%",
                          height: 14,
                          backgroundColor: theme.colors.border,
                          borderRadius: 4,
                          marginBottom: 8,
                        }}
                      />
                      <View
                        style={{
                          width: "60%",
                          height: 12,
                          backgroundColor: theme.colors.border,
                          borderRadius: 4,
                          marginBottom: 8,
                        }}
                      />
                      <View style={styles.bottomRow}>
                        <View
                          style={{
                            width: 60,
                            height: 16,
                            backgroundColor: theme.colors.border,
                            borderRadius: 4,
                          }}
                        />
                        <View
                          style={{
                            width: layout.isSmallPhone ? 32 : 36,
                            height: layout.isSmallPhone ? 32 : 36,
                            borderRadius: layout.isSmallPhone ? 16 : 18,
                            backgroundColor: theme.colors.border,
                          }}
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </>
            ) : products.length > 0 ? (
              products.map((product) => (
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
                  onPress={() => router.push(`/product/${product.id}`)}
                >
                  {/* Image at top */}
                  <View
                    style={[
                      styles.productImage,
                      {
                        height: layout.isSmallPhone
                          ? 90
                          : layout.isMediumPhone
                          ? 100
                          : 110,
                      },
                    ]}
                  >
                    <Image
                      source={{
                        uri: getProductImageUrl(
                          product,
                          "https://via.placeholder.com/400"
                        ),
                      }}
                      style={styles.productImageImg}
                      resizeMode="cover"
                    />
                    {/* Seller bonus tag (top-left) */}

                    <View
                      style={[
                        styles.bonusTag,
                        { backgroundColor: theme.colors.primary },
                      ]}
                    >
                      <Text style={styles.bonusTagText}>
                        IQD {product.commission_price}
                      </Text>
                    </View>
                  </View>

                  {/* Product info section */}
                  <View style={styles.productInfo}>
                    {/* Name */}
                    <Text
                      numberOfLines={2}
                      style={[
                        styles.productName,
                        {
                          color: theme.colors.text,
                          fontSize: layout.productNameSize,
                        },
                      ]}
                    >
                      {getLocalizedText(product, 'title') || getLocalizedText(product, 'name') || product.name}
                    </Text>

                    {/* Rating */}
                    <View style={styles.ratingRow}>
                      <View style={styles.starsRow}>
                        {renderStars(product.rating || 4.0)}
                      </View>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.ratingText,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {product.rating || 4.0}
                      </Text>
                    </View>

                    {/* Price and Share at bottom */}
                    <View style={styles.bottomRow}>
                      <Text
                        style={[
                          styles.productPrice,
                          {
                            color: theme.colors.primary,
                            fontSize: layout.productPriceSize,
                          },
                        ]}
                      >
                        IQD {product.sell_price}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.shareButton,
                          {
                            backgroundColor: theme.colors.primary,
                            width: layout.isSmallPhone ? 32 : 36,
                            height: layout.isSmallPhone ? 32 : 36,
                            borderRadius: layout.isSmallPhone ? 16 : 18,
                          },
                        ]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleShareProduct(product.id, getLocalizedText(product, 'title') || getLocalizedText(product, 'name') || product.title);
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
            ) : null}
          </View>
          {/* Loading more indicator */}
          {loadingMore && (
            <View
              style={{
                paddingVertical: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ color: theme.colors.textSecondary }}>
                {t("loadingMore")}...
              </Text>
            </View>
          )}
          {!hasMore && products.length > 0 && (
            <View style={{ paddingVertical: 8, alignItems: "center" }}>
              <Text style={{ color: theme.colors.textSecondary }}>
                {t("noMoreItems")}
              </Text>
            </View>
          )}
        </View>
        <InfoDialog
          visible={dialog.visible}
          title={dialog.title}
          message={dialog.message}
          onClose={closeDialog}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  containerDark: {
    backgroundColor: "#1a1a1a",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  headerDark: {
    backgroundColor: "#2a2a2a",
  },
  greeting: {
    fontSize: 14,
    color: "#666",
  },
  username: {
    fontSize: 20,
    color: "#1a1a1a",
  },
  textDark: {
    color: "#fff",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    // Best shadow for button

    elevation: 4,
  },
  headerButtonDark: {
    backgroundColor: "#3a3a3a",
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  banner: {
    backgroundColor: "#4a90e2",
    margin: 20,
    padding: 20,
    borderRadius: 12,
    // Best shadow for banner

    elevation: 8,
  },
  bannerTitle: {
    fontSize: 24,
    color: "#fff",
    marginBottom: 8,
  },
  bannerText: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 16,
  },
  bannerButton: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: "flex-start",
    // Best shadow for button
    elevation: 4,
  },
  bannerButtonText: {
    color: "#4a90e2",
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    letterSpacing: -0.3,
    color: "#1a1a1a",
  },
  seeAll: {
    color: "#4a90e2",
    fontSize: 14,
  },
  categoriesScroll: {
    // paddingLeft handled inline with responsive layout
  },
  categoryCard: {
    alignItems: "center",
    marginRight: 14,
    width: 75,
  },
  categoryImageContainer: {
    width: 75,
    height: 75,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
    marginBottom: 8,
    borderWidth: 0.4,
    borderColor: "transparent",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryImage: {
    width: "100%",
    height: "100%",
  },
  categoryOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  categoryIcon: {
    // width and height handled inline with responsive layout
    borderRadius: 14,
    backgroundColor: "#E8E9F8",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    elevation: 1,
  },
  categoryText: {
    fontSize: 11,
    color: "#1a1a1a",
    textAlign: "center",
    fontWeight: "500",
    marginTop: 2,
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    // paddingHorizontal and gap handled inline with responsive layout
  },
  productCard: {
    // width handled inline with responsive layout
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 2,
    position: "relative",
    // No shadow for featured products
    elevation: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e6e6e6",
  },
  productCardPressed: {
    // Lift effect on press
    transform: [{ translateY: -4 }, { scale: 0.98 }],
    elevation: 0,
  },
  productImage: {
    width: "100%",
    // height handled inline with responsive layout
    backgroundColor: "#f5f5f5",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    // No image shadows
    elevation: 0,
  },
  bonusTag: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,

    elevation: 4,
  },
  bonusTagText: {
    color: "#fff",
    fontSize: 8,
  },
  productImageImg: {
    width: "100%",
    height: "100%",
  },
  productInfo: {
    padding: 8,
    flex: 1,
    justifyContent: "space-between",
  },
  productName: {
    fontSize: 13,
    color: "#1a1a1a",
    marginBottom: 4,
    minHeight: 28,
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

    color: "#1a1a1a",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  ratingText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
    flexShrink: 1,
  },
  starsRow: {
    flexDirection: "row",
  },
  shareButton: {
    // width, height, and borderRadius handled inline with responsive layout
    backgroundColor: "#4a90e2",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  noDataText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
    width: "100%",
  },
  recentCard: {
    width: 120,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 10,
    // lighter shadow and border
    elevation: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },
  recentImage: {
    width: "100%",
    height: 90,
    backgroundColor: "#f5f5f5",
  },
  recentInfo: {
    padding: 8,
    gap: 4,
  },
});
