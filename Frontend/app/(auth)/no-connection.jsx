import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { Wifi } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function NoConnectionScreen() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const state = await NetInfo.fetch();
      if (state.isConnected) {
        // Connection restored, navigate back or to login
        router.replace('/(auth)/login');
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Check connection periodically every 3 seconds
    const interval = setInterval(() => {
      NetInfo.fetch().then(state => {
        if (state.isConnected) {
          router.replace('/(auth)/login');
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [router]);

  return (
    <LinearGradient
      colors={['#ee7301ff', '#ff9c2e']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.decorationTop} />
      <View style={styles.decorationBottom} />

      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Wifi size={80} color="#ffffff" strokeWidth={1.5} />
        </View>

        {/* Title */}
        <Text style={styles.title}>No Internet Connection</Text>

        {/* Message */}
        <Text style={styles.message}>
          Please check your internet connection and try again.
        </Text>

        {/* Retry Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={checkConnection}
          disabled={isChecking}
        >
          {isChecking ? (
            <ActivityIndicator color="#ee7301ff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Retry</Text>
          )}
        </TouchableOpacity>

        {/* Auto-checking indicator */}
        <Text style={styles.autoCheckText}>
          Automatically checking connection...
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  decorationTop: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorationBottom: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    marginBottom: 40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginBottom: 30,
    minWidth: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    color: '#ee7301ff',
  },
  autoCheckText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
  },
});
