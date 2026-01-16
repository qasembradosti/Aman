import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Image,
  Dimensions,
  Text as RNText,
  Share,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { useLanguage } from "../utils/LanguageContext";
import { useTheme } from "../utils/ThemeContext";
import { fetchProducts } from "../store/slices/productsSlice";
import InfoDialog from "../components/InfoDialog";
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
  const cardWidth = Math.floor((width - (horizontalPadding * 2) - totalGapWidth) / columns);
  
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

export default function Products() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { t, isRTL } = useLanguage();
  const { theme } = useTheme();
  const layout = useResponsiveLayout();
  
  const [dialog, setDialog] = useState({ visible: false, title: '', message: '' });
  const closeDialog = () => setDialog({ visible: false, title: '', message: '' });
  const [refreshing, setRefreshing] = useState(false);
  
  const { items: products, loading: productsLoading } = useSelector((state) => state.products);

  useEffect(() => {
    dispatch(fetchProducts({ limit: 100 })); // Fetch more products for the listing page
  }, [dispatch]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    dispatch(fetchProducts({ limit: 100 })).finally(() => setRefreshing(false));
  }, [dispatch]);

  const handleShareProduct = async (id, name) => {
    try {
      await Share.share({
        title: name,
        message: `Check out this product: ${name}`,
        url: `https://yourapp.com/product/${id}`,
      });
    } catch (_e) {
      setDialog({ visible: true, title: 'Error', message: 'Unable to share product' });
    }
  };

  const computeBonus = (p) => {
    if (typeof p?.bonus === 'number') return p.bonus;
    const priceNum = typeof p?.price === 'number' ? p.price : Number(p?.price);
    if (!isNaN(priceNum)) return Math.round(priceNum * 0.1 * 100) / 100;
    return undefined;
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
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons
            name={isRTL ? "arrow-forward" : "arrow-back"}
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t("allProducts") || "All Products"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
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
                  { borderColor: theme.colors.border, borderWidth: StyleSheet.hairlineWidth },
                  pressed && styles.productCardPressed,
                  pressed && { borderColor: theme.colors.primary },
                ]}
                onPress={() => router.push(`/product/${product.id}`)}
              >
                <View style={[styles.productImage, {
                  height: layout.isSmallPhone ? 100 : layout.isMediumPhone ? 110 : 120
                }]}>
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
                  {(() => {
                    const bonus = computeBonus(product);
                    return typeof bonus === 'number' ? (
                      <View style={[styles.bonusTag, { backgroundColor: theme.colors.primary }]}>
                        <Text style={styles.bonusTagText}>{t('sellerBonus')}: ${bonus}</Text>
                      </View>
                    ) : null;
                  })()}
                </View>

                <View style={styles.productInfo}>
                  <Text
                    numberOfLines={2}
                    style={[styles.productName, {
                      color: theme.colors.text,
                      fontSize: layout.productNameSize,
                    }]}
                  >
                    {product.title}
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
                    <Text style={[styles.productPrice, {
                      color: theme.colors.primary,
                      fontSize: layout.productPriceSize,
                    }]}>
                      ${product.price}
                    </Text>
                    <TouchableOpacity
                      style={[styles.shareButton, {
                        backgroundColor: theme.colors.primary,
                        width: layout.isSmallPhone ? 32 : 36,
                        height: layout.isSmallPhone ? 32 : 36,
                        borderRadius: layout.isSmallPhone ? 16 : 18,
                      }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleShareProduct(product.id, product.title);
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
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {t("noProductsFound") || "No products found"}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <InfoDialog
        visible={dialog.visible}
        title={dialog.title}
        message={dialog.message}
        onClose={closeDialog}
      />
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    
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
    position: 'absolute',
    top: 8,
    left: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  bonusTagText: {
    color: '#fff',
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
});
