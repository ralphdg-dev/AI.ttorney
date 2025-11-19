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
const renderInlineMarkdown = (text: string, textColor: string, boldColor: string): (string | React.ReactElement)[] => {
  const parts: (string | React.ReactElement)[] = [];
  let partIndex = 0;

  const renderBold = (input: string): (string | React.ReactElement)[] => {
    const boldParts: (string | React.ReactElement)[] = [];
    let currentIndex = 0;
    const boldRegex = /\*\*(.+?)\*\*/g;
    let boldMatch: RegExpExecArray | null;
    while ((boldMatch = boldRegex.exec(input)) !== null) {
      if (boldMatch.index > currentIndex) {
        boldParts.push(input.substring(currentIndex, boldMatch.index));
      }
      boldParts.push(
        <Text key={`bold-${partIndex++}`} style={[styles.bold, { color: boldColor }]}>
          {boldMatch[1]}
        </Text>
      );
      currentIndex = boldMatch.index + boldMatch[0].length;
    }
    if (currentIndex < input.length) {
      boldParts.push(input.substring(currentIndex));
    }
    return boldParts.length > 0 ? boldParts : [input];
  };

  // Handle in-app links: [text](/path or /path?query)
  const linkRegex = /\[([^\]]+)\]\((\/[^)]+)\)/g;
  let lastIndex = 0;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = linkRegex.exec(text)) !== null) {
    if (linkMatch.index > lastIndex) {
      const before = text.substring(lastIndex, linkMatch.index);
      parts.push(...renderBold(before));
    }
    const linkText = linkMatch[1];
    const linkPath = linkMatch[2];
    parts.push(
      <Text
        key={`link-${partIndex++}`}
        style={styles.link}
        onPress={() => {
          const router = require('expo-router').router;
          router.push(linkPath);
        }}
      >
        {renderBold(linkText)}
      </Text>
    );
    lastIndex = linkMatch.index + linkMatch[0].length;
  }
  if (lastIndex < text.length) {
    const tail = text.substring(lastIndex);
    parts.push(...renderBold(tail));
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
  link: {
    color: Colors.primary.blue,
    textDecorationLine: 'underline',
  },
});
