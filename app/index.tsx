import React from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { router } from 'expo-router';

const { height } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const animation = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animation, {
          toValue: 1.05,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(animation, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePress = () => {
    router.push('/dashboard');
  };

  return (
    <TouchableWithoutFeedback onPress={handlePress}>
      <View style={styles.container}>
        <Animated.View style={[styles.circle, { transform: [{ scale: animation }] }]} />
        <View style={styles.textContainer}>
          <Text style={styles.text}>Click when ready</Text>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  circle: {
    marginTop: height * 0.25,  // ← this pushes it 40% down the screen
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#000',
  },
  textContainer: {
    position: 'absolute',
    bottom: 50,  // ← this pins the text near the bottom
  },
  text: {
    fontSize: 20,
    color: '#555',
  },
});
