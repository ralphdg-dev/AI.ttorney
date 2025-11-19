import React from "react";
import { TextInput, Pressable } from "react-native";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Box } from "@/components/ui/box";
import { Ionicons } from "@expo/vector-icons";
import { Spinner } from "@/components/ui/spinner";
import Colors from "../../constants/Colors";

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
  loading?: boolean;
  editable?: boolean;
  maxLength?: number;
}

export default function SearchBar({
  searchQuery,
  onSearchChange,
  placeholder = "Search...",
  loading = false,
  editable = true,
  maxLength = 100,
}: SearchBarProps) {
  return (
    <Box className="bg-white border-b border-gray-200" style={{ zIndex: 100 }}>
      <VStack space="md" className="px-4 py-4 bg-white" style={{ zIndex: 1000 }}>
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
      </VStack>
    </Box>
  );
}
