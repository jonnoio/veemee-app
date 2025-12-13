import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type Task = {
  id: number;
  persona_id: number;
  task_text: string;
  status: 'todo' | 'done' | string;
  due_date: string | null;
  category: string | null;
};

const API_BASE = 'https://veemee.onrender.com';

export default function TaskEditScreen() {
  const { taskId, personaId } = useLocalSearchParams<{ taskId: string; personaId?: string }>();
  const tid = Number(taskId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [task, setTask] = useState<Task | null>(null);

  // editable fields
  const [taskText, setTaskText] = useState('');
  const [dueDate, setDueDate] = useState<string>(''); // YYYY-MM-DD or empty
  const [isDone, setIsDone] = useState(false);

  const canSave = useMemo(() => {
    return taskText.trim().length > 0 && !saving && Number.isFinite(tid);
  }, [taskText, saving, tid]);

  const goBack = () => {
    if (personaId) {
      router.replace({ pathname: '/tasks', params: { personaId } } as any);
    } else {
      router.back();
    }
  };

  const loadTask = async () => {
    if (!Number.isFinite(tid)) return;

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('veemee-jwt');

      const res = await fetch(`${API_BASE}/api/task/${tid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text();
        console.log('GET task status:', res.status);
        console.log('GET task body:', text);
        throw new Error(`Fetch failed: ${res.status}`);
      }

      const data = await res.json();
      const t: Task = data.task;

      setTask(t);
      setTaskText(t.task_text || '');
      setDueDate(t.due_date || '');
      setIsDone(t.status === 'done');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not load task.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const handleSave = async () => {
    if (!canSave) return;

    setSaving(true);
    try {
      const token = await SecureStore.getItemAsync('veemee-jwt');

      const payload = {
        task_text: taskText.trim(),
        status: isDone ? 'done' : 'todo',
        due_date: dueDate.trim() ? dueDate.trim() : null,
      };

      const res = await fetch(`${API_BASE}/api/task/${tid}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.log('PATCH task status:', res.status);
        console.log('PATCH task body:', text);
        throw new Error(`Save failed: ${res.status}`);
      }

      // Optionally refresh local
      const data = await res.json();
      setTask(data.task);

      // Back to tasks list
      goBack();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not save task.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        <Text style={styles.heading}>Edit Task</Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator />
            <Text style={{ marginTop: 10 }}>Loading…</Text>
          </View>
        ) : !task ? (
          <View style={styles.centered}>
            <Text>Task not found.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.label}>Task</Text>
            <TextInput
              value={taskText}
              onChangeText={setTaskText}
              placeholder="Task text…"
              style={styles.input}
              multiline
            />

            <View style={styles.row}>
              <Text style={styles.label}>Done</Text>
              <Switch value={isDone} onValueChange={setIsDone} />
            </View>

            <Text style={styles.label}>Due date (YYYY-MM-DD)</Text>
            <TextInput
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="e.g. 2025-12-31"
              style={styles.input}
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
              disabled={!canSave}
              onPress={handleSave}
            >
              {saving ? (
                <ActivityIndicator />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom-left back button (consistent with Tasks/Actions) */}
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', paddingTop: 60 },
  heading: { fontSize: 28, fontWeight: 'bold', marginVertical: 20, alignSelf: 'center' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 3,
  },

  label: { fontSize: 14, color: '#555', marginTop: 10, marginBottom: 6 },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },

  row: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  saveBtn: {
    marginTop: 18,
    backgroundColor: '#333',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },

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
});