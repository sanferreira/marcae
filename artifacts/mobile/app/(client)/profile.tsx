import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { appointments, loyaltyInfo } = useData();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const myApts = appointments.filter((a) => a.clientId === user?.id);
  const completedApts = myApts.filter((a) => a.status === "completed");
  const totalSpent = completedApts.reduce((s, a) => s + a.totalPrice, 0);

  const handleLogout = () => {
    Alert.alert("Sair", "Deseja sair da conta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          logout();
        },
      },
    ]);
  };

  const MENU_ITEMS = [
    { icon: "calendar" as const, label: "Meus agendamentos", count: myApts.length },
    { icon: "check-circle" as const, label: "Serviços realizados", count: completedApts.length },
    { icon: "award" as const, label: "Pontos de fidelidade", count: loyaltyInfo.currentPoints },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 16, paddingBottom: botPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Perfil</Text>

        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.gold }]}>
            <Text style={styles.avatarText}>
              {user?.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>{user?.name}</Text>
            <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>{user?.email}</Text>
            {user?.phone && (
              <Text style={[styles.profilePhone, { color: colors.mutedForeground }]}>{user.phone}</Text>
            )}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.gold }]}>{completedApts.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Cortes</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.gold }]}>R${totalSpent}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total gasto</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.gold }]}>{loyaltyInfo.currentPoints}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Pontos</Text>
          </View>
        </View>

        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {MENU_ITEMS.map((item, i) => (
            <View
              key={item.label}
              style={[
                styles.menuItem,
                i < MENU_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <View style={[styles.menuIcon, { backgroundColor: colors.secondary }]}>
                <Feather name={item.icon} size={16} color={colors.gold} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
              <Text style={[styles.menuCount, { color: colors.gold }]}>{item.count}</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: colors.destructive + "44" }]}
          onPress={handleLogout}
          activeOpacity={0.75}
        >
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#0C0C0C" },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  profileEmail: { fontSize: 13, fontFamily: "Inter_400Regular" },
  profilePhone: { fontSize: 13, fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  menuCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  menuCount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
