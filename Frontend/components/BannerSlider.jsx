import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Text } from "./ui/Text";
import { useTheme } from "../utils/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { useDispatch, useSelector } from "react-redux";
import { fetchActiveBanners } from "../store/slices/bannersSlice";
import { getApiBaseUrl } from "../utils/apiConfig";
import { useLanguage } from "../utils/LanguageContext";
import { useResponsiveLayout } from "../utils/useResponsiveLayout";

const API_BASE = getApiBaseUrl();

export default function BannerSlider() {
  const { theme, isDark } = useTheme();
  const { isRTL } = useLanguage();
  const layout = useResponsiveLayout();
  const dispatch = useDispatch();
  const { banners, loading } = useSelector((state) => state.banners);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef(null);
  const sidePadding = layout.isTablet ? layout.horizontalPadding : 20;
  const cardGap = layout.isTablet ? (layout.isLandscape ? 20 : 18) : 14;
  const cardWidth = layout.isTablet
    ? Math.min(
        layout.width - sidePadding * 2,
        layout.isLandscape ? 940 : layout.isSmallTablet ? 720 : 820,
      )
    : layout.width - sidePadding * 2 - 18;
  const snapInterval = cardWidth + cardGap;
  const cardHeight = layout.isTablet
    ? layout.isLandscape
      ? 340
      : 300
    : 238;
  const cardRadius = layout.isTablet ? 34 : 28;

  useEffect(() => {
    dispatch(fetchActiveBanners());
  }, [dispatch]);

  useEffect(() => {
    if (!banners || banners.length <= 1) return;

    const interval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % banners.length;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * snapInterval,
        animated: true,
      });
      setActiveIndex(nextIndex);
    }, 4500);

    return () => clearInterval(interval);
  }, [activeIndex, banners, snapInterval]);

  const moveToSlide = (index) => {
    scrollViewRef.current?.scrollTo({
      x: index * snapInterval,
      animated: true,
    });
    setActiveIndex(index);
  };

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / snapInterval);
    if (index >= 0 && index < banners.length) {
      setActiveIndex(index);
    }
  };

  if (loading) {
    return (
      <View style={styles.outer}>
        <View
          style={[
            styles.loadingCard,
            {
              height: cardHeight,
              marginHorizontal: sidePadding,
              borderRadius: cardRadius,
            },
            {
              backgroundColor: theme.colors.card,
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(15,23,42,0.08)",
            },
          ]}
        >
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (!banners || banners.length === 0) {
    return null;
  }

  return (
    <View style={styles.outer}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToInterval={snapInterval}
        decelerationRate="fast"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: sidePadding },
        ]}
        style={styles.scrollView}
      >
        {banners.map((banner, index) => {
          const imageUrl = banner.image_url?.startsWith("http")
            ? banner.image_url
            : `${API_BASE}${banner.image_url || ""}`;

          return (
            <Pressable
              key={banner.id}
              style={({ pressed }) => [
                styles.bannerCard,
                {
                  width: cardWidth,
                  height: cardHeight,
                  borderRadius: cardRadius,
                  marginRight: index === banners.length - 1 ? 0 : cardGap,
                  opacity: pressed ? 0.96 : 1,
                },
              ]}
            >
              <Image
                source={{ uri: imageUrl }}
                style={styles.bannerImage}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />

              <LinearGradient
                colors={[
                  "rgba(255, 117, 31, 0.08)",
                  "rgba(15, 23, 42, 0.18)",
                  "rgba(15, 23, 42, 0.9)",
                ]}
                style={styles.gradient}
              />

              <LinearGradient
                colors={["rgba(255,255,255,0.22)", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.topGlow}
              />
            </Pressable>
          );
        })}
      </ScrollView>

      {banners.length > 1 ? (
        <View
          style={[
            styles.paginationRow,
            { marginHorizontal: sidePadding },
            { flexDirection: isRTL ? "row-reverse" : "row" },
          ]}
        >
          <View
            style={[
              styles.paginationDots,
              { flexDirection: isRTL ? "row-reverse" : "row" },
            ]}
          >
            {banners.map((_, index) => (
              <Pressable key={index} onPress={() => moveToSlide(index)}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        index === activeIndex
                          ? theme.colors.primary
                          : isDark
                            ? "rgba(255,255,255,0.18)"
                            : "rgba(15,23,42,0.12)",
                      width: index === activeIndex ? (layout.isTablet ? 30 : 26) : 8,
                    },
                  ]}
                />
              </Pressable>
            ))}
          </View>

          <Text
            style={[
              styles.paginationCount,
              { fontSize: layout.isTablet ? 13 : 12 },
              { color: theme.colors.textSecondary },
            ]}
          >
            {String(activeIndex + 1).padStart(2, "0")} /{" "}
            {String(banners.length).padStart(2, "0")}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginTop: 14,
    marginBottom: 24,
  },
  scrollView: {
    overflow: "visible",
  },
  scrollContent: {
  },
  loadingCard: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  bannerCard: {
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
    backgroundColor: "#0F172A",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "58%",
  },
  bannerTopRow: {
    position: "absolute",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  heroPillText: {
    color: "#fff",
    fontSize: 11,
    letterSpacing: 0.2,
  },
  slideCounter: {
    minWidth: 40,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  slideCounterText: {
    color: "#fff",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  copyPanel: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 18,
    padding: 18,
    borderRadius: 24,
    backgroundColor: "rgba(12,18,28,0.46)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  copyAccent: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#ffb26b",
    marginBottom: 12,
  },
  bannerTitle: {
    color: "#fff",
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.7,
  },
  bannerSubtitle: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  paginationRow: {
    marginTop: 14,
    alignItems: "center",
    justifyContent: "space-between",
  },
  paginationDots: {
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 999,
  },
  paginationCount: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
