import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function ConfirmPage() {
  const router = useRouter();
  const { token: rawToken } = useLocalSearchParams();
  const token = typeof rawToken === 'string' ? rawToken : '';

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    console.log("🧭 Landed on /auth/confirm with token:", token);
  }, [token]);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No token found in URL.');
      return;
    }

    const validateToken = async () => {
      try {
        console.log("🔍 Validating token with backend…");

        const res = await fetch('https://veemee.onrender.com/api/auth/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (data.jwt) {
          await SecureStore.setItemAsync('veemee-jwt', data.jwt);
          console.log("💾 JWT stored in SecureStore");

          setStatus('success');
          setMessage('Login successful! Redirecting…');

          setTimeout(() => {
            router.replace('/');
          }, 1500);
        } else {
          console.log("❌ Validation error:", data.error);
          setStatus('error');
          setMessage(data.error || 'Login failed or token expired.');
        }
      } catch (err) {
        console.error("🚨 Unexpected error:", err);
        setStatus('error');
        setMessage('Unexpected error validating link.');
      }
    };

    validateToken();
  }, [token]);

  return (
    <View style={styles.container}>
      {status === 'loading' && (
        <>
          <ActivityIndicator size="large" />
          <Text style={styles.text}>Validating magic link…</Text>
        </>
      )}
      {status === 'success' && (
        <Text style={[styles.text, { color: 'green' }]}>{message}</Text>
      )}
      {status === 'error' && (
        <Text style={[styles.text, { color: 'red' }]}>{message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    marginTop: 20,
    fontSize: 16,
  },
});