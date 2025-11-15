import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Alert, Linking, Platform, ScrollView, Keyboard, Dimensions } from 'react-native';
import * as Location from 'expo-location';
import { NetworkConfig } from '../../../utils/networkConfig';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button/';
import { Box } from '@/components/ui/box';
import { Pressable } from '@/components/ui/pressable';
import { Spinner } from '@/components/ui/spinner';
import UnifiedSearchBar from '@/components/common/UnifiedSearchBar';
import { 
  Phone, 
  Navigation, 
  MapPin, 
  Star, 
  AlertCircle, 
  Map,
  ArrowLeft,
  Smartphone,
  Locate
} from 'lucide-react-native';
import Colors from '../../../constants/Colors';
import { shadowPresets, createShadowStyle } from '../../../utils/shadowUtils';

// Constants
const CONSTANTS = {
  DEFAULT_LOCATION: { lat: 14.5995, lng: 120.9842 } as { lat: number; lng: number },
  MAP_HEIGHT: 320,
  SEARCH_RADIUS: 10000, // 10km in meters
  ZOOM_LEVELS: {
    OVERVIEW: 12,
    FOCUSED: 16,
    MAX_ZOOM: 18
  },
  TIMEOUTS: {
    LOCATION: 10000, // 10 seconds
    API_REQUEST: 15000 // 15 seconds
  }
};

// Error messages
const ERROR_MESSAGES = {
  LOCATION_DENIED: 'Location access denied. Showing law firms near Manila.',
  API_KEY_MISSING: 'Google Maps API Key Required',
  API_KEY_INVALID: 'Google Maps API key is invalid or has restrictions.',
  NETWORK_ERROR: 'Network error occurred. Please check your connection.',
  LOADING_TIMEOUT: 'Request timed out. Please try again.',
  NO_RESULTS: 'No law firms found in this area. Try adjusting your search or location.'
} as const;

// Platform-specific WebView import with fallback
let WebView: any = null;

interface LawFirm {
  id: string;
  name: string;
  address: string;
  phone?: string;
  rating?: number;
  user_ratings_total?: number;
  types: string[];
  latitude: number;
  longitude: number;
  place_id: string;
  distance_km?: number;
}

interface AutocompletePrediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  types: string[];
}

interface ScreenSize {
  width: number;
  height: number;
  isSmall: boolean;
  isMedium: boolean;
  isLarge: boolean;
}

interface LawFirmsMapViewProps {
  searchQuery?: string;
  cache?: {
    get: (location: string, radius: number) => any;
    set: (location: string, radius: number, results: any) => void;
    clear: () => void;
    getStats: () => any;
  };
}

