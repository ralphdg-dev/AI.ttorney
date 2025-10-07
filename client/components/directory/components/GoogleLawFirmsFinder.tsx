import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  TextInput, 
  Pressable, 
  Linking, 
  Alert, 
  ScrollView,
  Platform,
  Keyboard
} from 'react-native';
import { WebView as RNWebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button/';
import { Box } from '@/components/ui/box';
import { Spinner } from '@/components/ui/spinner';
import { 
  Search, 
  MapPin, 
  Phone, 
  Navigation, 
  Star, 
  Locate, 
  X,
  Check
} from 'lucide-react-native';
import Colors from '../../../constants/Colors';
import { NetworkConfig } from '../../../utils/networkConfig';

interface LawFirm {
  id: string;
  name: string;
  address: string;
  phone?: string;
  rating?: number;
  user_ratings_total?: number; // Actual review count from Google Places API
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

interface GoogleLawFirmsFinderProps {
  searchQuery?: string;
}

export default function GoogleLawFirmsFinder({ searchQuery }: GoogleLawFirmsFinderProps) {
  const [lawFirms, setLawFirms] = useState<LawFirm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [searchText, setSearchText] = useState('');
  const [currentLocationName, setCurrentLocationName] = useState('Manila, Philippines');
  const [mapCenter, setMapCenter] = useState({ lat: 14.5995, lng: 120.9842 });
  const [WebView, setWebView] = useState<any>(null);
  const [webViewSupported, setWebViewSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
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
  
  // View states - Two dedicated views approach
  const [currentView, setCurrentView] = useState<'list' | 'map'>('list'); // Default to List View
  const [selectedFirmId, setSelectedFirmId] = useState<string | null>(null); // Track selected firm for zoom

  // Optimized autocomplete with abort controller and session tokens
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
    const controller = new AbortController();
    abortControllerRef.current = controller;

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
        signal: controller.signal,
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

  // This function will be replaced by handlePredictionSelectUpdated after searchByLocationName is defined

  // Optimized debounced autocomplete with progressive delay
  const handleSearchTextChangeWithAutocomplete = useCallback((text: string) => {
    setSearchText(text);
    searchTextRef.current = text;
    
    // Clear error when user starts typing
    if (error) setError(null);
    // Reset retry count when user types
    if (text.length > 0) setRetryCount(0);

    // Clear existing timeout
    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Industry-grade instant autocomplete - no debounce for immediate response
    if (text.length >= 2) {
      // Show loading state immediately for instant feedback
      setLoadingPredictions(true);
      setShowPredictions(true);
      
      // Minimal delay only to batch rapid keystrokes
      autocompleteTimeoutRef.current = setTimeout(() => {
        fetchAutocomplete(text);
      }, 50); // Ultra-fast 50ms delay
    } else {
      setPredictions([]);
      setShowPredictions(false);
      setLoadingPredictions(false);
    }
  }, [error, fetchAutocomplete]);

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

  // Hide predictions when clicking outside (for better UX)
  const handleSearchFocus = useCallback(() => {
    if (predictions.length > 0 && searchText.length >= 2) {
      setShowPredictions(true);
    }
  }, [predictions.length, searchText.length]);

  const handleSearchBlur = useCallback(() => {
    // Delay hiding to allow for prediction selection
    setTimeout(() => {
      setShowPredictions(false);
    }, 150);
  }, []);

  // Search law firms using backend proxy (avoids CORS issues)
  const searchLawFirmsViaProxy = useCallback(async (latitude: number, longitude: number, locationName: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log(`Searching law firms at: ${latitude}, ${longitude} for ${locationName}`);

      // Use backend proxy to avoid CORS issues
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(`${apiUrl}/api/places/nearby`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: latitude,
          longitude: longitude,
          radius: selectedRadius * 1000, // Convert km to meters
          type: 'lawyer'
        }),
      });

      if (!response.ok) {
        throw new Error(`Network error: ${response.status}. Please check your internet connection.`);
      }

      const data = await response.json();
      
      if (data.success && data.results && data.results.length > 0) {
        const firms: LawFirm[] = data.results.map((place: any) => ({
          id: place.place_id,
          name: place.name,
          address: place.vicinity || place.formatted_address || 'Address not available',
          phone: place.formatted_phone_number,
          rating: place.rating,
          user_ratings_total: place.user_ratings_total, // Real review count from Google
          types: place.types || [],
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          place_id: place.place_id
        }));

        setLawFirms(firms);
        setCurrentLocationName(locationName);
        setRetryCount(0);
        console.log(`Found ${firms.length} law firms in ${locationName}`);
      } else {
        console.log(`No law firms found in ${locationName}`);
        setLawFirms([]);
      }
    } catch (error) {
      console.error('Error fetching law firms:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to search for law firms. Please try again.';
      setError(errorMessage);
      setLawFirms([]);
    } finally {
      setLoading(false);
    }
  }, [selectedRadius]);

  // Search by location name using the new endpoint
  const searchByLocationName = useCallback(async (locationName: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log(`Searching for law firms in: ${locationName}`);
      
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(`${apiUrl}/api/places/search-by-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location_name: locationName,
          radius: selectedRadius * 1000, // Convert km to meters
          type: 'law_firm' // Search for law firms and offices
        }),
      });

      if (!response.ok) {
        throw new Error(`Network error: ${response.status}. Please check your internet connection.`);
      }

      const data = await response.json();
      
      if (data.success && data.results && data.results.length > 0) {
        const firms: LawFirm[] = data.results.map((place: any) => ({
          id: place.place_id,
          name: place.name,
          address: place.vicinity || place.formatted_address || 'Address not available',
          phone: place.formatted_phone_number,
          rating: place.rating,
          user_ratings_total: place.user_ratings_total, // Real review count from Google
          types: place.types || [],
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          place_id: place.place_id,
          distance_km: place.distance_km // Include distance from API
        }));

        setLawFirms(firms);
        setCurrentLocationName(data.location.formatted_address);
        setMapCenter({
          lat: data.location.latitude,
          lng: data.location.longitude
        });
        setRetryCount(0);
        
        // Log detailed search results
        console.log(`Search Results for ${data.location.formatted_address}:`);
        console.log(`- Total: ${firms.length} law firms`);
        console.log(`- Very close (≤2km): ${data.very_close_count || 0}`);
        console.log(`- Close (2-10km): ${data.close_count || 0}`);
        console.log(`- Nearby (>10km): ${data.nearby_count || 0}`);
        console.log(`- Search radius used: ${data.search_radius_km}km`);
        console.log(`- Message: ${data.message}`);
      } else if (data.success && data.results.length === 0) {
        setLawFirms([]);
        setCurrentLocationName(data.location?.formatted_address || locationName);
        console.log(`No law firms found within 50km of ${data.location?.formatted_address || locationName}`);
      } else {
        console.log(`Could not find location: ${locationName}`);
        setError(`Could not find location: ${locationName}. Please try a different search term.`);
        setLawFirms([]);
      }
    } catch (error) {
      console.error('Error searching by location:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to search for law firms. Please try again.';
      setError(errorMessage);
      setLawFirms([]);
    } finally {
      setLoading(false);
    }
  }, [selectedRadius]); // Include selectedRadius dependency

  // Optimized prediction selection with session token renewal
  const handlePredictionSelectUpdated = useCallback(async (prediction: AutocompletePrediction) => {
    setSearchText(prediction.main_text);
    searchTextRef.current = prediction.main_text;
    setShowPredictions(false);
    setPredictions([]);
    Keyboard.dismiss();
    
    
    // Search for law firms at the selected location
    setSearching(true);
    try {
      await searchByLocationName(prediction.description);
    } catch (error) {
      console.error('Search error after prediction selection:', error);
      setError('Unable to search at selected location. Please try again.');
    } finally {
      setSearching(false);
    }
  }, [searchByLocationName]);

  const requestLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location);
        setCurrentLocationName('your location');
        
        // Search law firms at user's location using coordinates
        await searchLawFirmsViaProxy(
          location.coords.latitude, 
          location.coords.longitude, 
          'your location'
        );
      } else {
        // Default to Manila using location search
        await searchByLocationName('Manila, Philippines');
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      // Default to Manila using location search
      await searchByLocationName('Manila, Philippines');
    }
  }, [searchByLocationName, searchLawFirmsViaProxy]);

  // Initialize WebView dynamically for platform compatibility
  useEffect(() => {
    const initializeWebView = async () => {
      try {
        // Only load WebView on supported platforms
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          setWebView(() => RNWebView);
          setWebViewSupported(true);
          console.log('WebView loaded successfully for', Platform.OS);
        } else {
          console.log('WebView not supported on', Platform.OS, '- using list view');
          setWebViewSupported(false);
        }
      } catch (error) {
        console.error('Failed to load WebView:', error);
        setWebViewSupported(false);
      }
    };

    initializeWebView();
  }, []);

  useEffect(() => {
    requestLocationPermission();
  }, [requestLocationPermission]);

  const handleSearch = useCallback(async () => {
    const currentSearchText = searchTextRef.current.trim();
    if (!currentSearchText) {
      setError('Please enter a location to search.');
      return;
    }
    
    setSearching(true);
    
    try {
      await searchByLocationName(currentSearchText);
    } catch (error) {
      console.error('Search error:', error);
      const errorMessage = 'Unable to search for that location. Please check your internet connection and try again.';
      setError(errorMessage);
      Alert.alert('Search Error', errorMessage);
    } finally {
      setSearching(false);
    }
  }, [searchByLocationName]); // Only depend on the search function

  const handleRetry = useCallback(async () => {
    if (retryCount >= 3) {
      setError('Maximum retry attempts reached. Please check your internet connection.');
      return;
    }
    
    setRetryCount(prev => prev + 1);
    setError(null);
    
    if (searchTextRef.current.trim()) {
      await handleSearch();
    } else {
      await requestLocationPermission();
    }
  }, [retryCount, handleSearch, requestLocationPermission]);

  const handleUseMyLocation = useCallback(async () => {
    if (userLocation) {
      await searchLawFirmsViaProxy(
        userLocation.coords.latitude, 
        userLocation.coords.longitude, 
        'your location'
      );
      setSearchText('');
      searchTextRef.current = ''; // Keep ref in sync
    } else {
      await requestLocationPermission();
    }
  }, [userLocation, requestLocationPermission, searchLawFirmsViaProxy]);

  const handleCallPress = useCallback((phone: string) => {
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
  }, []);

  const handleDirectionsPress = useCallback((latitude: number, longitude: number, name: string, address?: string, placeId?: string) => {
    const latLng = `${latitude},${longitude}`;
    
    // Use coordinate-based URLs to avoid encoding issues
    const iosUrl = `maps://maps.apple.com/?daddr=${latLng}&dirflg=d`;
    const androidUrl = `google.navigation:q=${latLng}`;
    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latLng}`;
    
    const primaryUrl = Platform.select({
      ios: iosUrl,
      android: androidUrl,
      default: webUrl
    });
    
    console.log(`Opening directions to: ${name}`);
    console.log(`Coordinates: ${latLng}`);
    
    if (primaryUrl) {
      Linking.canOpenURL(primaryUrl)
        .then((supported) => {
          if (supported) {
            return Linking.openURL(primaryUrl);
          } else {
            // Fallback to Google Maps web with readable location
            console.log("Primary maps app not available, using Google Maps web");
            return Linking.openURL(webUrl);
          }
        })
        .then(() => {
          console.log("Successfully opened directions");
        })
        .catch((error) => {
          console.error("Error opening directions:", error);
          // Final fallback - coordinates only
          const coordinateUrl = `https://maps.google.com/?q=${latLng}`;
          Linking.openURL(coordinateUrl).catch((fallbackError) => {
            console.error("All direction methods failed:", fallbackError);
            Alert.alert(
              "Unable to Open Directions",
              "Please check if you have a maps app installed on your device."
            );
          });
        });
    }
  }, []);

  // Handle "Show on Map" button press
  const handleShowOnMap = useCallback((firm: LawFirm) => {
    setSelectedFirmId(firm.id);
    setCurrentView('map');
    // Update map center to focus on selected firm
    setMapCenter({ lat: firm.latitude, lng: firm.longitude });
  }, []);


  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'call') {
        handleCallPress(data.phone);
      } else if (data.type === 'directions') {
        handleDirectionsPress(data.latitude, data.longitude, data.name);
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
    }
  }, [handleCallPress, handleDirectionsPress]);


  const renderStars = useCallback((rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const yellowColor = '#FBBF24';
    
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          size={14}
          fill={i < fullStars ? yellowColor : 'transparent'}
          color={i < fullStars ? yellowColor : '#E5E7EB'}
        />
      );
    }
    
    return stars;
  }, []);

  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Smart sorting algorithm: prioritize nearest + highest rated law firms
  const sortLawFirmsByQuality = useCallback((firms: LawFirm[]) => {
    return [...firms].sort((a, b) => {
      // Calculate distances if not provided
      const distanceA = a.distance_km !== undefined ? a.distance_km : 
        userLocation ? calculateDistance(
          userLocation.coords.latitude, 
          userLocation.coords.longitude, 
          a.latitude, 
          a.longitude
        ) : 999;
      
      const distanceB = b.distance_km !== undefined ? b.distance_km : 
        userLocation ? calculateDistance(
          userLocation.coords.latitude, 
          userLocation.coords.longitude, 
          b.latitude, 
          b.longitude
        ) : 999;

      // Normalize ratings (0-5 scale, default to 3 if no rating)
      const ratingA = a.rating || 3;
      const ratingB = b.rating || 3;

      // Smart scoring algorithm:
      // - Distance weight: 60% (closer is better)
      // - Rating weight: 40% (higher rating is better)
      // - Distance penalty increases exponentially for far locations
      
      const maxDistance = 50; // km - beyond this, heavy penalty
      const distancePenaltyA = Math.min(distanceA / maxDistance, 2); // Cap at 2x penalty
      const distancePenaltyB = Math.min(distanceB / maxDistance, 2);
      
      // Calculate composite scores (higher is better)
      const scoreA = (ratingA / 5) * 0.4 + (1 / (1 + distancePenaltyA)) * 0.6;
      const scoreB = (ratingB / 5) * 0.4 + (1 / (1 + distancePenaltyB)) * 0.6;

      // Special boost for highly rated nearby firms
      const nearbyBoostA = (distanceA <= 5 && ratingA >= 4.0) ? 0.1 : 0;
      const nearbyBoostB = (distanceB <= 5 && ratingB >= 4.0) ? 0.1 : 0;

      const finalScoreA = scoreA + nearbyBoostA;
      const finalScoreB = scoreB + nearbyBoostB;

      return finalScoreB - finalScoreA; // Sort descending (best first)
    });
  }, [userLocation, calculateDistance]);

  // Memoized sorted law firms for optimal performance
  const sortedLawFirms = useMemo(() => {
    return sortLawFirmsByQuality(lawFirms);
  }, [lawFirms, sortLawFirmsByQuality]);

  // Generate sorted map HTML for better marker ordering
  const generateSortedMapHTML = useCallback(() => {
    const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    const markers = sortedLawFirms.map(firm => ({
      lat: firm.latitude,
      lng: firm.longitude,
      title: firm.name,
      address: firm.address,
      phone: firm.phone,
      rating: firm.rating,
      user_ratings_total: firm.user_ratings_total,
      id: firm.id,
      distance_km: firm.distance_km
    }));

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { 
                margin: 0; 
                padding: 0; 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            }
            #map { 
                height: 100vh; 
                width: 100%; 
            }
            .info-window {
                max-width: 280px;
                padding: 16px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .info-title {
                font-weight: 600;
                font-size: 16px;
                margin-bottom: 8px;
                color: #1a1a1a;
            }
            .info-rating {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
                font-size: 14px;
            }
            .info-rating .stars {
                color: #fbbc04;
                margin-right: 6px;
            }
            .info-rating .rating-text {
                color: #666;
                font-size: 13px;
            }
            .info-distance {
                font-size: 13px;
                color: #059669;
                font-weight: 500;
                margin-bottom: 8px;
            }
            .info-address {
                color: #666;
                font-size: 14px;
                margin-bottom: 12px;
                line-height: 1.4;
            }
            .info-buttons {
                display: flex;
                gap: 8px;
            }
            .info-button {
                flex: 1;
                padding: 10px 14px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                cursor: pointer;
                font-weight: 500;
            }
            .directions-button {
                background-color: #4285F4;
                color: white;
            }
            .call-button {
                background-color: #f5f5f5;
                color: #333;
            }
        </style>
    </head>
    <body>
        <div id="map"></div>
        
        <script>
            let map;
            let infoWindow;
            
            function initMap() {
                // Use higher zoom if a specific firm is selected
                const zoomLevel = ${selectedFirmId ? '16' : '13'};
                
                map = new google.maps.Map(document.getElementById("map"), {
                    zoom: zoomLevel,
                    center: { lat: ${mapCenter.lat}, lng: ${mapCenter.lng} },
                    mapTypeControl: true,
                    streetViewControl: true,
                    fullscreenControl: true,
                    zoomControl: true,
                    zoomControlOptions: {
                        position: google.maps.ControlPosition.LEFT_CENTER
                    },
                    mapTypeControlOptions: {
                        position: google.maps.ControlPosition.TOP_LEFT,
                        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR
                    },
                    streetViewControlOptions: {
                        position: google.maps.ControlPosition.RIGHT_CENTER
                    },
                    fullscreenControlOptions: {
                        position: google.maps.ControlPosition.TOP_RIGHT
                    },
                    styles: [
                        {
                            featureType: "poi.business",
                            elementType: "labels",
                            stylers: [{ visibility: "off" }]
                        }
                    ]
                });
                
                // Add padding to avoid navbar and bottom navigation overlap
                map.setOptions({
                    padding: {
                        top: 100,    // Space for navbar and location counter
                        right: 20,   // Space for street view and fullscreen controls
                        bottom: 180, // Much more space for bottom navigation overlap
                        left: 20     // Space for zoom controls
                    }
                });
                
                infoWindow = new google.maps.InfoWindow();
                
                // Add user location marker if available
                ${userLocation ? `
                const userMarker = new google.maps.Marker({
                    position: { lat: ${userLocation.coords.latitude}, lng: ${userLocation.coords.longitude} },
                    map: map,
                    title: "Your Location",
                    icon: {
                        url: "data:image/svg+xml;charset=UTF-8,%3csvg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3ccircle cx='10' cy='10' r='8' fill='%234285F4'/%3e%3ccircle cx='10' cy='10' r='3' fill='white'/%3e%3c/svg%3e",
                        scaledSize: new google.maps.Size(20, 20),
                        anchor: new google.maps.Point(10, 10)
                    },
                    zIndex: 1000
                });
                ` : ''}
                
                // Add law firm markers (sorted by quality)
                const markers = ${JSON.stringify(markers)};
                
                markers.forEach((marker, index) => {
                    // Check if this is the selected firm for highlighting
                    const isSelected = "${selectedFirmId}" === marker.id;
                    const markerColor = isSelected ? '%234285F4' : '%23EA4335'; // Blue for selected, red for others
                    const markerSize = isSelected ? '40' : '32'; // Larger for selected
                    const markerHeight = isSelected ? '50' : '40'; // Taller for selected
                    
                    const mapMarker = new google.maps.Marker({
                        position: { lat: marker.lat, lng: marker.lng },
                        map: map,
                        title: marker.title,
                        icon: {
                            url: \`data:image/svg+xml;charset=UTF-8,%3csvg width='\${markerSize}' height='\${markerHeight}' viewBox='0 0 \${markerSize} \${markerHeight}' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M\${markerSize/2} 0C\${markerSize*0.225} 0 0 \${markerSize*0.225} 0 \${markerSize/2}c0 \${markerSize*0.375} \${markerSize/2} \${markerSize*0.75} \${markerSize/2} \${markerSize*0.75}s\${markerSize/2}-\${markerSize*0.375} \${markerSize/2}-\${markerSize*0.75}c0-\${markerSize*0.275}-\${markerSize*0.225}-\${markerSize/2}-\${markerSize/2}-\${markerSize/2}z' fill='\${markerColor}'/%3e%3ccircle cx='\${markerSize/2}' cy='\${markerSize/2}' r='\${markerSize*0.1875}' fill='white'/%3e%3c/svg%3e\`,
                            scaledSize: new google.maps.Size(32, 40),
                            anchor: new google.maps.Point(16, 40)
                        },
                        zIndex: 1000 - index // Higher quality firms appear on top
                    });
                    
                    mapMarker.addListener("click", () => {
                        const ratingStars = marker.rating ? 
                            '★'.repeat(Math.floor(marker.rating)) : '';
                            
                        const distanceText = marker.distance_km ? 
                            \`<div class="info-distance">\${marker.distance_km} km away</div>\` : '';
                            
                        const content = \`
                            <div class="info-window">
                                <div class="info-title">\${marker.title}</div>
                                \${marker.rating ? \`
                                    <div class="info-rating">
                                        <span class="stars">\${ratingStars}</span>
                                        <span class="rating-text">\${marker.rating.toFixed(1)} (\${marker.user_ratings_total || "No"} reviews)</span>
                                    </div>
                                \` : ''}
                                \${distanceText}
                                <div class="info-address">\${marker.address}</div>
                                <div class="info-buttons">
                                    <button class="info-button directions-button" onclick="getDirections(\${marker.lat}, \${marker.lng}, '\${marker.title}')">
                                        Directions
                                    </button>
                                    \${marker.phone ? \`
                                        <button class="info-button call-button" onclick="callPhone('\${marker.phone}')">
                                            Call
                                        </button>
                                    \` : ''}
                                </div>
                            </div>
                        \`;
                        
                        infoWindow.setContent(content);
                        infoWindow.open(map, mapMarker);
                    });
                    
                    // Auto-open info window for selected firm
                    if (isSelected) {
                        setTimeout(() => {
                            const ratingStars = marker.rating ? 
                                '★'.repeat(Math.floor(marker.rating)) : '';
                                
                            const distanceText = marker.distance_km ? 
                                \`<div class="info-distance">\${marker.distance_km} km away</div>\` : '';
                                
                            const content = \`
                                <div class="info-window">
                                    <div class="info-title" style="color: #4285F4;">\${marker.title} (Selected)</div>
                                    \${marker.rating ? \`
                                        <div class="info-rating">
                                            <span class="stars">\${ratingStars}</span>
                                            <span class="rating-text">\${marker.rating.toFixed(1)} (\${marker.user_ratings_total || "No"} reviews)</span>
                                        </div>
                                    \` : ''}
                                    \${distanceText}
                                    <div class="info-address">\${marker.address}</div>
                                    <div class="info-buttons">
                                        <button class="info-button directions-button" onclick="getDirections(\${marker.lat}, \${marker.lng}, '\${marker.title}')">
                                            Directions
                                        </button>
                                        \${marker.phone ? \`
                                            <button class="info-button call-button" onclick="callPhone('\${marker.phone}')">
                                                Call
                                            </button>
                                        \` : ''}
                                    </div>
                                </div>
                            \`;
                            
                            infoWindow.setContent(content);
                            infoWindow.open(map, mapMarker);
                        }, 800); // Delay to ensure map is loaded and centered
                    }
                });
                
                // Fit bounds to show all markers
                if (markers.length > 0) {
                    const bounds = new google.maps.LatLngBounds();
                    markers.forEach(marker => {
                        bounds.extend(new google.maps.LatLng(marker.lat, marker.lng));
                    });
                    ${userLocation ? `bounds.extend(new google.maps.LatLng(${userLocation.coords.latitude}, ${userLocation.coords.longitude}));` : ''}
                    map.fitBounds(bounds);
                    
                    // Set appropriate zoom level
                    google.maps.event.addListenerOnce(map, 'bounds_changed', function() {
                        if (map.getZoom() > 15) {
                            map.setZoom(15);
                        }
                        if (map.getZoom() < 10) {
                            map.setZoom(10);
                        }
                    });
                }
            }
            
            function callPhone(phone) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'call',
                    phone: phone
                }));
            }
            
            function getDirections(lat, lng, name) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'directions',
                    latitude: lat,
                    longitude: lng,
                    name: name
                }));
            }
            
            window.initMap = initMap;
        </script>
        <script async defer src="https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&callback=initMap"></script>
    </body>
    </html>
    `;
  }, [sortedLawFirms, mapCenter, userLocation, selectedFirmId]);

  const renderLawFirmCard = useCallback((firm: LawFirm) => (
    <Box key={firm.id} className="mx-2 mb-3 bg-white rounded-lg border border-gray-200">
      <VStack space="sm" className="p-4">
        <HStack space="sm" className="items-start">
          <Box className="p-2 bg-blue-50 rounded-lg">
            <MapPin size={18} color={Colors.primary.blue} />
          </Box>
          
          <VStack space="xs" className="flex-1">
            <Text 
              className="text-base font-semibold leading-tight" 
              style={{ color: Colors.text.head }}
            >
              {firm.name}
            </Text>
            
            <Text 
              className="text-sm" 
              style={{ color: Colors.text.body }}
            >
              {firm.address}
            </Text>
          </VStack>
        </HStack>
        
        <HStack space="md" className="justify-between items-center">
          {firm.rating ? (
            <HStack space="xs" className="items-center">
              <HStack space="xs">
                {renderStars(firm.rating)}
              </HStack>
              <Text className="text-sm font-medium" style={{ color: Colors.text.head }}>
                {firm.rating.toFixed(1)}
              </Text>
              <Text className="text-xs" style={{ color: Colors.text.body }}>
                ({firm.user_ratings_total || "No reviews"})
              </Text>
            </HStack>
          ) : (
            <Text className="text-sm" style={{ color: Colors.text.body }}>
              No ratings
            </Text>
          )}
          
          <Text className="text-xs font-medium" style={{ color: Colors.text.sub }}>
            {firm.distance_km !== undefined ? 
              `${firm.distance_km} km` : 
              userLocation ? 
                `${calculateDistance(
                  userLocation.coords.latitude, 
                  userLocation.coords.longitude, 
                  firm.latitude, 
                  firm.longitude
                ).toFixed(1)} km` : 
                'Distance N/A'
            }
          </Text>
        </HStack>
        
        <VStack space="sm" className="mt-2">
          <HStack space="sm">
            {firm.phone && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-gray-300"
                onPress={() => handleCallPress(firm.phone!)}
                accessibilityLabel={`Call ${firm.name}`}
              >
                <HStack space="xs" className="items-center">
                  <Phone size={16} color={Colors.primary.blue} />
                  <ButtonText className="text-sm" style={{ color: Colors.primary.blue }}>
                    Call
                  </ButtonText>
                </HStack>
              </Button>
            )}
            
            <Button
              size="sm"
              className="flex-1"
              style={{ backgroundColor: Colors.primary.blue }}
              onPress={() => handleDirectionsPress(firm.latitude, firm.longitude, firm.name, firm.address, firm.place_id)}
              accessibilityLabel={`Get directions to ${firm.name}`}
            >
              <HStack space="xs" className="items-center">
                <Navigation size={16} color="white" />
                <ButtonText className="text-sm text-white">
                  Directions
                </ButtonText>
              </HStack>
            </Button>
          </HStack>
          
          <Button
            size="sm"
            variant="outline"
            className="w-full border-blue-500"
            onPress={() => handleShowOnMap(firm)}
            accessibilityLabel={`Show ${firm.name} on map`}
          >
            <HStack space="xs" className="items-center">
              <MapPin size={16} color={Colors.primary.blue} />
              <ButtonText className="text-sm" style={{ color: Colors.primary.blue }}>
                Show on Map
              </ButtonText>
            </HStack>
          </Button>
        </VStack>
      </VStack>
    </Box>
  ), [handleCallPress, handleDirectionsPress, handleShowOnMap, renderStars, calculateDistance, userLocation]);

  // Clean Loading State Component
  const LoadingState = () => (
    <Box className="flex-1 justify-center items-center px-6 bg-gray-50">
      <VStack space="md" className="items-center">
        <Spinner size="large" color={Colors.primary.blue} />
        <VStack space="xs" className="items-center">
          <Text className="text-lg font-semibold" style={{ color: Colors.text.head }}>
            Finding Law Firms
          </Text>
          <Text className="text-sm text-center" style={{ color: Colors.text.body }}>
            Searching for legal services in your area...
          </Text>
        </VStack>
      </VStack>
    </Box>
  );

  // Clean Error State Component
  const ErrorState = () => (
    <Box className="flex-1 justify-center items-center px-8 bg-gray-50">
      <VStack space="md" className="items-center">
        <VStack space="sm" className="items-center">
          <Text className="text-lg font-semibold text-center" style={{ color: Colors.text.head }}>
            Search Error
          </Text>
          <Text className="text-sm text-center" style={{ color: Colors.text.body }}>
            {error}
          </Text>
        </VStack>
        <VStack space="sm" className="items-center w-full">
          <Button
            className="w-full"
            style={{ backgroundColor: Colors.primary.blue }}
            onPress={handleRetry}
            disabled={retryCount >= 3}
          >
            <ButtonText className="font-medium text-white">
              {retryCount >= 3 ? 'Max Retries Reached' : `Try Again (${retryCount}/3)`}
            </ButtonText>
          </Button>
          <Button
            variant="outline"
            className="w-full border-gray-300"
            onPress={handleUseMyLocation}
          >
            <HStack space="xs" className="items-center">
              <Locate size={16} color={Colors.primary.blue} />
              <ButtonText style={{ color: Colors.primary.blue }}>
                Use My Location
              </ButtonText>
            </HStack>
          </Button>
        </VStack>
      </VStack>
    </Box>
  );

  // Clean Empty State Component
  const EmptyState = () => (
    <Box className="flex-1 justify-center items-center px-8 bg-gray-50">
      <VStack space="md" className="items-center">
        <VStack space="sm" className="items-center">
          <Text className="text-lg font-semibold text-center" style={{ color: Colors.text.head }}>
            No Law Firms Found
          </Text>
          <Text className="text-sm text-center" style={{ color: Colors.text.body }}>
            We couldn&apos;t find any law firms in this area.
          </Text>
        </VStack>
        <Button
          className="w-full"
          style={{ backgroundColor: Colors.primary.blue }}
          onPress={handleUseMyLocation}
          accessibilityLabel="Search for law firms near your current location"
        >
          <HStack space="xs" className="items-center">
            <Locate size={16} color="white" />
            <ButtonText className="font-medium text-white">
              Search Near Me
            </ButtonText>
          </HStack>
        </Button>
      </VStack>
    </Box>
  );


  // Enhanced search text change handler with autocomplete
  const handleSearchTextChange = (text: string) => {
    handleSearchTextChangeWithAutocomplete(text);
  };

  // Clean Search Header Component - no memoization needed
  const renderSearchHeader = () => (
    <VStack space="md" className="px-4 py-4 bg-white" style={{ zIndex: 1000 }}>
      <Box className="relative" style={{ zIndex: 1000 }}>
        <Box className="bg-white rounded-lg border border-gray-300 focus:border-blue-400" style={{ 
          minHeight: 48,
          maxHeight: 48,
          height: 48
        }}>
          <HStack style={{ 
            height: 48, 
            alignItems: 'center', 
            paddingHorizontal: 12,
            justifyContent: 'space-between'
          }}>
            {/* Fixed-width container for left icon */}
            <Box style={{ 
              width: 24, 
              height: 48, 
              justifyContent: 'center', 
              alignItems: 'center', 
              flexShrink: 0 
            }}>
              <Search size={18} color="#6B7280" />
            </Box>
            
            <TextInput
              className="flex-1 text-base"
              placeholder="Search by street, barangay, or city"
              placeholderTextColor="#9CA3AF"
              value={searchText}
              onChangeText={handleSearchTextChange}
              onSubmitEditing={handleSearch}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              returnKeyType="search"
              editable={!searching}
              style={{ 
                color: Colors.text.head,
                paddingHorizontal: 12,
                paddingVertical: 0,
                height: 48,
                fontSize: 16,
                lineHeight: 20,
                textAlignVertical: 'center',
                includeFontPadding: false
              }}
              autoCorrect={false}
              autoCapitalize="words"
              blurOnSubmit={false}
              maxLength={100}
              multiline={false}
              numberOfLines={1}
            />
            
            {/* Fixed-width container for right icons */}
            <Box style={{ 
              width: 24, 
              height: 48, 
              justifyContent: 'center', 
              alignItems: 'center', 
              flexShrink: 0 
            }}>
              {searchText.length > 0 && !searching && (
                <Pressable 
                  onPress={() => {
                    setSearchText('');
                    searchTextRef.current = '';
                    setShowPredictions(false);
                    setPredictions([]);
                  }}
                  style={{ 
                    width: 24, 
                    height: 24, 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    borderRadius: 12
                  }}
                >
                  <X size={18} color="#6B7280" />
                </Pressable>
              )}
              {searching && (
                <Box style={{ 
                  width: 18, 
                  height: 18, 
                  justifyContent: 'center', 
                  alignItems: 'center' 
                }}>
                  <Spinner size="small" color={Colors.primary.blue} />
                </Box>
              )}
            </Box>
          </HStack>
        </Box>
        
        {/* Clean Autocomplete Dropdown */}
        {showPredictions && (
          <Box
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 5,
              zIndex: 9999,
              maxHeight: 250,
              overflow: 'hidden',
            }}
          >
            <ScrollView 
              style={{ maxHeight: 250 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              {loadingPredictions && predictions.length === 0 ? (
                <HStack space="sm" style={{ padding: 16, justifyContent: 'center', alignItems: 'center' }}>
                  <Spinner size="small" color={Colors.primary.blue} />
                  <Text size="sm" style={{ color: '#6B7280' }}>Searching...</Text>
                </HStack>
              ) : (
                predictions.map((item, index) => (
              <Pressable
                key={item.place_id}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderBottomWidth: index < predictions.length - 1 ? 0.5 : 0,
                  borderBottomColor: '#F3F4F6',
                }}
                onPress={() => handlePredictionSelectUpdated(item)}
              >
                <MapPin size={16} color="#9CA3AF" style={{ marginRight: 12 }} />
                <VStack space="xs" style={{ flex: 1, minWidth: 0 }}>
                  <Text 
                    size="sm" 
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{ 
                      color: '#111827',
                      fontWeight: '400',
                    }}
                  >
                    {item.main_text}
                  </Text>
                  {item.secondary_text && (
                    <Text 
                      size="xs" 
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={{ 
                        color: '#6B7280',
                      }}
                    >
                      {item.secondary_text}
                    </Text>
                  )}
                </VStack>
              </Pressable>
              ))
            )}
              {loadingPredictions && predictions.length > 0 && (
                <HStack space="sm" style={{ padding: 12, justifyContent: 'center' }}>
                  <Spinner size="small" color={Colors.primary.blue} />
                  <Text size="xs" style={{ color: '#6B7280' }}>Loading more...</Text>
                </HStack>
              )}
            </ScrollView>
          </Box>
        )}
      </Box>

      <HStack space="sm" className="items-center">
        <Pressable
          className="flex-1 px-3 py-2 bg-gray-100 rounded-lg active:bg-gray-200"
          onPress={handleUseMyLocation}
          disabled={searching}
          accessibilityLabel="Use current location"
        >
          <HStack space="xs" className="justify-center items-center">
            <Locate size={16} color={Colors.primary.blue} />
            <Text className="text-sm font-medium" style={{ color: Colors.primary.blue }}>
              Use My Location
            </Text>
          </HStack>
        </Pressable>
        
        {/* Radius Filter Button */}
        <Pressable
          className="px-3 py-2 bg-white rounded-lg border border-gray-300 active:bg-gray-50"
          onPress={() => setShowRadiusFilter(!showRadiusFilter)}
        >
          <HStack space="xs" className="items-center">
            <Text className="text-sm font-medium" style={{ color: Colors.text.head }}>
              {selectedRadius}km
            </Text>
            <Text className="text-xs" style={{ color: '#9CA3AF' }}>▼</Text>
          </HStack>
        </Pressable>
      </HStack>
      
      {/* Radius Filter Dropdown - Overlapping */}
      {showRadiusFilter && (
        <Box 
          style={{
            position: 'absolute',
            top: 110, // Position below the buttons
            right: 16,
            backgroundColor: 'white',
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 10,
            zIndex: 9999,
            minWidth: 120,
          }}
        >
          <VStack space="xs" style={{ padding: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '500', paddingHorizontal: 8, paddingVertical: 4, color: '#6B7280' }}>
              Search radius
            </Text>
            {radiusOptions.map((radius) => (
              <Pressable
                key={radius}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 4,
                  backgroundColor: selectedRadius === radius ? '#EFF6FF' : 'transparent',
                }}
                onPress={() => {
                  setSelectedRadius(radius);
                  setShowRadiusFilter(false);
                  // Trigger new search with updated radius
                  if (searchText.trim()) {
                    handleSearch();
                  }
                }}
              >
                <HStack className="justify-between items-center">
                  <Text 
                    style={{ 
                      fontSize: 14,
                      color: selectedRadius === radius ? Colors.primary.blue : Colors.text.head,
                      fontWeight: selectedRadius === radius ? '500' : '400'
                    }}
                  >
                    {radius} km
                  </Text>
                  {selectedRadius === radius && (
                    <Check size={14} color={Colors.primary.blue} />
                  )}
                </HStack>
              </Pressable>
            ))}
          </VStack>
        </Box>
      )}

      {error && (
        <Box className="p-3 bg-red-50 rounded-lg border border-red-200">
          <Text className="text-sm" style={{ color: '#DC2626' }}>
            {error}
          </Text>
        </Box>
      )}

      {lawFirms.length > 0 && (
        <Text className="px-1 text-sm font-medium" style={{ color: Colors.text.sub }}>
          {lawFirms.length} law firms found in {currentLocationName}
        </Text>
      )}
    </VStack>
  );

  if (loading && lawFirms.length === 0) {
    return <LoadingState />;
  }

  // Render Tab Navigation
  const renderTabNavigation = () => (
    <Box className="bg-white border-b border-gray-200">
      <HStack className="px-3 py-2">
        <Pressable
          onPress={() => {
            setCurrentView('list');
            setSelectedFirmId(null); // Clear selection when going back to list
          }}
          style={{
            flex: 1,
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 5,
            backgroundColor: currentView === 'list' ? Colors.primary.blue : 'transparent',
            alignItems: 'center',
            marginRight: 4
          }}
        >
          <Text style={{
            fontSize: 12,
            fontWeight: '600',
            color: currentView === 'list' ? 'white' : Colors.text.sub
          }}>
            List ({lawFirms.length})
          </Text>
        </Pressable>
        
        <Pressable
          onPress={() => setCurrentView('map')}
          style={{
            flex: 1,
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 5,
            backgroundColor: currentView === 'map' ? Colors.primary.blue : 'transparent',
            alignItems: 'center',
            marginLeft: 4
          }}
        >
          <Text style={{
            fontSize: 12,
            fontWeight: '600',
            color: currentView === 'map' ? 'white' : Colors.text.sub
          }}>
            Map
          </Text>
        </Pressable>
      </HStack>
    </Box>
  );

  // Render List View (Full Screen)
  const renderListView = () => (
    <ScrollView 
      className="flex-1" 
      style={{ backgroundColor: '#f9fafb' }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
      keyboardShouldPersistTaps="handled"
    >
      {sortedLawFirms.length > 0 ? (
        <VStack space="xs" style={{ paddingTop: 12, paddingHorizontal: 8 }}>
          {sortedLawFirms.map(renderLawFirmCard)}
        </VStack>
      ) : error ? (
        <Box className="px-4">
          <ErrorState />
        </Box>
      ) : (
        <Box className="px-4">
          <EmptyState />
        </Box>
      )}
    </ScrollView>
  );

  // Render Map View (Full Screen)
  const renderMapView = () => (
    <Box className="relative flex-1">
      {/* Law Firm Counter - Top Right */}
      {lawFirms.length > 0 && (
        <Box className="absolute top-3 right-3" style={{ zIndex: 1000 }}>
          <Box style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 3,
            borderWidth: 1,
            borderColor: 'rgba(0, 0, 0, 0.1)'
          }}>
            <Text style={{
              fontSize: 11,
              fontWeight: '600',
              color: Colors.text.head
            }}>
              {lawFirms.length} locations
            </Text>
          </Box>
        </Box>
      )}

      {/* Full Screen Map */}
      {webViewSupported && WebView ? (
        <WebView
          source={{ html: generateSortedMapHTML() }}
          style={{ flex: 1 }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <Box className="flex-1 justify-center items-center bg-gray-50">
              <VStack space="md" className="items-center">
                <Spinner size="large" color={Colors.primary.blue} />
                <Text className="text-sm" style={{ color: Colors.text.body }}>Loading map...</Text>
              </VStack>
            </Box>
          )}
        />
      ) : (
        <Box className="flex-1 justify-center items-center bg-gray-100">
          <VStack space="md" className="items-center">
            <MapPin size={48} color={Colors.text.sub} />
            <Text style={{ fontSize: 16, color: Colors.text.sub }}>
              Map not available on this platform
            </Text>
          </VStack>
        </Box>
      )}
    </Box>
  );

  return (
    <Box className="flex-1 bg-gray-50">
      <VStack className="flex-1">
        {/* Fixed Search Header */}
        <Box className="bg-white border-b border-gray-200" style={{ zIndex: 100 }}>
          {renderSearchHeader()}
        </Box>
        
        {/* Tab Navigation */}
        {renderTabNavigation()}
        
        {/* Dynamic Content Based on Current View */}
        {currentView === 'list' ? renderListView() : renderMapView()}
      </VStack>
    </Box>
  );
}
