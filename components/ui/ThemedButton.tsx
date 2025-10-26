import React, { ReactNode, useState,useRef , useEffect } from "react";
import { TouchableOpacity, StyleSheet, StyleProp, ViewStyle, TextStyle as RNTextStyle, View, TouchableOpacityProps, GestureResponderEvent, TextStyle  } from "react-native";
import { ThemedText } from "./ThemedText";
import  { useThemeColor } from "@/hooks/useThemeColor";

export interface ThemedButtonProps extends TouchableOpacityProps{
  title?: string | number;
  type?: 'neutral' | 'positive' | 'negative' | 'pleasant'; //pleasant is the cream for now
  size?: 'small' | 'medium' | 'large';
 // style?: StyleProp<ViewStyle>;
  btnTextStyle?: StyleProp<RNTextStyle>;
  style?: ViewStyle;
  icon?: ReactNode;
  needConfirm?: boolean;
  confirmText?: string;
  onConfirm?: () => void | Promise<void>;
  confirmTimeout?: number; // ms, default 2000
};

export function ThemedButton ({ title, type = 'neutral', size = 'small', icon, style, needConfirm, confirmText = "Confirm?", onConfirm, confirmTimeout = 2000,  ...props} : ThemedButtonProps) {

  const textColor = useThemeColor({}, 'text');
  const primaryColor = useThemeColor({}, 'primary');
  const neutralColor = useThemeColor({}, 'accentLight');
  const warning = useThemeColor({}, 'warning');

  const [isConfirming, setIsConfirming] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  let buttonColor: string;
  let buttonTextColor: string;

  if (needConfirm && isConfirming) {
    type = "negative";
  }

  switch (type) {
    case 'positive':
      buttonColor = primaryColor;
      buttonTextColor = 'white';
      break;
    case 'negative':
      buttonColor = warning;
      buttonTextColor = 'white';
      break;
    case 'pleasant':
      buttonColor =  neutralColor;
      buttonTextColor = 'black';
      break;
    case 'neutral':
    default:
      buttonColor = textColor;
      buttonTextColor = 'white';
      break;
  }

  let verticalPadding: number;
  let fontSize: number;
  let fontWeight: TextStyle['fontWeight'];

  switch(size) {
    case 'medium':
      verticalPadding = 9;
      fontSize = 16;
      fontWeight = '600';
      break;
    case 'large':
      verticalPadding = 15;
      fontSize = 18;
      fontWeight = '600';
      break;
    case 'small':
    default:
      verticalPadding = 2;
      fontSize = 14;
      fontWeight = '600';
      break;
  }


  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handlePress = async (event:GestureResponderEvent) => {
    if (!needConfirm) {
      if (props.onPress) await props.onPress(event);
      return;
    }
    if (!isConfirming) {
      setIsConfirming(true);
    
      // Set timeout to auto-cancel confirmation
      timeoutRef.current = setTimeout(() => setIsConfirming(false), confirmTimeout);
    } else {
      setIsConfirming(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (onConfirm) await onConfirm();
    }
  };

  return (
    <TouchableOpacity 
    onPress={handlePress}
      style={[styles.button, {backgroundColor: buttonColor, paddingHorizontal: 14, paddingVertical: verticalPadding, opacity: props.disabled ? 0.3: 1}, style]} 
      {...props}>
        {icon && <View style={styles.icon}>{icon}</View>}
        { (
        <ThemedText type="defaultSemiBold" style={[{color: buttonTextColor, fontSize, fontWeight}, props.btnTextStyle]} numberOfLines={1}>{
          needConfirm && isConfirming ? String(confirmText) : String(title)
          }</ThemedText>
        )}
        {props.children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 6,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  icon: {
    marginRight: 8,
  },
});

export default ThemedButton;
