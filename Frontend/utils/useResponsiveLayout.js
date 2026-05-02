import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';

/**
 * Custom hook for responsive layout calculations
 * Provides device type detection and responsive values for components
 */
export const useResponsiveLayout = () => {
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const { width, height } = dimensions;
  const shortEdge = Math.min(width, height);
  const longEdge = Math.max(width, height);
  const isLandscape = width > height;
  
  // Tablet detection uses the short edge so iPad mini portrait sizes are included.
  const isTablet = shortEdge >= 700;
  const isSmallTablet = isTablet && shortEdge < 820;
  const isLargeTablet = isTablet && shortEdge >= 1024;
  const isSmallPhone = !isTablet && shortEdge <= 375; // iPhone SE, iPhone 12 mini
  const isMediumPhone = !isTablet && shortEdge > 375 && shortEdge <= 414; // iPhone XR, 11, 12, 13, 14
  const isLargePhone = !isTablet && shortEdge > 414; // iPhone Pro Max models, iPhone 15/16 Plus
  
  // Base responsive values
  const baseSpacing = {
    xs: isTablet ? 12 : isSmallPhone ? 8 : 12,
    sm: isTablet ? 16 : isSmallPhone ? 12 : 16,
    md: isTablet ? (isLandscape ? 24 : 22) : isSmallPhone ? 16 : isMediumPhone ? 20 : 24,
    lg: isTablet ? (isLandscape ? 28 : 26) : isSmallPhone ? 20 : isMediumPhone ? 24 : 28,
    xl: isTablet ? (isLandscape ? 32 : 30) : isSmallPhone ? 24 : isMediumPhone ? 28 : 32,
  };

  // Container padding that adapts to screen size
  const containerPadding = isTablet 
    ? (isLandscape ? (isLargeTablet ? 36 : 32) : (isSmallTablet ? 22 : 26))
    : (isSmallPhone ? 12 : 16);
  const cardGap = isTablet ? (isLandscape ? 20 : 16) : (isSmallPhone ? 8 : 12);
  
  // Grid system
  const getGridColumns = (
    defaultCols = 2,
    landscapeCols = 3,
    tabletCols = 4,
    largeTabletCols = tabletCols + 1,
  ) => {
    if (isTablet) {
      if (isLandscape) {
        return isLargeTablet ? largeTabletCols : Math.max(4, tabletCols);
      }
      return isSmallTablet ? Math.max(3, tabletCols - 1) : tabletCols;
    }
    return isLandscape ? landscapeCols : (isSmallPhone ? Math.max(1, defaultCols - 1) : defaultCols);
  };

  // Calculate responsive card width for grids
  const getCardWidth = (columns, gap = cardGap) => {
    const totalGapWidth = gap * (columns - 1);
    const availableWidth = width - (containerPadding * 2) - totalGapWidth;
    return Math.floor(availableWidth / columns);
  };

  const defaultColumns = getGridColumns();
  const defaultCardWidth = getCardWidth(defaultColumns);

  // Typography scales
  const typography = {
    xs: isTablet ? 12 : isSmallPhone ? 10 : 11,
    sm: isTablet ? 13 : isSmallPhone ? 11 : 12,
    base: isTablet ? 14 : isSmallPhone ? 12 : 13,
    md: isTablet ? 16 : isSmallPhone ? 13 : 14,
    lg: isTablet ? 18 : isSmallPhone ? 14 : 16,
    xl: isTablet ? 20 : isSmallPhone ? 16 : 18,
    '2xl': isTablet ? 24 : isSmallPhone ? 18 : 20,
    '3xl': isTablet ? 28 : isSmallPhone ? 20 : 24,
    '4xl': isTablet ? 32 : isSmallPhone ? 24 : 28,
    '5xl': isTablet ? 36 : isSmallPhone ? 28 : 32,
  };

  // Touch target sizes (minimum 44px for accessibility)
  const touchTargets = {
    sm: isTablet ? 40 : isSmallPhone ? 36 : 40,
    md: isTablet ? 46 : isSmallPhone ? 40 : 44,
    lg: isTablet ? 52 : isSmallPhone ? 44 : 48,
    xl: isTablet ? 60 : isSmallPhone ? 48 : 56,
  };

  // Border radius scales
  const borderRadius = {
    sm: isTablet ? 10 : 6,
    md: isTablet ? 14 : 8,
    lg: isTablet ? 18 : 12,
    xl: isTablet ? 24 : 16,
  };

  // Icon sizes
  const iconSizes = {
    xs: isTablet ? 18 : isSmallPhone ? 14 : 16,
    sm: isTablet ? 20 : isSmallPhone ? 16 : 18,
    md: isTablet ? 22 : isSmallPhone ? 18 : 20,
    lg: isTablet ? 26 : isSmallPhone ? 20 : 24,
    xl: isTablet ? 30 : isSmallPhone ? 24 : 28,
    '2xl': isTablet ? 34 : isSmallPhone ? 28 : 32,
  };

  return {
    // Screen info
    width,
    height,
    shortEdge,
    longEdge,
    isLandscape,
    isSmallPhone,
    isMediumPhone,
    isLargePhone,
    isTablet,
    isSmallTablet,
    isLargeTablet,
    
    // Layout helpers
    containerPadding,
    horizontalPadding: containerPadding,
    spacing: baseSpacing,
    cardGap,
    getGridColumns,
    getCardWidth,
    cardWidth: defaultCardWidth,
    
    // Design tokens
    typography,
    touchTargets,
    borderRadius,
    iconSizes,
    
    // Common responsive values
    headerHeight: isTablet ? 72 : 56,
    tabBarHeight: isTablet ? 70 : isSmallPhone ? 60 : 65,
    sectionBannerOffset: isTablet ? (isLandscape ? 96 : 88) : 70,
    categoryIconSize: isTablet ? 28 : isSmallPhone ? 20 : 24,
    categoryCardWidth: isTablet ? (isSmallTablet ? 96 : 108) : isSmallPhone ? 70 : 80,
    categoryIconContainerSize: isTablet ? (isSmallTablet ? 60 : 68) : isSmallPhone ? 45 : 50,
    walletPadding: isTablet ? 20 : isSmallPhone ? 12 : 16,
    walletActionButtonSize: isTablet ? 50 : isSmallPhone ? 40 : 44,
    sectionTitleSize: isTablet ? 22 : isSmallPhone ? 16 : 18,
    productNameSize: isTablet ? 15 : isSmallPhone ? 12 : 13,
    productPriceSize: isTablet ? 18 : isSmallPhone ? 14 : 16,
    walletBalanceSize: isTablet ? 32 : isSmallPhone ? 24 : 28,
    
    // Helper functions
    scale: (size) => {
      if (isSmallPhone) return size * 0.9;
      if (isTablet) return size * (isLargeTablet ? 1.16 : 1.08);
      return size;
    },
    moderateScale: (size, factor = 0.5) => {
      const delta = isSmallPhone ? -2 : isTablet ? (isLargeTablet ? 4 : 2) : 0;
      return size + delta * factor;
    },
  };
};

export default useResponsiveLayout;
