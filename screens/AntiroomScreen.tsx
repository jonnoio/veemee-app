import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function AntiroomScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.circle} />
      <Text style={styles.text}>Click when ready</Text>
      <Button title="Go to Dashboard" onPress={() => navigation.navigate('Dashboard')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  circle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'black', marginBottom: 20, opacity: 0.7 },
  text: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
});

