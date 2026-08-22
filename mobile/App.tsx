import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { AuthProvider, useAuth } from './src/AuthContext';
import { SettingsProvider, useSettings } from './src/SettingsContext';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { TransparencyScreen } from './src/screens/TransparencyScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { CheckInScreen } from './src/screens/CheckInScreen';
import { TogetherScreen } from './src/screens/TogetherScreen';
import { CustomizeScreen } from './src/screens/CustomizeScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { PetOnboardingScreen } from './src/screens/PetOnboardingScreen';
import { colors } from './src/theme';

export type RootStackParamList = {
  Welcome: undefined;
  Transparency: undefined;
  PetOnboarding: undefined;
  Home: { celebrate?: boolean; newUnlocks?: import('./src/api').Unlock[] } | undefined;
  CheckIn: undefined;
  Together: undefined;
  Customize: Partial<import('./src/api').CompanionState> | undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { user, loading } = useAuth();
  const [showTransparency, setShowTransparency] = useState(true);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.cream,
        }}
      >
        <ActivityIndicator color={colors.sageDeep} size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {!user ? (
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
      ) : !user.onboarded && showTransparency ? (
        <Stack.Screen name="Transparency">
          {() => (
            <TransparencyScreen onDone={() => setShowTransparency(false)} />
          )}
        </Stack.Screen>
      ) : !user.onboarded ? (
        <Stack.Screen name="PetOnboarding" component={PetOnboardingScreen} />
      ) : (
        <>
          <Stack.Screen name="Home">
            {({ navigation, route }) => (
              <HomeScreen
                navigation={navigation}
                celebrate={Boolean(route.params?.celebrate)}
                newUnlocks={route.params?.newUnlocks || []}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="CheckIn" component={CheckInScreen} />
          <Stack.Screen name="Together" component={TogetherScreen} />
          <Stack.Screen name="Customize" component={CustomizeScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

function AuthBridge({ children }: { children: React.ReactNode }) {
  const { loading } = useSettings();
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.cream,
        }}
      >
        <ActivityIndicator color={colors.sageDeep} size="large" />
      </View>
    );
  }
  return <AuthProvider>{children}</AuthProvider>;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.cream,
        }}
      >
        <ActivityIndicator color={colors.sageDeep} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <AuthBridge>
          <NavigationContainer>
            <StatusBar style="dark" />
            <RootNavigator />
          </NavigationContainer>
        </AuthBridge>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
