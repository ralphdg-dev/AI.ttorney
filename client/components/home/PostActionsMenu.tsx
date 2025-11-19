import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Bookmark, Flag } from 'lucide-react-native';

interface PostActionsMenuProps {
  open: boolean;
  onRequestClose: () => void;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  onReport: () => void;
  position: { top: number; right: number };
  minWidth?: number; // defaults to 200 if not provided
  variant?: 'post' | 'reply'; // post: Bookmark + Report, reply: Report only
}

const PostActionsMenu: React.FC<PostActionsMenuProps> = ({
  open,
  onRequestClose,
  bookmarked,
  onToggleBookmark,
  onReport,
  position,
  minWidth = 200,
  variant = 'post',
}) => {
  if (!open) return null;

  return (
    <>
      {/* Overlay to close menu when tapping outside */}
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onRequestClose} />

      {/* Menu container */}
      <View
        style={[
          styles.menuContainer,
          variant === 'reply' ? styles.menuContainerCompact : null,
          { top: position.top, right: position.right, minWidth } as ViewStyle,
        ]}
      >
        {variant === 'post' ? (
          <>
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.8}
              onPress={() => {
                onToggleBookmark();
                // Keep menu open per UX
              }}
            >
              <Bookmark
                size={16}
                color={bookmarked ? '#F59E0B' : '#374151'}
                fill={bookmarked ? '#F59E0B' : 'none'}
              />
              <Text style={styles.menuText}>
                {bookmarked ? 'Unbookmark post' : 'Bookmark post'}
              </Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.8}
              onPress={() => {
                onReport();
                // Keep menu open per UX
              }}
            >
              <Flag size={16} color="#B91C1C" />
              <Text style={[styles.menuText, { color: '#B91C1C' }]}>Report post</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.8}
            onPress={() => {
              onReport();
              // Keep menu open per UX
            }}
          >
            <Flag size={16} color="#B91C1C" />
            <Text style={[styles.menuText, { color: '#B91C1C' }]}>Report reply</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  menuContainer: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 20,
  },
  menuContainerCompact: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  menuText: {
    fontSize: 14,
    color: '#374151',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 2,
  },
});

export default PostActionsMenu;