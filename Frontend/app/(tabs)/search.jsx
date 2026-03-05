import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text as RNText,
  Pressable,
  ActivityIndicator,
  Share,
} from "react-native";
import { Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Star, Heart, Share2, Grid3x3, List } from "lucide-react-native";
import { toggleFavorite } from "../../services/favoriteService";
import { useLanguage } from "../../utils/LanguageContext";
import { useTheme } from "../../utils/ThemeContext";
import { fetchProducts } from "../../store/slices/productsSlice";
import { fetchCategories } from "../../store/slices/categoriesSlice";
import { fetchBrands } from "../../store/slices/brandsSlice";
import Input from "../../components/ui/Input";
import { getProductImageUrl } from "../../utils/productImages";
import { getApiBaseUrl } from "../../utils/apiConfig";

const STORAGE_KEY = 'recent_searches';
const MAX_RECENT_SEARCHES = 10;

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

export default function Search() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { t, isRTL, locale } = useLanguage();
  const { theme } = useTheme();
  const API_BASE_URL = getApiBaseUrl();
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [favorites, setFavorites] = useState({});
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'
  const navigationInProgress = useRef(false);
  
  // Redux state
  const { items: products, loading: productsLoading } = useSelector((state) => state.products);
  const { items: categories, loading: categoriesLoading } = useSelector((state) => state.categories);
  const { items: brands, loading: brandsLoading } = useSelector((state) => state.brands);
  const { user } = useSelector((state) => state.auth);

  // Helper function to get localized product name
  const getLocalizedProductName = (product) => {
    if (!product) return "Product";
    
    const titleAr = product?.name_ar?.trim();
    const titleEn = product?.name_en?.trim();
    const titleKu = product?.name_ku?.trim();
    
    // Determine language and set name with fallbacks
    if (locale === "ar") {
      return titleAr || titleEn || titleKu || "Product";
    } else if (locale === "en") {
      return titleEn || titleAr || titleKu || "Product";
    } else if (locale === "ku") {
      return titleKu || titleEn || titleAr || "Product";
    } else {
      return titleEn || titleAr || titleKu || "Product";
    }
  };

  // Helper function to get localized category name
  const getLocalizedCategoryName = (category) => {
    if (!category) return "Category";
    
    const nameAr = category?.name_ar?.trim();
    const nameEn = category?.name_en?.trim();
    const nameKu = category?.name_ku?.trim();
    const defaultName = category?.name?.trim();
    
    // Determine language and set name with fallbacks
    if (locale === "ar") {
      return nameAr || defaultName || nameEn || nameKu || "Category";
    } else if (locale === "en") {
      return nameEn || defaultName || nameAr || nameKu || "Category";
    } else if (locale === "ku") {
      return nameKu || defaultName || nameEn || nameAr || "Category";
    } else {
      return nameEn || defaultName || nameAr || nameKu || "Category";
    }
  };

  const resolveBrandImageUri = (brand) => {
    const imageUrl = brand?.logo_url || brand?.logo || brand?.image;
    if (imageUrl) {
      if (imageUrl.startsWith("http")) return imageUrl;
      const cleanUrl = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
      return `${API_BASE_URL}${cleanUrl}`;
    }
    return null;
  };

  // Popular searches from actual categories (filter parent categories only)
  const popularSearches = categories
    .filter((cat) => cat.parent_id === null) // Get only parent categories
    .slice(0, 6) // Limit to 6 categories
    .map((cat) => ({
      name: getLocalizedCategoryName(cat),
      slug: cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-'),
      id: cat.id,
    }));

  const handleToggleFavorite = async (productId) => {
    try {
      const result = await toggleFavorite(productId);
      setFavorites((prev) => ({
        ...prev,
        [productId]: result.isFavorite,
      }));
    } catch (error) {
      console.error("Error toggling favorite:", error);
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
    } catch (error) {
      console.error("Error sharing product:", error);
    }
  };

  // Load recent searches from AsyncStorage
  useEffect(() => {
    loadRecentSearches();
  }, []);

  // Fetch featured products, categories and brands on mount
  useEffect(() => {
    dispatch(fetchProducts({ limit: 100 }));
    dispatch(fetchCategories({})); // Fetch all categories
    dispatch(fetchBrands({ limit: 100 })); // Fetch all brands
  }, [dispatch]);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  const saveRecentSearch = async (query) => {
    try {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) return;

      // Remove duplicates and add to front
      const updated = [
        trimmedQuery,
        ...recentSearches.filter(item => item.toLowerCase() !== trimmedQuery.toLowerCase())
      ].slice(0, MAX_RECENT_SEARCHES);

      setRecentSearches(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving recent search:', error);
    }
  };

  const clearRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing recent searches:', error);
    }
  };

  const handleSearch = (query) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // Filter products based on search query (schema-aligned: name/description/features)
    const q = trimmedQuery.toLowerCase();
    const filtered = products.filter((p) => {
      // Search across all localized name fields
      const nameEn = (p.name_en || '').toLowerCase();
      const nameAr = (p.name_ar || '').toLowerCase();
      const nameKu = (p.name_ku || '').toLowerCase();
      
      // Search across all localized description fields
      const descEn = (p.description_en || '').toLowerCase();
      const descAr = (p.description_ar || '').toLowerCase();
      const descKu = (p.description_ku || '').toLowerCase();
      
      const features = Array.isArray(p.key_features)
        ? p.key_features.join(' ').toLowerCase()
        : typeof p.key_features === 'string'
          ? p.key_features.toLowerCase()
          : '';
      
      return nameEn.includes(q) || nameAr.includes(q) || nameKu.includes(q) ||
             descEn.includes(q) || descAr.includes(q) || descKu.includes(q) ||
             features.includes(q);
    });

    setSearchResults(filtered);
    setIsSearching(false);
  };

  const handleSearchSubmit = () => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      saveRecentSearch(trimmedQuery);
      handleSearch(searchQuery);
    }
  };

  // Real-time search as user types
  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        handleSearch(searchQuery);
      }, 300); // Debounce search by 300ms

      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery, products]);

  const handleRecentSearchClick = (query) => {
    setSearchQuery(query);
    handleSearch(query);
  };

  const handlePopularSearchClick = (slug, name) => {
    // Prefer fast filtered products route when category id can be resolved.
    const matchedCategory = categories.find(
      (category) => String(category.slug) === String(slug),
    );

    if (matchedCategory?.id) {
      router.push(`/products?category=${matchedCategory.id}`);
      return;
    }

    // Fallback for unresolved slugs.
    router.push(`/category/${slug}`);
  };

  const handleBrandClick = (brandId, _brandName) => {
    router.push(`/products?brand=${brandId}`);
  };

  // Get random 20 products
  const randomProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    const shuffled = [...products].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 20);
  }, [products]);

  const featuredProducts = products.slice(0, 8);

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
      <View style={styles.content}>
        {/* Search Bar */}
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: theme.colors.card },
          ]}
        >
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: theme.colors.background,
                flexDirection: isRTL ? "row-reverse" : "row",
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={20}
              color={theme.colors.textSecondary}
            />
            <Input
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder={t("searchProducts")}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={handleSearchSubmit}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => {
                setSearchQuery("");
                setSearchResults([]);
              }}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView style={styles.scrollView}>
          {/* Search Results */}
          {searchQuery.trim() && searchResults.length > 0 && (
            <View style={styles.section}>
              <View style={styles.resultsHeader}>
                <View style={styles.viewToggle}>
                  <TouchableOpacity
                    style={[
                      styles.viewButton,
                      viewMode === "grid" && { backgroundColor: theme.colors.primary },
                    ]}
                    onPress={() => setViewMode("grid")}
                  >
                    <Grid3x3
                      size={18}
                      color={viewMode === "grid" ? "#fff" : theme.colors.text}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.viewButton,
                      viewMode === "list" && { backgroundColor: theme.colors.primary },
                    ]}
                    onPress={() => setViewMode("list")}
                  >
                    <List
                      size={18}
                      color={viewMode === "list" ? "#fff" : theme.colors.text}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={viewMode === "grid" ? styles.resultsGrid : styles.resultsList}>
                {searchResults.map((product) => (
                  <Pressable
                    key={product.id}
                    style={({ pressed }) => [
                      viewMode === "grid" ? styles.resultCard : styles.listCard,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.border,
                      },
                      pressed && styles.productCardPressed,
                    ]}
                    onPress={() => {
                      if (!navigationInProgress.current) {
                        navigationInProgress.current = true;
                        router.push(`/product/${product.id}`);
                        setTimeout(() => { navigationInProgress.current = false; }, 500);
                      }
                    }}
                  >
                    {/* Image Container */}
                    <View style={[
                      viewMode === "grid" ? styles.resultImageContainer : styles.listImageContainer,
                      viewMode === "list" && isRTL && styles.listImageContainerRTL
                    ]}>
                      <Image
                        source={{
                          uri: getProductImageUrl(
                            product,
                            "https://via.placeholder.com/400"
                          ),
                        }}
                        style={styles.resultImage}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="memory-disk"
                      />
                      {/* Commission Badge */}
                      {product.commission_price && product.commission_price > 0 && (
                        <View style={styles.bonusTag}>
                          <Text style={styles.bonusTagText}>
                            {isRTL
                              ? `${product.commission_price} دینار `
                              : `${product.commission_price} IQD`}
                          </Text>
                        </View>
                      )}
                      {/* Favorite Button */}
                      <TouchableOpacity
                        style={[
                          styles.favoriteButton,
                          { backgroundColor: theme.colors.card },
                        ]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(product.id);
                        }}
                      >
                        <Heart
                          size={16}
                          color={favorites[product.id] ? "#EF4444" : theme.colors.text}
                          fill={favorites[product.id] ? "#EF4444" : "none"}
                          strokeWidth={2}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Product Info */}
                    <View style={styles.productInfo}>
                      <Text
                        numberOfLines={2}
                        style={[styles.resultName, { color: theme.colors.text }]}
                      >
                        {getLocalizedProductName(product)}
                      </Text>
                      
                      {/* Rating */}
                      {product.average_rating && product.average_rating > 0 && (
                        <View style={styles.resultRating}>
                          <Star size={14} color="#FFA500" fill="#FFA500" />
                          <Text style={[styles.ratingText, { color: theme.colors.textSecondary }]}>
                            {product.average_rating.toFixed(1)}
                          </Text>
                          {product.review_count > 0 && (
                            <Text style={[styles.reviewCount, { color: theme.colors.textSecondary }]}>
                              ({product.review_count})
                            </Text>
                          )}
                        </View>
                      )}

                      {/* Price and Share */}
                      <View style={styles.bottomRow}>
                        <Text style={[styles.resultPrice, { color: theme.colors.primary }]}>
                          {isRTL
                            ? `${product.sell_price || product.price} دینار `
                            : `${product.sell_price || product.price} IQD`}
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.shareButton,
                            { backgroundColor: theme.colors.primary },
                          ]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleShareProduct(product.id, getLocalizedProductName(product));
                          }}
                        >
                          <Ionicons name="share-outline" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* No Results */}
          {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
            <View style={styles.noResults}>
              <Ionicons name="search-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={[styles.noResultsText, { color: theme.colors.textSecondary }]}>
                {t("noProductsFound") || "No products found"}
              </Text>
              <Text style={[styles.noResultsSubtext, { color: theme.colors.textSecondary }]}>
                Try searching with different keywords
              </Text>
            </View>
          )}

          {/* Recent Searches */}
          {!searchQuery.trim() && recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  {t("recentSearches")}
                </Text>
                <TouchableOpacity onPress={clearRecentSearches}>
                  <Text
                    style={[styles.clearAll, { color: theme.colors.primary }]}
                  >
                    {t("clearAll")}
                  </Text>
                </TouchableOpacity>
              </View>
              {recentSearches.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.recentItem,
                    {
                      backgroundColor: theme.colors.card,
                      flexDirection: isRTL ? "row-reverse" : "row",
                    },
                  ]}
                  onPress={() => handleRecentSearchClick(search)}
                >
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={[styles.recentText, { color: theme.colors.text }]}>
                    {search}
                  </Text>
                  <Ionicons
                    name={isRTL ? "arrow-back" : "arrow-forward"}
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Popular Searches */}
          {!searchQuery.trim() && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                {t("popularSearches")}
              </Text>
              <View style={styles.tagsContainer}>
                {popularSearches.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.tag, { 
                      borderColor: theme.colors.primary,
                      backgroundColor: `${theme.colors.primary}15`,
                    }]}
                    onPress={() => handlePopularSearchClick(item.slug, item.name)}
                  >
                    <Text
                      style={[styles.tagText, { color: theme.colors.primary }]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Popular Brands */}
          {!searchQuery.trim() && brands && brands.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                {t("popularBrands") || "Popular Brands"}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.brandsScroll}
              >
                {brands.slice(0, 10).map((brand) => {
                  const brandImage = resolveBrandImageUri(brand);
                  return (
                    <Pressable
                      key={brand.id}
                      style={({ pressed }) => [
                        styles.brandCard,
                        pressed && { transform: [{ scale: 0.95 }] },
                      ]}
                      onPress={() => handleBrandClick(brand.id, brand.name)}
                    >
                      <View
                        style={[
                          styles.brandImageContainer,
                          {
                            borderColor: theme.colors.border,
                            backgroundColor: theme.colors.background,
                          },
                        ]}
                      >
                        {brandImage ? (
                          <Image
                            source={{ uri: brandImage }}
                            style={styles.brandImage}
                            contentFit="cover"
                            transition={200}
                            cachePolicy="memory-disk"
                          />
                        ) : (
                          <View style={styles.brandPlaceholder}>
                            <Ionicons
                              name="business-outline"
                              size={32}
                              color={theme.colors.textSecondary}
                            />
                          </View>
                        )}
                      </View>
                      <Text
                        numberOfLines={1}
                        style={[styles.brandText, { color: theme.colors.text }]}
                      >
                        {brand.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Random Products */}
          {!searchQuery.trim() && randomProducts && randomProducts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.resultsHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 0 }]}>
                  {t("exploreProducts") || "Explore Products"}
                </Text>
                <View style={styles.viewToggle}>
                  <TouchableOpacity
                    style={[
                      styles.viewButton,
                      viewMode === "grid" && { backgroundColor: theme.colors.primary },
                    ]}
                    onPress={() => setViewMode("grid")}
                  >
                    <Grid3x3
                      size={18}
                      color={viewMode === "grid" ? "#fff" : theme.colors.text}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.viewButton,
                      viewMode === "list" && { backgroundColor: theme.colors.primary },
                    ]}
                    onPress={() => setViewMode("list")}
                  >
                    <List
                      size={18}
                      color={viewMode === "list" ? "#fff" : theme.colors.text}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={viewMode === "grid" ? styles.resultsGrid : styles.resultsList}>
                {randomProducts.map((product) => (
                  <Pressable
                    key={product.id}
                    style={({ pressed }) => [
                      viewMode === "grid" ? styles.resultCard : styles.listCard,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.border,
                      },
                      pressed && styles.productCardPressed,
                    ]}
                    onPress={() => {
                      if (!navigationInProgress.current) {
                        navigationInProgress.current = true;
                        router.push(`/product/${product.id}`);
                        setTimeout(() => { navigationInProgress.current = false; }, 500);
                      }
                    }}
                  >
                    {/* Image Container */}
                    <View style={[
                      viewMode === "grid" ? styles.resultImageContainer : styles.listImageContainer,
                      viewMode === "list" && isRTL && styles.listImageContainerRTL
                    ]}>
                      <Image
                        source={{
                          uri: getProductImageUrl(
                            product,
                            "https://via.placeholder.com/400"
                          ),
                        }}
                        style={styles.resultImage}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="memory-disk"
                      />
                      {/* Commission Badge */}
                      {product.commission_price && product.commission_price > 0 && (
                        <View style={styles.bonusTag}>
                          <Text style={styles.bonusTagText}>
                            {isRTL
                              ? `${product.commission_price} \u062f\u06cc\u0646\u0627\u0631 `
                              : `${product.commission_price} IQD`}
                          </Text>
                        </View>
                      )}
                      {/* Favorite Button */}
                      <TouchableOpacity
                        style={[
                          styles.favoriteButton,
                          { backgroundColor: theme.colors.card },
                        ]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(product.id);
                        }}
                      >
                        <Heart
                          size={16}
                          color={favorites[product.id] ? "#EF4444" : theme.colors.text}
                          fill={favorites[product.id] ? "#EF4444" : "none"}
                          strokeWidth={2}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Product Info */}
                    <View style={styles.productInfo}>
                      <Text
                        numberOfLines={2}
                        style={[styles.resultName, { color: theme.colors.text }]}
                      >
                        {getLocalizedProductName(product)}
                      </Text>
                      
                      {/* Rating */}
                      {product.average_rating && product.average_rating > 0 && (
                        <View style={styles.resultRating}>
                          <Star size={14} color="#FFA500" fill="#FFA500" />
                          <Text style={[styles.ratingText, { color: theme.colors.textSecondary }]}>
                            {product.average_rating.toFixed(1)}
                          </Text>
                          {product.review_count > 0 && (
                            <Text style={[styles.reviewCount, { color: theme.colors.textSecondary }]}>
                              ({product.review_count})
                            </Text>
                          )}
                        </View>
                      )}

                      {/* Price and Share */}
                      <View style={styles.bottomRow}>
                        <Text style={[styles.resultPrice, { color: theme.colors.primary }]}>
                          {isRTL
                            ? `${product.sell_price || product.price} \u062f\u06cc\u0646\u0627\u0631 `
                            : `${product.sell_price || product.price} IQD`}
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.shareButton,
                            { backgroundColor: theme.colors.primary },
                          ]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleShareProduct(product.id, getLocalizedProductName(product));
                          }}
                        >
                          <Ionicons name="share-outline" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#1a1a1a",
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#1a1a1a",
    marginBottom: 16,
  },
  seeAll: {
    fontSize: 14,
  },
  clearAll: {
    fontSize: 14,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  recentText: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
    fontSize: 16,
    color: "#1a1a1a",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 14,
  },
  productItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  productImage: {
    width: 70,
    height: 70,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    color: "#1a1a1a",
    marginBottom: 4,
  },
  productRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 12,
    marginLeft: 4,
  },
  productPrice: {
    fontSize: 16,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  viewToggle: {
    flexDirection: "row",
    gap: 8,
  },
  viewButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  resultsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  resultsList: {
    flexDirection: "column",
    gap: 12,
  },
  resultCard: {
    width: "48%",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e6e6e6",
    overflow: "hidden",
    backgroundColor: "#fff"
  },
  listCard: {
    width: "100%",
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e6e6e6",
    overflow: "hidden",
    backgroundColor: "#fff",
    minHeight: 120,
  },
  productCardPressed: {
    transform: [{ scale: 0.97 }],
    elevation: 1,
    shadowOpacity: 0.02,
  },
  resultImageContainer: {
    width: "100%",
    height: 120,
    backgroundColor: "#f9f9f9",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  listImageContainer: {
    width: 120,
    height: 120,
    backgroundColor: "#f9f9f9",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  listImageContainerRTL: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  resultImage: {
    width: "100%",
    height: "100%",
  },
  bonusTag: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "green",
    elevation: 4,
  },
  bonusTagText: {
    color: "#fff",
    fontSize: 8,
  },
  favoriteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  productInfo: {
    padding: 10,
    flex: 1,
    justifyContent: "space-between",
  },
  resultName: {
    fontSize: 13,
    color: "#1a1a1a",
    marginBottom: 8,
    lineHeight: 16,
    minHeight: 32,
  },
  resultRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  reviewCount: {
    fontSize: 11,
    marginLeft: 2,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "auto",
  },
  resultPrice: {
    fontSize: 16,
    color: "#1a1a1a",
  },
  shareButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  noResults: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  noResultsText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
  },
  brandsScroll: {
    paddingLeft: 0,
  },
  brandCard: {
    alignItems: "center",
    marginRight: 14,
    width: 75,
  },
  brandImageContainer: {
    width: 75,
    height: 75,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
  },
  brandImage: {
    width: "100%",
    height: "100%",
  },
  brandPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  brandText: {
    fontSize: 11,
    color: "#1a1a1a",
    textAlign: "center",
  },
});
