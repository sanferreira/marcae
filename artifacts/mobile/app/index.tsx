import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getPostAuthHref } from "@/lib/sessionRoute";

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

  return <Redirect href={getPostAuthHref(user, planStatus)} />;
}
