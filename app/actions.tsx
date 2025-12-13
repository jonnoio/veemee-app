import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type Action = {
  id: number;
  task_id: number;
  name: string;
  status: 'pending' | 'done' | string;
  due_date: string | null;
  estimated_minutes: number | null;
};

const API_BASE = 'https://veemee.onrender.com';

export default function ActionsScreen() {
  const { taskId, personaId } =
    useLocalSearchParams<{ taskId: string; personaId?: string }>();

  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [newActionName, setNewActionName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // UI-only timer state (wired later)
  const [currentTimerActionId, setCurrentTimerActionId] =
    useState<number | null>(null);

  const tid = Number(taskId);

  /* -------------------- data -------------------- */

  const fetchActions = async () => {
    setLoading(true);
    const token = await SecureStore.getItemAsync('veemee-jwt');

    try {
      const res = await fetch(`${API_BASE}/api/tasks/${tid}/actions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
      setActions(data.actions || []);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not load actions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!Number.isFinite(tid)) return;
    fetchActions();
  }, [taskId]);

  /* -------------------- actions -------------------- */

  const handleAddAction = async () => {
    const name = newActionName.trim();
    if (!name) return;

    setSubmitting(true);
    const token = await SecureStore.getItemAsync('veemee-jwt');

    try {
      const res = await fetch(`${API_BASE}/api/tasks/${tid}/actions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) throw new Error(`Add failed: ${res.status}`);

      const data = await res.json();
      setActions((prev) => [data.action, ...prev]);
      setNewActionName('');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not add action.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleDone = async (actionId: number) => {
    setActions((prev) =>
      prev.map((a) =>
        a.id === actionId
          ? { ...a, status: a.status === 'done' ? 'pending' : 'done' }
          : a
      )
    );

    const token = await SecureStore.getItemAsync('veemee-jwt');

    try {
      await fetch(`${API_BASE}/api/actions/${actionId}/toggle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.error(e);
      fetchActions(); // fallback
    }
  };

  const handleEditName = (action: Action) => {
    Alert.prompt?.(
      'Edit action',
      'Update the action name',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (text) => {
            const name = (text || '').trim();
            if (!name) return;

            const token = await SecureStore.getItemAsync('veemee-jwt');

            const before = actions;
            setActions((prev) =>
              prev.map((a) => (a.id === action.id ? { ...a, name } : a))
            );

            try {
              const res = await fetch(`${API_BASE}/api/actions/${action.id}`, {
                method: 'PATCH',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name }),
              });
              if (!res.ok) throw new Error();
            } catch {
              setActions(before);
              Alert.alert('Error', 'Could not update action.');
            }
          },
        },
      ],
      'plain-text',
      action.name
    );
  };

  const handleDeleteAction = (actionId: number) => {
    Alert.alert('Delete action?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const token = await SecureStore.getItemAsync('veemee-jwt');
          const before = actions;
          setActions((prev) => prev.filter((a) => a.id !== actionId));

          try {
            const res = await fetch(`${API_BASE}/api/actions/${actionId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error();
          } catch {
            setActions(before);
            Alert.alert('Error', 'Could not delete action.');
          }
        },
      },
    ]);
  };

  const handleTimerPress = (actionId: number) => {
    setCurrentTimerActionId((prev) => (prev === actionId ? null : actionId));
    Alert.alert('Timers', 'Action timers coming next.');
  };

  const goBack = () => {
    if (personaId) {
      router.replace({ pathname: '/tasks', params: { personaId } } as any);
    } else {
      router.back();
    }
  };

  /* -------------------- render -------------------- */

  const renderItem = ({ item }: { item: Action }) => {
    const done = item.status === 'done';
    const timing = currentTimerActionId === item.id;

    return (
      <View style={[styles.taskBox, done && styles.rowDone]}>
        <TouchableOpacity onPress={() => handleToggleDone(item.id)} style={styles.checkbox}>
          <Ionicons
            name={done ? 'checkbox-outline' : 'square-outline'}
            size={24}
            color={done ? '#4caf50' : '#999'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.taskTextWrapper}
          onPress={() => handleEditName(item)}
          onLongPress={() => handleDeleteAction(item.id)}
        >
          <Text style={done ? styles.taskDone : styles.taskText} numberOfLines={2}>
            {item.name}
          </Text>
        </TouchableOpacity>

        <View style={styles.taskActions}>
          <TouchableOpacity onPress={() => handleTimerPress(item.id)}>
            <Ionicons
              name={timing ? 'pause-circle' : 'play-circle'}
              size={28}
              color="#333"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        <Text style={styles.heading}>Actions</Text>

        <View style={styles.addRow}>
          <TextInput
            value={newActionName}
            onChangeText={setNewActionName}
            placeholder="Add an action…"
            style={styles.input}
            editable={!submitting}
            onSubmitEditing={handleAddAction}
            returnKeyType="done"
          />
          <TouchableOpacity onPress={handleAddAction} disabled={submitting} style={styles.addBtn}>
            {submitting ? <ActivityIndicator /> : <Ionicons name="add" size={22} color="#333" />}
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={actions}
            keyExtractor={(a) => a.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 120 }}
            ListEmptyComponent={<Text style={{ textAlign: 'center' }}>No actions yet.</Text>}
          />
        )}

        {/* Bottom-left back button (matches Tasks) */}
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </>
  );
}

/* -------------------- styles -------------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', paddingTop: 60 },
  heading: { fontSize: 28, fontWeight: 'bold', marginVertical: 20, alignSelf: 'center' },

  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
  },

  taskBox: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 3,
    marginHorizontal: 16,
  },
  rowDone: { opacity: 0.7 },

  checkbox: { marginRight: 12 },
  taskTextWrapper: { flex: 1 },

  taskText: { fontSize: 18, color: '#333' },
  taskDone: { fontSize: 18, color: '#999', textDecorationLine: 'line-through' },

  taskActions: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },

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

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});