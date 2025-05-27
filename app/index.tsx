import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '../lib/useAuth';
import * as SecureStore from 'expo-secure-store';

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
              <TouchableOpacity style={styles.button} onPress={handleSend} disabled={sendStatus === 'sending'}>
                <Text style={styles.buttonText}>
                  {sendStatus === 'sending' ? 'Sending…' : 'Send Magic Link'}
                </Text>
              </TouchableOpacity>
              {sendStatus === 'sent' && <Text style={styles.success}>✅ Magic link sent!</Text>}
              {error !== '' && <Text style={styles.error}>❌ {error}</Text>}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  circle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#000',
    marginBottom: 30,
  },
  message: {
    fontSize: 18,
    marginBottom: 20,
  },
  input: {
    width: '100%',
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  success: {
    marginTop: 20,
    color: 'green',
    fontSize: 16,
  },
  error: {
    marginTop: 20,
    color: 'red',
    fontSize: 16,
  },
    statusContainer: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#333',
  },
});
