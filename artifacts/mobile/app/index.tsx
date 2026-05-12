import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function Index() {
  const { user, isLoading, planStatus } = useAuth();
  const colors = useColors();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/login" />;
  // Total block for admins when the trial expired and there's no premium subscription —
  // they can only see the upgrade screen until they pay.
  if (user.role === "admin" && !planStatus.isActive) return <Redirect href="/upgrade" />;
  if (user.role === "admin") return <Redirect href="/(admin)/dashboard" />;
  if (user.role === "employee") return <Redirect href="/(employee)/today" />;
  return <Redirect href="/(client)/home" />;
}
