import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text,
  TextInput, 
  TouchableOpacity, 
  Animated, 
  StyleSheet, 
  Dimensions,
  FlatList 
} from 'react-native';
import { Search, X, Hash, User } from 'lucide-react-native';
import Colors from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import ForumSearchService from '../../services/forumSearchService';

interface AnimatedSearchBarProps {
  visible: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
}

const { width } = Dimensions.get('window');

const AnimatedSearchBar: React.FC<AnimatedSearchBarProps> = ({
  visible,
  onClose,
  onSearch,
  placeholder = "Search posts, users, or categories...",
  value = "",
  onChangeText
}) => {
  const { session } = useAuth();
  const [searchQuery, setSearchQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const slideAnim = useRef(new Animated.Value(-80)).current; // Start collapsed
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current; // Start slightly smaller
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      // Smooth slide down animation with spring physics
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 120,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Focus input after animation completes
        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      });
    } else {
      // Smooth slide up animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -80,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, opacityAnim, scaleAnim]);

  const handleTextChange = async (text: string) => {
    setSearchQuery(text);
    if (onChangeText) {
      onChangeText(text);
    }
    
    // Show intelligent suggestions
    if (text.length >= 2) {
      try {
        // Get search suggestions with authentication
        const suggestions = await ForumSearchService.getSearchSuggestions(text, session);
        
        if (suggestions.length > 0) {
          setSuggestions(suggestions);
          setShowSuggestions(true);
        } else {
          // Fallback suggestions
          const fallbackSuggestions = [];
          const textLower = text.toLowerCase();
          
          if (text.startsWith('@')) {
            // No fallback suggestions for user search - let API handle it
          } else {
            // Category suggestions
            const categories = ['Family Law', 'Labor Law', 'Civil Law', 'Consumer Law', 'Criminal Law', 'Others'];
            const categoryMatches = categories.filter(cat => cat.toLowerCase().includes(textLower));
            fallbackSuggestions.push(...categoryMatches);
            
            // Legal term suggestions
            const legalTerms = ['contract', 'employment', 'divorce', 'inheritance', 'criminal defense'];
            const termMatches = legalTerms.filter(term => term.includes(textLower));
            fallbackSuggestions.push(...termMatches);
          }
          
          if (fallbackSuggestions.length > 0) {
            setSuggestions(fallbackSuggestions.slice(0, 5));
            setShowSuggestions(true);
          } else {
            setShowSuggestions(false);
          }
        }
      } catch (error) {
        console.error('Error getting suggestions:', error);
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
    
    // Trigger search as user types (debounced)
    if (__DEV__) {
      console.log('🔍 AnimatedSearchBar: Triggering search for:', text);
    }
    onSearch(text);
  };

  const handleClear = () => {
    setSearchQuery('');
    if (onChangeText) {
      onChangeText('');
    }
    onSearch('');
    setShowSuggestions(false);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleClose = () => {
    setSearchQuery('');
    if (onChangeText) {
      onChangeText('');
    }
    onSearch('');
    setShowSuggestions(false);
    setSuggestions([]);
    onClose();
  };

  const handleSuggestionPress = (suggestion: string) => {
    setSearchQuery(suggestion);
    if (onChangeText) {
      onChangeText(suggestion);
    }
    onSearch(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ],
          opacity: opacityAnim,
        }
      ]}
    >
      <View style={styles.searchContainer}>
        <View style={styles.inputContainer}>
          <Search size={20} color={Colors.text.secondary} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={Colors.text.secondary}
            value={searchQuery}
            onChangeText={handleTextChange}
            returnKeyType="search"
            onSubmitEditing={() => onSearch(searchQuery)}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <X size={18} color={Colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <X size={22} color={Colors.text.primary} />
        </TouchableOpacity>
      </View>
      
      {/* Search Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <Animated.View 
          style={[
            styles.suggestionsContainer,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <FlatList
            data={suggestions}
            keyExtractor={(item, index) => `${item}-${index}`}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.suggestionItem,
                  index === suggestions.length - 1 && styles.lastSuggestionItem
                ]}
                onPress={() => handleSuggestionPress(item)}
                activeOpacity={0.7}
              >
                <View style={styles.suggestionContent}>
                  {item.startsWith('@') ? (
                    <View style={styles.suggestionIconContainer}>
                      <User size={16} color={Colors.primary.blue} style={styles.suggestionIcon} />
                    </View>
                  ) : (
                    <View style={styles.suggestionIconContainer}>
                      <Hash size={16} color={Colors.text.secondary} style={styles.suggestionIcon} />
                    </View>
                  )}
                  <Text style={styles.suggestionText}>{item}</Text>
                </View>
              </TouchableOpacity>
            )}
            style={styles.suggestionsList}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
    paddingVertical: 0, // Remove default padding
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  closeButton: {
    padding: 8,
  },
  suggestionsContainer: {
    backgroundColor: Colors.background.primary,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border.light,
    maxHeight: 200,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border.light,
    backgroundColor: Colors.background.primary,
  },
  lastSuggestionItem: {
    borderBottomWidth: 0,
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  suggestionIcon: {
    marginRight: 0,
  },
  suggestionText: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '500',
  },
});

export default AnimatedSearchBar;
