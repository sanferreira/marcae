import { Stack } from "expo-router";
import React from "react";
import { useColorScheme } from "react-native";
import colors from "@/constants/colors";

export default function AuthLayout() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? colors.dark : colors.light;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.background },
        animation: "fade",
      }}
    />
  );
}
