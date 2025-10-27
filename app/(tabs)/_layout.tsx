import { Tabs } from 'expo-router';
import React from 'react';
import { Image, Platform, TouchableOpacity, View } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { FontAwesome, FontAwesome5, MaterialCommunityIcons, } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DrawerLayout from './drawer';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  const [isDrawerVisible, setDrawerVisible] = React.useState(false);
  const handleDrawer = () => {
    setDrawerVisible(!isDrawerVisible);
  };
  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: true,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: Platform.select({
            ios: {
              // Use a transparent background on iOS to show the blur effect
              position: 'absolute',
            },
            default: {
              backgroundColor: Colors[colorScheme ?? 'light'].background,
            },
          }),
          //add image oin the right header side
          tabBarIconStyle: {
            marginTop: 2,
            marginBottom: 2,
          },
          headerRight: () => (
            <View style={{ borderRadius: 1000, borderColor: 'red', borderWidth: 3, padding: 5, flexDirection: 'row', alignItems: 'center', marginRight: 10, }}>
              <Image
                source={require('@/assets/images/AdaptIT_logo.png')}
                style={{ width: 40, height: 40 }}
              />
            </View>
          ),
          headerLeft: () => (
            <TouchableOpacity onPress={() => handleDrawer()}>
              <MaterialCommunityIcons
                name="menu"
                size={35}

                color={Colors[colorScheme ?? 'light'].primary}
                style={{ marginLeft: 10, marginTop: 5 }}
              />
            </TouchableOpacity>
          ),
          headerStyle: {
            height: 120,
          }
        }}>
        <Tabs.Screen
          name="appointments"
          options={{
            title: 'Apointments',
            tabBarIcon: ({ color }) => <FontAwesome5 size={25} name="calendar-week" color={color} />,
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color }) => <FontAwesome size={28} name="dashboard" color={color} />,
          }}
        />
        <Tabs.Screen
          name="encounters"
          options={{
            title: 'Encounters',
            tabBarIcon: ({ color }) => <FontAwesome5 size={25} name="calendar-times" color={color} />,
          }}
        />
        <Tabs.Screen
          name="drawer"
          options={{
            href: null,
            tabBarIcon: ({ color }) => <FontAwesome5 size={25} name="user-injured" color={color} />,
          }}
        />
      </Tabs>
      {isDrawerVisible && (
        <SafeAreaProvider style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
          <DrawerLayout closeDrawer={handleDrawer} />
        </SafeAreaProvider>
      )}
    </>
  );
}
