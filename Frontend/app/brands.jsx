import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import api from '../services/apiService';
import { getApiBaseUrl } from '../utils/apiConfig';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 40) / 2;

export default function BrandsScreen() {
  const [brands, setBrands] = useState([]);
  const [filteredBrands, setFilteredBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const API_BASE_URL = getApiBaseUrl();

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = brands.filter(brand =>
        brand.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredBrands(filtered);
    } else {
      setFilteredBrands(brands);
    }
  }, [searchQuery, brands]);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/brands', {
        params: { is_active: 'true' }
      });
      const brandsData = response.data.data || [];
      setBrands(brandsData);
      setFilteredBrands(brandsData);
    } catch (error) {
      console.error('Error fetching brands:', error);
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
            width: CARD_WIDTH,
            marginLeft: index % 2 === 0 ? 0 : 8,
            marginRight: index % 2 === 0 ? 8 : 0,
          }
        ]}
        onPress={() => handleBrandPress(item)}
        activeOpacity={0.85}
      >
        <View style={[styles.logoSection, { backgroundColor: theme.colors.background + 'CC' }]}>
          {brandImage ? (
            <Image
              source={{ uri: brandImage }}
              style={styles.brandLogo}
              contentFit="contain"
              transition={300}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.placeholderLogo}>
              <Ionicons name="storefront-outline" size={48} color={theme.colors.textSecondary} />
            </View>
          )}
        </View>
        
        <View style={styles.contentSection}>
          <View style={styles.textWrapper}>
            <Text style={[styles.brandName, { color: theme.colors.text }]} numberOfLines={2}>
              {item.name}
            </Text>
            {item.description && (
              <Text style={[styles.brandDescription, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
          
          <View style={[styles.viewButton, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary + '30' }]}>
            <Text style={[styles.viewButtonText, { color: theme.colors.primary }]}>
              {t('view') || 'View'}
            </Text>
            <Ionicons 
              name={isRTL ? "chevron-back" : "chevron-forward"} 
              size={16} 
              color={theme.colors.primary} 
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            {t('loading') || 'Loading brands...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Modern Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: theme.colors.background + 'AA' }]}
        >
          <Ionicons
            name={isRTL ? "arrow-forward" : "arrow-back"}
            size={22}
            color={theme.colors.text}
          />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {t("brands") || "All Brands"}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            {filteredBrands.length} {t('available') || 'available'}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Enhanced Search Bar */}
      <View style={styles.searchSection}>
        <View style={[styles.searchContainer, { backgroundColor: theme.colors.card }]}>
          <View style={[styles.searchIconWrapper, { backgroundColor: theme.colors.primary + '15' }]}>
            <Ionicons name="search" size={18} color={theme.colors.primary} />
          </View>
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder={t('searchBrands') || 'Search for brands...'}
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            selectionColor={theme.colors.primary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Brands Grid */}
      <FlatList
        data={filteredBrands}
        renderItem={renderBrandItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyCircle, { backgroundColor: theme.colors.primary + '10' }]}>
              <Ionicons 
                name={searchQuery ? "search-outline" : "storefront-outline"} 
                size={64} 
                color={theme.colors.primary} 
              />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              {searchQuery ? t('noBrandsFound') || 'No Brands Found' : t('noBrands') || 'No Brands Yet'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              {searchQuery 
                ? t('tryDifferentSearch') || 'Try a different search term or browse all brands'
                : t('checkBackLater') || 'Check back soon for exciting new brands'
              }
            </Text>
            {searchQuery && (
              <TouchableOpacity 
                style={[styles.resetButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => setSearchQuery('')}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.resetButtonText}>{t('showAll') || 'Show All Brands'}</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  // Modern Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  headerRight: {
    width: 40,
  },
  // Enhanced Search
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  searchIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  // Brand Cards
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  brandCard: {
    borderRadius: 18,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  logoSection: {
    width: '100%',
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  brandLogo: {
    width: '85%',
    height: '85%',
  },
  placeholderLogo: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentSection: {
    padding: 16,
    paddingTop: 14,
  },
  textWrapper: {
    marginBottom: 14,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  brandDescription: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '400',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
    letterSpacing: 0.2,
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
    paddingHorizontal: 40,
  },
  emptyCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
    fontWeight: '400',
  },
  resetButton: {
    marginTop: 28,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
