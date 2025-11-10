import React from 'react';
import { Text, TextStyle } from 'react-native';
import Colors from '../../constants/Colors';

interface SearchHighlightProps {
  text: string;
  searchTerm: string;
  style?: TextStyle;
  highlightStyle?: TextStyle;
  isUsername?: boolean;
}

const SearchHighlight: React.FC<SearchHighlightProps> = ({
  text,
  searchTerm,
  style,
  highlightStyle,
  isUsername = false
}) => {
  if (!searchTerm || !text) {
    return <Text style={style}>{text}</Text>;
  }

  // Remove @ symbol from search term for username searches
  const cleanSearchTerm = searchTerm.startsWith('@') ? searchTerm.slice(1) : searchTerm;
  
  if (!cleanSearchTerm) {
    return <Text style={style}>{text}</Text>;
  }

  // Create regex for case-insensitive search
  const regex = new RegExp(`(${cleanSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  const defaultHighlightStyle: TextStyle = {
    backgroundColor: isUsername ? '#10B981' + '20' : Colors.primary.blue + '20', // 20% opacity - green for usernames
    color: isUsername ? '#10B981' : Colors.primary.blue,
    fontWeight: '600',
  };

  return (
    <Text style={style}>
      {parts.map((part, index) => {
        const isHighlight = regex.test(part);
        return (
          <Text
            key={index}
            style={isHighlight ? { ...defaultHighlightStyle, ...highlightStyle } : undefined}
          >
            {part}
          </Text>
        );
      })}
    </Text>
  );
};

export default SearchHighlight;
