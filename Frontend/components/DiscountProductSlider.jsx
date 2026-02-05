import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "../utils/ThemeContext";
import { useLanguage } from "../utils/LanguageContext";
import { fetchProducts } from "../store/slices/productsSlice";
import { Tag, Star } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getProductImageUrl } from "../utils/productImages";
import { Text } from "./ui/Text";


const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = screenWidth * 0.44;

export default function DiscountProductSlider() {
  const { theme, isDark } = useTheme();
  const { t, locale } = useLanguage();
  const router = useRouter();
  const dispatch = useDispatch();

  // Helper function to get localized text
  const getLocalizedText = (product, field) => {
    const lang = locale;
    const localizedField = `${field}_${lang}`;
    return product[localizedField] || product[field] || "";
  };

  const { items: products, loading } = useSelector((state) => state.products);

  // Use products provided by global store (Home handles pagination)

  // Determine discounted products based on app schema
  const isDiscounted = (p) => {
    const base = Number(p?.base_price);
    const sell = Number(p?.sell_price || p?.price);
    const hasFieldDiscount = typeof p?.discount === "number" && p.discount > 0;
    
    // Check if product has discount
    // Note: Checking both scenarios - sell < base (normal) AND base < sell (inverted schema)
    const hasPriceDiscount = 
      Number.isFinite(base) && 
      Number.isFinite(sell) && 
      base > 0 && 
      sell > 0 && 
      base !== sell; // Any price difference indicates a discount scenario
    
    return hasPriceDiscount || hasFieldDiscount;
  };

  const discountProducts = products.filter(isDiscounted);

  useEffect(() => {
    // If products not loaded yet, fetch them
    if (products.length === 0 && !loading) {
      dispatch(fetchProducts({ limit: 20, offset: 0 }));
    }
    console.log("DiscountProductSlider - Total products:", products.length);
    console.log("DiscountProductSlider - Discounted products:", discountProducts.length);
    
    // Debug: log first few products to see their structure
    if (products.length > 0) {
      console.log("Sample product data:", products.slice(0, 2).map(p => ({
        id: p.id,
        name: p.name || p.name_en,
        base_price: p.base_price,
        sell_price: p.sell_price,
        price: p.price,
        discount: p.discount,
        discount_type: p.discount_type
      })));
    }
  }, [dispatch, products.length, loading, discountProducts.length]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Show message if no discounted products (temporary for debugging)
  if (discountProducts.length === 0) {
    console.log("No discounted products found to display");
    // Return null to hide the section when no discounts
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Tag size={24} color={theme.colors.primary} strokeWidth={2.5} />
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t("discountProducts") || "Special Deals"}
          </Text>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + 12}
        snapToAlignment="start"
      >
        {discountProducts.map((product) => (
          <DiscountProductCard
            key={product.id}
            product={product}
            onPress={() => router.push(`/product/${product.id}`)}
            theme={theme}
            isDark={isDark}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function DiscountProductCard({ product, onPress, theme, isDark }) {
  const { isRTL, t, locale } = useLanguage();
  
  // Helper function to get localized text
  const getLocalizedText = (product, field) => {
    const lang = locale || 'en';
    const localizedField = `${field}_${lang}`;
    return product[localizedField] || product[field] || "";
  };
  
  // Image selection consistent with Home
  const imageUrl = getProductImageUrl(
    product,
    "https://via.placeholder.com/300",
  );

  // Price fields - In this schema: sell_price is the actual selling price, base_price is cost/wholesale
  const base = Number(product?.base_price) || 0;
  const sell = Number(product?.sell_price || product?.price) || 0;
  let discountPercent = 0;
  let discountAmount = 0;
  let isPercentageDiscount = true;
  
  // Calculate discount: base_price is original/cost, sell_price is discounted/sale price
  // Discount % = (base_price - sell_price) / base_price * 100
  if (base > 0 && sell > 0 && base !== sell) {
    discountPercent = Math.round(Math.abs(((base - sell) / Math.max(base, sell)) * 100));
  }
  // Use explicit discount field if available
  else if (typeof product?.discount === "number" && product.discount > 0) {
    if (product.discount_type === "percentage") {
      discountPercent = Math.round(product.discount);
      isPercentageDiscount = true;
    } else if (product.discount_type === "fixed") {
      discountAmount = product.discount;
      isPercentageDiscount = false;
      // Also calculate percentage for reference
      if (sell > 0) {
        discountPercent = Math.round((product.discount / sell) * 100);
      }
    }
  }
  
  // Display: sell_price is the current price, base_price is the original
  const displayPrice = sell;

  return (
    <Pressable
      style={[
        styles.card,
        {
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
          backgroundColor: theme.colors.card,
        },
      ]}
      onPress={onPress}
    >
      {/* Discount Badge */}
      {(discountPercent > 0 || discountAmount > 0) && (
        <View style={[styles.discountBadge, { backgroundColor: "#FF3B30" }]}>
          <Text style={styles.discountText}>
            {isPercentageDiscount 
              ? `-${discountPercent}%` 
              : `-${discountAmount.toLocaleString()} ${isRTL ? "د" : "IQD"}`}
          </Text>
        </View>
      )}

      {/* Commission Badge */}
      {product.commission_price && product.commission_price > 0 && (
        <View
          style={[
            styles.commissionBadge,
            { backgroundColor: "#34C759" },
          ]}
        >
          <Text style={styles.commissionText}>
            +{product.commission_price} {isRTL ? "دینار" : "IQD"}
          </Text>
        </View>
      )}

      {/* Product Image with Gradient */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      </View>

      {/* Product Info */}
      <View style={styles.info}>
        <Text
          style={[styles.name, { color: theme.colors.text }]}
          numberOfLines={2}
        >
          {getLocalizedText(product, "name")}
        </Text>

        {/* Rating */}
        {product.rating && (
          <View style={styles.ratingRow}>
            <Star size={12} color="#FFA500" fill="#FFA500" />
            <Text
              style={[styles.rating, { color: theme.colors.textSecondary }]}
            >
              {product.rating.toFixed(1)}
            </Text>
          </View>
        )}

        {/* Price Row */}
        <View style={styles.priceRow}>
          <View style={styles.priceColumn}>
            <Text style={[styles.price, { color: theme.colors.primary }]}>
              {isRTL
                ? `${displayPrice.toLocaleString()} دینار`
                : `${displayPrice.toLocaleString()} IQD`}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 20,

    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  discountBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  discountText: {
    color: "#fff",
    fontSize: 12,

    letterSpacing: 0.5,
  },
  commissionBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  commissionText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.3,
  },
  imageContainer: {
    width: "100%",
    height: 140,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  imageGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "50%",
  },
  info: {
    padding: 10,
  },
  name: {
    fontSize: 13,

    marginBottom: 6,
    lineHeight: 16,
    minHeight: 32,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  rating: {
    fontSize: 11,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceColumn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  price: {
    fontSize: 18,

    letterSpacing: -0.5,
  },
  originalPrice: {
    fontSize: 13,

    textDecorationLine: "line-through",
  },
});
