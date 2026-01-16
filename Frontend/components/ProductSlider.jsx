import React from "react";
import {
  View,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  Dimensions,
  Text as RNText,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../utils/ThemeContext";
import { useLanguage } from "../utils/LanguageContext";
import { Heart, Star } from "lucide-react-native";
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
const CARD_WIDTH = screenWidth * 0.45;

export default function ProductSlider({ products, title }) {
  const { theme, isDark } = useTheme();
  const router = useRouter();

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {title && (
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {title}
        </Text>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + 12}
      >
        {products.map((product) => (
          <ProductCard
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

function ProductCard({ product, onPress, theme, isDark }) {
  const [isFavorite, setIsFavorite] = React.useState(false);

  // Get first image or fallback
  const imageUrl = getProductImageUrl(
    product,
    "https://via.placeholder.com/300"
  );

  // Calculate commission (example: 10% of price)
  const commissionRate = product.commission_rate || 0.1;
  const commission = (product.price * commissionRate).toFixed(2);

  return (
    <Pressable
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
        },
      ]}
      onPress={onPress}
    >
      {/* Commission Badge at Top */}
      {commission > 0 && (
        <View
          style={[
            styles.commissionBadge,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <Text style={styles.commissionText}>+${commission}</Text>
        </View>
      )}

      {/* Favorite Button */}
      <Pressable
        style={[
          styles.favoriteButton,
          {
            backgroundColor: isDark
              ? "rgba(0,0,0,0.5)"
              : "rgba(255,255,255,0.9)",
          },
        ]}
        onPress={(e) => {
          e.stopPropagation();
          setIsFavorite(!isFavorite);
        }}
      >
        <Heart
          size={18}
          color={isFavorite ? "#EF4444" : theme.colors.text}
          fill={isFavorite ? "#EF4444" : "none"}
          strokeWidth={2}
        />
      </Pressable>

      {/* Product Image */}
      <Image
        source={{ uri: imageUrl }}
        style={styles.image}
        resizeMode="cover"
      />

      {/* Product Info */}
      <View style={styles.info}>
        <Text
          style={[styles.name, { color: theme.colors.text }]}
          numberOfLines={2}
        >
          {product.name}
        </Text>

        {/* Rating */}
        {product.rating && (
          <View style={styles.ratingRow}>
            <Star size={14} color="#FFA500" fill="#FFA500" />
            <Text
              style={[styles.rating, { color: theme.colors.textSecondary }]}
            >
              {product.rating.toFixed(1)}
            </Text>
          </View>
        )}

        {/* Price */}
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: theme.colors.primary }]}>
            ${product.price}
          </Text>
          {product.original_price && product.original_price > product.price && (
            <Text
              style={[
                styles.originalPrice,
                { color: theme.colors.textSecondary },
              ]}
            >
              ${product.original_price}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  commissionBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    zIndex: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  commissionText: {
    color: "#fff",
    fontSize: 12,
    
  },
  favoriteButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: 160,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  info: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    
    marginBottom: 6,
    lineHeight: 18,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  rating: {
    fontSize: 12,
    
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  price: {
    fontSize: 18,
    
  },
  originalPrice: {
    fontSize: 14,
    
    textDecorationLine: "line-through",
  },
});
