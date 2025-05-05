import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

type Context = {
  id: number;
  display_name: string;
  slug: string;
  task_count: number;
};

export default function Dashboard() {
  const [contexts, setContexts] = useState<Context[]>([]);

  useEffect(() => {
    fetch('https://veemee.onrender.com/api/contexts', {
      headers: { 'x-private-key': 'Wwy4Hu33Xs7ob4MVjQ2kB-yW2NGRmsWk' },
    })
      .then((res) => res.json())
      .then((data) => setContexts(data.contexts || []))
      .catch((err) => console.error('Error fetching contexts:', err));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Your Dashboard</Text>
      <FlatList
        data={contexts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.contextBox}>
            <Text style={styles.contextText}>
              {item.display_name} ({item.task_count} tasks)
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text>No contexts found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8' },
  heading: { fontSize: 28, fontWeight: 'bold', marginBottom: 30 },
  contextBox: { backgroundColor: 'white', padding: 20, marginVertical: 10, borderRadius: 12, width: 200, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 6, elevation: 3 },
  contextText: { fontSize: 20, color: '#333' },
});
