import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";
import { useLanguage } from "../utils/LanguageContext";
import { useTheme } from "../utils/ThemeContext";
import { fetchCategories } from "../store/slices/categoriesSlice";
import Text from "../components/ui/Text";
import { getApiBaseUrl } from "../utils/apiConfig";

const categoryIcons = {
  electronics: "tv-outline",
  fashion: "shirt-outline",
  food: "fast-food-outline",
  books: "book-outline",
  sports: "football-outline",
};

export default function CategoriesScreen() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const { theme } = useTheme();

  const { items: categories, loading } = useSelector((s) => s.categories);
  const [screenData, setScreenData] = useState(Dimensions.get("window"));

  // Update screen dimensions on orientation change
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setScreenData(window);
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    dispatch(fetchCategories({})); // Fetch all categories
  }, [dispatch]);

  // State for selected parent category
  const [selectedParent, setSelectedParent] = useState(null);

  // Filter parent categories (no parent_id)
  const parentCategories = categories.filter((cat) => cat.parent_id === null);

  // Get subcategories for selected parent
  const subCategories = selectedParent
    ? categories.filter((cat) => cat.parent_id === selectedParent.id)
    : [];

  // Determine which categories to display
  const displayCategories = selectedParent ? subCategories : parentCategories;

  // Responsive layout calculations
  const getResponsiveLayout = () => {
    const { width, height } = screenData;
    const isLandscape = width > height;
    const isTablet = Math.min(width, height) >= 768;
    const isSmallPhone = width < 375;
    
    // Container padding that adapts to screen size
    let containerPadding;
    if (isTablet) {
      containerPadding = isLandscape ? 32 : 24;
    } else {
      containerPadding = isSmallPhone ? 12 : 16;
    }
    
    // Gap between cards
    let cardGap;
    if (isTablet) {
      cardGap = 16;
    } else {
      cardGap = isSmallPhone ? 8 : 12;
    }
    
    // Number of columns (force 3 columns on phones as requested)
    let columns;
    if (isTablet) {
      // Keep richer layout for tablets
      columns = isLandscape ? 5 : 4;
    } else {
      // Always 3 columns on phones (portrait or landscape)
      columns = 3;
    }
    
    // Calculate card width
    const totalGapWidth = cardGap * (columns - 1);
    const availableWidth = width - (containerPadding * 2) - totalGapWidth;
    const cardWidth = Math.floor(availableWidth / columns);
    
    // Card dimensions and styling
    const cardHeight = cardWidth * 1.1; // Slightly taller than wide
    const cardBorderRadius = isTablet ? 16 : 12;
    const cardPadding = isTablet ? 16 : 12;
    
    // Icon styling
    const iconBoxSize = isTablet ? 56 : isSmallPhone ? 36 : 44;
    const iconSize = isTablet ? 28 : isSmallPhone ? 18 : 22;
    
    // Text styling
    const titleFontSize = isTablet ? 14 : isSmallPhone ? 11 : 12;
    
    return {
      containerPadding,
      cardGap,
      cardWidth,
      cardHeight,
      cardBorderRadius,
      cardPadding,
      iconBoxSize,
      iconSize,
      titleFontSize,
      columns,
      isTablet,
      isLandscape,
      isSmallPhone,
    };
  };

  const layout = getResponsiveLayout();
  const API_BASE_URL = getApiBaseUrl();

  const renderCategoryCard = (category) => {
    const isParent = !category.parent_id;
    
    return (
      <TouchableOpacity
        key={category.id ?? category.slug ?? String(category.name)}
        style={[
          styles.categoryCard,
          {
            width: layout.cardWidth,
            height: layout.cardHeight,
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderRadius: layout.cardBorderRadius,
            overflow: 'hidden',
            shadowColor: theme.colors.text,
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          },
        ]}
        onPress={() => {
          if (isParent) {
            // Check if has subcategories
            const hasSubs = categories.some(c => c.parent_id === category.id);
            if (hasSubs) {
              setSelectedParent(category);
            } else {
              router.push(`/category/${category.slug ?? category.id}`);
            }
          } else {
            router.push(`/category/${category.slug ?? category.id}`);
          }
        }}
        activeOpacity={0.8}
      >
        {/* Category Image */}
        {category.image_url ? (
          <Image
            source={{ 
              uri: category.image_url.startsWith('http') 
                ? category.image_url 
                : `${API_BASE_URL}${category.image_url}` 
            }}
            style={styles.categoryImage}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.categoryImagePlaceholder,
              { backgroundColor: theme.colors.primary + "15" },
            ]}
          >
            <Ionicons
              name={categoryIcons[category.slug] || "grid-outline"}
              size={layout.iconSize * 1.5}
              color={theme.colors.primary}
            />
          </View>
        )}

        {/* Gradient overlay for better text readability */}
        <View style={styles.categoryOverlay}>
          <Text
            numberOfLines={2}
            style={[
              styles.categoryTitle,
              {
                fontSize: layout.titleFontSize,
                color: '#fff',
                lineHeight: layout.titleFontSize * 1.3,
                textShadowColor: 'rgba(0, 0, 0, 0.75)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
              },
            ]}
          >
            {category.name}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["top", "bottom"]}
    >
      {/* Responsive header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.card,
            borderBottomColor: theme.colors.border,
            flexDirection: isRTL ? "row-reverse" : "row",
            height: layout.isTablet ? 64 : 56,
            paddingHorizontal: layout.containerPadding,
          },
        ]}
      >
        <TouchableOpacity 
          onPress={() => selectedParent ? setSelectedParent(null) : router.back()} 
          style={[
            styles.headerButton,
            {
              width: layout.isTablet ? 48 : 40,
              height: layout.isTablet ? 48 : 40,
            }
          ]}
        >
          <Ionicons
            name={isRTL ? "chevron-forward" : "chevron-back"}
            size={layout.isTablet ? 26 : 22}
            color={theme.colors.text}
          />
        </TouchableOpacity>
        
        <Text 
          style={[
            styles.headerTitle, 
            { 
              color: theme.colors.text,
              fontSize: layout.isTablet ? 20 : 16,
            }
          ]}
        >
          {selectedParent ? selectedParent.name : t("categories")}
        </Text>
        
        <View 
          style={[
            styles.headerButton,
            {
              width: layout.isTablet ? 48 : 40,
              height: layout.isTablet ? 48 : 40,
            }
          ]} 
        />
      </View>

      {/* Content area */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size="large" 
            color={theme.colors.primary} 
          />
          <Text 
            style={[
              styles.loadingText,
              { 
                color: theme.colors.textSecondary,
                fontSize: layout.titleFontSize,
                marginTop: 12,
              }
            ]}
          >
            {t("loading") || "Loading categories..."}
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { 
              padding: layout.containerPadding,
            }
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Responsive grid container */}
          <View 
            style={[
              styles.gridContainer,
              { 
                gap: layout.cardGap,
              }
            ]}
          >
            {displayCategories?.length ? (
              displayCategories.map(renderCategoryCard)
            ) : (
              <View style={[styles.emptyState, { width: screenData.width - (layout.containerPadding * 2) }]}>
                <Ionicons 
                  name="grid-outline" 
                  size={layout.isTablet ? 48 : 36} 
                  color={theme.colors.textSecondary} 
                />
                <Text 
                  style={[
                    styles.emptyText,
                    { 
                      color: theme.colors.textSecondary,
                      fontSize: layout.titleFontSize + 2,
                      marginTop: 12,
                    }
                  ]}
                >
                  {t("noCategories") || "No categories available"}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    textAlign: "center",
    
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  categoryCard: {
    borderWidth: StyleSheet.hairlineWidth,
    position: "relative",
    transform: [{ scale: 1 }],
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  categoryImagePlaceholder: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  categoryTitle: {
    textAlign: "center",
  },
  cardIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyText: {
    textAlign: "center",
    
  },
});