import React from "react";
import {
  View,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  Dimensions,
  Text as RNText,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "../utils/ThemeContext";
import { useLanguage } from "../utils/LanguageContext";
import { fetchProducts } from "../store/slices/productsSlice";
import { Tag, Star } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
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

const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = screenWidth * 0.44;

export default function DiscountProductSlider() {
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const dispatch = useDispatch();

  const { items: products, loading } = useSelector((state) => state.products);

  // Use products provided by global store (Home handles pagination)

  // Determine discounted products based on app schema
  const isDiscounted = (p) => {
    const base = Number(p?.base_price);
    const sell = Number(p?.sell_price ?? p?.price);
    const hasFieldDiscount = typeof p?.discount === "number" && p.discount > 0;
    return (Number.isFinite(base) && Number.isFinite(sell) && sell < base) || hasFieldDiscount;
  };

  const discountProducts = products.filter(isDiscounted);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (discountProducts.length === 0) {
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
  // Image selection consistent with Home
  const imageUrl = getProductImageUrl(
    product,
    "https://via.placeholder.com/300"
  );

  // Price fields
  const base = Number(product?.base_price);
  const sell = Number(product?.sell_price ?? product?.price);
  let discountPercent = 0;
  if (Number.isFinite(base) && base > 0 && Number.isFinite(sell) && sell < base) {
    discountPercent = Math.round(((base - sell) / base) * 100);
  } else if (typeof product?.discount === "number" && product.discount > 0) {
    // If only "discount" known, use it directly if it's percentage
    discountPercent = product.discount_type === "percentage" ? Math.round(product.discount) : 0;
  }

  return (
    <Pressable
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.primary + "30",
        },
      ]}
      onPress={onPress}
    >
      {/* Discount Badge */}
      <View style={[styles.discountBadge, { backgroundColor: "#FF3B30" }]}>
        <Text style={styles.discountText}>-{discountPercent}%</Text>
      </View>

      {/* Product Image with Gradient */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.3)"]}
          style={styles.imageGradient}
        />
      </View>

      {/* Product Info */}
      <View style={styles.info}>
        <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={2}>
          {product.name}
        </Text>

        {/* Rating */}
        {product.rating && (
          <View style={styles.ratingRow}>
            <Star size={12} color="#FFA500" fill="#FFA500" />
            <Text style={[styles.rating, { color: theme.colors.textSecondary }]}>
              {product.rating.toFixed(1)}
            </Text>
          </View>
        )}

        {/* Price Row */}
        <View style={styles.priceRow}>
          <View style={styles.priceColumn}>
            <Text style={[styles.price, { color: theme.colors.primary }]}>
              {Number.isFinite(sell) ? `$${sell}` : ""}
            </Text>
            {Number.isFinite(base) && base > (Number.isFinite(sell) ? sell : 0) ? (
              <Text style={[styles.originalPrice, { color: theme.colors.textSecondary }]}>
                ${base}
              </Text>
            ) : null}
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  discountBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  discountText: {
    color: "#fff",
    fontSize: 12,
    
    letterSpacing: 0.5,
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
