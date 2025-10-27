import React from 'react'
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native'

import { Colors } from '@/constants/Colors'
import { Styles } from '@/constants/Styles'

type SegmentedControlProps = {
  options: string[]
  selectedIndex: number
  onChange: (index: number) => void
  style?: StyleProp<ViewStyle>
}

export function SegmentedControl({
  options,
  selectedIndex,
  onChange,
  style,
}: SegmentedControlProps) {
  return (
    <View style={[styles.container, style]}>
      {options.map((option, index) => {
        const isSelected = index === selectedIndex

        return (
          <Pressable
            key={option}
            onPress={() => onChange(index)}
            style={({ pressed }) => [
              styles.segment,
              isSelected && styles.segmentSelected,
              pressed && styles.segmentPressed,
            ]}
          >
            <Text
              style={[styles.segmentLabel, isSelected && styles.segmentLabelSelected]}
            >
              {option}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Styles.spacing.xs,
    alignItems: 'center',
  },
  segment: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Styles.spacing.sm,
    paddingHorizontal: Styles.spacing.lg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    backgroundColor: '#FFFFFF',
  },
  segmentSelected: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
    shadowColor: '#0A1433',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  segmentPressed: {
    opacity: 0.9,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  segmentLabelSelected: {
    color: '#FFFFFF',
  },
})
