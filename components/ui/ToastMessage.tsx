import { StyleSheet, Touchable, TouchableOpacity } from 'react-native';
import React from 'react';
import Toast, { ToastProps, ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface TomatoToastProps extends ToastProps {
}

const toastConfig: ToastConfig = {
  success: ({text1}) => (
    <ThemedView style={[styles.wrapper, {backgroundColor: Colors.light.primary}]}>
        <Ionicons name="checkmark-circle" size={24} color={"white"} />
        <ThemedText type="defaultSemiBold" style={{color: "white"}}>{text1 ?? 'No message'}</ThemedText>
    </ThemedView>
  ),
  
  error: ({ text1, props }: ToastConfigParams<TomatoToastProps>) => (
    <TouchableOpacity
      onPress={() => {
        if (props?.onPress) {
          props.onPress();
        } else {
          console.warn("No onPress function provided for error toast");
        }
      }
    }>
    <ThemedView style={[styles.wrapper, {backgroundColor: Colors.light.warning}]}>
        <Ionicons name="warning" size={24} color={"white"} />
        <ThemedText type="defaultSemiBold" style={{color: "white"}}>{text1 ?? 'No message'}</ThemedText>
    </ThemedView>
    </TouchableOpacity>
  ),

  info: ({ text1, props }: ToastConfigParams<TomatoToastProps>) => (
    <ThemedView style={[styles.wrapper, {backgroundColor: Colors.light.accentLight}]}>
        <Ionicons name="information-circle" size={24} color={"white"} />
        <ThemedText type="defaultSemiBold" style={{color: Colors.light.text}}>{text1 ?? 'No message'}</ThemedText>
    </ThemedView>

  ),
};

export default function ToastMessage() {
  return <Toast config={toastConfig} topOffset={100}/>;
}

const styles = StyleSheet.create({
    wrapper: { 
      display: 'flex',
      flexDirection: 'row', 
      alignSelf: 'center', 
      justifyContent: 'center', 
      alignItems: 'center', 
      gap: 10,
      paddingHorizontal: 15,
      marginHorizontal: 20,
      height: 40,
      borderRadius: 15,
    }
})