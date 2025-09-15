import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const CACHE_PREFIX = 'glossary_cache_';
const CACHE_DURATION = 24 * 60 * 60 * 1000;

export interface CacheData {
  data: any;
  timestamp: number;
  expiresAt: number;
}

export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!cached) return null;

      const cacheData: CacheData = JSON.parse(cached);
      
      if (Date.now() > cacheData.expiresAt) {
        await this.remove(key);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  static async set(key: string, data: any, duration: number = CACHE_DURATION): Promise<void> {
    try {
      const cacheData: CacheData = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + duration
      };
      
      await AsyncStorage.setItem(
        `${CACHE_PREFIX}${key}`,
        JSON.stringify(cacheData)
      );
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  static async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
    } catch (error) {
      console.error('Cache remove error:', error);
    }
  }

  static async clearExpired(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      
      for (const key of cacheKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const cacheData: CacheData = JSON.parse(cached);
          if (Date.now() > cacheData.expiresAt) {
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Clear expired cache error:', error);
    }
  }

  static async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Clear all cache error:', error);
    }
  }

  static async isConnected(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  }

  static async getAllKeys(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return keys.filter(key => key.startsWith(CACHE_PREFIX));
    } catch (error) {
      console.error('Get all keys error:', error);
      return [];
    }
  }
}

export const generateGlossaryCacheKey = (
  page: number,
  category: string,
  search: string
): string => {
  const normalizedCategory = category.toLowerCase().replace(/\s+/g, '_');
  const normalizedSearch = search.toLowerCase().trim().replace(/\s+/g, '_');
  return `terms_page_${page}_category_${normalizedCategory}_search_${normalizedSearch}`;
};

export const generateTermCacheKey = (termId: string): string => {
  return `term_${termId}`;
};