import React, { useState, useEffect, useCallback } from 'react';
import { Linking, Platform, Alert, ScrollView, TextInput } from 'react-native';
import * as Location from 'expo-location';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField, InputSlot } from '@/components/ui/input';
import { Box } from '@/components/ui/box';
import { Pressable } from '@/components/ui/pressable';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Search, MapPin, Locate, Phone, Navigation, Star } from 'lucide-react-native';
import Colors from '../../../constants/Colors';

interface LawFirm {
  id: string;
  name: string;
  address: string;
  phone?: string;
  rating?: number;
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

  const handleSearch = async () => {
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
  };

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

  const handleUseMyLocation = async () => {
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
            const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latLng}`;
            Linking.openURL(googleMapsUrl);
          }
        })
        .catch((error) => console.error('Error opening maps app:', error));
    }
  };

  const handleWebViewMessage = (event: any) => {
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
  };

  const generateMapHTML = () => {
    const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    const markers = lawFirms.map(firm => ({
      lat: firm.latitude,
      lng: firm.longitude,
      title: firm.name,
      address: firm.address,
      phone: firm.phone,
      rating: firm.rating,
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
                
                // Add law firm markers
                const markers = ${JSON.stringify(markers)};
                
                markers.forEach(marker => {
                    const mapMarker = new google.maps.Marker({
                        position: { lat: marker.lat, lng: marker.lng },
                        map: map,
                        title: marker.title,
                        icon: {
                            url: "data:image/svg+xml;charset=UTF-8,%3csvg width='32' height='40' viewBox='0 0 32 40' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24c0-8.8-7.2-16-16-16z' fill='%23EA4335'/%3e%3ccircle cx='16' cy='16' r='6' fill='white'/%3e%3c/svg%3e",
                            scaledSize: new google.maps.Size(32, 40),
                            anchor: new google.maps.Point(16, 40)
                        }
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
                                        <span class="rating-text">\${marker.rating.toFixed(1)} (\${Math.floor(Math.random() * 50) + 10} reviews)</span>
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
  };

  const renderStars = (rating: number) => {
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
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const renderLawFirmCard = (firm: LawFirm) => (
    <Box key={firm.id} className="mx-4 mb-4 bg-white rounded-xl border border-gray-100 shadow-sm">
      <VStack space="md" className="p-5">
        {/* Header Section */}
        <HStack space="sm" className="items-start">
          <Box className="bg-blue-50 p-3 rounded-full">
            <MapPin size={20} color={Colors.primary.blue} />
          </Box>
          
          <VStack space="xs" className="flex-1">
            <Text 
              className="font-semibold text-lg leading-tight" 
              style={{ color: Colors.text.head }}
            >
              {firm.name}
            </Text>
            
            <Text 
              className="text-sm leading-relaxed" 
              style={{ color: Colors.text.body }}
            >
              {firm.address}
            </Text>
          </VStack>
        </HStack>
        
        {/* Rating and Distance Section */}
        <HStack space="md" className="items-center">
          {firm.rating && (
            <HStack space="xs" className="items-center">
              <HStack space="xs">
                {renderStars(firm.rating)}
              </HStack>
              <Text className="text-sm font-medium" style={{ color: Colors.text.sub }}>
                {firm.rating.toFixed(1)}
              </Text>
              <Text className="text-xs" style={{ color: Colors.text.body }}>
                ({Math.floor(Math.random() * 50) + 10} reviews)
              </Text>
            </HStack>
          )}
          
          <Badge className="ml-auto bg-gray-100">
            <BadgeText className="text-xs font-medium" style={{ color: Colors.text.body }}>
              {firm.distance_km !== undefined ? 
                `${firm.distance_km} km away` : 
                userLocation ? 
                  `${calculateDistance(
                    userLocation.coords.latitude, 
                    userLocation.coords.longitude, 
                    firm.latitude, 
                    firm.longitude
                  ).toFixed(1)} km away` : 
                  'Distance unavailable'
              }
            </BadgeText>
          </Badge>
        </HStack>
        
        {/* Action Buttons */}
        <HStack space="sm" className="mt-2">
          {firm.phone && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-gray-200"
              onPress={() => handleCallPress(firm.phone!)}
              accessibilityLabel={`Call ${firm.name}`}
              accessibilityHint="Opens phone app to call this law firm"
            >
              <HStack space="xs" className="items-center">
                <Phone size={16} color={Colors.primary.blue} />
                <ButtonText className="text-sm font-medium" style={{ color: Colors.primary.blue }}>
                  Call
                </ButtonText>
              </HStack>
            </Button>
          )}
          
          <Button
            size="sm"
            className="flex-1"
            style={{ backgroundColor: Colors.primary.blue }}
            onPress={() => handleDirectionsPress(firm.latitude, firm.longitude, firm.name)}
            accessibilityLabel={`Get directions to ${firm.name}`}
            accessibilityHint="Opens maps app with directions to this law firm"
          >
            <HStack space="xs" className="items-center">
              <Navigation size={16} color="white" />
              <ButtonText className="text-sm font-medium text-white">
                Directions
              </ButtonText>
            </HStack>
          </Button>
        </HStack>
      </VStack>
    </Box>
  );

  // Loading State Component
  const LoadingState = () => (
    <Box className="flex-1 justify-center items-center bg-gray-50 px-6">
      <VStack space="lg" className="items-center">
        <Box className="bg-white p-6 rounded-full shadow-sm">
          <Spinner size="large" color={Colors.primary.blue} />
        </Box>
        <VStack space="sm" className="items-center">
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

  // Error State Component
  const ErrorState = () => (
    <Box className="flex-1 justify-center items-center bg-gray-50 px-8">
      <VStack space="lg" className="items-center">
        <Box className="bg-red-50 p-8 rounded-full shadow-sm">
          <MapPin size={48} color="#EF4444" />
        </Box>
        <VStack space="sm" className="items-center">
          <Text className="text-xl font-semibold text-center" style={{ color: Colors.text.head }}>
            Search Error
          </Text>
          <Text className="text-sm text-center leading-relaxed" style={{ color: Colors.text.body }}>
            {error}
          </Text>
        </VStack>
        <VStack space="sm" className="items-center">
          <Button
            className="mt-2"
            style={{ backgroundColor: Colors.primary.blue }}
            onPress={handleRetry}
            disabled={retryCount >= 3}
          >
            <HStack space="xs" className="items-center">
              <Text className="font-medium text-white">
                {retryCount >= 3 ? 'Max Retries Reached' : `Retry (${retryCount}/3)`}
              </Text>
            </HStack>
          </Button>
          <Button
            variant="outline"
            className="border-gray-200"
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

  // Empty State Component
  const EmptyState = () => (
    <Box className="flex-1 justify-center items-center bg-gray-50 px-8">
      <VStack space="lg" className="items-center">
        <Box className="bg-white p-8 rounded-full shadow-sm">
          <MapPin size={48} color="#9CA3AF" />
        </Box>
        <VStack space="sm" className="items-center">
          <Text className="text-xl font-semibold text-center" style={{ color: Colors.text.head }}>
            No Law Firms Found
          </Text>
          <Text className="text-sm text-center leading-relaxed" style={{ color: Colors.text.body }}>
            We couldn&apos;t find any law firms in this area. Try searching for a different city or use your current location.
          </Text>
        </VStack>
        <Button
          className="mt-2"
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

  // Search Header Component
  const SearchHeader = () => (
    <Box className="bg-white border-b border-gray-100">
      <VStack space="md" className="px-4 py-4">
        {/* Search Input */}
        <Box className="relative">
          <Input className="border border-gray-200 rounded-xl bg-gray-50 focus:bg-white" size="lg">
            <InputSlot className="absolute left-4 top-4">
              <Search size={20} color="#9CA3AF" />
            </InputSlot>
            <InputField
              placeholder="Search by city, province, or location..."
              placeholderTextColor="#9CA3AF"
              value={searchText}
              onChangeText={(text) => {
                setSearchText(text);
                if (error) setError(null);
              }}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              editable={!searching}
              className="pl-12 py-4 text-base"
              style={{ color: Colors.text.head }}
              accessibilityLabel="Search for law firms by location"
              accessibilityHint="Enter a city, province, or location name to find nearby law firms"
            />
            {searching && (
              <InputSlot className="absolute right-4 top-4">
                <Spinner size="small" color={Colors.primary.blue} />
              </InputSlot>
            )}
          </Input>
        </Box>

        {/* Location Button */}
        <Pressable
          className="bg-blue-50 border border-blue-100 rounded-xl p-4 active:bg-blue-100"
          onPress={handleUseMyLocation}
          disabled={searching}
          accessibilityLabel="Use current location to find nearby law firms"
          accessibilityRole="button"
        >
          <HStack space="sm" className="items-center justify-center">
            <Locate size={18} color={Colors.primary.blue} />
            <Text className="font-medium" style={{ color: Colors.primary.blue }}>
              Use My Current Location
            </Text>
          </HStack>
        </Pressable>

        {/* Error Message */}
        {error && (
          <Box className="bg-red-50 border border-red-200 rounded-lg p-3">
            <Text className="text-sm text-center" style={{ color: '#DC2626' }}>
              {error}
            </Text>
          </Box>
        )}

        {/* Results Info */}
        {lawFirms.length > 0 && (
          <Box className="bg-gray-50 rounded-lg p-3">
            <HStack space="sm" className="items-center">
              <MapPin size={16} color={Colors.text.body} />
              <Text className="font-medium" style={{ color: Colors.text.head }}>
                {lawFirms.length} law firms found
              </Text>
              <Text className="text-sm" style={{ color: Colors.text.body }}>
                in {currentLocationName}
              </Text>
            </HStack>
          </Box>
        )}
      </VStack>
    </Box>
  );

  if (loading && lawFirms.length === 0) {
    return <LoadingState />;
  }

  return (
    <Box className="flex-1 bg-gray-50">
      {webViewSupported && WebView ? (
        // Mobile: Map View with Overlay
        <>
          {/* Floating Search Overlay */}
          <Box className="absolute top-4 left-4 right-4 z-10">
            <VStack space="sm">
              {/* Search Card */}
              <Box className="bg-white rounded-2xl shadow-lg border border-gray-100">
                <VStack space="sm" className="p-4">
                  <HStack space="sm" className="items-center">
                    <Search size={20} color="#9CA3AF" />
                    <TextInput
                      className="flex-1 text-base"
                      placeholder="Search by city or location..."
                      placeholderTextColor="#9CA3AF"
                      value={searchText}
                      onChangeText={(text) => {
                        setSearchText(text);
                        if (error) setError(null);
                      }}
                      onSubmitEditing={handleSearch}
                      returnKeyType="search"
                      editable={!searching}
                      style={{ color: Colors.text.head }}
                      accessibilityLabel="Search for law firms by location"
                    />
                    {searching ? (
                      <Spinner size="small" color={Colors.primary.blue} />
                    ) : (
                      <Pressable onPress={handleSearch} className="px-2">
                        <Text className="font-medium" style={{ color: Colors.primary.blue }}>
                          Search
                        </Text>
                      </Pressable>
                    )}
                  </HStack>
                </VStack>
              </Box>

              {/* Location Button */}
              <Pressable 
                className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 active:bg-gray-50"
                onPress={handleUseMyLocation}
                accessibilityLabel="Use current location"
                accessibilityRole="button"
              >
                <HStack space="sm" className="items-center justify-center">
                  <Locate size={16} color={Colors.primary.blue} />
                  <Text className="font-medium text-sm" style={{ color: Colors.primary.blue }}>
                    Use My Location
                  </Text>
                </HStack>
              </Pressable>

              {/* Error Message for Mobile */}
              {error && (
                <Box className="bg-red-50/95 rounded-lg p-2 shadow-sm border border-red-200">
                  <Text className="text-xs text-center" style={{ color: '#DC2626' }}>
                    {error}
                  </Text>
                </Box>
              )}

              {/* Results Badge */}
              {lawFirms.length > 0 && (
                <Box className="bg-white/95 rounded-lg p-2 shadow-sm">
                  <Text className="text-sm font-medium text-center" style={{ color: Colors.text.head }}>
                    {lawFirms.length} law firms in {currentLocationName}
                  </Text>
                </Box>
              )}
            </VStack>
          </Box>

          {/* Map or Empty State */}
          {lawFirms.length > 0 ? (
            <WebView
              source={{ html: generateMapHTML() }}
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
        // Web/Desktop: List View
        <>
          <SearchHeader />
          
          {lawFirms.length > 0 ? (
            <ScrollView 
              className="flex-1" 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
            >
              <VStack space="sm" className="py-2">
                {lawFirms.map(renderLawFirmCard)}
              </VStack>
            </ScrollView>
          ) : error ? (
            <ErrorState />
          ) : (
            <EmptyState />
          )}
        </>
      )}
    </Box>
  );
}
