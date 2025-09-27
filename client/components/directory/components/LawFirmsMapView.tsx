import React, { useState, useEffect, useCallback } from 'react';
import { View, Alert, Linking, Platform, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Phone, Navigation, MapPin, Star, ExternalLink } from 'lucide-react-native';
import Colors from '../../../constants/Colors';

// Platform-specific WebView import with fallback
let WebView: any = null;
try {
  if (Platform.OS !== 'web') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { WebView: RNWebView } = require('react-native-webview');
    WebView = RNWebView;
  }
} catch (error) {
  console.warn('WebView not available on this platform:', error);
}

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
}

interface LawFirmsMapViewProps {
  searchQuery?: string;
}

export default function LawFirmsMapView({ searchQuery }: LawFirmsMapViewProps) {
  const [lawFirms, setLawFirms] = useState<LawFirm[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [mapCenter, setMapCenter] = useState({ lat: 14.5995, lng: 120.9842 }); // Manila default

  const fetchNearbyLawFirms = useCallback(async () => {
    try {
      setLoading(true);
      
      // Use user location if available, otherwise use default location
      const searchLocation = userLocation 
        ? { lat: userLocation.coords.latitude, lng: userLocation.coords.longitude }
        : { lat: 14.5995, lng: 120.9842 }; // Manila default

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/law-firms/nearby`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: searchLocation.lat,
          longitude: searchLocation.lng,
          radius: 10000, // 10km radius
          query: searchQuery || 'law firm lawyer attorney legal services'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.law_firms) {
        setLawFirms(data.law_firms);
        setMapCenter(searchLocation);
      } else {
        throw new Error(data.message || 'Failed to fetch law firms');
      }
    } catch (error) {
      console.error('Error fetching law firms:', error);
      // For demo purposes, add some sample law firms
      const sampleLawFirms: LawFirm[] = [
        {
          id: 'sample1',
          name: 'Atty. Santos Law Office',
          address: 'Makati City, Metro Manila, Philippines',
          phone: '+63 2 8123 4567',
          rating: 4.5,
          types: ['lawyer', 'legal_services'],
          latitude: 14.5547,
          longitude: 121.0244,
          place_id: 'sample1'
        },
        {
          id: 'sample2',
          name: 'Cruz & Associates Law Firm',
          address: 'BGC, Taguig City, Metro Manila, Philippines',
          phone: '+63 2 8987 6543',
          rating: 4.2,
          types: ['lawyer', 'legal_services'],
          latitude: 14.5515,
          longitude: 121.0473,
          place_id: 'sample2'
        },
        {
          id: 'sample3',
          name: 'Legal Aid Center Manila',
          address: 'Quezon City, Metro Manila, Philippines',
          phone: '+63 2 8456 7890',
          rating: 4.0,
          types: ['lawyer', 'legal_services'],
          latitude: 14.6760,
          longitude: 121.0437,
          place_id: 'sample3'
        }
      ];
      setLawFirms(sampleLawFirms);
    } finally {
      setLoading(false);
    }
  }, [userLocation, searchQuery]);

  const requestLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        setLocationPermission(true);
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location);
        setMapCenter({
          lat: location.coords.latitude,
          lng: location.coords.longitude
        });
      } else {
        setLocationPermission(false);
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setLocationPermission(false);
    }
  }, []);

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
    const markers = lawFirms.map(firm => ({
      lat: firm.latitude,
      lng: firm.longitude,
      title: firm.name,
      address: firm.address,
      phone: firm.phone,
      rating: firm.rating,
      id: firm.id
    }));

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            #map { height: 100vh; width: 100%; }
            .info-window {
                max-width: 250px;
                padding: 10px;
            }
            .info-title {
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 5px;
                color: #333;
            }
            .info-address {
                color: #666;
                font-size: 14px;
                margin-bottom: 8px;
                line-height: 1.3;
            }
            .info-rating {
                color: #666;
                font-size: 14px;
                margin-bottom: 10px;
            }
            .info-buttons {
                display: flex;
                gap: 8px;
            }
            .info-button {
                flex: 1;
                padding: 8px 12px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                cursor: pointer;
                font-weight: 500;
            }
            .call-button {
                background-color: #fff;
                color: #023D7B;
                border: 1px solid #023D7B;
            }
            .directions-button {
                background-color: #023D7B;
                color: white;
            }
            .info-button:hover {
                opacity: 0.8;
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
                    styles: [
                        {
                            featureType: "poi",
                            elementType: "labels",
                            stylers: [{ visibility: "off" }]
                        }
                    ]
                });
                
                infoWindow = new google.maps.InfoWindow();
                
                // Add user location marker if available
                ${userLocation ? `
                new google.maps.Marker({
                    position: { lat: ${userLocation.coords.latitude}, lng: ${userLocation.coords.longitude} },
                    map: map,
                    title: "Your Location",
                    icon: {
                        url: "data:image/svg+xml;charset=UTF-8,%3csvg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3ccircle cx='10' cy='10' r='8' fill='%234285F4'/%3e%3ccircle cx='10' cy='10' r='3' fill='white'/%3e%3c/svg%3e",
                        scaledSize: new google.maps.Size(20, 20),
                        anchor: new google.maps.Point(10, 10)
                    }
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
                            url: "data:image/svg+xml;charset=UTF-8,%3csvg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M16 2C11.6 2 8 5.6 8 10c0 7.5 8 18 8 18s8-10.5 8-18c0-4.4-3.6-8-8-8z' fill='%23023D7B'/%3e%3ccircle cx='16' cy='10' r='3' fill='white'/%3e%3c/svg%3e",
                            scaledSize: new google.maps.Size(32, 32),
                            anchor: new google.maps.Point(16, 32)
                        }
                    });
                    
                    mapMarker.addListener("click", () => {
                        const content = \`
                            <div class="info-window">
                                <div class="info-title">\${marker.title}</div>
                                <div class="info-address">\${marker.address}</div>
                                \${marker.rating ? \`<div class="info-rating">⭐ \${marker.rating.toFixed(1)} stars</div>\` : ''}
                                <div class="info-buttons">
                                    \${marker.phone ? \`<button class="info-button call-button" onclick="callPhone('\${marker.phone}')">📞 Call</button>\` : ''}
                                    <button class="info-button directions-button" onclick="getDirections(\${marker.lat}, \${marker.lng}, '\${marker.title}')">🗺️ Directions</button>
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
                    
                    // Don't zoom too close if there's only one marker
                    google.maps.event.addListenerOnce(map, 'bounds_changed', function() {
                        if (map.getZoom() > 15) {
                            map.setZoom(15);
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

  const handleOpenInMaps = (latitude: number, longitude: number, name: string) => {
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(googleMapsUrl);
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

  const renderLawFirmCard = (firm: LawFirm) => (
    <View key={firm.id} className="bg-white mx-4 mb-4 rounded-lg shadow-sm border border-gray-200">
      <VStack space="sm" className="p-4">
        <HStack space="sm" className="items-start">
          <View className="bg-blue-100 p-2 rounded-full">
            <MapPin size={20} color={Colors.primary.blue} />
          </View>
          
          <VStack space="xs" className="flex-1">
            <Text className="font-bold text-base text-gray-900" numberOfLines={2}>
              {firm.name}
            </Text>
            
            <Text className="text-gray-600 text-sm" numberOfLines={3}>
              {firm.address}
            </Text>
            
            {firm.rating && (
              <HStack space="xs" className="items-center">
                <HStack space="xs">
                  {renderStars(firm.rating)}
                </HStack>
                <Text className="text-sm text-gray-600">
                  {firm.rating.toFixed(1)} stars
                </Text>
              </HStack>
            )}
          </VStack>
        </HStack>
        
        <HStack space="sm" className="mt-3">
          {firm.phone && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onPress={() => handleCallPress(firm.phone!)}
            >
              <HStack space="xs" className="items-center">
                <Phone size={16} color={Colors.primary.blue} />
                <ButtonText className="text-sm">Call</ButtonText>
              </HStack>
            </Button>
          )}
          
          <Button
            size="sm"
            className="flex-1"
            style={{ backgroundColor: Colors.primary.blue }}
            onPress={() => handleDirectionsPress(firm.latitude, firm.longitude, firm.name)}
          >
            <HStack space="xs" className="items-center">
              <Navigation size={16} color="white" />
              <ButtonText className="text-sm">Directions</ButtonText>
            </HStack>
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onPress={() => handleOpenInMaps(firm.latitude, firm.longitude, firm.name)}
          >
            <HStack space="xs" className="items-center">
              <ExternalLink size={16} color={Colors.primary.blue} />
              <ButtonText className="text-sm">View</ButtonText>
            </HStack>
          </Button>
        </HStack>
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

  // Fallback to list view if WebView is not available or on unsupported platforms
  if (!WebView || Platform.OS === 'web') {
    return (
      <View className="flex-1 bg-gray-50">
        {!locationPermission && (
          <View className="mx-4 mt-4 bg-yellow-100 p-3 rounded-lg border border-yellow-300">
            <Text className="text-yellow-800 text-sm text-center">
              📍 Location access denied. Showing law firms near Manila. Enable location for personalized results.
            </Text>
          </View>
        )}
        
        <ScrollView 
          className="flex-1" 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 80 }}
        >
          {lawFirms.length > 0 ? (
            lawFirms.map(renderLawFirmCard)
          ) : (
            <View className="flex-1 justify-center items-center py-20">
              <MapPin size={48} color={Colors.text.sub} />
              <Text className="text-gray-500 text-center mt-4 mx-8">
                No law firms found in this area. Try adjusting your search or location.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // WebView-based map for supported platforms
  return (
    <View className="flex-1">
      {!locationPermission && (
        <View className="absolute top-4 left-4 right-4 bg-yellow-100 p-3 rounded-lg border border-yellow-300 z-10">
          <Text className="text-yellow-800 text-sm text-center">
            📍 Location access denied. Showing law firms near Manila. Enable location for personalized results.
          </Text>
        </View>
      )}
      
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
