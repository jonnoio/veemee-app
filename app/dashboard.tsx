import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../lib/useAuth';
import { logout } from '../lib/auth'; // adjust path

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
    await logout();            // remove JWT
    router.replace('/');       // send back to landing/login screen
  };

  useEffect(() => {
    if (status !== 'authenticated') {
      console.log('🔒 Not authenticated yet, skipping fetch.');
      return;
    }

    const fetchPersonas = async () => {
      try {
        const token = await SecureStore.getItemAsync('veemee-jwt');
        console.log("📦 JWT used for fetch:", token);
        const res = await fetch('https://veemee.onrender.com/api/personas', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const text = await res.text();
        console.log('🧾 Raw response:', text); // this will show if it's HTML

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
            <TouchableOpacity
              style={styles.personaBox}
              onPress={() => router.push(`/tasks?personaId=${item.id}`)}
            >
              <Text style={styles.personaText}>
                {item.display_name} ({item.task_count} tasks)
              </Text>
            </TouchableOpacity>
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
  personaBox: {
    backgroundColor: 'white',
    padding: 20,
    marginVertical: 10,
    borderRadius: 12,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 3,
  },
  personaText: { fontSize: 20, color: '#333' },
  listContainer: { alignItems: 'center' },
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
