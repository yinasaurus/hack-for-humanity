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
import { PetSelectionScreen } from './src/screens/PetSelectionScreen';
import { DemoAccountSwitcher } from './src/components/DemoAccountSwitcher';
import { colors } from './src/theme';

export type RootStackParamList = {
  Welcome: undefined;
  Transparency: undefined;
  PetSelection: undefined;
  Home: { celebrate?: boolean; newUnlocks?: import('./src/api').Unlock[] } | undefined;
  CheckIn: undefined;
  Together: undefined;
  Customize: import('./src/screens/CustomizeScreen').CustomizeParams | undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { user, loading, demoSwitching } = useAuth();
  const [transparencyCompletedFor, setTransparencyCompletedFor] = useState<string | null>(null);

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
    <View style={{ flex: 1 }}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!user ? (
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
        ) : !user.onboarded && transparencyCompletedFor !== user.id ? (
          <Stack.Screen name="Transparency">
            {() => (
              <TransparencyScreen onDone={() => setTransparencyCompletedFor(user.id)} />
            )}
          </Stack.Screen>
        ) : !user.onboarded ? (
          <Stack.Screen name="PetSelection" component={PetSelectionScreen} />
        ) : (
          <>
            <Stack.Screen name="Home">
              {({ navigation, route }) => (
                <HomeScreen
                  key={user.id}
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
      {/* Presenter tool — self-gates to __DEV__ / DEMO_MODE + @demo.local */}
      <DemoAccountSwitcher />
      {demoSwitching ? (
        <View
          pointerEvents="auto"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: 2000,
            elevation: 2000,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.cream,
          }}
        >
          <ActivityIndicator color={colors.sageDeep} size="large" />
        </View>
      ) : null}
    </View>
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
