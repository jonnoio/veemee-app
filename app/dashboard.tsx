import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { logout } from '../lib/auth'; // adjust path
import { useAuth } from '../lib/useAuth';

type Persona = {
  id: number;
  display_name: string;
  slug: string;
  task_count: number;
};

export default function Dashboard() {
  const router = useRouter();
  const { status, email } = useAuth();
  console.log('🧠 Dashboard auth status:', status, email);

  const [personas, setPersonas] = useState<Persona[]>([]);

  const handleLogout = async () => {
    await logout(); // remove JWT
    router.replace('/'); // send back to landing/login screen
  };

  const handleViewTasks = (personaId: number) => {
    router.push({
      pathname: '/tasks',
      params: { personaId: personaId.toString() },
    } as any);
  };

  const handleEditPersona = (personaId: number) => {
    // ✅ CHANGE THIS if your persona edit route differs
    // e.g. '/personas/[personaId]' or '/persona_edit' etc.
    router.push({
      pathname: '/persona/[personaId]',
      params: { personaId: personaId.toString() },
    } as any);
  };

  useEffect(() => {
    if (status !== 'authenticated') {
      console.log('🔒 Not authenticated yet, skipping fetch.');
      return;
    }

    const fetchPersonas = async () => {
      try {
        const token = await SecureStore.getItemAsync('veemee-jwt');
        console.log('📦 JWT used for fetch:', token);

        const res = await fetch('https://veemee.onrender.com/api/personas', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const text = await res.text();
        console.log('🧾 Raw response:', text); // shows HTML if misrouted

        const data = JSON.parse(text);
        console.log('✅ Parsed JSON:', data);

        setPersonas(data.personas || []);
      } catch (err) {
        console.error('🔥 Fetch failed:', err);
      }
    };

    fetchPersonas();
    const interval = setInterval(fetchPersonas, 30000);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/confirm');
    }
  }, [status]);

  if (status === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>Checking login…</Text>
      </View>
    );
  }

  if (status === 'unauthenticated') return null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.heading}>Dashboard</Text>

        <FlatList
          contentContainerStyle={styles.listContainer}
          data={personas}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.row}>
              {/* Main (tap to edit persona) */}
              <TouchableOpacity style={styles.main} onPress={() => handleEditPersona(item.id)}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.display_name}
                </Text>
                <Text style={styles.meta}>{item.task_count} tasks</Text>
              </TouchableOpacity>

              {/* Right icon (go to tasks) */}
              <View style={styles.rightIcons}>
                <TouchableOpacity onPress={() => handleViewTasks(item.id)} style={styles.iconBtn}>
                  <Ionicons name="list-outline" size={24} color="#333" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text>Loading personas...</Text>}
        />

        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', paddingTop: 60 },
  heading: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },

  // NEW: consistent row styling (matches tasks/actions vibe)
  listContainer: { paddingHorizontal: 16, paddingBottom: 120 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
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
  title: { fontSize: 18, color: '#333', fontWeight: '600' },
  meta: { fontSize: 12, color: '#777', marginTop: 4 },

  rightIcons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8 },

  backButton: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    backgroundColor: '#333',
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
    backgroundColor: '#333',
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