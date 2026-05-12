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
      <NativeTabs.Trigger name="dashboard">
        <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="agenda">
        <Icon sf={{ default: "calendar", selected: "calendar.badge.checkmark" }} />
        <Label>Agenda</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="clients">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>Clientes</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="financial">
        <Icon sf={{ default: "banknote", selected: "banknote.fill" }} />
        <Label>Financeiro</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="services">
        <Icon sf={{ default: "scissors", selected: "scissors.fill" }} />
        <Label>Serviços</Label>
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
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="chart.bar" tintColor={color} size={22} />
            ) : (
              <Feather name="bar-chart-2" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: "Agenda",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="calendar" tintColor={color} size={22} />
            ) : (
              <Feather name="calendar" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: "Clientes",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.2" tintColor={color} size={22} />
            ) : (
              <Feather name="users" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="financial"
        options={{
          title: "Financeiro",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="banknote" tintColor={color} size={22} />
            ) : (
              <Feather name="dollar-sign" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: "Serviços",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="scissors" tintColor={color} size={22} />
            ) : (
              <Feather name="scissors" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

function ExpiredPlanGate({ canUpgrade }: { canUpgrade: boolean }) {
  const colors = useColors();
  const { logout, barbershop, upgradeToPremium } = useAuth();
  const handleUpgrade = () => {
    upgradeToPremium();
  };
  return (
    <View style={[gateStyles.container, { backgroundColor: colors.background }]}>
      <View style={[gateStyles.card, { backgroundColor: colors.card, borderColor: colors.destructive + "55" }]}>
        <Feather name="alert-circle" size={36} color={colors.destructive} />
        <Text style={[gateStyles.title, { color: colors.foreground }]}>Plano expirado</Text>
        <Text style={[gateStyles.msg, { color: colors.mutedForeground }]}>
          O acesso de {barbershop?.name ?? "seu estabelecimento"} foi pausado.{"\n"}
          {canUpgrade ? "Reative a assinatura por R$59/mês para voltar a operar." : "Peça ao administrador para reativar a assinatura."}
        </Text>
        {canUpgrade && (
          <TouchableOpacity style={[gateStyles.btn, { backgroundColor: colors.gold, borderColor: colors.gold }]} onPress={handleUpgrade}>
            <Text style={[gateStyles.btnText, { color: "#0C0C0C" }]}>Assinar Premium</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[gateStyles.btn, { borderColor: colors.border }]} onPress={logout}>
          <Text style={[gateStyles.btnText, { color: colors.foreground }]}>Sair da conta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const gateStyles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: { borderRadius: 18, borderWidth: 1.5, padding: 24, alignItems: "center", gap: 10, maxWidth: 360 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", marginTop: 4 },
  msg: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19, marginBottom: 8 },
  btn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  btnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});

export default function AdminTabLayout() {
  const { user, isLoading, planStatus } = useAuth();
  const colors = useColors();
  if (isLoading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}><ActivityIndicator color={colors.gold} /></View>;
  }
  if (!user) return <Redirect href={"/(auth)/login" as any} />;
  if (user.role !== "admin") {
    return <Redirect href={"/" as any} />;
  }
  if (planStatus.plan === "expired") return <ExpiredPlanGate canUpgrade={true} />;
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}
