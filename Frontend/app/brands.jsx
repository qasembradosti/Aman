import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TextInput,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../utils/ThemeContext";
import { useLanguage } from "../utils/LanguageContext";
import api from "../services/apiService";
import { getApiBaseUrl } from "../utils/apiConfig";
import Text from "@/components/ui/Text";

const { width } = Dimensions.get("window");
const HORIZONTAL_PADDING = 16;
const CARD_GAP = 12;
const COLUMNS = 3;
const CARD_WIDTH = (width - (HORIZONTAL_PADDING * 2) - (CARD_GAP * (COLUMNS - 1))) / COLUMNS;

export default function BrandsScreen() {
  const [brands, setBrands] = useState([]);
  const [filteredBrands, setFilteredBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const API_BASE_URL = getApiBaseUrl();

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = brands.filter((brand) =>
        brand.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredBrands(filtered);
    } else {
      setFilteredBrands(brands);
    }
  }, [searchQuery, brands]);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/brands", {
        params: { is_active: "true" },
      });
      const brandsData = response.data.data || [];
      setBrands(brandsData);
      setFilteredBrands(brandsData);
    } catch (error) {
      console.error("Error fetching brands:", error);
    } finally {
      setLoading(false);
    }
  };

  const resolveBrandImageUri = (brand) => {
    const imageUrl = brand?.logo_url || brand?.logo || brand?.image;
    if (imageUrl) {
      return imageUrl.startsWith("http")
        ? imageUrl
        : `${API_BASE_URL}${imageUrl}`;
    }
    return null;
  };

  const handleBrandPress = (brand) => {
    router.push(`/products?brand=${brand.id}`);
  };

  const renderBrandItem = ({ item, index }) => {
    const brandImage = resolveBrandImageUri(item);

    return (
      <TouchableOpacity
        style={[
          styles.brandCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            width: CARD_WIDTH,
          },
        ]}
        onPress={() => handleBrandPress(item)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.brandLogoContainer,
            { backgroundColor: theme.colors.primary + "10" },
          ]}
        >
          {brandImage ? (
            <Image
              source={{ uri: brandImage }}
              style={styles.brandLogo}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : (
            <Ionicons
              name="storefront-outline"
              size={35}
              color={theme.colors.textSecondary}
            />
          )}
        </View>
        
        <Text
          style={[styles.brandName, { color: theme.colors.text }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[styles.loadingText, { color: theme.colors.textSecondary }]}
          >
            {t("loading") || "Loading brands..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["top"]}
    >
      {/* Modern Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, flexDirection: !isRTL ? "row-reverse" : "row" }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.backButton,
            { backgroundColor: theme.colors.background + "AA" },
          ]}
        >
          <Ionicons
            name={isRTL ? "arrow-forward" : "arrow-back"}
            size={22}
            color={theme.colors.text}
          />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.colors.text, textAlign: "center" }]}>
            {t("brands")}
          </Text>
          <Text
            style={[
              styles.headerSubtitle,
              { color: theme.colors.textSecondary, textAlign: "center" },
            ]}
          >
            {filteredBrands.length} {t("available") || "available"}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Enhanced Search Bar */}
      <View style={styles.searchSection}>
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: theme.colors.card, flexDirection: isRTL ? "row-reverse" : "row" },
          ]}
        >
          <View
            style={[
              styles.searchIconWrapper,
              { backgroundColor: theme.colors.primary + "15", marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 },
            ]}
          >
            <Ionicons name="search" size={18} color={theme.colors.primary} />
          </View>
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text, textAlign: isRTL ? "right" : "left" }]}
            placeholder={t("searchBrands") || "Search for brands..."}
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            selectionColor={theme.colors.primary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={[styles.clearButton, { marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }]}
            >
              <Ionicons
                name="close-circle"
                size={22}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Brands Grid */}
      <FlatList
        data={filteredBrands}
        renderItem={renderBrandItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={3}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyCircle,
                { backgroundColor: theme.colors.primary + "10" },
              ]}
            >
              <Ionicons
                name={searchQuery ? "search-outline" : "storefront-outline"}
                size={64}
                color={theme.colors.primary}
              />
            </View> 
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              {searchQuery
                ? t("noBrandsFound")
                : t("noBrands")}
            </Text>
            <Text
              style={[
                styles.emptySubtitle,
                { color: theme.colors.textSecondary },
              ]}
            >
              {searchQuery
                ? t("tryDifferentSearch") ||
                  "Try a different search term or browse all brands"
                : t("checkBackLater") ||
                  "Check back soon for exciting new brands"}
            </Text>
            {searchQuery && (
              <TouchableOpacity
                style={[
                  styles.resetButton,
                  { backgroundColor: theme.colors.primary, flexDirection: isRTL ? "row-reverse" : "row" },
                ]}
                onPress={() => setSearchQuery("")}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="refresh"
                  size={18}
                  color="#fff"
                  style={{ marginRight: isRTL ? 0 : 6, marginLeft: isRTL ? 6 : 0 }}
                />
                <Text style={styles.resetButtonText}>
                  {t("showAll") || "Show All Brands"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  // Modern Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
  },
  headerRight: {
    width: 36,
  },
  // Enhanced Search
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: 44,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  searchIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  // Brand Cards
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  brandCard: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 0,
    padding: 12,
    backgroundColor: "#fff",
  },
  brandLogoContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    overflow: "hidden",
    marginBottom: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  brandLogo: {
    width: "100%",
    height: "100%",
  },
  brandName: {
    fontSize: 12,
    textAlign: "center",
    width: "100%",
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 120,
    paddingHorizontal: 40,
  },
  emptyCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  emptyTitle: {
    fontSize: 24,
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 300,
  },
  resetButton: {
    marginTop: 28,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  resetButtonText: {
    color: "#fff",
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
