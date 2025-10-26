import { StyleSheet, ImageBackground, View, Image, useColorScheme, Platform } from 'react-native';
import React, { useContext, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import ThemedTextInput from '@/components/ui/ThemedTextInput';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { UsersContext } from '@/context/UserContext';
import Toast from 'react-native-toast-message';
import { validateValidInput } from '@/utils/inputValidation';

export default function Login() {
  const colorScheme = useColorScheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const currentController = useRef<AbortController | undefined>(undefined);
  const { loginUser } = useContext(UsersContext);
  const handleLogin = async () => {
    console.log('called handleLogin with:', { username, password });
    
    if (currentController.current) {
        currentController.current.abort();
      }
  
      try {
        setLoggingIn(true);
        const { promise, controller } = await loginUser(username, password);
        currentController.current = controller; // Store the new controller
  
        const result = await promise;
        console.log('Login successful!', result.data);
        Toast.show({
          type: 'success',
          text1: 'Login successful!',
          autoHide: true,
          visibilityTime: 3000,
        });
      } catch (error) {
        console.error('Login error:', error);
        Toast.show({
          type: 'error',
          text1: error instanceof Error ? error.message : 'Login failed.',
          autoHide: true,
          visibilityTime: 3000,
        });
      }
      finally {
        setLoggingIn(false);
        currentController.current = undefined;
      }
  }
  return (
    <ImageBackground
      source={require('@/assets/images/Login-Backround.jpg')}
      style={{ height: '100%', width: '100%' }}
      resizeMode="cover"
    >
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={styles.container}>
          {Platform.OS ==='web' ? (
            <View style={styles.webGradient}>
              <View style={styles.card}>
                <Image
                  source={require('@/assets/images/AdaptIT-Logo-1.png')}
                  style={{ width: 100, height: 60, marginBottom: 10 }}
                />
                <ThemedText type="subtitle">Welcome back to AdaptIT</ThemedText>
                <ThemedText type="defaultSemiBold" style={styles.signInText}>Sign in to your account</ThemedText>
                <View style={styles.inputContainer}>
                  <Ionicons name="person" size={20} color={Colors[colorScheme ?? 'light'].primary} style={styles.iconStyle} />
                  <ThemedTextInput
                    value={username}
                    onChangeText={setUsername}
                    style={styles.input}
                    placeholder="Username or Email Address"
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed" size={20} color={Colors[colorScheme ?? 'light'].primary} style={styles.iconStyle} />
                  <ThemedTextInput
                    value={password}
                    onChangeText={setPassword}
                    style={styles.input}
                    placeholder="Password"
                    secureTextEntry={true}
                  />
                </View>
                <ThemedButton
                  title="Log In"
                  type="positive"
                  size="medium"
                  style={styles.loginButton}
                  onPress={handleLogin} // Pass the function reference, not a direct invocation
                />
              </View>
            </View>
          ) : (
            <LinearGradient
              colors={['#f5f9fe','rgba(245, 249, 254, 0.24)']}
              style={styles.gradient}
              locations={[0.35, 0.95]}
            >
              <View style={styles.card}>
                <Image
                  source={require('@/assets/images/AdaptIT-Logo-1.png')}
                  style={{ width: 100, height: 60, marginBottom: 10 }}
                />
                <ThemedText type="subtitle">Welcome back to AdaptIT</ThemedText>
                <ThemedText type="defaultSemiBold" style={styles.signInText}>Sign in to your account</ThemedText>
                <View style={styles.inputContainer}>
                  <Ionicons name="person" size={20} color={Colors[colorScheme ?? 'light'].primary} style={styles.iconStyle} />
                  <ThemedTextInput
                    value={username}
                    onChangeText={setUsername}
                    style={styles.input}
                    placeholder="Username or Email Address"
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed" size={20} color={Colors[colorScheme ?? 'light'].primary} style={styles.iconStyle} />
                  <ThemedTextInput
                    value={password}
                    onChangeText={setPassword}
                    style={styles.input}
                    placeholder="Password"
                    secureTextEntry={true}
                  />
                </View>
                <ThemedButton
                  title={loggingIn ? "Logging in ...":"Log In"}
                  disabled={loggingIn || !validateValidInput(username) || !validateValidInput(password)}
                  type="positive"
                  size="medium"
                  style={styles.loginButton}
                  onPress={handleLogin}
                />
              </View>
            </LinearGradient>
          )}
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  gradient: {
    width: '90%',
    maxWidth: 400,
    height: 450,
    borderRadius: 15,
    alignItems: 'center',
  },
  webGradient: {
    width: '90%',
    maxWidth: 400,
    height: 450,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundImage: 'linear-gradient(180deg, #f5f9fe 0%, transparent 70%)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    height: 450,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 15,
    padding: 20,
    paddingTop: 40,
    gap: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 5,
  },
  signInText: {
    marginBottom: 20,
  },
  inputContainer: {
    height: 40,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    gap: 10,
  },
  iconStyle: {
    position: 'absolute',
    left: 10,
    top: '50%',
    zIndex: 10,
    transform: [{ translateY: -13 }],
  },
  input: {
    flex: 1,
    width: '100%',
    paddingLeft: 40,
    paddingHorizontal: 10,
  },
  loginButton: {
    width: '100%',
    marginTop: 20,
  },
});