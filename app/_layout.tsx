import ToastMessage from '@/components/ui/ToastMessage';
import { Styles } from '@/constants/Styles';
import { UserProvider, UsersContext } from '@/context/UserContext';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useContext, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, useColorScheme } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const pathname = usePathname();
  
  const { user } = useContext(UsersContext);
  const [isAuthenticated, setIsAuthenticated] = useState(!!user);
  useEffect(() => {
    console.log('RootLayout useEffect user:', user);
    
    setIsAuthenticated(!!user);
  }
  , [user]);
    
  // Check if the user is on a protected route
  const isProtectedRoute = 
    // Don't protect login route
    pathname !== '/login' && 
    // But protect everything else
    segments.length > 0;
  
    console.log('RootLayout segments:', segments);
  console.log('RootLayout pathname:', pathname);
  console.log('RootLayout isAuthenticated:', isAuthenticated);
  console.log('RootLayout isProtectedRoute:', isProtectedRoute);
    
  // if (isProtectedRoute && !isAuthenticated) {
  //   return <Redirect href="/login" />;
  // }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <KeyboardAvoidingView 
        style={Styles.mainScreen}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <UserProvider>
          <Stack>
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" options={{ presentation: 'modal' }} />
          </Stack>
          <StatusBar style="auto" />
          <ToastMessage />
        </UserProvider>
      </KeyboardAvoidingView>
    </ThemeProvider>
  );
}