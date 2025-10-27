import React from 'react'
import { View, ViewProps, StyleSheet } from 'react-native'

import { Styles } from '@/constants/Styles'

export type CardProps = ViewProps & {
  children: React.ReactNode
}

export function Card({ style, children, ...rest }: CardProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Styles.colors.cardBackground,
    borderRadius: 20,
    padding: Styles.spacing.xl,
    shadowColor: '#0A1433',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
})
