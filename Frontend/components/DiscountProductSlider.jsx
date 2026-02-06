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
import { getProductImageUrl } from "../utils/productImages";
import { Text } from "./ui/Text";

const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = screenWidth * 0.44;

export default function DiscountProductSlider() {
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const dispatch = useDispatch();

  const { items: products, loading } = useSelector((state) => state.products);

  useEffect(() => {
    if (products.length === 0 && !loading) {
      dispatch(fetchProducts({ limit: 20, offset: 0 }));
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Hide section if no discounted products
  if (discountProducts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Tag size={24} color={theme.colors.primary} />
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t("discountProducts")}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + 12}
      >
        {discountProducts.map((product) => (
          <DiscountProductCard
            key={product.id}
            product={product}
            theme={theme}
            isDark={isDark}
            onPress={() => router.push(`/product/${product.id}`)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function DiscountProductCard({ product, onPress, theme, isDark }) {
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

  const type = (product?.discount_type || "").toLowerCase();
  const isPercentage =
    type === "percentage" || type === "parsentage" || type === "percent";
  const isFixed = type === "fixed";

  if (discount > 0) {
    if (isPercentage) {
      finalPrice = sell - (sell * discount / 100);
      badgeText = `-${Math.round(discount)}%`;
    } else if (isFixed) {
      finalPrice = sell - discount;
      badgeText = `-${discount.toLocaleString()} ${isRTL ? "د" : "IQD"}`;
    }
  }

  finalPrice = Math.max(0, finalPrice);
  const displayPrice = Math.round(finalPrice);

  return (
    <Pressable
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
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
            <Star size={12} color="#FFA500" fill="#FFA500" />
            <Text style={styles.rating}>{product.rating.toFixed(1)}</Text>
          </View>
        )}

        <Text style={[styles.price, { color: theme.colors.primary }]}>
          {isRTL
            ? `${displayPrice.toLocaleString()} دینار`
            : `${displayPrice.toLocaleString()} IQD`}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 24 },
  loadingContainer: { padding: 20, alignItems: "center" },

  header: {
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
    backgroundColor: "#FF3B30",
  },

  discountText: {
    color: "#fff",
    fontSize: 12,
  },

  imageContainer: {
    width: "100%",
    height: 140,
  },

  image: {
    width: "100%",
    height: "100%",
  },

  info: {
    padding: 10,
  },

  name: {
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 16,
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

  price: {
    fontSize: 18,
  },
});
