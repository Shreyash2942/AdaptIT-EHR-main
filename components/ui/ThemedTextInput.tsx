import { TextInput, TextInputProps, View, TouchableOpacity, StyleSheet, TextStyle, StyleProp } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';
import { styles as themedTextStyles } from '@/components/ui/ThemedText'; // Renamed to avoid conflict
import React, { useState } from 'react';
import { FontAwesome5 } from '@expo/vector-icons';

interface ThemedTextInputProps extends TextInputProps {
    value: string;
    // secureTextEntry is already part of TextInputProps, but we handle it specially
}

export default function ThemedTextInput({style, secureTextEntry, ...props}: ThemedTextInputProps) {
    const gray = useThemeColor({}, 'darkGray');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    //for ios mulitply number of lines by 20 to get the height of the text input
    const heightValue = (props.numberOfLines && props.numberOfLines > 1) && props.numberOfLines * 24;

    const baseStyle = {
        borderRadius: 10,
        // width: '100%',
        backgroundColor: '#f8f9fb',
        shadowColor: 'rgb(45, 65, 75)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 1,
        elevation: 4,
    };

    const paddingStyle = {
        paddingTop: 6, // General padding
        paddingBottom: 12, // General padding
        paddingLeft: 16,
        paddingRight: 16, // Specific horizontal padding
    };
    
    const textInputStyles: StyleProp<TextStyle> = [
        baseStyle,
        themedTextStyles.default, //apply the themedText styles (ensure this only contains text-related styles)
        paddingStyle,
        heightValue ? { height: heightValue } : { lineHeight: 21},
        style, //apply the passed in style (this can override paddings)
    ];

    if (secureTextEntry) {
        return (
            <View style={componentStyles.container}>
                <TextInput
                    style={[
                        ...textInputStyles,
                        { paddingRight: 45 } // Ensure space for the icon, overrides other paddingRight
                    ]}
                    placeholderTextColor={gray}
                    secureTextEntry={!isPasswordVisible}
                    {...props}
                />
                <TouchableOpacity 
                    style={componentStyles.eyeIcon} 
                    onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                >
                    <FontAwesome5 
                        name={isPasswordVisible ? "eye-slash" : "eye"} 
                        size={20} 
                        color={gray} 
                    />
                </TouchableOpacity>
            </View>
        );
    }

    return <TextInput
        style={textInputStyles}
        placeholderTextColor={gray}
        secureTextEntry={secureTextEntry}
        {...props}
        />
}

const componentStyles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    eyeIcon: {
        position: 'absolute',
        right: 16,
        height: '100%', // Make touchable area cover the height
        justifyContent: 'center', // Center icon vertically
        paddingHorizontal: 5, // Add some horizontal padding for easier touch
    },
});