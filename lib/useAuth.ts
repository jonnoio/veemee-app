import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { decodeJwt } from '../lib/decodeJwt';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await SecureStore.getItemAsync('veemee-jwt');
        console.log("🔐 token present?", !!token, "len:", token?.length);
        if (!token) {
          console.log('❌ No token found');
          setStatus('unauthenticated');
          return;
        }

        const decoded = decodeJwt(token);
        if (!decoded) {
          console.log('❌ Could not decode token');
          setStatus('unauthenticated');
          return;
        }
        console.log('✅ Decoded JWT:', decoded);

        const now = Date.now();
        const expiry = decoded.exp * 1000;
        if (expiry < now) {
          console.log('⌛ Token expired');
          setStatus('unauthenticated');
        } else {
          setEmail(decoded.email);
          setStatus('authenticated');
        }

        const nowIso = new Date().toISOString();
        const expIso = decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : "no exp";
        console.log("🕒 now:", nowIso, "exp:", expIso);

      } catch (err) {
        console.log('❌ Error decoding token:', err);
        setStatus('unauthenticated');
      }
    };


    checkToken();
  }, []);


  return { status, email };
}
