import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Image } from "react-native";
import { Text } from "./ui/Text";
import { useTheme } from "../utils/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { useDispatch, useSelector } from "react-redux";
import { fetchActiveBanners } from "../store/slices/bannersSlice";
import { getApiBaseUrl } from "../utils/apiConfig";
import { useLanguage } from "../utils/LanguageContext";

const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = screenWidth - 40; // Account for container margins
const API_BASE = getApiBaseUrl();

export default function BannerSlider() {
  const { theme, isDark } = useTheme();
  const { locale } = useLanguage();
  const dispatch = useDispatch();
  const { banners, loading } = useSelector((state) => state.banners);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef(null);

  // Fetch banners on mount
  useEffect(() => {
    dispatch(fetchActiveBanners());
  }, [dispatch]);

  // Auto-scroll every 3 seconds
  useEffect(() => {
    if (!banners || banners.length === 0) return;

    const interval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % banners.length;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * CARD_WIDTH,
        animated: true,
      });
      setActiveIndex(nextIndex);
    }, 3000);

    return () => clearInterval(interval);
  }, [activeIndex, banners]);

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / CARD_WIDTH);
    if (index >= 0 && index < banners.length) {
      setActiveIndex(index);
    }
  };

  const handleMomentumScrollEnd = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / CARD_WIDTH);
    if (index >= 0 && index < banners.length) {
      setActiveIndex(index);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!banners || banners.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        snapToInterval={CARD_WIDTH}
        snapToAlignment="center"
        decelerationRate="fast"
        style={styles.scrollView}
      >
        {banners.map((banner) => {
          // Construct full image URL
          const imageUrl = banner.image_url?.startsWith('http') 
            ? banner.image_url 
            : `${API_BASE}${banner.image_url || ""}`;

          // Get localized text
          const getLocalizedText = (field) => {
            if (locale === 'ar' && banner[`${field}_ar`]) {
              return banner[`${field}_ar`];
            }
            if (locale === 'ku' && banner[`${field}_ku`]) {
              return banner[`${field}_ku`];
            }
            return banner[field] || "";
          };

          const title = getLocalizedText('title');
          const subtitle = getLocalizedText('subtitle');

          return (
            <Pressable key={banner.id} style={styles.bannerContainer}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.bannerImage}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.7)"]}
                style={styles.gradient}
              />
              <View style={styles.textContainer}>
                <Text style={styles.bannerTitle}>{title}</Text>
                {subtitle && (
                  <Text style={styles.bannerSubtitle}>{subtitle}</Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Pagination Dots */}
      {banners && banners.length > 1 && (
        <View style={styles.pagination}>
          {banners.map((_, index) => (
            <Pressable
              key={index}
              onPress={() => {
                scrollViewRef.current?.scrollTo({
                  x: index * CARD_WIDTH,
                  animated: true,
                });
                setActiveIndex(index);
              }}
            >
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      index === activeIndex
                        ? "#FFFFFF"
                        : "rgba(255,255,255,0.4)",
                    width: index === activeIndex ? 28 : 8,
                  },
                ]}
              />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 190,
    marginTop: 10,
    marginBottom: 20,
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: "hidden",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  scrollVieCARD_WIDTH: {
    flex: 1,
  },
  bannerContainer: {
    width: screenWidth - 40,
    height: 200,
    position: "relative",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "50%",
  },
  textContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
  },
  bannerTitle: {
    fontSize: 24,
    
    color: "#FFFFFF",
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    
    color: "#FFFFFF",
    opacity: 0.9,
  },
  pagination: {
    flexDirection: "row",
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
