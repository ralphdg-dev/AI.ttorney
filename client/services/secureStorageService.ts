import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Secure storage service following DRY principles
 * - Sensitive data (auth tokens) → SecureStore (encrypted at rest)
 * - Non-sensitive data → AsyncStorage
 */
export class SecureStorageService {
  // Secure storage for sensitive data
  static async setSecureItem(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value, {
      requireAuthentication: false, // Can be enabled for biometric protection later
    });
  }

  static async getSecureItem(key: string): Promise<string | null> {
    return await SecureStore.getItemAsync(key);
  }

  static async removeSecureItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  }

  // Regular storage for non-sensitive data  
  static async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  }

  static async getItem(key: string): Promise<string | null> {
    return await AsyncStorage.getItem(key);
  }

  static async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }
}

// Export singleton instance for easier usage
export const secureStorage = SecureStorageService;
