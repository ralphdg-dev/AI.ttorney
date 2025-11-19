import React, { useCallback, useMemo } from "react";
import { Box } from "@/components/ui/box";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";

interface UnifiedSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  loading?: boolean;
  editable?: boolean;
  showFilterIcon?: boolean;
  onFilterPress?: () => void;
  containerClassName?: string;
}

/**
 * Optimized, reusable search bar component
 * Based on glossary/learn page design with performance improvements
 * 
 * Features:
 * - Memoized handlers for optimal performance
 * - Consistent 16px horizontal padding
 * - Optional filter icon
 * - Loading state support
 * - Accessible and responsive
 */
export default function UnifiedSearchBar({
  value,
  onChangeText,
  placeholder = "Search...",
  loading = false,
  editable = true,
  showFilterIcon = false,
  onFilterPress,
  containerClassName = "pt-6 pb-4",
}: UnifiedSearchBarProps) {
  // Memoized handlers for performance
  const handleTextChange = useCallback(
    (text: string) => {
      onChangeText(text);
    },
    [onChangeText]
  );

  const handleFilterPress = useCallback(() => {
    if (onFilterPress) {
      onFilterPress();
    }
  }, [onFilterPress]);

  // Memoized input props
  const inputProps = useMemo(
    () => ({
      value,
      placeholder,
      placeholderTextColor: "#9CA3AF",
      editable: editable && !loading,
    }),
    [value, placeholder, editable, loading]
  );

  return (
    <Box className={containerClassName}>
      <Input
        variant="outline"
        size="lg"
        className="bg-white rounded-lg border border-gray-300"
      >
        <InputSlot className="pl-4">
          <Ionicons name="search" size={20} color="#9CA3AF" />
        </InputSlot>
        <InputField
          {...inputProps}
          onChangeText={handleTextChange}
          className="text-gray-800 text-base"
        />
        {showFilterIcon && (
          <InputSlot className="pr-4">
            <Ionicons
              name="options"
              size={20}
              color={Colors.text.sub}
              onPress={handleFilterPress}
            />
          </InputSlot>
        )}
      </Input>
    </Box>
  );
}
