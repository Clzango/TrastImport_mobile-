import { router } from "expo-router";
import { View } from "react-native";
import { Button, EmptyState, type IconName } from "./ui";

export function SignInPrompt({ icon, title, message }: { icon: IconName; title: string; message: string }) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      message={message}
      action={
        <View style={{ gap: 10 }}>
          <Button title="Log In" onPress={() => router.push("/login")} />
          <Button title="Create Account" variant="tinted" onPress={() => router.push("/signup")} />
        </View>
      }
    />
  );
}
