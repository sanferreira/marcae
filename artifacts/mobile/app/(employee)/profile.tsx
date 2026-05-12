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
import { DAY_KEYS, DAY_SHORT, DEFAULT_SCHEDULE, useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";

export default function EmployeeProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, barbershop, logout } = useAuth();
  const { professionals, professionalSchedules, getProfessionalStats, appointments } = useData();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const me = professionals.find((p) => p.id === user?.professionalId);
  const stats = me ? getProfessionalStats(me.id) : { completed: 0, revenue: 0, cancelRate: 0 };
  const schedule = me ? (professionalSchedules[me.id] ?? DEFAULT_SCHEDULE) : DEFAULT_SCHEDULE;
  const totalCommission = Math.round(stats.revenue * ((me?.commissionRate ?? 50) / 100));
  const upcomingCount = appointments.filter((a) =>
    a.professionalId === user?.professionalId &&
    (a.status === "confirmed" || a.status === "pending")
  ).length;

  const handleLogout = () => {
    Alert.alert("Sair", "Deseja sair da conta?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        logout();
      }},
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: botPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Perfil</Text>

        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.gold }]}>
            <Text style={styles.avatarText}>
              {me?.avatar ?? user?.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>{user?.name}</Text>
            {me && (
              <Text style={[styles.profileSpecialty, { color: colors.gold }]}>{me.specialty}</Text>
            )}
            <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>{user?.email}</Text>
            {barbershop && (
              <View style={styles.shopRow}>
                <Feather name="briefcase" size={11} color={colors.mutedForeground} />
                <Text style={[styles.shopText, { color: colors.mutedForeground }]}>
                  {barbershop.name}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Lifetime stats */}
        <Text style={[styles.section, { color: colors.foreground }]}>Suas estatísticas</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="check-circle" size={16} color={"#22C55E"} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{stats.completed}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Atendimentos concluídos</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="dollar-sign" size={16} color={colors.gold} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>R${stats.revenue}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Receita gerada</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="award" size={16} color={colors.gold} />
            <Text style={[styles.statValue, { color: colors.gold }]}>R${totalCommission}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total em comissão ({me?.commissionRate ?? 50}%)</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="calendar" size={16} color={colors.gold} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{upcomingCount}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Próximos agendamentos</Text>
          </View>
        </View>

        {/* Schedule preview */}
        <Text style={[styles.section, { color: colors.foreground }]}>Sua escala</Text>
        <View style={[styles.scheduleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.scheduleDays}>
            {DAY_KEYS.map((k) => (
              <View key={k} style={[styles.schedDay, { backgroundColor: schedule[k].enabled ? colors.gold + "22" : colors.secondary }]}>
                <Text style={[styles.schedDayLabel, { color: schedule[k].enabled ? colors.gold : colors.mutedForeground }]}>
                  {DAY_SHORT[k]}
                </Text>
                {schedule[k].enabled ? (
                  <Text style={[styles.schedHours, { color: colors.foreground }]}>
                    {schedule[k].startTime}–{schedule[k].endTime}
                  </Text>
                ) : (
                  <Text style={[styles.schedHours, { color: colors.mutedForeground }]}>Folga</Text>
                )}
              </View>
            ))}
          </View>
          <Text style={[styles.scheduleHint, { color: colors.mutedForeground }]}>
            Para alterar sua escala, fale com o administrador.
          </Text>
        </View>

        {/* Logout */}
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
  profileCard: { flexDirection: "row", alignItems: "center", gap: 16, padding: 18, borderRadius: 18, borderWidth: 1 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#0C0C0C" },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { fontSize: 17, fontFamily: "Inter_700Bold" },
  profileSpecialty: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  profileEmail: { fontSize: 12, fontFamily: "Inter_400Regular" },
  shopRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  shopText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  section: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 4 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statBox: { width: "48%", padding: 14, borderRadius: 14, borderWidth: 1, gap: 6 },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 14 },
  scheduleCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  scheduleDays: { gap: 6 },
  schedDay: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  schedDayLabel: { fontSize: 12, fontFamily: "Inter_700Bold" },
  schedHours: { fontSize: 12, fontFamily: "Inter_500Medium" },
  scheduleHint: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, marginTop: 4 },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
