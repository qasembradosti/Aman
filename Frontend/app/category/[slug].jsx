import React, { useMemo, useEffect, useState, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
} from "react-native";
import { Image } from "react-native";
import {
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { useLanguage } from "../../utils/LanguageContext";
import { useTheme } from "../../utils/ThemeContext";
import { fetchProducts } from "../../store/slices/productsSlice";
import { fetchCategories } from "../../store/slices/categoriesSlice";
import { getApiBaseUrl } from "../../utils/apiConfig";
import { getProductImageUrl } from "../../utils/productImages";
import Text from "../../components/ui/Text";

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const navigationInProgress = useRef(false);
  const { t, isRTL, locale } = useLanguage();
  const { theme } = useTheme();
  const API_BASE_URL = getApiBaseUrl();

  const [loading, setLoading] = useState(true);
  const [categoryProducts, setCategoryProducts] = useState([]);

  // Get categories and products from Redux
  const { items: categories } = useSelector((state) => state.categories);
  const { items: allProducts } = useSelector((state) => state.products);

  // Find the category by slug
  const category = useMemo(
    () => categories.find((cat) => cat.slug === slug),
    [categories, slug]
  );

  // Fetch data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch categories and products without unwrap to avoid throwing errors
        const [categoriesResult, productsResult] = await Promise.allSettled([
          dispatch(fetchCategories({})),
          dispatch(fetchProducts({ limit: 100, offset: 0 })),
        ]);
        
        // Log any errors but don't throw
        if (categoriesResult.status === 'rejected') {
          console.error('Failed to fetch categories:', categoriesResult.reason);
        }
        if (productsResult.status === 'rejected') {
          console.error('Failed to fetch products:', productsResult.reason);
        }
      } catch (error) {
        console.error('Error loading category data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [dispatch]);

  // Filter products by category
  useEffect(() => {
    if (category && allProducts.length > 0) {
      // Get all subcategory IDs for this category
      const subCategoryIds = categories
        .filter((cat) => cat.parent_id === category.id)
        .map((cat) => cat.id);
      
      // Filter products that belong to this category or its subcategories
      const filtered = allProducts.filter((product) => {
        return (
          product.category_id === category.id ||
          subCategoryIds.includes(product.category_id)
        );
      });
      
      setCategoryProducts(filtered);
    }
  }, [category, allProducts, categories]);

  const products = categoryProducts;

  const handleShareProduct = async (item) => {
    try {
      const itemName = getLocalizedName(item);
      await Share.share({
        title: itemName,
        message: `Check out this product: ${itemName}`,
        url: `https://yourapp.com/product/${item.id}`,
      });
    } catch (_e) {
      Alert.alert("Error", "Unable to share product");
    }
  };

  // Helper function to get localized product name
  const getLocalizedName = (product) => {
    const lang = locale || "en";
    return product[`name_${lang}`] || product.name || "";
  };

  // Helper function to get localized category name
  const getLocalizedCategoryName = (cat) => {
    const lang = locale || "en";
    return cat[`name_${lang}`] || cat.name || "";
  };

  // Helper function to calculate final price
  const calculateFinalPrice = (product) => {
    const sell = Number(product?.sell_price) || 0;
    const discount = Number(product?.discount) || 0;
    const type = (product?.discount_type || "").toLowerCase();
    
    if (discount > 0) {
      if (type === "percentage" || type === "parsentage" || type === "percent") {
        const savedAmount = (sell * discount) / 100;
        return Math.max(0, sell - savedAmount);
      } else if (type === "fixed") {
        return Math.max(0, sell - discount);
      }
    }
    return sell;
  };

  const renderItem = ({ item }) => {
    const finalPrice = Math.round(calculateFinalPrice(item));
    const itemName = getLocalizedName(item);
    
    return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.colors.card },
        { borderColor: theme.colors.border, borderWidth: StyleSheet.hairlineWidth },
        pressed && styles.cardPressed,
        pressed && { borderColor: theme.colors.primary },
      ]}
      onPress={() => {
        if (!navigationInProgress.current) {
          navigationInProgress.current = true;
          router.push(`/product/${item.id}`);
          setTimeout(() => { navigationInProgress.current = false; }, 500);
        }
      }}
    >
      {/* Image at top */}
      <View style={styles.imageWrap}>
        <Image 
          source={{ uri: getProductImageUrl(item, API_BASE_URL) }} 
          style={styles.image}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      </View>

      {/* Product info */}
      <View style={styles.cardInfo}>
        {/* Name */}
        <Text numberOfLines={2} style={[styles.name, { color: theme.colors.text }]}>
          {itemName}
        </Text>

        {/* Price and Share at bottom */}
        <View style={styles.rowBetween}>
          <Text style={[styles.price, { color: theme.colors.primary }]}>
            {finalPrice.toLocaleString()} {isRTL ? "د" : "IQD"}
          </Text>
          <TouchableOpacity
            style={[styles.shareBtn, { backgroundColor: theme.colors.primary }]}
            onPress={(e) => {
              e.stopPropagation();
              handleShareProduct(item);
            }}
          >
            <Ionicons name="share-outline" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, direction: isRTL ? "rtl" : "ltr" },
      ]}
    >
      <View style={[styles.header, { backgroundColor: theme.colors.card, flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <TouchableOpacity onPress={() => router.canGoBack?.() ? router.back() : router.replace('/(tabs)/home')} style={styles.backBtn}>
          <Ionicons
            name={isRTL ? "arrow-forward" : "arrow-back"}
            size={22}
            color={theme.colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {category ? getLocalizedCategoryName(category) : t(String(slug))}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          renderItem={renderItem}
          ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={{ color: theme.colors.textSecondary }}>
              {t("noProducts") || "No products in this category"}
            </Text>
          </View>
        )}
      />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    height: 56,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18 },
  list: { padding: 16 },
  card: {
    width: "48%",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 14,
    // No shadows (use border inline for theme-aware color)
    elevation: 0,
  },
  cardPressed: {
    // Subtle lift without shadows
    transform: [{ translateY: -1 }],
  },
  imageWrap: {
    width: "100%",
    height: 100,
    overflow: "hidden",
    backgroundColor: "#f2f2f2",
  },
  image: { width: "100%", height: "100%" },
  cardInfo: {
    padding: 8,
    flex: 1,
    justifyContent: "space-between",
  },
  name: { fontSize: 13,  marginBottom: 6, minHeight: 32 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: "auto" },
  price: { fontSize: 14 },
  shareBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { flex: 1, paddingTop: 40, alignItems: "center" },
});
