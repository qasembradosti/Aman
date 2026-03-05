import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function BrandsList({ brands = [] }) {
  const router = useRouter();

  const handleBrandPress = (brand) => {
    router.push(`/products?brand=${brand.id}`);
  };

  const handleSeeAll = () => {
    router.push("/brands");
  };

  const renderBrandItem = ({ item }) => (
    <TouchableOpacity
      style={styles.brandItem}
      onPress={() => handleBrandPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.logoContainer}>
        {item.logo_url ? (
          <Image
            source={{ uri: item.logo_url }}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.placeholderLogo}>
            <Ionicons name="business-outline" size={24} color="#999" />
          </View>
        )}
      </View>
      <Text style={styles.brandName} numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  if (!brands || brands.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shop by Brand</Text>
        <TouchableOpacity onPress={handleSeeAll}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={brands}
        renderItem={renderBrandItem}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    color: "#333",
  },
  seeAllText: {
    fontSize: 14,
    color: "#007AFF",
  },
  listContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  brandItem: {
    alignItems: "center",
    marginRight: 16,
    width: 80,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  brandLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  placeholderLogo: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  brandName: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    maxWidth: 80,
  },
});
