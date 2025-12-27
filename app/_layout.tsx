import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/useColorScheme";
import { ContextStoreProvider } from "@/state/ContextStore";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) return null;

  return (
    <ContextStoreProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          {/* index.tsx */}
          <Stack.Screen name="index" options={{ headerShown: false }} />

          {/* contexts.tsx */}
          <Stack.Screen name="contexts" options={{ headerShown: false }} />

          {/* dashboard.tsx */}
          <Stack.Screen name="dashboard" options={{ headerShown: false }} />

          <Stack.Screen name="+not-found" />
        </Stack>

        <StatusBar style="auto" />
      </ThemeProvider>
    </ContextStoreProvider>
  );
}