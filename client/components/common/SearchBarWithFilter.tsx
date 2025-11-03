import React from "react";
import { TextInput, Pressable } from "react-native";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Box } from "@/components/ui/box";
import { Text as UIText } from "@/components/ui/text";
import { Pressable as UIPressable } from "@/components/ui/pressable";
import { Ionicons } from "@expo/vector-icons";
import { Spinner } from "@/components/ui/spinner";
import Colors from "../../constants/Colors";

interface SearchBarWithFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onFilterPress: () => void;
  placeholder?: string;
  loading?: boolean;
  editable?: boolean;
  maxLength?: number;
  hasActiveFilters?: boolean;
}

export default function SearchBarWithFilter({
  searchQuery,
  onSearchChange,
  onFilterPress,
  placeholder = "Search...",
  loading = false,
  editable = true,
  maxLength = 100,
  hasActiveFilters = false,
}: SearchBarWithFilterProps) {
  return (
    <Box className="bg-white border-b border-gray-200" style={{ zIndex: 100 }}>
      <VStack space="md" className="px-4 py-3 bg-white" style={{ zIndex: 1000 }}>
        <HStack space="sm" className="items-center">
          <Box className="flex-1 relative" style={{ zIndex: 1000 }}>
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
                  value={searchQuery}
                  onChangeText={onSearchChange}
                  returnKeyType="search"
                  editable={editable && !loading}
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
                  maxLength={maxLength}
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
                  {searchQuery.length > 0 && !loading && (
                    <Pressable 
                      onPress={() => onSearchChange('')}
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
                  {loading && (
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
          </Box>
          
          {/* Filter Button - Right of Search Bar */}
          <UIPressable
            onPress={onFilterPress}
            className="bg-white border border-gray-300 px-3 py-2 rounded-lg relative active:bg-gray-50"
            style={{ height: 48, justifyContent: 'center' }}
          >
            <HStack space="xs" className="items-center">
              <Ionicons
                name="filter-outline"
                size={16}
                color={Colors.primary.blue}
              />
              <UIText className="text-sm font-medium" style={{ color: Colors.text.head }}>
                Filter
              </UIText>
            </HStack>
            {hasActiveFilters && (
              <Box
                className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                style={{ backgroundColor: Colors.primary.blue }}
              />
            )}
          </UIPressable>
        </HStack>
      </VStack>
    </Box>
  );
}
