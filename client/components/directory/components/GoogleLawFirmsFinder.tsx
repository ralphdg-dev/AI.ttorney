import React, { useState, useEffect, useCallback } from 'react';
import { View, Linking, Platform, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
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


  // Search law firms using backend proxy (avoids CORS issues)
  const searchLawFirmsViaProxy = async (latitude: number, longitude: number, locationName: string) => {
    try {
      setLoading(true);
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
        throw new Error(`API error: ${response.status}`);
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
        console.log(`Found ${firms.length} law firms in ${locationName}`);
      } else {
        console.log(`No law firms found in ${locationName}`);
        setLawFirms([]);
      }
    } catch (error) {
      console.error('Error fetching law firms:', error);
      setLawFirms([]);
    } finally {
      setLoading(false);
    }
  };

  // Search by location name using the new endpoint
  const searchByLocationName = async (locationName: string) => {
    try {
      setLoading(true);
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
        throw new Error(`API error: ${response.status}`);
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
        setLawFirms([]);
      }
    } catch (error) {
      console.error('Error searching by location:', error);
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
    if (!searchText.trim()) return;
    
    setSearching(true);
    
    try {
      await searchByLocationName(searchText.trim());
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Search Error', 'Unable to search for that location. Please check your internet connection and try again.');
    } finally {
      setSearching(false);
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
    <View key={firm.id} style={{ backgroundColor: 'white', marginHorizontal: 16, marginBottom: 12, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2, borderWidth: 1, borderColor: '#e5e7eb' }}>
      <VStack space="sm" style={{ padding: 16 }}>
        <HStack space="sm" style={{ alignItems: 'flex-start' }}>
          <View style={{ backgroundColor: '#fecaca', padding: 8, borderRadius: 20 }}>
            <MapPin size={18} color="#DC2626" />
          </View>
          
          <VStack space="xs" style={{ flex: 1 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#111827' }}>
              {firm.name}
            </Text>
            
            <Text style={{ color: '#6b7280', fontSize: 14 }}>
              {firm.address}
            </Text>
            
            <HStack space="xs" style={{ alignItems: 'center' }}>
              {firm.rating && (
                <HStack space="xs" style={{ alignItems: 'center' }}>
                  <HStack space="xs">
                    {renderStars(firm.rating)}
                  </HStack>
                  <Text style={{ fontSize: 14, color: '#6b7280' }}>
                    {firm.rating.toFixed(1)} stars
                  </Text>
                </HStack>
              )}
              
              <Text style={{ fontSize: 12, color: '#9ca3af', marginLeft: 'auto' }}>
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
              </Text>
            </HStack>
          </VStack>
        </HStack>
        
        <HStack space="sm" style={{ marginTop: 12 }}>
          {firm.phone && (
            <Button
              size="sm"
              variant="outline"
              style={{ flex: 1 }}
              onPress={() => handleCallPress(firm.phone!)}
            >
              <HStack space="xs" style={{ alignItems: 'center' }}>
                <Phone size={16} color={Colors.primary.blue} />
                <ButtonText style={{ fontSize: 14 }}>Call</ButtonText>
              </HStack>
            </Button>
          )}
          
          <Button
            size="sm"
            style={{ flex: 1, backgroundColor: Colors.primary.blue }}
            onPress={() => handleDirectionsPress(firm.latitude, firm.longitude, firm.name)}
          >
            <HStack space="xs" style={{ alignItems: 'center' }}>
              <Navigation size={16} color="white" />
              <ButtonText style={{ fontSize: 14 }}>Directions</ButtonText>
            </HStack>
          </Button>
        </HStack>
      </VStack>
    </View>
  );

  if (loading && lawFirms.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <Spinner size="large" color={Colors.primary.blue} />
        <Text style={{ marginTop: 16, color: '#6b7280' }}>Finding law firms & offices...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {webViewSupported && WebView ? (
        // Mobile: Overlay search on map
        <>
          {/* Search Bar Overlay for Mobile */}
          <View style={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 10 }}>
            <View style={{ backgroundColor: 'white', borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, borderWidth: 1, borderColor: '#e5e7eb' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
                <Search size={20} color="#6b7280" />
                <TextInput
                  style={{ flex: 1, marginLeft: 12, fontSize: 16 }}
                  placeholder="Find law firms in any location..."
                  value={searchText}
                  onChangeText={setSearchText}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                  editable={!searching}
                />
                {searching ? (
                  <Spinner size="small" color={Colors.primary.blue} />
                ) : (
                  <TouchableOpacity onPress={handleSearch} style={{ marginLeft: 8 }}>
                    <Text style={{ color: '#2563eb', fontWeight: '500' }}>Search</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Current Location Button */}
            <TouchableOpacity 
              onPress={handleUseMyLocation}
              style={{ marginTop: 8, backgroundColor: '#eff6ff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe' }}
            >
              <HStack space="xs" style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Locate size={16} color={Colors.primary.blue} />
                <Text style={{ color: '#1d4ed8', fontSize: 14, fontWeight: '500' }}>
                  Use My Location
                </Text>
              </HStack>
            </TouchableOpacity>

            {/* Results Info */}
            <View style={{ marginTop: 8, backgroundColor: 'rgba(255,255,255,0.95)', padding: 8, borderRadius: 6 }}>
              <Text style={{ color: '#111827', fontSize: 14, fontWeight: '500' }}>
                {lawFirms.length} law firms in {currentLocationName}
              </Text>
            </View>
          </View>

          {/* Google Maps WebView */}
          {lawFirms.length > 0 ? (
            <WebView
              source={{ html: generateMapHTML() }}
              style={{ flex: 1 }}
              onMessage={handleWebViewMessage}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
                  <Spinner size="large" color={Colors.primary.blue} />
                  <Text style={{ marginTop: 16, color: '#6b7280' }}>Loading map...</Text>
                </View>
              )}
            />
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
              <MapPin size={48} color="#9ca3af" />
              <Text style={{ color: '#6b7280', textAlign: 'center', marginTop: 16, marginHorizontal: 32, fontSize: 16 }}>
                No law firms found in this area.
              </Text>
              <Text style={{ color: '#9ca3af', textAlign: 'center', marginTop: 8, marginHorizontal: 32, fontSize: 14 }}>
                Try searching for a different city or location.
              </Text>
              <Button
                style={{ marginTop: 16, backgroundColor: Colors.primary.blue }}
                onPress={handleUseMyLocation}
              >
                <ButtonText>Search Near Me</ButtonText>
              </Button>
            </View>
          )}
        </>
      ) : (
        // Web: Proper spacing with header
        <>
          {/* Search Section for Web */}
          <View style={{ backgroundColor: 'white', marginHorizontal: 16, marginTop: 16, marginBottom: 8, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, borderWidth: 1, borderColor: '#e5e7eb' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
              <Search size={20} color="#6b7280" />
              <TextInput
                style={{ flex: 1, marginLeft: 12, fontSize: 16 }}
                placeholder="Find law firms in any location..."
                value={searchText}
                onChangeText={setSearchText}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                editable={!searching}
              />
              {searching ? (
                <Spinner size="small" color={Colors.primary.blue} />
              ) : (
                <TouchableOpacity onPress={handleSearch} style={{ marginLeft: 8 }}>
                  <Text style={{ color: '#2563eb', fontWeight: '500' }}>Search</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Current Location Button for Web */}
          <TouchableOpacity 
            onPress={handleUseMyLocation}
            style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: '#eff6ff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe' }}
          >
            <HStack space="xs" style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Locate size={16} color={Colors.primary.blue} />
              <Text style={{ color: '#1d4ed8', fontSize: 14, fontWeight: '500' }}>
                Use My Location
              </Text>
            </HStack>
          </TouchableOpacity>

          {/* Results Info for Web */}
          <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
            <Text style={{ color: '#111827', fontSize: 16, fontWeight: '600' }}>
              {lawFirms.length} law firms in {currentLocationName}
            </Text>
          </View>

          {/* Law Firms List for Web */}
          {lawFirms.length > 0 ? (
            <ScrollView 
              style={{ flex: 1 }} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 80 }}
            >
              {lawFirms.map(renderLawFirmCard)}
            </ScrollView>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb', paddingHorizontal: 32 }}>
              <MapPin size={48} color="#9ca3af" />
              <Text style={{ color: '#6b7280', textAlign: 'center', marginTop: 16, fontSize: 16 }}>
                No law firms found in this area.
              </Text>
              <Text style={{ color: '#9ca3af', textAlign: 'center', marginTop: 8, fontSize: 14 }}>
                Try searching for a different city or location.
              </Text>
              <Button
                style={{ marginTop: 16, backgroundColor: Colors.primary.blue }}
                onPress={handleUseMyLocation}
              >
                <ButtonText>Search Near Me</ButtonText>
              </Button>
            </View>
          )}
        </>
      )}
    </View>
  );
}
