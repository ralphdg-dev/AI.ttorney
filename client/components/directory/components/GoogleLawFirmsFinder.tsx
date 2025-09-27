import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { Linking, Platform, Alert, ScrollView, TextInput } from 'react-native';
import * as Location from 'expo-location';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField, InputSlot } from '@/components/ui/input';
import { Box } from '@/components/ui/box';
import { Pressable } from '@/components/ui/pressable';
import { Spinner } from '@/components/ui/spinner';
import { Search, MapPin, Locate, Phone, Navigation, Star } from 'lucide-react-native';
import Colors from '../../../constants/Colors';

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
  const searchInputRef = useRef<TextInput>(null);


  // Search law firms using backend proxy (avoids CORS issues)
  const searchLawFirmsViaProxy = async (latitude: number, longitude: number, locationName: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log(`Searching law firms at: ${latitude}, ${longitude} for ${locationName}`);

      // Use backend proxy to avoid CORS issues
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/places/nearby`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude,
          longitude,
          radius: 25000,
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
  };

  // Search by location name using the new endpoint
  const searchByLocationName = async (locationName: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log(`Searching for law firms in: ${locationName}`);
      
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/places/search-by-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location_name: locationName,
          radius: 15000, // 15km for more location-specific results
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
  };

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
  }, []);

  // Initialize WebView dynamically for platform compatibility
  useEffect(() => {
    const initializeWebView = async () => {
      try {
        // Only load WebView on supported platforms
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          const { WebView: RNWebView } = await import('react-native-webview');
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
    if (!searchText.trim()) {
      setError('Please enter a location to search.');
      return;
    }
    
    setSearching(true);
    
    try {
      await searchByLocationName(searchText.trim());
    } catch (error) {
      console.error('Search error:', error);
      const errorMessage = 'Unable to search for that location. Please check your internet connection and try again.';
      setError(errorMessage);
      Alert.alert('Search Error', errorMessage);
    } finally {
      setSearching(false);
    }
  }, [searchText]);

  const handleRetry = async () => {
    if (retryCount >= 3) {
      setError('Maximum retry attempts reached. Please check your internet connection.');
      return;
    }
    
    setRetryCount(prev => prev + 1);
    setError(null);
    
    if (searchText.trim()) {
      await handleSearch();
    } else {
      await requestLocationPermission();
    }
  };

  const handleUseMyLocation = useCallback(async () => {
    if (userLocation) {
      await searchLawFirmsViaProxy(
        userLocation.coords.latitude, 
        userLocation.coords.longitude, 
        'your location'
      );
      setSearchText('');
    } else {
      await requestLocationPermission();
    }
  }, [userLocation, requestLocationPermission]);

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
    const encodedName = encodeURIComponent(name);
    
    // Enhanced URL schemes prioritizing readable names and addresses
    // Priority: name + address > address > name > coordinates
    const fullLocation = address ? `${name}, ${address}` : name;
    const encodedFullLocation = encodeURIComponent(fullLocation);
    
    const iosUrl = address 
      ? `maps://maps.apple.com/?daddr=${encodedFullLocation}&dirflg=d` 
      : `maps://maps.apple.com/?daddr=${encodedName}&dirflg=d`;
    
    const androidUrl = address 
      ? `google.navigation:q=${encodedFullLocation}` 
      : `google.navigation:q=${encodedName}`;
    
    const webUrl = address 
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodedFullLocation}` 
      : `https://www.google.com/maps/dir/?api=1&destination=${encodedName}`;
    
    const primaryUrl = Platform.select({
      ios: iosUrl,
      android: androidUrl,
      default: webUrl
    });
    
    console.log(`Opening directions to: ${fullLocation}`);
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
          // Final fallback - coordinates with name as query
          const coordinateUrl = `https://maps.google.com/?q=${encodedName}@${latLng}`;
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
                max-width: 300px;
                padding: 16px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .info-title {
                font-weight: 600;
                font-size: 16px;
                margin-bottom: 8px;
                color: #1a1a1a;
                line-height: 1.3;
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
                color: #5f6368;
            }
            .info-distance {
                font-size: 13px;
                color: #5f6368;
                margin-bottom: 8px;
            }
            .info-address {
                color: #5f6368;
                font-size: 14px;
                margin-bottom: 16px;
                line-height: 1.4;
            }
            .info-buttons {
                display: flex;
                gap: 8px;
                margin-top: 12px;
            }
            .info-button {
                flex: 1;
                padding: 10px 16px;
                border: none;
                border-radius: 24px;
                font-size: 14px;
                cursor: pointer;
                font-weight: 500;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                transition: all 0.2s;
            }
            .directions-button {
                background-color: #1a73e8;
                color: white;
            }
            .directions-button:hover {
                background-color: #1557b0;
            }
            .call-button {
                background-color: #fff;
                color: #1a73e8;
                border: 1px solid #dadce0;
            }
            .call-button:hover {
                background-color: #f8f9fa;
            }
        </style>
    </head>
    <body>
        <div id="map"></div>
        
        <script>
            let map;
            let infoWindow;
            
            function initMap() {
                map = new google.maps.Map(document.getElementById("map"), {
                    zoom: 13,
                    center: { lat: ${mapCenter.lat}, lng: ${mapCenter.lng} },
                    mapTypeControl: true,
                    streetViewControl: true,
                    fullscreenControl: false,
                    zoomControl: true,
                    styles: [
                        {
                            featureType: "poi.business",
                            elementType: "labels",
                            stylers: [{ visibility: "off" }]
                        }
                    ]
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
                    const mapMarker = new google.maps.Marker({
                        position: { lat: marker.lat, lng: marker.lng },
                        map: map,
                        title: marker.title,
                        icon: {
                            url: "data:image/svg+xml;charset=UTF-8,%3csvg width='32' height='40' viewBox='0 0 32 40' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24c0-8.8-7.2-16-16-16z' fill='%23EA4335'/%3e%3ccircle cx='16' cy='16' r='6' fill='white'/%3e%3c/svg%3e",
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
                                        🧭 Directions
                                    </button>
                                    \${marker.phone ? \`
                                        <button class="info-button call-button" onclick="callPhone('\${marker.phone}')">
                                            📞 Call
                                        </button>
                                    \` : ''}
                                </div>
                            </div>
                        \`;
                        
                        infoWindow.setContent(content);
                        infoWindow.open(map, mapMarker);
                    });
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
  }, [sortedLawFirms, mapCenter, userLocation]);

  const renderLawFirmCard = useCallback((firm: LawFirm) => (
    <Box key={firm.id} className="mx-4 mb-3 bg-white rounded-lg border border-gray-200">
      <VStack space="sm" className="p-4">
        <HStack space="sm" className="items-start">
          <Box className="p-2 bg-blue-50 rounded-lg">
            <MapPin size={18} color={Colors.primary.blue} />
          </Box>
          
          <VStack space="xs" className="flex-1">
            <Text 
              className="text-base font-semibold leading-tight" 
              style={{ color: Colors.text.head }}
              numberOfLines={2}
            >
              {firm.name}
            </Text>
            
            <Text 
              className="text-sm" 
              style={{ color: Colors.text.body }}
              numberOfLines={2}
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
        
        <HStack space="sm" className="mt-2">
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
      </VStack>
    </Box>
  ), [handleCallPress, handleDirectionsPress, renderStars, calculateDistance, userLocation]);

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

  // Clean Search Input Component
  const SearchInput = memo(({
    value, 
    onChangeText, 
    onSubmitEditing, 
    searching, 
    placeholder = "Search by city or location" 
  }: {
    value: string;
    onChangeText: (text: string) => void;
    onSubmitEditing: () => void;
    searching: boolean;
    placeholder?: string;
  }) => (
    <Box className="relative">
      <Input 
        className="bg-white rounded-lg border border-gray-300 focus:border-blue-400" 
        size="lg"
        style={{ minHeight: 48 }}
      >
        <InputSlot className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <Search size={18} color="#6B7280" />
        </InputSlot>
        <InputField
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmitEditing}
          returnKeyType="search"
          editable={!searching}
          className="py-3 pr-10 pl-10 text-base"
          style={{ color: Colors.text.head }}
          accessibilityLabel="Search for law firms by location"
          autoCorrect={false}
          autoCapitalize="words"
          blurOnSubmit={false}
        />
        {searching && (
          <InputSlot className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Spinner size="small" color={Colors.primary.blue} />
          </InputSlot>
        )}
      </Input>
    </Box>
  ));
  SearchInput.displayName = 'SearchInput';

  // Mobile-Optimized Search Component
  const MobileSearchInput = memo(({
    value, 
    onChangeText, 
    onSubmitEditing, 
    searching 
  }: {
    value: string;
    onChangeText: (text: string) => void;
    onSubmitEditing: () => void;
    searching: boolean;
  }) => (
    <TextInput
      ref={searchInputRef}
      className="flex-1 text-base font-medium"
      placeholder="Type city name (e.g., Manila)"
      placeholderTextColor="#9CA3AF"
      value={value}
      onChangeText={onChangeText}
      onSubmitEditing={onSubmitEditing}
      returnKeyType="search"
      editable={!searching}
      style={{ 
        color: Colors.text.head,
        paddingVertical: 12, // Better touch target
        lineHeight: 20
      }}
      accessibilityLabel="Search for law firms by location"
      accessibilityHint="Type a city name to find nearby law firms"
      autoCorrect={false}
      autoCapitalize="words"
      blurOnSubmit={false}
    />
  ));
  MobileSearchInput.displayName = 'MobileSearchInput';

  // Memoized search text change handler
  const handleSearchTextChange = useCallback((text: string) => {
    setSearchText(text);
    if (error) setError(null);
    if (text.length > 0) setRetryCount(0);
  }, [error, setRetryCount]);

  // Clean Search Header Component
  const renderSearchHeader = useCallback(() => (
    <VStack space="md" className="px-4 py-4 bg-white">
      <SearchInput
        value={searchText}
        onChangeText={handleSearchTextChange}
        onSubmitEditing={handleSearch}
        searching={searching}
      />

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
      </HStack>

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
  ), [SearchInput, searchText, handleSearchTextChange, handleSearch, searching, handleUseMyLocation, error, lawFirms.length, currentLocationName]);

  if (loading && lawFirms.length === 0) {
    return <LoadingState />;
  }

  return (
    <Box className="flex-1 bg-gray-50">
      {webViewSupported && WebView ? (
        // Mobile: Map View with Overlay
        <>
          {/* Floating Search Overlay */}
          <Box className="absolute top-4 right-4 left-4 z-10">
            <VStack space="sm">
              {/* Clean Mobile Search Card */}
              <Box className="bg-white rounded-lg border border-gray-200">
                <HStack space="sm" className="items-center p-3">
                  <Search size={16} color="#6B7280" />
                  <MobileSearchInput
                    value={searchText}
                    onChangeText={handleSearchTextChange}
                    onSubmitEditing={handleSearch}
                    searching={searching}
                  />
                  {searching ? (
                    <Spinner size="small" color={Colors.primary.blue} />
                  ) : (
                    <Pressable onPress={handleSearch} className="px-2 py-1 bg-blue-500 rounded">
                      <Text className="text-xs font-medium text-white">
                        Go
                      </Text>
                    </Pressable>
                  )}
                </HStack>
              </Box>

              {/* Clean Location Button */}
              <Pressable 
                className="px-3 py-2 bg-white rounded-lg border border-gray-200 active:bg-gray-50"
                onPress={handleUseMyLocation}
                accessibilityLabel="Use current location"
              >
                <HStack space="xs" className="justify-center items-center">
                  <Locate size={14} color={Colors.primary.blue} />
                  <Text className="text-xs font-medium" style={{ color: Colors.primary.blue }}>
                    Near Me
                  </Text>
                </HStack>
              </Pressable>

              {/* Clean Status Messages */}
              {error && (
                <Box className="px-3 py-2 bg-red-100 rounded-lg border border-red-200">
                  <Text className="text-xs font-medium text-center text-red-700">
                    {error.length > 40 ? error.substring(0, 40) + '...' : error}
                  </Text>
                </Box>
              )}

              {lawFirms.length > 0 && (
                <Text className="text-xs font-medium text-center" style={{ color: Colors.text.sub }}>
                  {lawFirms.length} law firms found
                </Text>
              )}
            </VStack>
          </Box>

          {/* Map or Empty State */}
          {sortedLawFirms.length > 0 ? (
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
          ) : error ? (
            <ErrorState />
          ) : (
            <EmptyState />
          )}
        </>
      ) : (
        // Web/Desktop: Fully Scrollable List View
        <ScrollView 
          className="flex-1" 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          {renderSearchHeader()}
          
          {sortedLawFirms.length > 0 ? (
            <VStack space="sm" className="py-2">
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
      )}
    </Box>
  );
}
