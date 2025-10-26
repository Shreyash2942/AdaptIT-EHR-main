import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';


export const secureStorage = {
    // right now AdaptIT is using WP nonse to authenticate users, so later find the reliable way for authentication
    setItem: async (key:string, value:string) => {
        try {
            if (Platform.OS === 'web') {
                localStorage.setItem(key, value);
                return;
            }
            await SecureStore.setItemAsync(key, value);
        } catch (error) {
            console.error(`Error storing ${key}:`, error);
        }
    },
    getItem: async (key:string) => {
        try {
            if (Platform.OS === 'web') {
                return localStorage.getItem(key);
            }
            return await SecureStore.getItemAsync(key);
        } catch (error) {
            console.error(`Error retrieving ${key}:`, error);
            return null;
        }
    },
    removeItem: async (key:string) => {
        try {
          if (Platform.OS === 'web') {
            localStorage.removeItem(key);
          } else {
            await SecureStore.deleteItemAsync(key);
          }
        } catch (error) {
          console.error(`Error removing ${key}:`, error);
        }
    },
}
