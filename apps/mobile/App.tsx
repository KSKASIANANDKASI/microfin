import {
  DefaultTheme,
  NavigationContainer,
  type NavigationState,
  type Theme as NavTheme,
} from '@react-navigation/native';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { loadLocale, useActiveLocale } from './src/i18n';
import { loadPortfolio } from './src/lib/data';
import { getSession, loadSession } from './src/lib/session';
import { loadRotation } from './src/orientation';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme';

const navigationTheme: NavTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.brand,
    background: colors.bg,
    card: colors.bgElevated,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });
  const [localeLoaded, setLocaleLoaded] = useState(false);
  const locale = useActiveLocale();
  // Survives the remount below, so switching language keeps the user where they are.
  const navState = useRef<NavigationState | undefined>(undefined);

  useEffect(() => {
    Promise.all([loadLocale(), loadRotation(), loadSession()])
      .then(() => {
        if (!getSession()) return;
        // A revoked token clears the session (back to sign-in); offline, the
        // screens open empty and a pull down retries.
        return loadPortfolio().catch(() => undefined);
      })
      .finally(() => setLocaleLoaded(true));
  }, []);

  if (!fontsLoaded || !localeLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {/* Keyed on the language: every screen re-renders its copy, and the
          saved state puts the user back on the screen they switched from. */}
      <NavigationContainer
        key={locale}
        theme={navigationTheme}
        initialState={navState.current}
        onStateChange={(state) => {
          navState.current = state;
        }}
      >
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
