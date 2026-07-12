import React, { useEffect, useRef } from 'react';
import { BackHandler, Alert, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { StripeProvider } from '@stripe/stripe-react-native';
import * as Notifications from 'expo-notifications';
import { setDoc, doc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { getAuth } from 'firebase/auth';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
import OrderHistoryScreen from './screens/OrderHistoryScreen';
import ChangeCredentialsScreen from './screens/ChangeCredentialsScreen';
import AddItemScreen from './screens/AddItemScreen';
import AdminUserDetails from './screens/AdminUserDetails';
// IMPORT YOUR CONTEXT PROVIDERS
import { AuthProvider, useAuth } from './AuthContext';
import { CartProvider } from './CartContext';
import ChatScreen from './screens/ChatScreen';

// IMPORT SCREENS
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import OrderDetailsScreen from './screens/OrderDetailsScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import HomeScreen from './screens/HomeScreen';
import ProductDetailsScreen from './screens/ProductDetailsScreen';
import CartScreen from './screens/CartScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import OrderTrackingScreen from './screens/OrderTrackingScreen';
import ProfileScreen from './screens/ProfileScreen';
import CustomerHistoryScreen from './screens/CustomerHistoryScreen';

// IMPORT NEW MASTER MODE SCREENS
import MasterLoginScreen from './screens/MasterLoginScreen';
import ElevatedDashboard from './screens/ElevatedDashboard';

const Stack = createNativeStackNavigator();
const navigationRef = React.createRef();

function useAndroidBackHandler() {
  const lastPressRef = useRef(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onBackPress = () => {
      const nav = navigationRef.current;
      if (nav && nav.canGoBack && nav.canGoBack()) return false;
      const now = Date.now();
      if (now - lastPressRef.current < 2000) {
        BackHandler.exitApp();
        return true;
      }
      lastPressRef.current = now;
      Alert.alert('Hold on!', 'Press back again to exit.', [{ text: 'OK' }]);
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);
}

function useNotificationsSetup() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const setup = async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('order-ring', {
          name: 'Order Ringing',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [1000, 500, 1000, 500],
          lightColor: '#FF9800',
          sound: 'default',
          bypassDnd: true,
        });
      }

      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '43ce51a9-9a31-4b99-bc03-4814d127592d',
      });
      const pushToken = tokenData.data;

      try {
        await setDoc(doc(db, "AdminDeviceTokens", user.uid), {
          pushToken,
          email: user.email,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (e) {
        console.error("Failed to store push token:", e);
      }
    };

    setup();
  }, [user?.uid]);
}

function NavigationTree() {
  const auth = useAuth();
  if (!auth) return null;
  const { user, loading } = auth;
  if (loading) return null;

  const isAuthenticated = !!user;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="MasterLoginScreen" component={MasterLoginScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
          <Stack.Screen name="Cart" component={CartScreen} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} />
          <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="CustomerHistory" component={CustomerHistoryScreen} />
          <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
          <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
        </>
      )}
      {/* GLOBAL SCREENS - REGISTERED ONCE */}
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="AddItemScreen" component={AddItemScreen} />
      <Stack.Screen name="ChangeCredentials" component={ChangeCredentialsScreen} />
      <Stack.Screen name="ElevatedDashboard" component={ElevatedDashboard} />
      <Stack.Screen name="AdminUserDetails" component={AdminUserDetails} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}

function AppContent() {
  useAndroidBackHandler();
  useNotificationsSetup();

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.orderId && navigationRef.current) {
        navigationRef.current.navigate('OrderDetails', { orderId: data.orderId });
      }
    });
    return () => sub.remove();
  }, []);

  return <NavigationTree />;
}

export default function App() {
  return (
    <StripeProvider publishableKey="pk_test_51QDkjUHkXH0ABRaOHU3gGcafPsYCXVdKCiQ1zxQUssI15m4ns2cym8Jz6tVJ8ph5kEDV4qQOTPtiljo3Nuvjkhxq004JhB33Ts">
      <AuthProvider>
        <CartProvider>
          <NavigationContainer ref={navigationRef}>
            <StatusBar style="dark" />
            <AppContent />
          </NavigationContainer>
        </CartProvider>
      </AuthProvider>
    </StripeProvider>
  );
}
