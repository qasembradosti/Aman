import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/apiService';
import { getProductImageUrl } from '../../utils/productImages';

export default function BrandProductsScreen() {
  const { id, name } = useLocalSearchParams();
  const [brand, setBrand] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchBrandProducts();
  }, [id]);

  const fetchBrandProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/brands/${id}/products`);
      setBrand(response.data.brand);
      setProducts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching brand products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductPress = (product) => {
    router.push({
      pathname: '/product/[id]',
      params: { id: product.id }
    });
  };

  const renderProductItem = ({ item }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => handleProductPress(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ 
          uri: getProductImageUrl(item, 'https://via.placeholder.com/150')
        }}
        style={styles.productImage}
        resizeMode="cover"
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.productPrice}>
          ${item.sell_price || item.base_price}
        </Text>
        {!item.in_stock && (
          <Text style={styles.outOfStock}>Out of Stock</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: name || 'Brand Products',
          headerBackTitle: 'Back',
        }}
      />
      <View style={styles.container}>
        {/* Brand Header */}
        {brand && (
          <View style={styles.brandHeader}>
            {brand.logo_url && (
              <Image
                source={{ uri: brand.logo_url }}
                style={styles.brandLogo}
                resizeMode="contain"
              />
            )}
            <Text style={styles.brandName}>{brand.name}</Text>
            {brand.description && (
              <Text style={styles.brandDescription}>{brand.description}</Text>
            )}
            {brand.website && (
              <TouchableOpacity style={styles.websiteButton}>
                <Ionicons name="globe-outline" size={16} color="#007AFF" />
                <Text style={styles.websiteText}>Visit Website</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Products List */}
        <FlatList
          data={products}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No products available</Text>
            </View>
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandHeader: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  brandLogo: {
    width: 100,
    height: 100,
    marginBottom: 12,
  },
  brandName: {
    fontSize: 24,
    color: '#333',
    marginBottom: 8,
  },
  brandDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  websiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  websiteText: {
    fontSize: 14,
    color: '#007AFF',
  },
  listContainer: {
    padding: 12,
  },
  row: {
    justifyContent: 'space-between',
  },
  productCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: '48%',
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#f9f9f9',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 16,
    color: '#007AFF',
  },
  outOfStock: {
    fontSize: 12,
    color: '#ff3b30',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});
