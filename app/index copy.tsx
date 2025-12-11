import { Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Button,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { useAuth } from '../lib/useAuth';

export default function HomeScreen() {
  const animation = useRef(new Animated.Value(1)).current;
  const router = useRouter();
  const { status } = useAuth();

  const [serverStatus, setServerStatus] = useState<'checking' | 'up' | 'down'>('checking');

  console.log('🟠 useAuth status:', status);
  useEffect(() => {
    console.log('🔵 HomeScreen mounted');
  }, []);

  useEffect(() => {
    console.log('🟢 Auth status changed:', status);
  }, [status]);

  useEffect(() => {
    SecureStore.getItemAsync('veemee-jwt').then((token) =>
      console.log('🔐 JWT in SecureStore:', token)
    );
  }, []);

  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await fetch('https://veemee.onrender.com/api/ping');
        setServerStatus(res.ok ? 'up' : 'down');
      } catch {
        setServerStatus('down');
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 30000); // every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const [email, setEmail] = useState('');
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animation, {
          toValue: 1.06,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(animation, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleTap = () => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  };

  const handleSend = async () => {
    if (!email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }

    setSendStatus('sending');
    setError('');

    try {
      const res = await fetch('https://veemee.onrender.com/api/auth/magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': 'jonnose_pk_99',
        },
        body: JSON.stringify({ email, platform: 'mobile' }),
      });

      const data = await res.json();
      if (res.ok) {
        setSendStatus('sent');
      } else {
        setError(data.error || 'Failed to send link');
        setSendStatus('idle');
      }
    } catch (err) {
      console.error(err);
      setError('Network error');
      setSendStatus('idle');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <TouchableWithoutFeedback onPress={handleTap}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.View style={[styles.circle, { transform: [{ scale: animation }] }]} />
          <Text style={styles.message}>
            {status === 'authenticated' ? 'Click to continue' : 'Enter email to continue'}
          </Text>

          {status === 'unauthenticated' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              <TouchableOpacity
                style={styles.button}
                onPress={handleSend}
                disabled={sendStatus === 'sending'}
              >
                <Text style={styles.buttonText}>
                  {sendStatus === 'sending' ? 'Sending…' : 'Send Magic Link'}
                </Text>
              </TouchableOpacity>
              {sendStatus === 'sent' && <Text style={styles.success}>✅ Magic link sent!</Text>}
              {error !== '' && <Text style={styles.error}>❌ {error}</Text>}

              {/* 🔧 TEMP: internal test for /auth/confirm */}
              <View style={{ marginTop: 20 }}>
                <Button
                  title="Test /auth/confirm screen"
                  onPress={() =>
                    router.push({
                      pathname: '/auth/confirm',
                      params: { token: 'TEST-TOKEN-123' },
                    })
                  }
                />
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      {/* Server status indicator */}
      <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor:
                serverStatus === 'up'
                  ? 'green'
                  : serverStatus === 'down'
                  ? 'red'
                  : 'gray',
            },
          ]}
        />
        <Text style={styles.statusText}>
          Veemee server:{' '}
          {serverStatus === 'checking'
            ? 'Checking…'
            : serverStatus === 'up'
            ? 'Up'
            : 'Down'}
        </Text>
      </View>
    </View>
  );
}