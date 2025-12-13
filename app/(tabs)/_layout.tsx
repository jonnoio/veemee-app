import { Stack, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { useAuth } from '../../lib/useAuth';

export default function AppLayout() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('../auth/confirm');
    }
  }, [status]);

  if (status === 'loading') return <Text>Checking login…</Text>;
  if (status === 'unauthenticated') return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="tasks" />
      <Stack.Screen name="actions" />
    </Stack>
  );
}


