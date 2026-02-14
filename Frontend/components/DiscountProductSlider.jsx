import React, { useEffect, useState } from "react";
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
import { getProductImageUrl } from "../utils/productImages";
import { Text } from "./ui/Text";
import SectionBanner from "./SectionBanner";

const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = screenWidth * 0.38;

export default function DiscountProductSlider() {
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const dispatch = useDispatch();
  const [initialLoad, setInitialLoad] = useState(false);

  const { items: products, loading } = useSelector((state) => state.products);

  useEffect(() => {
    // Fetch products if we don't have any
    if (products.length === 0 && !loading) {
      dispatch(fetchProducts({ limit: 20, offset: 0 }));
      setInitialLoad(true);
    } else if (products.length > 0) {
      setInitialLoad(true);
    }
  }, [dispatch, products.length, loading]);

  const discountProducts = products.filter((p) => {
    const discountValue = Number(p?.discount) || 0;
    return discountValue > 0;
  });

  if (products.length > 0 && discountProducts.length === 0) {
    console.log('Sample product (checking discount field):', {
      id: products[0]?.id,
      name: products[0]?.name,
      discount: products[0]?.discount,
      discount_type: products[0]?.discount_type,
      sell_price: products[0]?.sell_price,
    });
  }

  // Show loading only on initial load
  if (loading && !initialLoad) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Hide section if no discounted products and we've loaded
  if (initialLoad && discountProducts.length === 0) {
    return null;
  }

  return (
    <SectionBanner type="discounts" resizeMode="stretch" style={styles.container} route="/products">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        style={{ marginTop: 80 }}
        snapToInterval={CARD_WIDTH + 16}
      >
        {discountProducts.map((product, index) => (
          <DiscountProductCard
            key={product.id}
            product={product}
            theme={theme}
            isDark={isDark}
            isLast={index === discountProducts.length - 1}
            onPress={() => router.push(`/product/${product.id}`)}
          />
        ))}
      </ScrollView>
    </SectionBanner>
  );
}

function DiscountProductCard({ product, onPress, theme, isDark, isLast }) {
  const { isRTL, locale } = useLanguage();

  const getLocalizedText = (field) => {
    const lang = locale || "en";
    return product[`${field}_${lang}`] || product[field] || "";
  };

  const imageUrl = getProductImageUrl(
    product,
    "https://via.placeholder.com/300",
  );

  // ===============================
  // 🔥 DISCOUNT CALCULATION (YOUR RULES)
  // ===============================
  const sell = Number(product?.sell_price) || 0;
  const discount = Number(product?.discount) || 0;

  let finalPrice = sell;
  let badgeText = "";
  let savedAmount = 0;

  const type = (product?.discount_type || "").toLowerCase();
  const isPercentage =
    type === "percentage" || type === "parsentage" || type === "percent";
  const isFixed = type === "fixed";

  if (discount > 0) {
    if (isPercentage) {
      savedAmount = (sell * discount / 100);
      finalPrice = sell - savedAmount;
      badgeText = `-${Math.round(discount)}%`;
    } else if (isFixed) {
      savedAmount = discount;
      finalPrice = sell - discount;
      badgeText = `-${discount.toLocaleString()} ${isRTL ? "د" : "IQD"}`;
    }
  }

  finalPrice = Math.max(0, finalPrice);
  const displayPrice = Math.round(finalPrice);
  const originalPrice = Math.round(sell);

  return (
    <Pressable
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          marginRight: isLast ? 0 : 16,
        },
      ]}
      onPress={onPress}
    >
      {badgeText ? (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>{badgeText}</Text>
        </View>
      ) : null}

      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
      </View>

      <View style={styles.info}>
        <Text
          style={[styles.name, { color: theme.colors.text }]}
          numberOfLines={2}
        >
          {getLocalizedText("name")}
        </Text>

        {product.rating && (
          <View style={styles.ratingRow}>
            <Star size={14} color="#FFA500" fill="#FFA500" />
            <Text style={[styles.rating, { color: theme.colors.textSecondary }]}>
              {product.rating.toFixed(1)}
            </Text>
          </View>
        )}

        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: theme.colors.primary }]}>
            {isRTL
              ? `${displayPrice.toLocaleString()} دینار`
              : `${displayPrice.toLocaleString()} IQD`}
          </Text>
          <Text style={[styles.originalPrice, { color: theme.colors.textSecondary }]}>
            {isRTL
              ? `${originalPrice.toLocaleString()} د`
              : `${originalPrice.toLocaleString()}`}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { 
    marginBottom: 0,
    paddingVertical: 10,
  },
  loadingContainer: { padding: 20, alignItems: "center" },

  header: {
    paddingHorizontal: 20,
    marginBottom: 18,
  },

  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  accentBar: {
    width: 5,
    height: 26,
    borderRadius: 3,
  },

  title: {
    fontSize: 22,
    letterSpacing: 0.3,
  },

  scrollContent: {
    paddingHorizontal: 16,
  },

  card: {
    width: CARD_WIDTH,
    borderRadius: 12,
    overflow: 'hidden',
  },

  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#FF3B30",
  },

  discountText: {
    color: "#fff",
    fontSize: 11,
    letterSpacing: 0.2,
  },

  imageContainer: {
    width: "100%",
    height: 120,
    backgroundColor: '#F8F9FA',
  },

  image: {
    width: "100%",
    height: "100%",
  },

  info: {
    padding: 8,
  },

  name: {
    fontSize: 12,
    marginBottom: 4,
    lineHeight: 16,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 10,
  },

  rating: {
    fontSize: 12,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },

  price: {
    fontSize: 14,
    letterSpacing: 0.2,
    fontWeight: '600',
  },

  originalPrice: {
    fontSize: 11,
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
});
