import React, { useRef, useCallback } from 'react';
import { 
  TextInput, 
  Pressable, 
  ScrollView
} from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Box } from '@/components/ui/box';
import { Spinner } from '@/components/ui/spinner';
import { MapPin } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../../constants/Colors';

interface AutocompletePrediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  types: string[];
}

interface SearchHeaderProps {
  searchText: string;
  onSearchTextChange: (text: string) => void;
  onSearch: () => void;
  placeholder?: string;
  predictions?: AutocompletePrediction[];
  showPredictions?: boolean;
  loadingPredictions?: boolean;
  onPredictionSelect?: (prediction: AutocompletePrediction) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  searching?: boolean;
  showAutocomplete?: boolean;
  rightButton?: React.ReactNode;
}

export default function SearchHeader({
  searchText,
  onSearchTextChange,
  onSearch,
  placeholder = "Search...",
  predictions = [],
  showPredictions = false,
  loadingPredictions = false,
  onPredictionSelect,
  onFocus,
  onBlur,
  searching = false,
  showAutocomplete = false,
  rightButton
}: SearchHeaderProps) {
  const searchTextRef = useRef<string>('');

  const handleSearchTextChange = useCallback((text: string) => {
    searchTextRef.current = text;
    onSearchTextChange(text);
  }, [onSearchTextChange]);

  const handleClearSearch = useCallback(() => {
    searchTextRef.current = '';
    onSearchTextChange('');
  }, [onSearchTextChange]);

  return (
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
            paddingLeft: 20,
            paddingRight: 16
          }}>
            <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 14 }} />
            
            <TextInput
              className="flex-1 text-base"
              placeholder={placeholder}
              placeholderTextColor="#9CA3AF"
              value={searchText}
              onChangeText={handleSearchTextChange}
              onSubmitEditing={onSearch}
              onFocus={onFocus}
              onBlur={onBlur}
              returnKeyType="search"
              editable={!searching}
              style={{ 
                color: Colors.text.head,
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
                  onPress={handleClearSearch}
                  style={{ 
                    width: 24, 
                    height: 24, 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    borderRadius: 12
                  }}
                >
                  <Ionicons name="close" size={18} color="#6B7280" />
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
        
        {/* Autocomplete Dropdown - only show if showAutocomplete is true */}
        {showAutocomplete && showPredictions && (
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
                    onPress={() => onPredictionSelect?.(item)}
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

      {/* Right button section (for location/filter buttons) */}
      {rightButton && (
        <Box>
          {rightButton}
        </Box>
      )}
    </VStack>
  );
}
