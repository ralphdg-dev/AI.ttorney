import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Automatically detects the local development server IP address
 * Works across different network configurations without manual updates
 */
export class NetworkConfig {
  private static cachedIP: string | null = null;
  private static readonly DEFAULT_PORT = '8000';
  
  /**
   * Get the current development server URL with automatic IP detection
   */
  static getApiUrl(): string {
    // Check environment variable first (production/manual override)
    const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envApiUrl) {
      return envApiUrl;
    }

    // For development, auto-detect the IP
    const detectedIP = this.getLocalIP();
    return `http://${detectedIP}:${this.DEFAULT_PORT}`;
  }

  /**
   * Automatically detect the local IP address using Expo's manifest
   */
  private static getLocalIP(): string {
    if (this.cachedIP) {
      return this.cachedIP;
    }

    try {
      // Method 1: Use Expo's debugger host (most reliable)
      const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
      if (debuggerHost) {
        // Extract IP from debuggerHost (format: "192.168.1.100:19000")
        const ip = debuggerHost.split(':')[0];
        if (this.isValidIP(ip)) {
          this.cachedIP = ip;
          console.log(`📡 Auto-detected IP from Expo manifest: ${ip}`);
          return ip;
        }
      }

      // Method 2: Use Expo's manifest URL (alternative approach)
      const manifestUrl = Constants.manifest2?.extra?.expoClient?.hostUri;
      if (manifestUrl) {
        const ip = manifestUrl.split(':')[0];
        if (this.isValidIP(ip)) {
          this.cachedIP = ip;
          console.log(`📡 Auto-detected IP from manifest URL: ${ip}`);
          return ip;
        }
      }

      // Method 3: Platform-specific fallbacks
      if (Platform.OS === 'ios') {
        // iOS Simulator typically uses localhost
        return 'localhost';
      } else if (Platform.OS === 'android') {
        // Android Emulator uses 10.0.2.2 to access host machine
        return '10.0.2.2';
      }

      // Method 4: Common development IPs (last resort)
      const commonIPs = [
        '192.168.1.100',   // Common router IP range
        '192.168.0.100',   // Alternative router IP range
        '192.168.68.102',  // Current network (fallback)
        '10.0.1.100',      // Corporate network range
        'localhost'        // Local development
      ];

      for (const ip of commonIPs) {
        console.log(`🔍 Trying fallback IP: ${ip}`);
        return ip; // Return first available (we'll test connectivity separately)
      }

      // Final fallback
      return 'localhost';

    } catch (error) {
      console.warn('⚠️ Failed to auto-detect IP, using localhost:', error);
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
   * Test connectivity to the API server
   */
  static async testConnectivity(url?: string): Promise<boolean> {
    const testUrl = url || this.getApiUrl();
    
    try {
      console.log(`🔍 Testing connectivity to: ${testUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${testUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`✅ Successfully connected to: ${testUrl}`);
        return true;
      } else {
        console.log(`❌ Server responded with error: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Failed to connect to ${testUrl}:`, error);
      return false;
    }
  }

  /**
   * Get the best available API URL by testing multiple options
   */
  static async getBestApiUrl(): Promise<string> {
    const primaryUrl = this.getApiUrl();
    
    // Test primary URL first
    if (await this.testConnectivity(primaryUrl)) {
      return primaryUrl;
    }

    // If primary fails, try alternative IPs
    const alternativeIPs = [
      '192.168.1.100',
      '192.168.0.100', 
      '192.168.68.102',
      '10.0.1.100',
      'localhost'
    ];

    for (const ip of alternativeIPs) {
      const testUrl = `http://${ip}:${this.DEFAULT_PORT}`;
      if (await this.testConnectivity(testUrl)) {
        // Cache the working IP
        this.cachedIP = ip;
        return testUrl;
      }
    }

    // Return primary URL as fallback (let the app handle the error)
    console.warn('⚠️ No working API server found, using primary URL');
    return primaryUrl;
  }

  /**
   * Clear cached IP (useful for network changes)
   */
  static clearCache(): void {
    this.cachedIP = null;
    console.log('🧹 Cleared IP cache');
  }

  /**
   * Get network info for debugging
   */
  static getNetworkInfo(): object {
    return {
      cachedIP: this.cachedIP,
      detectedIP: this.getLocalIP(),
      apiUrl: this.getApiUrl(),
      platform: Platform.OS,
      expoConfig: {
        hostUri: Constants.expoConfig?.hostUri,
        debuggerHost: Constants.manifest?.debuggerHost,
        manifestUrl: Constants.manifest2?.extra?.expoClient?.hostUri,
      }
    };
  }
}
