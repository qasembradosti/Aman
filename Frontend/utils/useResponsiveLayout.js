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
  const isLandscape = width > height;
  
  // Device type detection based on width
  const isSmallPhone = width <= 375; // iPhone SE, iPhone 12 mini
  const isMediumPhone = width > 375 && width <= 414; // iPhone XR, 11, 12, 13, 14
  const isLargePhone = width > 414 && width < 768; // iPhone Pro Max models, iPhone 15/16 Plus
  const isTablet = width >= 768; // iPad and larger tablets
  
  // Base responsive values
  const baseSpacing = {
    xs: isSmallPhone ? 8 : 12,
    sm: isSmallPhone ? 12 : 16,
    md: isSmallPhone ? 16 : isMediumPhone ? 20 : 24,
    lg: isSmallPhone ? 20 : isMediumPhone ? 24 : 28,
    xl: isSmallPhone ? 24 : isMediumPhone ? 28 : 32,
  };

  // Container padding that adapts to screen size
  const containerPadding = isTablet 
    ? (isLandscape ? 32 : 24)
    : (isSmallPhone ? 12 : 16);
  
  // Grid system
  const getGridColumns = (defaultCols = 2, landscapeCols = 3, tabletCols = 4) => {
    if (isTablet) {
      return isLandscape ? (tabletCols + 1) : tabletCols;
    }
    return isLandscape ? landscapeCols : (isSmallPhone ? Math.max(1, defaultCols - 1) : defaultCols);
  };

  // Calculate responsive card width for grids
  const getCardWidth = (columns, gap = baseSpacing.sm) => {
    const totalGapWidth = gap * (columns - 1);
    const availableWidth = width - (containerPadding * 2) - totalGapWidth;
    return Math.floor(availableWidth / columns);
  };

  // Typography scales
  const typography = {
    xs: isSmallPhone ? 10 : 11,
    sm: isSmallPhone ? 11 : 12,
    base: isSmallPhone ? 12 : 13,
    md: isSmallPhone ? 13 : 14,
    lg: isSmallPhone ? 14 : 16,
    xl: isSmallPhone ? 16 : 18,
    '2xl': isSmallPhone ? 18 : 20,
    '3xl': isSmallPhone ? 20 : 24,
    '4xl': isSmallPhone ? 24 : 28,
    '5xl': isSmallPhone ? 28 : 32,
  };

  // Touch target sizes (minimum 44px for accessibility)
  const touchTargets = {
    sm: isSmallPhone ? 36 : 40,
    md: isSmallPhone ? 40 : 44,
    lg: isSmallPhone ? 44 : 48,
    xl: isSmallPhone ? 48 : 56,
  };

  // Border radius scales
  const borderRadius = {
    sm: isTablet ? 8 : 6,
    md: isTablet ? 12 : 8,
    lg: isTablet ? 16 : 12,
    xl: isTablet ? 20 : 16,
  };

  // Icon sizes
  const iconSizes = {
    xs: isSmallPhone ? 14 : 16,
    sm: isSmallPhone ? 16 : 18,
    md: isSmallPhone ? 18 : 20,
    lg: isSmallPhone ? 20 : 24,
    xl: isSmallPhone ? 24 : 28,
    '2xl': isSmallPhone ? 28 : 32,
  };

  return {
    // Screen info
    width,
    height,
    isLandscape,
    isSmallPhone,
    isMediumPhone,
    isLargePhone,
    isTablet,
    
    // Layout helpers
    containerPadding,
    spacing: baseSpacing,
    getGridColumns,
    getCardWidth,
    
    // Design tokens
    typography,
    touchTargets,
    borderRadius,
    iconSizes,
    
    // Common responsive values
    headerHeight: isTablet ? 64 : 56,
    tabBarHeight: isSmallPhone ? 60 : 65,
    
    // Helper functions
    scale: (size) => isSmallPhone ? size * 0.9 : isTablet ? size * 1.1 : size,
    moderateScale: (size, factor = 0.5) => size + (isSmallPhone ? -2 : isTablet ? 2 : 0) * factor,
  };
};

export default useResponsiveLayout;