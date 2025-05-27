import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Switch } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import * as SecureStore from 'expo-secure-store';


// Define task type
type Task = {
  id: number;
  task_text: string;
  status: string;
  due_date: string;
  category: string;
};

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hideCompleted, setHideCompleted] = useState(false);
  const { personaId } = useLocalSearchParams<{ personaId: string }>();

  const fetchTasks = async () => {
    try {
      const token = await SecureStore.getItemAsync('veemee-jwt');
      const res = await fetch(`https://veemee.onrender.com/api/tasks/${personaId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 30000); // every 30s
    return () => clearInterval(interval);
  }, [personaId]);

  const toggleTaskStatus = async (taskId: number) => {
    const token = await SecureStore.getItemAsync('veemee-jwt');
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? { ...task, status: task.status === 'done' ? 'pending' : 'done' }
          : task
      )
    );

    try {
      await fetch(`https://veemee.onrender.com/api/tasks/${taskId}/toggle`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.error('Error updating task status:', err);
      // Rollback on error
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId
            ? { ...task, status: task.status === 'done' ? 'pending' : 'done' }
            : task
        )
      );
    }
  };

  const filteredTasks = hideCompleted
    ? tasks.filter((task) => task.status !== 'done')
    : tasks;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.heading}>Tasks</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Hide completed tasks</Text>
          <Switch value={hideCompleted} onValueChange={setHideCompleted} />
        </View>
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.taskBox}
              onPress={() => toggleTaskStatus(item.id)}
            >
              <Text style={item.status === 'done' ? styles.taskDone : styles.taskText}>
                {item.task_text} ({item.status})
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text>Loading tasks...</Text>}
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
  taskBox: {
    backgroundColor: 'white',
    padding: 20,
    marginVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 3,
  },
  taskText: { fontSize: 18, color: '#333' },
  taskDone: { fontSize: 18, color: '#999', textDecorationLine: 'line-through' },
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
  listContainer: { paddingBottom: 100 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#333',
  },
});