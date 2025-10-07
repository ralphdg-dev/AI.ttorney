import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';

export type DropdownOption = {
  key: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
  bold?: boolean;
};

interface DropdownMenuProps {
  open: boolean;
  options: DropdownOption[];
  position: { top: number; left?: number; right?: number };
  minWidth?: number;
  onRequestClose?: () => void; // Backdrop handled by parent if needed
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ open, options, position, minWidth = 200 }) => {
  if (!open) return null;

  return (
    <View
      style={[
        styles.menuContainer,
        { top: position.top, left: position.left, right: position.right, minWidth } as ViewStyle,
      ]}
    >
      {options.map((opt, idx) => (
        <React.Fragment key={opt.key}>
          {idx > 0 && <View style={styles.menuDivider} />}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.8}
            onPress={opt.onPress}
          >
            <Text style={[styles.menuText, opt.danger ? { color: '#B91C1C' } : null, opt.bold ? { fontWeight: '700' } : null]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        </React.Fragment>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  menuContainer: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
    elevation: 6,
    zIndex: 999,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
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

export default DropdownMenu;
