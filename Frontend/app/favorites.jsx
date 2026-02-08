import { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Share,
} from "react-native";
import { Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../utils/ThemeContext";
import { useLanguage } from "../utils/LanguageContext";
import { Text } from "../components/ui/Text";
import * as favoriteService from "../services/favoriteService";
import { getProductImageUrl } from "../utils/productImages";
import InfoDialog from "../components/InfoDialog";

// Responsive layout hook (copied from home.jsx for consistency)
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

  const columns = isLandscape ? 3 : isLargePhone ? 3 : 2;
  const totalGapWidth = cardGap * (columns - 1);
  const cardWidth = Math.floor(
    (width - horizontalPadding * 2 - totalGapWidth) / columns
  );

  const productNameSize = isSmallPhone ? 12 : 13;
  const productPriceSize = isSmallPhone ? 14 : 16;
  const sectionTitleSize = isSmallPhone ? 16 : 18;

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
    sectionTitleSize,
    columns,
  };
};

export default function Favorites() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, isRTL, locale } = useLanguage();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const layout = useResponsiveLayout();
  const navigationInProgress = useRef(false);

  const [dialog, setDialog] = useState({
    visible: false,
    title: "",
    message: "",
  });

  const getLocalizedText = (product, field) => {
    const lang = locale;
    const localizedField = `${field}_${lang}`;
    return product[localizedField] || product[field] || "";
  };

  const loadFavorites = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const response = await favoriteService.getUserFavorites({ limit: 100 });
      setFavorites(response.data || []);
    } catch (err) {
      console.error("Load favorites error:", err);
      setError(err?.response?.data?.message || t("errorLoadingFavorites") || "Failed to load favorites");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleShareProduct = async (productId, name) => {
    try {
      const url = `https://aman.com/product/${productId}`; // Adjust as per your deep link/web url
      await Share.share({
        message: `${t("checkOutThisProduct")}: ${name}\n${url}`,
        url: url,
        title: name,
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const renderFavoriteItem = ({ item }) => {
    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [
          styles.productCard,
          {
            backgroundColor: theme.colors.card,
            width: layout.cardWidth,
            marginBottom: layout.cardGap,
          },
          pressed && styles.productCardPressed,
        ]}
        onPress={() => {
          if (!navigationInProgress.current) {
            navigationInProgress.current = true;
            router.push(`/product/${item.id}`);
            setTimeout(() => {
              navigationInProgress.current = false;
            }, 500);
          }
        }}
      >
        {/* Image at top */}
        <View
          style={[
            styles.productImage,
            {
              height: layout.cardWidth * 0.75,
              backgroundColor: theme.colors.border,
            },
          ]}
        >
          <Image
            source={{
              uri: getProductImageUrl(item, "https://via.placeholder.com/400"),
            }}
            style={styles.productImageImg}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
          {item.commission_price && (
            <View
              style={[styles.bonusTag, { backgroundColor: "green" }]}
            >
              <Text style={styles.bonusTagText}>
                {isRTL
                  ? `${item.commission_price} دینار `
                  : `${item.commission_price} IQD`}
              </Text>
            </View>
          )}
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
                minHeight: 32,
              },
            ]}
          >
            {getLocalizedText(item, "name")}
          </Text>

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
              {isRTL
                ? `${item.sell_price} دینار `
                : `${item.sell_price} IQD`}
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
                handleShareProduct(
                  item.id,
                  getLocalizedText(item, "name"),
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
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-outline" size={64} color="#ccc" />
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        {t("noFavoritesYet")}
      </Text>
      <TouchableOpacity
        style={[styles.exploreButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push("/(tabs)/home")}
      >
        <Text style={styles.exploreButtonText}>{t("exploreProducts")}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t("favorites")}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          key={layout.columns} // Force re-render on orientation change
          data={favorites}
          renderItem={renderFavoriteItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={layout.columns}
          contentContainerStyle={[
            styles.listContainer,
            { paddingHorizontal: layout.horizontalPadding },
            favorites.length === 0 && { flex: 1, justifyContent: "center" }
          ]}
          columnWrapperStyle={
             favorites.length > 0 ? { gap: layout.cardGap } : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadFavorites(true)}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={EmptyState}
        />
      )}
      
      <InfoDialog
        visible={dialog.visible}
        title={dialog.title}
        message={dialog.message}
        onClose={() => setDialog({ ...dialog, visible: false })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    width: 40,
  },
  headerRight: {
    width: 40,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    textAlign: "center",
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    paddingVertical: 16,
    flexGrow: 1,
  },
  productCard: {
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e6e6e6",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  productCardPressed: {
    transform: [{ scale: 0.97 }],
    elevation: 1,
    shadowOpacity: 0.02,
  },
  productImage: {
    width: "100%",
    // height handled by layout
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  productImageImg: {
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
    zIndex: 1,
  },
  bonusTagText: {
    color: "#fff",
    fontSize: 10,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    marginBottom: 8,
    lineHeight: 18,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  productPrice: {
  },
  shareButton: {
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    marginBottom: 24,
  },
  exploreButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: "#fff",
    fontSize: 16,
  },
});