export default function LawFirmsMapView({ searchQuery, cache }: LawFirmsMapViewProps) {
  const [lawFirms, setLawFirms] = useState<LawFirm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [mapCenter, setMapCenter] = useState(CONSTANTS.DEFAULT_LOCATION);
  const [webViewSupported, setWebViewSupported] = useState(false);
  const [isExpoGo, setIsExpoGo] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const [selectedFirm, setSelectedFirm] = useState<LawFirm | null>(null);
  
  // Enhanced search states
  const [searchText, setSearchText] = useState('');
  const [currentLocationName, setCurrentLocationName] = useState('Manila, Philippines');
  const searchTextRef = useRef<string>('');
  
  // Autocomplete states
  const [predictions, setPredictions] = useState<AutocompletePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const autocompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Radius filter states
  const [selectedRadius, setSelectedRadius] = useState(5); // Default 5km
  const [showRadiusFilter, setShowRadiusFilter] = useState(false);
  const radiusOptions = [5, 10, 15, 25]; // km options (limited to 25km max)
  
  // Screen size detection for responsive design
  const [screenSize, setScreenSize] = useState<ScreenSize>(() => {
    const { width, height } = Dimensions.get('window');
    return {
      width,
      height,
      isSmall: width < 375,
      isMedium: width >= 375 && width <= 414,
      isLarge: width > 414
    };
  });

  // Screen size change listener
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenSize({
        width: window.width,
        height: window.height,
        isSmall: window.width < 375,
        isMedium: window.width >= 375 && window.width <= 414,
        isLarge: window.width > 414
      });
    });
    
    return () => subscription?.remove();
  }, []);

  // Optimized autocomplete with abort controller
  const fetchAutocomplete = useCallback(async (input: string) => {
    if (input.length < 2) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      setLoadingPredictions(true);
      const apiUrl = await NetworkConfig.getBestApiUrl();
      
      const response = await fetch(`${apiUrl}/api/places/autocomplete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: input.trim(),
          location: userLocation ? `${userLocation.coords.latitude},${userLocation.coords.longitude}` : null,
          radius: selectedRadius * 1000 // Convert km to meters
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Autocomplete API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.predictions) {
        setPredictions(data.predictions.slice(0, 5)); // Limit to 5 results
        setShowPredictions(data.predictions.length > 0);
      } else {
        setPredictions([]);
        setShowPredictions(false);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Autocomplete request aborted');
        return; // Don't update state for aborted requests
      }
      console.error('Autocomplete error:', error);
      setPredictions([]);
      setShowPredictions(false);
    } finally {
      setLoadingPredictions(false);
      abortControllerRef.current = null;
    }
  }, [userLocation, selectedRadius]);

  // Enhanced debounced autocomplete
  const handleSearchTextChangeWithAutocomplete = useCallback((text: string) => {
    setSearchText(text);
    searchTextRef.current = text;

    // Clear existing timeout
    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Progressive debounce: shorter delay for longer queries
    const debounceDelay = text.length <= 3 ? 400 : text.length <= 5 ? 300 : 200;

    // Set new timeout for autocomplete
    if (text.length >= 2) {
      autocompleteTimeoutRef.current = setTimeout(() => {
        fetchAutocomplete(text);
      }, debounceDelay);
    } else {
      setPredictions([]);
      setShowPredictions(false);
    }
  }, [fetchAutocomplete]);

  // Separate function for fresh data fetching (used for cache misses and background refresh)
  const fetchFreshMapData = useCallback(async (locationName: string) => {
    try {
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(`${apiUrl}/api/places/search-by-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: locationName.trim(),
          radius: selectedRadius * 1000 // Convert km to meters
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.results) {
        const firms: LawFirm[] = data.results.map((place: any) => ({
          id: place.place_id,
          name: place.name || 'Law Firm',
          address: place.formatted_address || place.vicinity || 'Address not available',
          phone: place.formatted_phone_number || place.international_phone_number,
          rating: place.rating || 0,
          user_ratings_total: place.user_ratings_total || 0,
          types: place.types || [],
          latitude: place.geometry?.location?.lat || 0,
          longitude: place.geometry?.location?.lng || 0,
          place_id: place.place_id,
          distance_km: place.distance_km || 0
        }));

        // FAANG Cache: Store fresh data for future instant responses
        if (cache) {
          const cacheLocationName = data.location_info?.name || locationName;
          cache.set(cacheLocationName, selectedRadius, data.results);
          console.log(`🗺️ Map Cache SET: ${firms.length} law firms for ${cacheLocationName} (${selectedRadius}km)`);
        }
        
        setLawFirms(firms);
        setCurrentLocationName(data.location_info?.name || locationName);
        
        // Update map center if location coordinates are available
        if (data.location_info?.coordinates) {
          setMapCenter({
            lat: data.location_info.coordinates.lat,
            lng: data.location_info.coordinates.lng
          });
        }

        // Log cache stats for debugging
        if (cache) {
          const stats = cache.getStats();
          console.log(`🗺️ Map Cache Stats: ${stats.valid}/${stats.total} valid entries`);
        }
      } else {
        throw new Error(data.message || 'No results found');
      }
    } catch (error) {
      console.error('Error searching law firms:', error);
      Alert.alert('Search Error', 'Unable to search for law firms. Please try again.');
      setLawFirms([]);
    } finally {
      setSearching(false);
    }
  }, [selectedRadius, cache]);

  // Search functions with FAANG cache-first approach (Google/Netflix pattern)
  const searchByLocationName = useCallback(async (locationName: string) => {
    try {
      // FAANG Cache-First Strategy: Check cache first for instant response
      if (cache) {
        const cachedResults = cache.get(locationName, selectedRadius);
        if (cachedResults) {
          console.log(`🗺️ Map Cache HIT: ${cachedResults.length} law firms for ${locationName} (${selectedRadius}km)`);
          const firms: LawFirm[] = cachedResults.map((place: any) => ({
            id: place.place_id,
            name: place.name || 'Law Firm',
            address: place.formatted_address || place.vicinity || 'Address not available',
            phone: place.formatted_phone_number || place.international_phone_number,
            rating: place.rating || 0,
            user_ratings_total: place.user_ratings_total || 0,
            types: place.types || [],
            latitude: place.geometry?.location?.lat || CONSTANTS.DEFAULT_LOCATION.lat,
            longitude: place.geometry?.location?.lng || CONSTANTS.DEFAULT_LOCATION.lng,
            place_id: place.place_id,
            distance_km: place.distance_km
          }));

          // Set cached data immediately (0ms load time)
          setLawFirms(firms);
          setMapCenter({
            lat: cachedResults[0]?.geometry?.location?.lat || CONSTANTS.DEFAULT_LOCATION.lat,
            lng: cachedResults[0]?.geometry?.location?.lng || CONSTANTS.DEFAULT_LOCATION.lng
          });
          setSearching(false);
          
          // Background refresh to ensure data is fresh (stale-while-revalidate)
          console.log(`🔄 Map background refresh for ${locationName}...`);
          fetchFreshMapData(locationName);
          return;
        }
      }

      // No cache hit - fetch fresh data with loading state
      setSearching(true);
      console.log(`🗺️ Map Cache MISS - fetching fresh data for: ${locationName}`);
      
      await fetchFreshMapData(locationName);
      
    } catch (error) {
      console.error('Error in map searchByLocationName:', error);
      setLawFirms([]);
    } finally {
      setSearching(false);
    }
  }, [cache, selectedRadius, fetchFreshMapData]);

  const handlePredictionSelect = useCallback((prediction: AutocompletePrediction) => {
    setSearchText(prediction.description);
    setShowPredictions(false);
    setPredictions([]);
    Keyboard.dismiss();
    searchByLocationName(prediction.description);
  }, [searchByLocationName]);

  const handleSearch = useCallback(() => {
    if (searchText.trim()) {
      setShowPredictions(false);
      Keyboard.dismiss();
      searchByLocationName(searchText.trim());
    }
  }, [searchText, searchByLocationName]);

  const handleUseMyLocation = useCallback(async () => {
    try {
      setSearching(true);
      
      if (!locationPermission) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required to find nearby law firms.');
          return;
        }
        setLocationPermission(true);
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      setUserLocation(location);
      const newCenter = {
        lat: location.coords.latitude,
        lng: location.coords.longitude
      };
      setMapCenter(newCenter);
      
      // Search for nearby law firms using the location directly
      try {
        const searchLocation = { lat: location.coords.latitude, lng: location.coords.longitude };
        const apiUrl = await NetworkConfig.getBestApiUrl();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONSTANTS.TIMEOUTS.API_REQUEST);
        
        const response = await fetch(`${apiUrl}/api/places/nearby`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            latitude: searchLocation.lat,
            longitude: searchLocation.lng,
            radius: selectedRadius * 1000, // Convert km to meters
            type: 'lawyer'
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.results) {
            const firms: LawFirm[] = data.results.map((place: any) => ({
              id: place.place_id,
              name: place.name || 'Law Firm',
              address: place.formatted_address || place.vicinity || 'Address not available',
              phone: place.formatted_phone_number || place.international_phone_number,
              rating: place.rating || 0,
              user_ratings_total: place.user_ratings_total || 0,
              types: place.types || [],
              latitude: place.geometry?.location?.lat || 0,
              longitude: place.geometry?.location?.lng || 0,
              place_id: place.place_id,
              distance_km: place.distance_km || 0
            }));
            setLawFirms(firms);
          }
        }
      } catch (fetchError) {
        console.error('Error fetching nearby law firms:', fetchError);
        // Continue with location update even if fetch fails
      }
      
      setSearchText('');
      setCurrentLocationName('Your Current Location');
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Location Error', 'Unable to get your current location. Please try again.');
    } finally {
      setSearching(false);
    }
  }, [locationPermission, selectedRadius]);

  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchNearbyLawFirms = useCallback(async () => {
    try {
      setLoading(true);
      
      // Use user location if available, otherwise use default location
      const searchLocation = userLocation 
        ? { lat: userLocation.coords.latitude, lng: userLocation.coords.longitude }
        : CONSTANTS.DEFAULT_LOCATION;

      const apiUrl = await NetworkConfig.getBestApiUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONSTANTS.TIMEOUTS.API_REQUEST);
      
      const response = await fetch(`${apiUrl}/api/places/nearby`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: searchLocation.lat,
          longitude: searchLocation.lng,
          radius: selectedRadius * 1000, // Convert km to meters
          type: 'lawyer'
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.results) {
        // Transform Google Places API results to our LawFirm interface
        const firms: LawFirm[] = data.results.map((place: any) => ({
          id: place.place_id,
          name: place.name || 'Law Firm',
          address: place.formatted_address || place.vicinity || 'Address not available',
          phone: place.formatted_phone_number || place.international_phone_number,
          rating: place.rating || 0,
          types: place.types || [],
          latitude: place.geometry?.location?.lat || 0,
          longitude: place.geometry?.location?.lng || 0,
          place_id: place.place_id
        }));
        
        setLawFirms(firms);
        setMapCenter(searchLocation);
      } else {
        throw new Error(data.message || ERROR_MESSAGES.NETWORK_ERROR);
      }
    } catch (error) {
      console.error('Error fetching law firms:', error);
      
      let errorMessage: string = ERROR_MESSAGES.NETWORK_ERROR;
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = ERROR_MESSAGES.LOADING_TIMEOUT;
        } else if (error.message.includes('Network request failed') || error.message.includes('Failed to fetch')) {
          errorMessage = 'Cannot connect to server. Please check your internet connection and try again.';
        }
      }
      
      // Show error to user instead of sample data
      Alert.alert('Connection Error', errorMessage);
      setLawFirms([]);
    } finally {
      setLoading(false);
    }
  }, [userLocation, selectedRadius]);

  const initializeWebView = useCallback(async () => {
    try {
      // Detect if running in Expo Go
      const expoGo = __DEV__ && !process.env.EAS_BUILD_ID;
      setIsExpoGo(expoGo);
      
      // Only try to load WebView on supported platforms and not in Expo Go
      if (Platform.OS !== 'web' && !expoGo) {
        const { WebView: RNWebView } = await import('react-native-webview');
        WebView = RNWebView;
        setWebViewSupported(true);
      } else {
        setWebViewSupported(false);
      }
    } catch (error) {
      console.warn('WebView not available:', error);
      setWebViewSupported(false);
    }
  }, []);

  const requestLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation(location);
        setMapCenter({
          lat: location.coords.latitude,
          lng: location.coords.longitude
        });
      } else {
        console.warn('Location permission denied');
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setLocationPermission(false);
      // Fallback to default location
      setMapCenter(CONSTANTS.DEFAULT_LOCATION);
    }
  }, []);

  useEffect(() => {
    initializeWebView();
  }, [initializeWebView]);

  useEffect(() => {
    requestLocationPermission();
  }, [requestLocationPermission]);

  useEffect(() => {
    fetchNearbyLawFirms();
  }, [fetchNearbyLawFirms]);

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'call') {
        const phoneUrl = `tel:${data.phone}`;
        Linking.canOpenURL(phoneUrl)
          .then((supported) => {
            if (supported) {
              Linking.openURL(phoneUrl);
            } else {
              Alert.alert('Error', 'Phone calls are not supported on this device');
            }
          })
          .catch((error) => console.error('Error opening phone app:', error));
      } else if (data.type === 'directions') {
        const scheme = Platform.select({
          ios: 'maps:0,0?q=',
          android: 'geo:0,0?q=',
        });
        
        const latLng = `${data.latitude},${data.longitude}`;
        const label = encodeURIComponent(data.name);
        const url = Platform.select({
          ios: `${scheme}${label}@${latLng}`,
          android: `${scheme}${latLng}(${label})`,
        });

        if (url) {
          Linking.canOpenURL(url)
            .then((supported) => {
              if (supported) {
                Linking.openURL(url);
              } else {
                const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latLng}`;
                Linking.openURL(googleMapsUrl);
              }
            })
            .catch((error) => console.error('Error opening maps app:', error));
        }
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
    }
  };

  const generateMapHTML = () => {
    const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    // If no API key, return a message
    if (!googleMapsApiKey) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { 
                    margin: 0; 
                    padding: 20px; 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    background-color: #f9fafb;
                }
                .message {
                    text-align: center;
                    padding: 20px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
            </style>
        </head>
        <body>
            <div class="message">
                <h3>Google Maps API Key Required</h3>
                <p>To view the interactive map, please configure your Google Maps API key in the environment variables.</p>
                <p>Showing list view instead.</p>
            </div>
        </body>
        </html>
      `;
    }
    
    // Show only selected firm when in map view, or all firms when not
    const firmsToShow = selectedFirm ? [selectedFirm] : lawFirms;
    const markers = firmsToShow.map(firm => ({
      position: { lat: firm.latitude, lng: firm.longitude },
      title: firm.name,
      address: firm.address,
      phone: firm.phone,
      rating: firm.rating,
      id: firm.id
    }));

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Law Firms Map</title>
        <style>
            * { box-sizing: border-box; }
            html, body { 
                height: 100%; 
                margin: 0; 
                padding: 0; 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
            #map { 
                height: 100vh; 
                width: 100%; 
                position: relative;
            }
            .loading {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                text-align: center;
                z-index: 1000;
            }
            .info-window {
                max-width: 280px;
                padding: 12px;
                font-family: inherit;
            }
            .info-title {
                font-weight: 600;
                font-size: 16px;
                margin-bottom: 6px;
                color: #1f2937;
                line-height: 1.2;
            }
            .info-address {
                color: #6b7280;
                font-size: 13px;
                margin-bottom: 8px;
                line-height: 1.4;
            }
            .info-rating {
                color: #f59e0b;
                font-size: 14px;
                margin-bottom: 12px;
                font-weight: 500;
            }
            .info-buttons {
                display: flex;
                gap: 6px;
            }
            .info-button {
                flex: 1;
                padding: 8px 12px;
                border: none;
                border-radius: 6px;
                font-size: 13px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s ease;
                text-align: center;
            }
            .call-button {
                background-color: #ffffff;
                color: #023D7B;
                border: 1.5px solid #023D7B;
            }
            .call-button:hover {
                background-color: #f8fafc;
            }
            .directions-button {
                background-color: #023D7B;
                color: white;
                border: 1.5px solid #023D7B;
            }
            .directions-button:hover {
                background-color: #1e40af;
            }
            .error-message {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 24px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                text-align: center;
                max-width: 320px;
                z-index: 1000;
            }
            .error-title {
                color: #dc2626;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 8px;
            }
            .error-text {
                color: #6b7280;
                font-size: 14px;
                line-height: 1.5;
            }
        </style>
    </head>
    <body>
        <div id="map">
            <div class="loading">
                <div style="font-size: 16px; font-weight: 500; color: #023D7B; margin-bottom: 8px;">Loading Map...</div>
                <div style="font-size: 13px; color: #6b7280;">Please wait while we load the law firms</div>
            </div>
        </div>
        
        <script>
            // Global variables
            let map;
            let infoWindow;
            let markers = [];
            
            // Initialize map function - called by Google Maps API
            function initMap() {
                try {
                    console.log('Initializing Google Maps...');
                    
                    // Remove loading indicator
                    const loadingElement = document.querySelector('.loading');
                    if (loadingElement) {
                        loadingElement.remove();
                    }
                    
                    // Verify Google Maps API is loaded
                    if (typeof google === 'undefined' || !google.maps) {
                        throw new Error('Google Maps JavaScript API not loaded');
                    }
                    
                    // Map configuration following Google Maps documentation
                    const mapOptions = {
                        zoom: ${selectedFirm ? CONSTANTS.ZOOM_LEVELS.FOCUSED : CONSTANTS.ZOOM_LEVELS.OVERVIEW},
                        center: { lat: ${mapCenter.lat}, lng: ${mapCenter.lng} },
                        mapTypeId: google.maps.MapTypeId.ROADMAP,
                        disableDefaultUI: false,
                        zoomControl: true,
                        mapTypeControl: false,
                        scaleControl: true,
                        streetViewControl: false,
                        rotateControl: false,
                        fullscreenControl: true,
                        gestureHandling: 'auto',
                        styles: [
                            {
                                featureType: "poi.business",
                                elementType: "labels",
                                stylers: [{ visibility: "off" }]
                            },
                            {
                                featureType: "poi.medical",
                                elementType: "labels", 
                                stylers: [{ visibility: "off" }]
                            }
                        ]
                    };
                    
                    // Create map instance
                    map = new google.maps.Map(document.getElementById("map"), mapOptions);
                    
                    // Create info window instance
                    infoWindow = new google.maps.InfoWindow({
                        maxWidth: 300,
                        pixelOffset: new google.maps.Size(0, -10)
                    });
                    
                    console.log('Google Maps initialized successfully');
                
                    // Add user location marker if available
                    ${userLocation ? `
                    const userMarker = new google.maps.Marker({
                        position: { lat: ${userLocation.coords.latitude}, lng: ${userLocation.coords.longitude} },
                        map: map,
                        title: "Your Current Location",
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 8,
                            fillColor: '#4285F4',
                            fillOpacity: 1,
                            strokeColor: '#ffffff',
                            strokeWeight: 2
                        },
                        zIndex: 1000
                    });
                    ` : ''}
                    
                    // Law firm markers data
                    const lawFirmData = ${JSON.stringify(markers)};
                    
                    // Create law firm markers
                    lawFirmData.forEach((firmData, index) => {
                        // Create custom marker icon
                        const markerIcon = {
                            url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(\`
                                <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24c0-8.8-7.2-16-16-16z" fill="#023D7B"/>
                                    <circle cx="16" cy="16" r="6" fill="white"/>
                                    <text x="16" y="20" text-anchor="middle" fill="#023D7B" font-size="10" font-weight="bold">⚖</text>
                                </svg>
                            \`),
                            scaledSize: new google.maps.Size(32, 40),
                            anchor: new google.maps.Point(16, 40),
                            labelOrigin: new google.maps.Point(16, -8)
                        };
                        
                        // Create marker
                        const marker = new google.maps.Marker({
                            position: firmData.position,
                            map: map,
                            title: firmData.title,
                            icon: markerIcon,
                            animation: google.maps.Animation.DROP,
                            zIndex: 100
                        });
                        
                        // Store marker reference
                        markers.push(marker);
                        
                        // Create info window content
                        const infoContent = \`
                            <div class="info-window">
                                <div class="info-title">\${firmData.title}</div>
                                <div class="info-address">\${firmData.address}</div>
                                \${firmData.rating && firmData.rating > 0 ? 
                                    \`<div class="info-rating">★ \${firmData.rating.toFixed(1)} stars</div>\` : 
                                    '<div class="info-rating" style="color: #9ca3af;">No ratings yet</div>'
                                }
                                <div class="info-buttons">
                                    \${firmData.phone ? 
                                        \`<button class="info-button call-button" onclick="handleCall('\${firmData.phone}')">Call</button>\` : 
                                        ''
                                    }
                                    <button class="info-button directions-button" onclick="handleDirections(\${firmData.position.lat}, \${firmData.position.lng}, '\${firmData.title.replace(/'/g, "\\\\'")}')">Directions</button>
                                </div>
                            </div>
                        \`;
                        
                        // Add click listener for marker
                        marker.addListener('click', () => {
                            infoWindow.setContent(infoContent);
                            infoWindow.open(map, marker);
                        });
                    });
                
                    // Fit map bounds to show all markers
                    if (lawFirmData.length > 0) {
                        const bounds = new google.maps.LatLngBounds();
                        
                        // Add law firm positions to bounds
                        lawFirmData.forEach(firmData => {
                            bounds.extend(new google.maps.LatLng(firmData.position.lat, firmData.position.lng));
                        });
                        
                        // Add user location to bounds if available
                        ${userLocation ? `bounds.extend(new google.maps.LatLng(${userLocation.coords.latitude}, ${userLocation.coords.longitude}));` : ''}
                        
                        // Fit the map to show all markers
                        map.fitBounds(bounds);
                        
                        // Ensure minimum zoom level for single markers
                        google.maps.event.addListenerOnce(map, 'bounds_changed', function() {
                            if (map.getZoom() > ${CONSTANTS.ZOOM_LEVELS.FOCUSED}) {
                                map.setZoom(${CONSTANTS.ZOOM_LEVELS.FOCUSED});
                            }
                        });
                    } else {
                        // No markers, center on user location or default
                        map.setZoom(${CONSTANTS.ZOOM_LEVELS.OVERVIEW});
                    }
                    
                } catch (error) {
                    console.error('Error initializing Google Maps:', error);
                    showError('Map Initialization Error', error.message);
                }
            }
            
            // Error display function
            function showError(title, message) {
                document.getElementById('map').innerHTML = \`
                    <div class="error-message">
                        <div class="error-title">\${title}</div>
                        <div class="error-text">\${message}</div>
                        <div style="margin-top: 12px;">
                            <button onclick="location.reload()" style="background: #023D7B; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px;">
                                Retry
                            </button>
                        </div>
                    </div>
                \`;
            }
            
            // Handle call button clicks
            function handleCall(phone) {
                console.log('Calling:', phone);
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'call',
                        phone: phone
                    }));
                } else {
                    // Fallback for web testing
                    window.open(\`tel:\${phone}\`, '_self');
                }
            }
            
            // Handle directions button clicks
            function handleDirections(lat, lng, name) {
                console.log('Getting directions to:', name);
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'directions',
                        latitude: lat,
                        longitude: lng,
                        name: name
                    }));
                } else {
                    // Fallback for web testing
                    const url = \`https://www.google.com/maps/dir/?api=1&destination=\${lat},\${lng}\`;
                    window.open(url, '_blank');
                }
            }
            
            // Handle Google Maps API authentication failures
            window.gm_authFailure = function() {
                console.error('Google Maps API authentication failed');
                showError('API Authentication Failed', 'Please check your Google Maps API key configuration.');
            };
            
            // Handle script loading errors
            window.addEventListener('error', function(e) {
                if (e.target && e.target.src && e.target.src.includes('maps.googleapis.com')) {
                    console.error('Failed to load Google Maps script');
                    showError('Network Error', 'Failed to load Google Maps. Please check your internet connection.');
                }
            });
            
            // Set global initMap function
            window.initMap = initMap;
            
            // Timeout fallback
            setTimeout(function() {
                if (typeof google === 'undefined') {
                    console.error('Google Maps API failed to load within timeout');
                    showError('Loading Timeout', 'Google Maps took too long to load. Please refresh and try again.');
                }
            }, 15000); // 15 second timeout
            
        </script>
        
        <!-- Load Google Maps JavaScript API -->
        <script async defer 
                src="https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&callback=initMap&loading=async"
                onerror="showError('Script Loading Error', 'Failed to load Google Maps JavaScript API. Please check your internet connection.')">
        </script>
    </body>
    </html>
    `;
  };

  const handleCallPress = (phone: string) => {
    if (phone) {
      const phoneUrl = `tel:${phone}`;
      Linking.canOpenURL(phoneUrl)
        .then((supported) => {
          if (supported) {
            Linking.openURL(phoneUrl);
          } else {
            Alert.alert('Error', 'Phone calls are not supported on this device');
          }
        })
        .catch((error) => console.error('Error opening phone app:', error));
    }
  };

  const handleDirectionsPress = (latitude: number, longitude: number, name: string) => {
    const scheme = Platform.select({
      ios: 'maps:0,0?q=',
      android: 'geo:0,0?q=',
    });
    
    const latLng = `${latitude},${longitude}`;
    const label = encodeURIComponent(name);
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });

    if (url) {
      Linking.canOpenURL(url)
        .then((supported) => {
          if (supported) {
            Linking.openURL(url);
          } else {
            // Fallback to Google Maps web
            const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latLng}`;
            Linking.openURL(googleMapsUrl);
          }
        })
        .catch((error) => console.error('Error opening maps app:', error));
    }
  };


  const handleViewOnMap = (firm: LawFirm) => {
    setSelectedFirm(firm);
    setMapCenter({ lat: firm.latitude, lng: firm.longitude });
    setShowMapView(true);
  };

  const handleBackToList = () => {
    setShowMapView(false);
    setSelectedFirm(null);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const yellowColor = '#FCD34D';
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star
          key={i}
          size={12}
          fill={yellowColor}
          color={yellowColor}
        />
      );
    }
    
    return stars;
  };

  // Mobile Search Header Component - Industry-grade responsive design
  const renderMobileSearchHeader = () => {
    const placeholderText = screenSize.isSmall 
      ? "Search area (e.g., 'Makati')" 
      : "Search by street, barangay, or city (e.g., '62 Baco', 'Makati')";
    
    return (
      <VStack space="md" className="px-4 py-4 bg-white" style={{ zIndex: 1000 }}>
        <Box className="relative" style={{ zIndex: 1000 }}>
          {/* Unified search bar using the same component as lawyer directory */}
          <UnifiedSearchBar
            value={searchText}
            onChangeText={handleSearchTextChangeWithAutocomplete}
            placeholder={placeholderText}
            loading={searching}
            editable={!searching}
            containerClassName="pt-0 pb-0"
          />
          
          {/* Mobile Autocomplete Dropdown */}
          {showPredictions && predictions.length > 0 && (
            <Box 
              style={{
                position: 'absolute',
                top: 52,
                left: 0,
                right: 0,
                zIndex: 9999,
                backgroundColor: 'white',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                ...createShadowStyle({
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  elevation: 10,
                }),
                maxHeight: screenSize.isSmall ? 200 : 250,
              }}
            >
              <ScrollView 
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {predictions.map((item, index) => (
                  <Pressable
                    key={item.place_id}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderBottomWidth: index < predictions.length - 1 ? 0.5 : 0,
                      borderBottomColor: '#F3F4F6',
                      minHeight: 48, // Accessibility touch target
                    }}
                    onPress={() => handlePredictionSelect(item)}
                  >
                    <MapPin size={16} color="#9CA3AF" style={{ marginRight: 12 }} />
                    <VStack space="xs" style={{ flex: 1 }}>
                      <Text 
                        style={{ 
                          fontSize: screenSize.isSmall ? 13 : 14,
                          color: '#111827',
                          fontWeight: '500',
                        }}
                        numberOfLines={1}
                      >
                        {item.main_text}
                      </Text>
                      {item.secondary_text && (
                        <Text 
                          style={{ 
                            fontSize: screenSize.isSmall ? 11 : 12,
                            color: '#6B7280',
                          }}
                          numberOfLines={1}
                        >
                          {item.secondary_text}
                        </Text>
                      )}
                    </VStack>
                  </Pressable>
                ))}
                {loadingPredictions && (
                  <HStack space="sm" style={{ padding: 12, justifyContent: 'center' }}>
                    <Spinner size="small" />
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>Loading...</Text>
                  </HStack>
                )}
              </ScrollView>
            </Box>
          )}
        </Box>

        {/* Action Buttons Row - Mobile Optimized */}
        <HStack space="sm" className="items-center">
          <Pressable
            style={{
              flex: 1,
              paddingHorizontal: 12,
              paddingVertical: 10,
              backgroundColor: '#F3F4F6',
              borderRadius: 8,
              minHeight: 48, // Accessibility compliance
            }}
            onPress={handleUseMyLocation}
            disabled={searching}
            accessibilityLabel="Use current location"
          >
            <HStack space="xs" className="justify-center items-center">
              <Locate size={16} color={Colors.primary.blue} />
              <Text 
                style={{ 
                  fontSize: screenSize.isSmall ? 13 : 14,
                  fontWeight: '500',
                  color: Colors.primary.blue 
                }}
              >
                {screenSize.isSmall ? 'My Location' : 'Use My Location'}
              </Text>
            </HStack>
          </Pressable>
          
          {/* Facebook Marketplace-style Radius Filter */}
          <Pressable
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              backgroundColor: 'white',
              borderWidth: 1,
              borderColor: '#D1D5DB',
              borderRadius: 8,
              minHeight: 48,
              minWidth: screenSize.isSmall ? 70 : 80,
            }}
            onPress={() => setShowRadiusFilter(!showRadiusFilter)}
          >
            <HStack space="xs" className="items-center justify-center">
              <Text 
                style={{ 
                  fontSize: screenSize.isSmall ? 13 : 14,
                  fontWeight: '500',
                  color: Colors.text.head 
                }}
              >
                {selectedRadius}km
              </Text>
              <Text style={{ fontSize: 10, color: '#9CA3AF' }}>▼</Text>
            </HStack>
          </Pressable>
        </HStack>
        
        {/* Fixed Radius Filter Dropdown - No overlap */}
        {showRadiusFilter && (
          <Box 
            style={{
              position: 'absolute',
              top: 110,
              right: 16,
              backgroundColor: 'white',
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 12,
              ...createShadowStyle({
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 12,
              }),
              zIndex: 9999,
              minWidth: 140,
            }}
          >
            <VStack space="xs" style={{ padding: 12 }}>
              <Text style={{ 
                fontSize: 13, 
                fontWeight: '600', 
                paddingHorizontal: 4, 
                paddingVertical: 2, 
                color: '#374151' 
              }}>
                Search Radius
              </Text>
              {radiusOptions.map((radius) => (
                <Pressable
                  key={radius}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    borderRadius: 8,
                    backgroundColor: selectedRadius === radius ? '#EFF6FF' : 'transparent',
                    minHeight: 44,
                    borderWidth: selectedRadius === radius ? 1 : 0,
                    borderColor: selectedRadius === radius ? '#DBEAFE' : 'transparent',
                  }}
                  onPress={() => {
                    setSelectedRadius(radius);
                    setShowRadiusFilter(false);
                    // Trigger new search with updated radius
                    if (searchText.trim()) {
                      handleSearch();
                    } else {
                      // If no search text, re-fetch nearby law firms with new radius
                      fetchNearbyLawFirms();
                    }
                  }}
                >
                  <HStack className="justify-between items-center">
                    <Text 
                      style={{ 
                        fontSize: 15,
                        color: selectedRadius === radius ? Colors.primary.blue : Colors.text.head,
                        fontWeight: selectedRadius === radius ? '600' : '500'
                      }}
                    >
                      {radius} km
                    </Text>
                    {selectedRadius === radius && (
                      <View style={{
                        backgroundColor: Colors.primary.blue,
                        borderRadius: 10,
                        width: 20,
                        height: 20,
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                      </View>
                    )}
                  </HStack>
                </Pressable>
              ))}
            </VStack>
          </Box>
        )}

        {/* Results Count - Mobile Optimized */}
        {lawFirms.length > 0 && (
          <Text 
            style={{ 
              fontSize: screenSize.isSmall ? 12 : 13,
              fontWeight: '500',
              color: Colors.text.sub,
              textAlign: 'center'
            }}
          >
            {lawFirms.length} law firms found in {currentLocationName}
          </Text>
        )}
      </VStack>
    );
  };

  const renderLawFirmCard = (firm: LawFirm) => (
    <View 
      key={firm.id} 
      style={{
        backgroundColor: 'white',
        marginBottom: 12,
        borderRadius: 12,
        ...shadowPresets.light,
        borderWidth: 1,
        borderColor: '#f1f5f9'
      }}
    >
      <VStack space="md" style={{ padding: 16 }}>
        <HStack space="sm" className="items-start">
          <View 
            style={{
              backgroundColor: '#eff6ff',
              padding: 10,
              borderRadius: 25,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <MapPin size={20} color={Colors.primary.blue} />
          </View>
          
          <VStack space="xs" className="flex-1">
            <Text 
              style={{ 
                fontSize: screenSize.isSmall ? 15 : 16,
                fontWeight: '700',
                color: '#111827',
                lineHeight: 22
              }}
              numberOfLines={2}
            >
              {firm.name}
            </Text>
            
            <Text 
              style={{ 
                fontSize: screenSize.isSmall ? 13 : 14,
                color: '#6b7280',
                lineHeight: 20
              }}
              numberOfLines={3}
            >
              {firm.address}
            </Text>
            
            {firm.rating && firm.rating > 0 && (
              <HStack space="xs" className="items-center">
                <HStack space="xs">
                  {renderStars(firm.rating)}
                </HStack>
                <Text 
                  style={{ 
                    fontSize: 13,
                    color: '#6b7280',
                    fontWeight: '500'
                  }}
                >
                  {firm.rating.toFixed(1)} stars
                  {firm.user_ratings_total && firm.user_ratings_total > 0 && (
                    ` (${firm.user_ratings_total} reviews)`
                  )}
                </Text>
              </HStack>
            )}
          </VStack>
        </HStack>
        
        <VStack space="sm">
          <HStack space="sm">
            {firm.phone && (
              <Button
                size="md"
                variant="outline"
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderColor: Colors.primary.blue,
                  borderWidth: 1.5
                }}
                onPress={() => handleCallPress(firm.phone!)}
              >
                <HStack space="xs" className="items-center">
                  <Phone size={16} color={Colors.primary.blue} />
                  <ButtonText style={{ 
                    color: Colors.primary.blue,
                    fontSize: 14,
                    fontWeight: '600'
                  }}>
                    Call
                  </ButtonText>
                </HStack>
              </Button>
            )}
            
            <Button
              size="md"
              style={{ 
                flex: 1,
                backgroundColor: Colors.primary.blue,
                minHeight: 44
              }}
              onPress={() => handleDirectionsPress(firm.latitude, firm.longitude, firm.name)}
            >
              <HStack space="xs" className="items-center">
                <Navigation size={16} color="white" />
                <ButtonText style={{ 
                  fontSize: 14,
                  fontWeight: '600'
                }}>
                  Directions
                </ButtonText>
              </HStack>
            </Button>
          </HStack>
          
          <Button
            size="md"
            variant="outline"
            style={{
              width: '100%',
              minHeight: 44,
              borderColor: '#d1d5db',
              borderWidth: 1
            }}
            onPress={() => {
              if (webViewSupported && !isExpoGo) {
                handleViewOnMap(firm);
              } else {
                // Fallback to external maps for Expo Go
                const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${firm.latitude},${firm.longitude}`;
                Linking.openURL(googleMapsUrl);
              }
            }}
          >
            <HStack space="xs" className="items-center">
              <MapPin size={16} color="#6b7280" />
              <ButtonText style={{ 
                color: '#374151',
                fontSize: 14,
                fontWeight: '500'
              }}>
                {webViewSupported && !isExpoGo ? 'View on Map' : 'Open in Maps'}
              </ButtonText>
            </HStack>
          </Button>
        </VStack>
      </VStack>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Spinner size="large" color={Colors.primary.blue} />
        <Text className="mt-4 text-gray-600">Loading nearby law firms...</Text>
      </View>
    );
  }

  // Show interactive map if requested and supported
  if (showMapView && webViewSupported && !isExpoGo) {
    return (
      <View className="flex-1">
        {/* Back to List Button */}
        <View className="absolute top-4 left-4 right-4 z-20">
          <HStack space="sm" className="items-center">
            <Button
              size="sm"
              variant="outline"
              className="bg-white"
              onPress={handleBackToList}
            >
              <HStack space="xs" className="items-center">
                <ArrowLeft size={16} color={Colors.primary.blue} />
                <ButtonText className="text-sm">Back to List</ButtonText>
              </HStack>
            </Button>
            
            {selectedFirm && (
              <View className="flex-1 bg-white px-3 py-2 rounded-lg border border-gray-300">
                <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                  {selectedFirm.name}
                </Text>
              </View>
            )}
          </HStack>
        </View>
        
        <WebView
          source={{ html: generateMapHTML() }}
          style={{ flex: 1 }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View className="flex-1 justify-center items-center bg-gray-50">
              <Spinner size="large" color={Colors.primary.blue} />
              <Text className="mt-4 text-gray-600">Loading map...</Text>
            </View>
          )}
        />
      </View>
    );
  }

  // Show mobile layout with proper spacing and no overlaps
  if (!webViewSupported || Platform.OS === 'web' || isExpoGo || !showMapView) {
    return (
      <View className="flex-1 bg-gray-50">
        {/* Fixed Mobile Search Header - No overlap */}
        <View className="bg-white border-b border-gray-200" style={{ zIndex: 100 }}>
          {renderMobileSearchHeader()}
        </View>
        
        {isExpoGo && (
          <View className="mx-4 mt-2 mb-2 bg-blue-50 p-3 rounded-lg border border-blue-200">
            <HStack space="sm" className="items-center justify-center">
              <Smartphone size={16} color={Colors.primary.blue} />
              <Text className="text-blue-700 text-sm text-center flex-1">
                Running in Expo Go - Map view requires Development Build for full functionality
              </Text>
            </HStack>
          </View>
        )}
        
        {/* Optimized Map Section - Better proportions */}
        <View 
          style={{ 
            height: screenSize.isSmall ? 240 : screenSize.isMedium ? 300 : 360,
            backgroundColor: '#f8f9fa'
          }} 
          className="border-b border-gray-200"
        >
          {!locationPermission && (
            <View className="absolute top-3 left-3 right-3 bg-amber-50 p-3 rounded-lg border border-amber-200 z-20">
              <HStack space="xs" className="items-center justify-center">
                <AlertCircle size={16} color="#D97706" />
                <Text 
                  style={{ 
                    fontSize: screenSize.isSmall ? 12 : 13,
                    color: '#92400e',
                    textAlign: 'center',
                    fontWeight: '500'
                  }}
                >
                  Location access needed for better results
                </Text>
              </HStack>
            </View>
          )}
          
          {/* Enhanced Map Placeholder - Better visual hierarchy */}
          <View className="flex-1 justify-center items-center relative" style={{ backgroundColor: '#e5e7eb' }}>
            <VStack space="md" className="items-center">
              <View 
                style={{
                  backgroundColor: Colors.primary.blue,
                  borderRadius: 50,
                  padding: 16,
                  ...shadowPresets.medium
                }}
              >
                <MapPin 
                  size={screenSize.isSmall ? 32 : 40} 
                  color="white" 
                />
              </View>
              
              <VStack space="xs" className="items-center">
                <Text 
                  style={{ 
                    fontSize: screenSize.isSmall ? 18 : 20,
                    fontWeight: '700',
                    color: Colors.text.head,
                    textAlign: 'center'
                  }}
                >
                  {lawFirms.length} Law Firms Found
                </Text>
                <Text 
                  style={{ 
                    fontSize: screenSize.isSmall ? 13 : 14,
                    color: Colors.text.body,
                    textAlign: 'center',
                    paddingHorizontal: 20,
                    fontWeight: '500'
                  }}
                  numberOfLines={2}
                >
                  {userLocation 
                    ? `Near your location in ${currentLocationName}`
                    : `Near ${currentLocationName}`
                  }
                </Text>
              </VStack>
            </VStack>
            
            {/* Interactive Map Button - Better positioning */}
            {webViewSupported && !isExpoGo && (
              <View className="absolute bottom-4 right-4">
                <Button
                  size="md"
                  style={{ 
                    backgroundColor: Colors.primary.blue,
                    minHeight: 48,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    ...createShadowStyle({
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.15,
                      shadowRadius: 4,
                      elevation: 4
                    })
                  }}
                  onPress={() => setShowMapView(true)}
                >
                  <HStack space="xs" className="items-center">
                    <Map size={18} color="white" />
                    <ButtonText 
                      style={{ 
                        fontSize: 14,
                        fontWeight: '600'
                      }}
                    >
                      {screenSize.isSmall ? 'Interactive Map' : 'View Interactive Map'}
                    </ButtonText>
                  </HStack>
                </Button>
              </View>
            )}
          </View>
        </View>
        
        {/* Enhanced Law Firms List - Better spacing */}
        <ScrollView 
          className="flex-1" 
          style={{ backgroundColor: '#f9fafb' }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {lawFirms.length > 0 ? (
            <VStack space="xs" style={{ paddingTop: 12, paddingHorizontal: 16 }}>
              {lawFirms.map(renderLawFirmCard)}
            </VStack>
          ) : (
            <View className="flex-1 justify-center items-center" style={{ paddingVertical: 60 }}>
              <VStack space="lg" className="items-center">
                <View 
                  style={{
                    backgroundColor: '#f3f4f6',
                    borderRadius: 50,
                    padding: 20
                  }}
                >
                  <AlertCircle size={48} color="#9CA3AF" />
                </View>
                <VStack space="sm" className="items-center">
                  <Text 
                    style={{ 
                      fontSize: screenSize.isSmall ? 16 : 18,
                      color: '#374151',
                      textAlign: 'center',
                      fontWeight: '600'
                    }}
                  >
                    No law firms found
                  </Text>
                  <Text 
                    style={{ 
                      fontSize: screenSize.isSmall ? 14 : 15,
                      color: '#6B7280',
                      textAlign: 'center',
                      marginHorizontal: 32,
                      lineHeight: 20
                    }}
                  >
                    Try searching in a different area or use your current location
                  </Text>
                </VStack>
                {!searching && (
                  <Button
                    size="md"
                    variant="outline"
                    onPress={handleUseMyLocation}
                    style={{ 
                      marginTop: 8,
                      minHeight: 48,
                      paddingHorizontal: 20,
                      borderColor: Colors.primary.blue,
                      borderWidth: 1.5
                    }}
                  >
                    <HStack space="xs" className="items-center">
                      <Locate size={18} color={Colors.primary.blue} />
                      <ButtonText style={{ color: Colors.primary.blue, fontWeight: '600' }}>
                        Use My Location
                      </ButtonText>
                    </HStack>
                  </Button>
                )}
              </VStack>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // WebView-based map for supported platforms - focused on selected firm
  return (
    <View className="flex-1">
      {/* Back to List Button */}
      <View className="absolute top-4 left-4 right-4 z-20">
        <HStack space="sm" className="items-center">
          <Button
            size="sm"
            variant="outline"
            className="bg-white"
            onPress={handleBackToList}
          >
            <HStack space="xs" className="items-center">
              <Text className="text-sm">← Back to List</Text>
            </HStack>
          </Button>
          
          {selectedFirm && (
            <View className="flex-1 bg-white px-3 py-2 rounded-lg border border-gray-300">
              <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                {selectedFirm.name}
              </Text>
            </View>
          )}
        </HStack>
      </View>
      
      <WebView
        source={{ html: generateMapHTML() }}
        style={{ flex: 1 }}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View className="flex-1 justify-center items-center bg-gray-50">
            <Spinner size="large" color={Colors.primary.blue} />
            <Text className="mt-4 text-gray-600">Loading map...</Text>
          </View>
        )}
      />
    </View>
  );
}
