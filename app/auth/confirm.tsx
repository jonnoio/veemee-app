import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';


useEffect(() => {
  console.log("🧭 Landed on /auth/confirm");
}, []);

export default function ConfirmPage() {
  const router = useRouter();
  const { token: rawToken } = useLocalSearchParams();
  const token = typeof rawToken === 'string' ? rawToken : ''; // flatten and guard
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No token found in URL.');
      return;
    }

    const validateToken = async () => {
      try {
        const res = await fetch('https://veemee.onrender.com/api/auth/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }), // ✅ now it's a plain string
        });
        console.log('Token from URL:', token);


        const data = await res.json();

        if (data.jwt) {
          await SecureStore.setItemAsync('veemee-jwt', data.jwt);
          console.log('JWT stored');
          setStatus('success');
          setMessage('Login successful! Redirecting...');
          setTimeout(() => {
            router.replace('/'); // change if you want another landing page
          }, 1500);
        } else {
          setStatus('error');
          setMessage(data.error || 'Login failed or token expired.');
        }
      } catch (error) {
        console.error(error);
        setStatus('error');
        setMessage('An unexpected error occurred.');
      }
    };

    validateToken();
  }, [token]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      {status === 'loading' && (
        <>
          <ActivityIndicator size="large" />
          <Text>Validating magic link…</Text>
        </>
      )}
      {status === 'success' && <Text style={{ color: 'green' }}>{message}</Text>}
      {status === 'error' && <Text style={{ color: 'red' }}>{message}</Text>}
    </View>
  );
}
