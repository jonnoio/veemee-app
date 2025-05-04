import { View, Text, StyleSheet } from 'react-native';

export default function Dashboard() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Your Dashboard</Text>
      <View style={styles.contextBox}><Text style={styles.contextText}>Work</Text></View>
      <View style={styles.contextBox}><Text style={styles.contextText}>Music</Text></View>
      <View style={styles.contextBox}><Text style={styles.contextText}>Home</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8' },
  heading: { fontSize: 28, fontWeight: 'bold', marginBottom: 30 },
  contextBox: { backgroundColor: 'white', padding: 20, marginVertical: 10, borderRadius: 12, width: 200, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 6, elevation: 3 },
  contextText: { fontSize: 20, color: '#333' },
});