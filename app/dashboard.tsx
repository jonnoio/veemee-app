import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { API_BASE } from '@/config/api';
import { useContextStore } from '@/state/ContextStore';
import { SkinRegistry } from '@/state/skins';
import { logout } from '../lib/auth';
import { useAuth } from '../lib/useAuth';


type Persona = {
  id: number;
  display_name: string;
  slug: string;
  task_count: number;
  context_id?: number;
};

export default function Dashboard() {
  const router = useRouter();
  const { status, email } = useAuth();
  console.log('🧠 Dashboard auth status:', status, email);

  const { activeContext } = useContextStore();
  const skin = SkinRegistry[activeContext?.skinId ?? 'simple'];

  // 🌸 Bloom animation on context OR skin change
  const bloom = useRef(new Animated.Value(0)).current;
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    const key = `${activeContext?.id ?? 'none'}:${activeContext?.skinId ?? 'none'}`;

    if (lastKey.current === null) {
      lastKey.current = key;
      return;
    }

    if (lastKey.current !== key) {
      lastKey.current = key;

      bloom.setValue(0);
      const m = skin.motion;

      Animated.timing(bloom, {
        toValue: 1,
        duration: m.bloomDurationMs,
        easing: m.easing,
        useNativeDriver: true,
      }).start(() => bloom.setValue(0));
    }
  }, [activeContext?.id, activeContext?.skinId, skin.motion, bloom]);

  const [personas, setPersonas] = useState<Persona[]>([]);

  const personasToShow = useMemo(() => {
    if (!activeContext) return personas;
    const anyHasContext = personas.some((p) => typeof p.context_id === 'number');
    if (!anyHasContext) return personas; // backend not returning context_id yet
    return personas.filter((p) => p.context_id === activeContext.id);
  }, [personas, activeContext]);

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const handleViewTasks = (personaId: number) => {
    router.push({
      pathname: '/tasks',
      params: { personaId: personaId.toString() },
    } as any);
  };

  const handleEditPersona = (personaId: number) => {
    router.push({
      pathname: '/persona/[personaId]',
      params: { personaId: personaId.toString() },
    } as any);
  };

  const fetchPersonas = useCallback(async () => {
    try {
      const ctxId = activeContext?.id;
      if (!ctxId) {
        setPersonas([]);
        return;
      }

      const token = await SecureStore.getItemAsync("veemee-jwt");
      console.log("📦 JWT present:", !!token);
      if (!token) {
        setPersonas([]);
        return;
      }

      const url = `${API_BASE}/api/contexts/${ctxId}/personas`; // ✅ put back
      console.log("🌍 fetching personas:", url);

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        const text401 = await res.text();
        let data401: any = {};
        try { data401 = JSON.parse(text401); } catch {}

        console.log("🚫 401 from", url, "body:", text401);

        // Only wipe token if backend explicitly says it's expired/invalid
        const msg = (data401?.error || "").toLowerCase();
        if (msg.includes("expired") || msg.includes("invalid") || msg.includes("signature")) {
          await SecureStore.deleteItemAsync("veemee-jwt");
        }

        setPersonas([]);
        router.replace("/auth");
        return;
      }

      const text = await res.text();
      console.log('🧾 Raw response:', text);

      let data: any = {};
      try { data = JSON.parse(text); }
      catch { throw new Error(`Non-JSON response (HTTP ${res.status})`); }

      setPersonas(data.personas || []);

    } catch (err) {
      console.error('🔥 Fetch failed:', err);
      setPersonas([]);
    }
  }, [activeContext?.id]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchPersonas();
    const interval = setInterval(fetchPersonas, 30000);
    return () => clearInterval(interval);
  }, [status, activeContext?.id, fetchPersonas]);

  if (status === 'loading') {
    return (
      <View style={[styles.centered, { backgroundColor: skin.background }]}>
        <ActivityIndicator size="large" color={skin.accent} />
        <Text style={{ color: skin.text, marginTop: 10 }}>Checking login…</Text>
      </View>
    );
  }

  if (status === "unauthenticated") {
    return (
      <View style={[styles.centered, { backgroundColor: skin.background }]}>
        <ActivityIndicator size="large" color={skin.accent} />
        <Text style={{ color: skin.text, marginTop: 10 }}>
          Redirecting to sign in…
        </Text>
      </View>
    );
  }
  
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.shell, { backgroundColor: skin.background }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.bloom,
            {
              backgroundColor: skin.accent,
              opacity: bloom.interpolate({
                inputRange: [0, 1],
                outputRange: [0, skin.motion.bloomOpacity],
              }),
              transform: [
                {
                  scale: bloom.interpolate({
                    inputRange: [0, 1],
                    outputRange: [skin.motion.bloomScaleFrom, skin.motion.bloomScaleTo],
                  }),
                },
              ],
            },
          ]}
        />

        <View style={[styles.container, { backgroundColor: skin.background }]}>
          <Text style={[styles.heading, { color: skin.text }]}>
            {activeContext ? activeContext.name : 'Dashboard'}
          </Text>

          <TouchableOpacity
            style={[styles.contextButton, { backgroundColor: skin.accent }]}
            onPress={() => router.push('/')}
          >
            <Text style={{ color: '#0B0C10', fontWeight: '800' }}>Switch context</Text>
          </TouchableOpacity>

          <FlatList
            contentContainerStyle={styles.listContainer}
            data={personasToShow}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={[styles.row, { backgroundColor: skin.surface }]}>
                <TouchableOpacity style={styles.main} onPress={() => handleEditPersona(item.id)}>
                  <Text style={[styles.title, { color: skin.text }]} numberOfLines={1}>
                    {item.display_name}
                  </Text>
                  <Text style={[styles.meta, { color: skin.muted }]}>{item.task_count} tasks</Text>
                </TouchableOpacity>

                <View style={styles.rightIcons}>
                  <TouchableOpacity onPress={() => handleViewTasks(item.id)} style={styles.iconBtn}>
                    <Ionicons name="list-outline" size={24} color={skin.text} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={{ color: skin.muted }}>Loading personas...</Text>}
          />

          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: skin.surface }]}
            onPress={() => router.push('/')}
          >
            <Ionicons name="arrow-back" size={24} color={skin.text} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.logoutButton, { backgroundColor: skin.surface }]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={skin.text} />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  heading: { fontSize: 24, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },

  shell: { flex: 1 },
  bloom: { ...StyleSheet.absoluteFillObject, borderRadius: 28 },

  contextButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 12,
  },

  listContainer: { paddingHorizontal: 16, paddingBottom: 120 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginVertical: 8,
    borderRadius: 12,

    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 3,
  },

  main: { flex: 1 },
  title: { fontSize: 18, fontWeight: '600' },
  meta: { fontSize: 12, marginTop: 4 },

  rightIcons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8 },

  backButton: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 4,
    elevation: 5,
  },
  logoutButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 4,
    elevation: 5,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});