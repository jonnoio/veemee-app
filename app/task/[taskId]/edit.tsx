import { Stack, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function EditTask() {
  const { taskId } = useLocalSearchParams();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Stack.Screen options={{ title: "Edit Task" }} />
      <Text>Edit task {String(taskId)}</Text>
    </View>
  );
}