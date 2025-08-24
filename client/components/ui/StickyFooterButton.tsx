import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import PrimaryButton from './PrimaryButton';

interface StickyFooterButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  bottomOffset?: number; // distance from bottom edge
}

export default function StickyFooterButton({
  title,
  onPress,
  disabled = false,
  bottomOffset = 24,
}: StickyFooterButtonProps) {
  return (
    <View pointerEvents="box-none" style={[styles.container, { bottom: bottomOffset }] }>
      <View style={styles.divider} />
      <View style={styles.innerPad}>
        <PrimaryButton title={title} onPress={onPress} disabled={disabled} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  innerPad: {
    paddingHorizontal: 24,
    marginTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 8 : 8,
  },
});
