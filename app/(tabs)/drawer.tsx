import React, { useEffect, useState, useContext, useMemo, useRef } from "react";
import { View, TouchableOpacity, StyleSheet, GestureResponderEvent,  ScrollView, Platform } from "react-native";
import Animated, { Easing, SlideInLeft, SlideOutLeft, useSharedValue, withTiming } from "react-native-reanimated";
import { Link, useRouter } from "expo-router";
import { Colors } from "@/constants/Colors";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import RoutingLinks from "@/constants/RoutingLinks";
import { Entypo, FontAwesome5, FontAwesome6, Ionicons, MaterialIcons, Octicons } from "@expo/vector-icons";
import { UsersContext } from "@/context/UserContext";

type DrawerLayoutProps = {
  closeDrawer: () => void;
};

export default function DrawerLayout({ closeDrawer }: DrawerLayoutProps) {
  const { user } = useContext(UsersContext);
  console.log('DrawerLayout user:', user);
  

  const router = useRouter();
  const drawerOptions = useMemo(() => {
    return RoutingLinks()
    //   .filter(item => {
    //     if ((Platform.OS === 'ios' || Platform.OS === 'android') && item.key === 'Go to Portal') {
    //       return false;
    //     }
    //     if (currentUser?.role === 'employee') {
    //       return ['Store Overview', 'Manage', 'Go to Portal'].includes(item.key);
    //     }
    //     return true;
    //   })
      .map(item => {     
        return item;
      });
  }, [  ]);

  const [activeSubmenuIndex, setActiveSubmenuIndex] = useState<number | null>(null);
  const [isDrawerClosing, setDrawerClosing] = useState(false);
  const isMountedRef = React.useRef(false);

  const toggleSubmenu = (index: number) => {
    setActiveSubmenuIndex(prev => (prev === index ? null : index));
  };

  const AnimatedView = Animated.createAnimatedComponent(View);

  const backgroundColor = useSharedValue(0);

  const handlePress = (item: any, event: React.MouseEvent | GestureResponderEvent) => {
    event.preventDefault();

    if (item.submenu) {
      return;
    }

    if (item.onPress) {
      item.onPress();
    } else {

      router.replace(item.link);
      setDrawerClosing(true); setTimeout(() => { closeDrawer() }, 10)
    }
  };

  useEffect(() => {
    backgroundColor.value = withTiming(1, { duration: 800, easing: Easing.ease });
    isMountedRef.current = true;
  });

  const formateTextToProperCase = (text: string) => {
    if (text.split(' ').length > 1) {
      return text.split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  const drawerEnterAnimation = useMemo(() => SlideInLeft.duration(200).easing(Easing.ease), []);

const getItemIcon = (
  key: string,
  iconName?: string,
  iconBundle?: string,
  size: number = 20
) => {
  if (iconName && iconBundle) {
    switch (iconBundle) {
      case 'FontAwsome5':
        return <FontAwesome5 name={iconName as any} size={size} color={Colors.light.primary} />;
      case 'Ionicons':
        return <Ionicons name={iconName as any} size={size} color={Colors.light.primary} />;
      case 'MaterialIcons':
        return <MaterialIcons name={iconName as any} size={size} color={Colors.light.primary} />;
      case 'FontAwsome6':
        return <FontAwesome6 name={iconName as any} size={size} color={Colors.light.primary} />;
      case 'Entypo':
        return <Entypo name={iconName as any} size={size} color={Colors.light.primary} />;
      default:
        return <Octicons name='question' size={size} color={Colors.light.primary} />;
    }
  }
  return null;
};

  return (
    <View style={{ flex: 1 }} id="drawer">
      <TouchableOpacity style={styles.sidemenuDrawerWrapper} onPress={() => { setDrawerClosing(true); setTimeout(() => { closeDrawer() }, 10) }} />
      <AnimatedView
        key="drawer"
        style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, maxWidth: 250 }]}
        entering={!isMountedRef.current ? drawerEnterAnimation : undefined}
        exiting={isDrawerClosing ? SlideOutLeft.duration(200).easing(Easing.ease) : undefined}
      >
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} bounces={false}>
        <ThemedView style={styles.container}>
          <TouchableOpacity style={{ alignSelf: "flex-end" }} onPress={() => { setDrawerClosing(true); setTimeout(() => { closeDrawer() }, 10) }}>
            <Entypo name="cross" size={20} />
          </TouchableOpacity>
          <View style={{justifyContent: 'space-between', marginBottom: 20, flex: 1 }}>
          <View key={'drawerOptions'}>
            {drawerOptions.length > 0 && drawerOptions.map((item, index) => (
              <View style={styles.menuItem} key={item.key}>
                  {item.link ? (
                      <Link key={item.key} href={item.link as any} onPress={(event) => handlePress(item, event)}>
                        {getItemIcon(item.key, item.iconName, item.iconBundle)}
                        <ThemedText style={styles.sidemenuListItem}>  {item.key}</ThemedText>
                      </Link>
                  ) : (
                    <>
                      <TouchableOpacity style={{flexDirection: 'row'}} onPress={() => toggleSubmenu(index)}>
                        {getItemIcon(item.key, item.iconName, item.iconBundle)}
                        <ThemedText style={styles.sidemenuListItem}> {item.key}</ThemedText>
                      </TouchableOpacity>
                      {item.submenu && activeSubmenuIndex === index && (
                        <View style={styles.submenuContainer}>
                          {item.submenu.length > 0 && item.submenu.map((subItem) => (
                            <Link key={subItem.key} href={subItem.link as any} onPress={closeDrawer} style={{ marginVertical: 5 }}>
                                {getItemIcon(subItem.key, subItem.iconName, subItem.iconBundle, 15)}
                                <ThemedText style={styles.sidesubmenuListItem}>  {subItem.key}</ThemedText>
                              </Link>
                          ))}
                        </View>
                      )}
                    </>
                  )}
                </View>
              ))}

          </View>
          <View key={'userInfo'}>
            <ThemedText style={{ fontSize: 20, fontWeight: '400', color: Colors.light.primary }}>{user && formateTextToProperCase(user.name)}</ThemedText>
            <ThemedText>{user && formateTextToProperCase(user.role)}</ThemedText>
          </View>
          </View>
        </ThemedView>
        </ScrollView>
      </AnimatedView>
    </View>
  );
}
const styles = StyleSheet.create({
  sidemenuDrawerWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  container: {
    // position: 'absolute',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
    margin: 0,
    padding: 15,
    paddingTop: 60,
    backgroundColor: Colors.light.background,
    flex: 1,
    width: 250,
    borderRadius: 0
  },
  menuItem: {
    paddingVertical: 10,
  },
  sidemenuListItem: {
    fontSize: 20,
    fontWeight: '700',
  },
  submenuContainer: {
    marginLeft: 25,
  },
  sidesubmenuListItem: {
    paddingVertical: 5,
    marginVertical: 5,
    paddingHorizontal: 10,
    fontSize: 15,
    fontWeight: '400',
  },
});