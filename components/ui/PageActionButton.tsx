import React from 'react'
import {
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native'

import { Styles } from '@/constants/Styles'

export type PageActionButtonProps = PressableProps & {
  label: string
  variant?: 'primary' | 'secondary'
  icon?: React.ReactNode
}

export function PageActionButton({
  label,
  variant = 'primary',
  icon,
  style,
  ...rest
}: PageActionButtonProps) {
  const isPrimary = variant === 'primary'
  const dynamicStyle = typeof style === 'function' ? style : undefined
  const staticStyle = typeof style === 'function' ? undefined : style

  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      style={(pressableState) => {
        const { pressed, hovered } = pressableState
        const composed: StyleProp<ViewStyle>[] = [
          styles.base,
          isPrimary ? styles.primary : styles.secondary,
        ]

        if (isPrimary && (hovered || pressed)) {
          composed.push(styles.primaryInteractive)
        }

        if (!isPrimary && (hovered || pressed)) {
          composed.push(styles.secondaryInteractive)
        }

        if (staticStyle) {
          composed.push(staticStyle)
        }

        const transitionStyle =
          Platform.OS === 'web'
            ? ({
              transitionDuration: '200ms',
              transitionProperty: 'background-color, box-shadow, transform',
              transitionTimingFunction: 'ease-in-out',
            } as unknown as ViewStyle)
            : null
        if (transitionStyle) {
          composed.push(transitionStyle)
        }

        if (pressed) {
          composed.push(styles.pressed)
        }

        if (dynamicStyle) {
          const dynamicResult = dynamicStyle(pressableState)
          if (dynamicResult) {
            composed.push(dynamicResult)
          }
        }

        return composed
      }}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.label, isPrimary ? styles.primaryLabel : styles.secondaryLabel]}>
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: Styles.spacing.lg,
    paddingVertical: Styles.spacing.sm,
    gap: Styles.spacing.sm,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  primary: {
    backgroundColor: '#274760',
    shadowColor: '#0C1826',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 6,
  },
  primaryInteractive: {
    backgroundColor: '#307bc4',
  },
  secondary: {
    borderWidth: 1,
    borderColor: '#274760',
    backgroundColor: 'transparent',
  },
  secondaryInteractive: {
    backgroundColor: '#E7EFF7',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  primaryLabel: {
    color: '#FFFFFF',
  },
  secondaryLabel: {
    color: '#274760',
  },
  icon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
})
