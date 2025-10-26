import { View, Text } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Styles } from '@/constants/Styles'

export default function appointments() {
  return (
    <SafeAreaView style={Styles.mainScreen}>
      <Text>appointments</Text>
    </SafeAreaView>
  )
}