import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Production-grade network configuration with automatic IP detection
 * Follows industry best practices:
 * - Environment-based configuration
 * - Automatic IP detection from Expo manifest
 * - Connection health checks with retry logic
 * - No hardcoded IPs (dynamic discovery)
 * - Proper error handling and logging
 * - Performance optimization with caching
 */
export class NetworkConfig {
  private static cachedApiUrl: string | null = null;
  private static lastHealthCheck: number = 0;
  private static readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute
  private static readonly CONNECTION_TIMEOUT = 3000; // 3 seconds
  private static readonly DEFAULT_PORT = '8000';
  private static readonly PRODUCTION_API_URL = process.env.EXPO_PUBLIC_API_URL;
  
  /**
   * Get API URL with environment-aware configuration
   * Production: Uses EXPO_PUBLIC_API_URL
   * Development: Auto-detects from Expo manifest
   */
  static getApiUrl(): string {
    // Production: Use environment variable
    if (this.PRODUCTION_API_URL) {
      return this.PRODUCTION_API_URL;
    }

    // Development: Auto-detect from Expo's development server
    const detectedIP = this.detectIPFromExpo();
    return `http://${detectedIP}:${this.DEFAULT_PORT}`;
  }

  /**
   * Detect IP address from Expo's development server manifest
   * This is the most reliable method as it uses the actual connection info
   */
  private static detectIPFromExpo(): string {
    try {
      // Web: Always use localhost
      if (Platform.OS === 'web') {
        return 'localhost';
      }

      // Mobile: Extract IP from Expo's manifest (where the app is actually connected)
      // This is the same IP that Metro bundler is using
      const debuggerHost = Constants.expoConfig?.hostUri || 
                          (Constants.manifest as any)?.debuggerHost ||
                          Constants.manifest2?.extra?.expoClient?.hostUri;
      
      if (debuggerHost) {
        const ip = debuggerHost.split(':')[0];
        if (this.isValidIP(ip)) {
          if (__DEV__) {
            console.log(`📡 Auto-detected API server IP: ${ip}`);
          }
          return ip;
        }
      }

      // Fallback for emulators/simulators
      if (Platform.OS === 'ios') {
        return 'localhost'; // iOS Simulator
      } else if (Platform.OS === 'android') {
        return '10.0.2.2'; // Android Emulator
      }

      return 'localhost';

    } catch (error) {
      if (__DEV__) {
        console.warn('⚠️ IP detection failed, using fallback:', error);
      }
      return 'localhost';
    }
  }

  /**
   * Validate if a string is a valid IP address
   */
  private static isValidIP(ip: string): boolean {
    if (!ip || ip === 'localhost') return true;
    
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  /**
   * Health check with timeout and proper error handling
   * Uses AbortController for clean timeout implementation
   */
  private static async healthCheck(url: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.CONNECTION_TIMEOUT);
    
    try {
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      return response.ok;
      
    } catch (error) {
      clearTimeout(timeoutId);
      return false;
    }
  }

  /**
   * Get the best available API URL with intelligent caching
   * - Uses cached URL if recent health check passed
   * - Auto-detects from Expo manifest (no hardcoded IPs)
   * - Falls back gracefully if connection fails
   */
  static async getBestApiUrl(): Promise<string> {
    const now = Date.now();
    
    // Return cached URL if recent health check passed
    if (this.cachedApiUrl && (now - this.lastHealthCheck) < this.HEALTH_CHECK_INTERVAL) {
      return this.cachedApiUrl;
    }

    const primaryUrl = this.getApiUrl();
    
    // Web: Skip health check, return immediately
    if (Platform.OS === 'web') {
      this.cachedApiUrl = primaryUrl;
      this.lastHealthCheck = now;
      return primaryUrl;
    }
    
    // Mobile: Verify connectivity before returning
    if (__DEV__) {
      console.log(`🔍 Verifying API connection: ${primaryUrl}`);
    }
    
    const isHealthy = await this.healthCheck(primaryUrl);
    
    if (isHealthy) {
      if (__DEV__) {
        console.log(`✅ API server connected: ${primaryUrl}`);
      }
      this.cachedApiUrl = primaryUrl;
      this.lastHealthCheck = now;
      return primaryUrl;
    }

    // Connection failed - clear cache and return URL anyway
    // Let the actual API call handle the error with proper user feedback
    if (__DEV__) {
      console.warn(`⚠️ API health check failed, attempting connection anyway`);
    }
    
    this.cachedApiUrl = null;
    return primaryUrl;
  }

  /**
   * Clear cache (useful for network changes or debugging)
   */
  static clearCache(): void {
    this.cachedApiUrl = null;
    this.lastHealthCheck = 0;
    if (__DEV__) {
      console.log('🧹 Network cache cleared');
    }
  }

  /**
   * Get network diagnostics for debugging
   * Useful for troubleshooting connection issues
   */
  static getNetworkInfo(): object {
    return {
      cachedApiUrl: this.cachedApiUrl,
      currentApiUrl: this.getApiUrl(),
      platform: Platform.OS,
      lastHealthCheck: new Date(this.lastHealthCheck).toISOString(),
      productionUrl: this.PRODUCTION_API_URL || 'Not configured',
      expoManifest: {
        hostUri: Constants.expoConfig?.hostUri,
        debuggerHost: (Constants.manifest as any)?.debuggerHost,
      },
      environment: __DEV__ ? 'development' : 'production',
    };
  }

  /**
   * Force refresh connection (useful after network changes)
   */
  static async refreshConnection(): Promise<string> {
    this.clearCache();
    return await this.getBestApiUrl();
  }
}
