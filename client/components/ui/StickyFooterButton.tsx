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
  bottomOffset = 0,
}: StickyFooterButtonProps) {
  return (
    <View style={[styles.container, { bottom: bottomOffset, pointerEvents: 'box-none' }]}>
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
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 0,
  },
  innerPad: {
    paddingHorizontal: 20,
    marginTop: 16,
    paddingBottom: 0,
    backgroundColor: '#FFFFFF',
  },
});
