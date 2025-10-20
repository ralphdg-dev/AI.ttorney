import React, { ReactElement } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Colors from '../../constants/Colors';

interface MarkdownTextProps {
  text: string;
  style?: any;
  isUserMessage?: boolean;
}

/**
 * Simple markdown text renderer for chat messages
 * Supports: **bold**, numbered lists, bullet points
 * Industry best practice: Clean, readable formatting without asterisks
 */
export const MarkdownText: React.FC<MarkdownTextProps> = ({ text, style, isUserMessage = false }) => {
  const textColor = isUserMessage ? '#FFFFFF' : Colors.text.primary;
  const boldColor = isUserMessage ? '#FFFFFF' : Colors.text.primary;

  // Clean up lawyer chatbot formatting issues
  // Remove markdown horizontal rules (---) and clean up inline URLs
  let cleanedText = text
    .replace(/^---\s*$/gm, '') // Remove horizontal rules
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '$1') // Convert [text](url) to just text
    .replace(/(https?:\/\/[^\s\)]+)/g, '') // Remove standalone URLs
    .trim();

  // Split text into lines for processing
  const lines = cleanedText.split('\n');
  const elements: ReactElement[] = [];

  lines.forEach((line, lineIndex) => {
    // Skip empty lines
    if (line.trim() === '') {
      elements.push(<View key={`empty-${lineIndex}`} style={{ height: 8 }} />);
      return;
    }

    // Check if line is a numbered list (e.g., "1. ", "2. ")
    const numberedListMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numberedListMatch) {
      const [, number, content] = numberedListMatch;
      elements.push(
        <View key={`line-${lineIndex}`} style={styles.listItem}>
          <Text style={[styles.listNumber, { color: boldColor }]}>{number}.</Text>
          <Text style={[styles.listContent, style, { color: textColor }]}>
            {renderInlineMarkdown(content, textColor, boldColor)}
          </Text>
        </View>
      );
      return;
    }

    // Check if line is a bullet point (e.g., "• ", "- ")
    const bulletMatch = line.match(/^[•\-]\s+(.+)$/);
    if (bulletMatch) {
      const [, content] = bulletMatch;
      elements.push(
        <View key={`line-${lineIndex}`} style={styles.listItem}>
          <Text style={[styles.bullet, { color: boldColor }]}>•</Text>
          <Text style={[styles.listContent, style, { color: textColor }]}>
            {renderInlineMarkdown(content, textColor, boldColor)}
          </Text>
        </View>
      );
      return;
    }

    // Regular paragraph
    elements.push(
      <Text key={`line-${lineIndex}`} style={[styles.paragraph, style, { color: textColor }]}>
        {renderInlineMarkdown(line, textColor, boldColor)}
      </Text>
    );
  });

  return <View>{elements}</View>;
};

/**
 * Render inline markdown (bold text)
 * Converts **text** to bold, removes asterisks
 */
const renderInlineMarkdown = (text: string, textColor: string, boldColor: string): (string | ReactElement)[] => {
  const parts: (string | ReactElement)[] = [];
  let currentIndex = 0;
  let partIndex = 0;

  // Find all **bold** patterns
  const boldRegex = /\*\*(.+?)\*\*/g;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before the bold part
    if (match.index > currentIndex) {
      parts.push(text.substring(currentIndex, match.index));
    }

    // Add bold text (without asterisks)
    parts.push(
      <Text key={`bold-${partIndex++}`} style={[styles.bold, { color: boldColor }]}>
        {match[1]}
      </Text>
    );

    currentIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    parts.push(text.substring(currentIndex));
  }

  return parts.length > 0 ? parts : [text];
};

const styles = StyleSheet.create({
  paragraph: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 0,
    textAlign: 'left',
  },
  bold: {
    fontWeight: '700',
    fontSize: 16,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingLeft: 4,
  },
  listNumber: {
    fontWeight: '700',
    fontSize: 16,
    marginRight: 8,
    minWidth: 24,
  },
  bullet: {
    fontWeight: '700',
    fontSize: 16,
    marginRight: 8,
    minWidth: 16,
  },
  listContent: {
    flex: 1,
    fontSize: 16,
    lineHeight: 26,
  },
});
