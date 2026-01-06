import { Stack, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function EditProject() {
  const { projectId } = useLocalSearchParams();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Stack.Screen options={{ title: "Edit Project" }} />
      <Text>Edit project {String(projectId)}</Text>
    </View>
  );
}