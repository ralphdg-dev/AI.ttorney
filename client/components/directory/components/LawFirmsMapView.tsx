import React, { useState, useEffect, useCallback } from 'react';
import { View, Alert, Linking, Platform, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { 
  Phone, 
  Navigation, 
  MapPin, 
  Star, 
  AlertCircle, 
  Map,
  ArrowLeft,
  Smartphone
} from 'lucide-react-native';
import Colors from '../../../constants/Colors';

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
  const [mapCenter, setMapCenter] = useState(CONSTANTS.DEFAULT_LOCATION);
  const [webViewSupported, setWebViewSupported] = useState(false);
  const [isExpoGo, setIsExpoGo] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const [selectedFirm, setSelectedFirm] = useState<LawFirm | null>(null);

  const fetchNearbyLawFirms = useCallback(async () => {
    try {
      setLoading(true);
      
      // Use user location if available, otherwise use default location
      const searchLocation = userLocation 
        ? { lat: userLocation.coords.latitude, lng: userLocation.coords.longitude }
        : CONSTANTS.DEFAULT_LOCATION;

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.254.103:8000';
      const response = await fetch(`${apiUrl}/api/places/nearby`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: searchLocation.lat,
          longitude: searchLocation.lng,
          radius: CONSTANTS.SEARCH_RADIUS,
          type: 'lawyer'
        }),
      });

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
  }, [userLocation]);

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
        
        <VStack space="sm" className="mt-3">
          <HStack space="sm">
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
          </HStack>
          
          <Button
            size="sm"
            variant="outline"
            className="w-full"
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
              <MapPin size={16} color={Colors.primary.blue} />
              <ButtonText className="text-sm">
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

  // Show web-style layout: map on top, list below (no WebView issues)
  if (!webViewSupported || Platform.OS === 'web' || isExpoGo || !showMapView) {
    return (
      <View className="flex-1 bg-gray-50">
        {isExpoGo && (
          <View className="mx-4 mt-4 bg-blue-100 p-3 rounded-lg border border-blue-300">
            <HStack space="sm" className="items-center justify-center">
              <Smartphone size={16} color={Colors.primary.blue} />
              <Text className="text-blue-800 text-sm text-center flex-1">
                Running in Expo Go - Map view requires Development Build for full functionality
              </Text>
            </HStack>
          </View>
        )}
        
        
        {/* Map Section - Top Half */}
        <View style={{ height: CONSTANTS.MAP_HEIGHT }} className="bg-white border-b border-gray-200">
          {!locationPermission && (
            <View className="absolute top-2 left-2 right-2 bg-yellow-100 p-2 rounded-lg border border-yellow-300 z-10">
              <HStack space="xs" className="items-center justify-center">
                <AlertCircle size={14} color="#D97706" />
                <Text className="text-yellow-800 text-xs text-center flex-1">
                  {ERROR_MESSAGES.LOCATION_DENIED}
                </Text>
              </HStack>
            </View>
          )}
          
          {/* Map Placeholder with Law Firms Count */}
          <View className="flex-1 bg-gray-100 justify-center items-center relative">
            <VStack space="sm" className="items-center">
              <MapPin size={48} color={Colors.primary.blue} />
              <Text className="text-lg font-semibold" style={{ color: Colors.text.head }}>
                {lawFirms.length} Law Firms Found
              </Text>
              <Text className="text-sm text-center px-4" style={{ color: Colors.text.body }}>
                {userLocation 
                  ? `Near your location in ${mapCenter.lat.toFixed(4)}, ${mapCenter.lng.toFixed(4)}`
                  : 'Near Manila, Philippines'
                }
              </Text>
            </VStack>
            
            {/* Interactive Map Button */}
            {webViewSupported && !isExpoGo && (
              <View className="absolute bottom-4 right-4">
                <Button
                  size="sm"
                  style={{ backgroundColor: Colors.primary.blue }}
                  onPress={() => setShowMapView(true)}
                >
                  <HStack space="xs" className="items-center">
                    <Map size={16} color="white" />
                    <ButtonText className="text-sm">View Interactive Map</ButtonText>
                  </HStack>
                </Button>
              </View>
            )}
          </View>
        </View>
        
        {/* Law Firms List - Bottom Half */}
        <ScrollView 
          className="flex-1 bg-gray-50" 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View className="p-4 bg-white border-b border-gray-200">
            <Text className="text-sm font-medium text-center" style={{ color: Colors.text.head }}>
              {lawFirms.length} Law Firms & Legal Services
            </Text>
          </View>
          
          {lawFirms.length > 0 ? (
            <VStack space="sm" className="p-4">
              {lawFirms.map(renderLawFirmCard)}
            </VStack>
          ) : (
            <View className="flex-1 justify-center items-center py-20">
              <VStack space="md" className="items-center">
                <AlertCircle size={48} color="#9CA3AF" />
                <Text className="text-gray-500 text-center mt-4 mx-8">
                  {ERROR_MESSAGES.NO_RESULTS}
                </Text>
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
