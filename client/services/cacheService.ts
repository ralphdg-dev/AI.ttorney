// Simple cache service replacement
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

export class CacheService {
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  static async get<T>(key: string): Promise<T | null> {
    try {
      const item = await AsyncStorage.getItem(key);
      if (!item) return null;

      const parsed: CacheItem<T> = JSON.parse(item);
      
      // Check if expired
      if (Date.now() > parsed.expiry) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  static async set<T>(key: string, data: T, ttl: number = CacheService.DEFAULT_TTL): Promise<void> {
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + ttl,
      };

      await AsyncStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  static async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Cache remove error:', error);
    }
  }

  static async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  static async clearExpired(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const now = Date.now();

      for (const key of keys) {
        const item = await AsyncStorage.getItem(key);
        if (item) {
          try {
            const parsed: CacheItem<any> = JSON.parse(item);
            if (now > parsed.expiry) {
              await AsyncStorage.removeItem(key);
            }
          } catch {
            // Invalid format, remove it
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Cache clearExpired error:', error);
    }
  }

  static async isConnected(): Promise<boolean> {
    try {
      const netInfo = await NetInfo.fetch();
      return netInfo.isConnected ?? false;
    } catch (error) {
      console.error('Network check error:', error);
      return false;
    }
  }
}

export const generateGlossaryCacheKey = (
  page: number,
  category: string = 'all',
  search: string = ''
): string => {
  return `glossary_${category}_${search}_${page}`;
};
