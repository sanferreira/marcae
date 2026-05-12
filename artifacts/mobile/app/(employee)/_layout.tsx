import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Redirect, Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="today">
        <Icon sf={{ default: "sun.max", selected: "sun.max.fill" }} />
        <Label>Hoje</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="agenda">
        <Icon sf={{ default: "calendar", selected: "calendar.badge.checkmark" }} />
        <Label>Agenda</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Perfil</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const isDark = useColorScheme() === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: "Hoje",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="sun.max" tintColor={color} size={22} /> : <Feather name="sun" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: "Agenda",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="calendar" tintColor={color} size={22} /> : <Feather name="calendar" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="person" tintColor={color} size={22} /> : <Feather name="user" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

function EmployeeExpiredGate() {
  const colors = useColors();
  const { logout, barbershop } = useAuth();
  return (
    <View style={[empGate.container, { backgroundColor: colors.background }]}>
      <View style={[empGate.card, { backgroundColor: colors.card, borderColor: colors.destructive + "55" }]}>
        <Feather name="alert-circle" size={36} color={colors.destructive} />
        <Text style={[empGate.title, { color: colors.foreground }]}>Acesso pausado</Text>
        <Text style={[empGate.msg, { color: colors.mutedForeground }]}>
          A assinatura de {barbershop?.name ?? "seu estabelecimento"} expirou. Peça ao administrador para reativar o plano.
        </Text>
        <TouchableOpacity style={[empGate.btn, { borderColor: colors.border }]} onPress={logout}>
          <Text style={[empGate.btnText, { color: colors.foreground }]}>Sair da conta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const empGate = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: { borderRadius: 18, borderWidth: 1.5, padding: 24, alignItems: "center", gap: 10, maxWidth: 360 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", marginTop: 4 },
  msg: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19, marginBottom: 8 },
  btn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  btnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});

export default function EmployeeTabLayout() {
  const { user, isLoading, planStatus } = useAuth();
  const colors = useColors();
  if (isLoading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}><ActivityIndicator color={colors.gold} /></View>;
  }
  if (!user) return <Redirect href={"/(auth)/login" as any} />;
  if (user.role !== "employee") return <Redirect href={"/" as any} />;
  if (planStatus.plan === "expired") return <EmployeeExpiredGate />;
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}
