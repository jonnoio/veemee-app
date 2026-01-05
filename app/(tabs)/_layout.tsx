import { Stack, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useAuth } from '../../lib/useAuth';

export default function AppLayout() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth"); // ✅ go to email request screen
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 10, opacity: 0.7 }}>Checking login…</Text>
      </View>
    );
  }

  // While the redirect runs, show something instead of returning null.
  if (status === "unauthenticated") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 10, opacity: 0.7 }}>Redirecting to sign in…</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="tasks" />
      <Stack.Screen name="actions" />
    </Stack>
  );
}

