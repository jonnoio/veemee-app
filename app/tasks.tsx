import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { API_BASE } from "@/config/api";

// Define task type
type Task = {
  id: number;
  task_text: string;
  status: string; // 'todo' | 'done' etc
  due_date: string | null;
  category: string | null;
};

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [currentTimerTaskId, setCurrentTimerTaskId] = useState<number | null>(null);

  const [newTaskText, setNewTaskText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { personaId } = useLocalSearchParams<{ personaId: string }>();

  const fetchTasks = async () => {
    try {
      const token = await SecureStore.getItemAsync('veemee-jwt');
      const res = await fetch(`${API_BASE}/api/tasks/${personaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, [personaId]);

  const handleAddTask = async () => {
    const text = newTaskText.trim();
    if (!text) return;

    setSubmitting(true);
    const token = await SecureStore.getItemAsync('veemee-jwt');

    try {
      // ✅ Assumed endpoint for creating a task under a persona
      const res = await fetch(`${API_BASE}/api/personas/${personaId}/tasks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ task_text: text }),
      });

      const bodyText = await res.text();
      console.log('POST add task status:', res.status);
      console.log('POST add task body:', bodyText);

      if (!res.ok) throw new Error(`Add failed: ${res.status}`);

      const data = JSON.parse(bodyText);
      if (data.task) {
        setTasks((prev) => [data.task, ...prev]);
      } else {
        // fallback if server doesn't return created task
        fetchTasks();
      }

      setNewTaskText('');
    } catch (err) {
      console.error('Error adding task:', err);
      Alert.alert('Error', 'Could not add task.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTaskStatus = async (taskId: number) => {
    const token = await SecureStore.getItemAsync('veemee-jwt');

    // optimistic update
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? { ...task, status: task.status === 'done' ? 'todo' : 'done' }
          : task
      )
    );

    try {
      await fetch(`${API_BASE}/api/tasks/${taskId}/toggle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Error updating task status:', err);
      // rollback on error
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId
            ? { ...task, status: task.status === 'done' ? 'todo' : 'done' }
            : task
        )
      );
    }
  };

  const handleTimerPress = async (taskId: number) => {
    const token = await SecureStore.getItemAsync('veemee-jwt');
    try {
      if (currentTimerTaskId === taskId) {
        await fetch(`${API_BASE}/api/timer/stop`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentTimerTaskId(null);
      } else {
        await fetch(`${API_BASE}/api/timer/start`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ task_id: taskId }),
        });
        setCurrentTimerTaskId(taskId);
      }
    } catch (err) {
      console.error('Error starting/stopping timer:', err);
    }
  };

  // ✅ You said your edit screen file is app/tasks/[taskId].tsx
  const handleEditTask = (taskId: number) => {
    router.push({
      pathname: '/tasks/[taskId]',
      params: { taskId: taskId.toString(), personaId: personaId?.toString() },
    } as any);
  };

  const handleViewActions = (taskId: number) => {
    router.push({
      pathname: '/actions',
      params: { taskId: taskId.toString(), personaId: personaId?.toString() },
    } as any);
  };

  const filteredTasks = hideCompleted ? tasks.filter((t) => t.status !== 'done') : tasks;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.heading}>Tasks</Text>

        {/* Add task row */}
        <View style={styles.addRow}>
          <TextInput
            value={newTaskText}
            onChangeText={setNewTaskText}
            placeholder="Add a task…"
            style={styles.input}
            editable={!submitting}
            onSubmitEditing={handleAddTask}
            returnKeyType="done"
          />
          <TouchableOpacity onPress={handleAddTask} disabled={submitting} style={styles.addBtn}>
            {submitting ? <ActivityIndicator /> : <Ionicons name="add" size={22} color="#333" />}
          </TouchableOpacity>
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Hide completed tasks</Text>
          <Switch value={hideCompleted} onValueChange={setHideCompleted} />
        </View>

        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.taskBox}>
              <TouchableOpacity style={styles.checkbox} onPress={() => toggleTaskStatus(item.id)}>
                <Ionicons
                  name={item.status === 'done' ? 'checkbox-outline' : 'square-outline'}
                  size={24}
                  color={item.status === 'done' ? '#4caf50' : '#999'}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.taskTextWrapper} onPress={() => handleEditTask(item.id)}>
                <Text style={item.status === 'done' ? styles.taskDone : styles.taskText}>
                  {item.task_text}
                </Text>
              </TouchableOpacity>

              <View style={styles.taskActions}>
                <TouchableOpacity onPress={() => handleTimerPress(item.id)}>
                  <Ionicons
                    name={currentTimerTaskId === item.id ? 'pause-circle' : 'play-circle'}
                    size={28}
                    color="#333"
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleViewActions(item.id)} style={{ marginLeft: 12 }}>
                  <Ionicons name="list-outline" size={24} color="#333" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={{ textAlign: 'center' }}>Loading tasks...</Text>}
          contentContainerStyle={filteredTasks.length === 0 ? styles.emptyContainer : styles.listContainer}
        />

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </>
  );
}

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

  listContainer: { paddingBottom: 120 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  toggleLabel: { fontSize: 16, color: '#333' },
});