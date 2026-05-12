import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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

import { AppointmentCard } from "@/components/AppointmentCard";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, barbershop, planStatus } = useAuth();
  const { appointments, cashEntries, clients, updateAppointmentStatus, cancelAppointment } = useData();
  const router = useRouter();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const today = new Date().toISOString().split("T")[0];
  const thisMonth = today.slice(0, 7);

  const todayApts = appointments.filter((a) => a.date === today && a.status !== "cancelled");
  const monthApts = appointments.filter((a) => a.date.startsWith(thisMonth) && a.status !== "cancelled");
  const completedApts = appointments.filter((a) => a.status === "completed");
  const cancelledApts = appointments.filter((a) => a.status === "cancelled");

  const monthIncome = cashEntries
    .filter((e) => e.type === "income" && e.date.startsWith(thisMonth))
    .reduce((s, e) => s + e.amount, 0);

  const todayIncome = cashEntries
    .filter((e) => e.type === "income" && e.date === today)
    .reduce((s, e) => s + e.amount, 0);

  const pendingApts = appointments.filter(
    (a) => (a.status === "confirmed" || a.status === "pending") && a.date === today
  );

  const serviceCount: Record<string, number> = {};
  completedApts.forEach((a) => {
    a.services.forEach((s) => {
      serviceCount[s.name] = (serviceCount[s.name] ?? 0) + 1;
    });
  });
  const topServices = Object.entries(serviceCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const handleComplete = (id: string) => {
    Alert.alert(
      "Concluir atendimento",
      "Selecione a forma de pagamento:",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "PIX", onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); updateAppointmentStatus(id, "completed", "PIX"); } },
        { text: "Dinheiro", onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); updateAppointmentStatus(id, "completed", "Dinheiro"); } },
        { text: "Cartão", onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); updateAppointmentStatus(id, "completed", "Cartão"); } },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 16, paddingBottom: botPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {barbershop && (planStatus.plan !== "premium") && (
          <TouchableOpacity
            onPress={() => router.push("/(admin)/services?tab=plan" as any)}
            style={[
              styles.planBanner,
              {
                backgroundColor: planStatus.plan === "expired" ? "#7F1D1D22" : colors.gold + "15",
                borderColor: planStatus.plan === "expired" ? colors.destructive : colors.gold + "55",
              },
            ]}
          >
            <Feather
              name={planStatus.plan === "expired" ? "alert-circle" : "clock"}
              size={18}
              color={planStatus.plan === "expired" ? colors.destructive : colors.gold}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.planBannerTitle, { color: colors.foreground }]}>
                {planStatus.plan === "expired"
                  ? "Plano expirado"
                  : `Trial gratuito · ${planStatus.trialDaysLeft} dia${planStatus.trialDaysLeft !== 1 ? "s" : ""} restante${planStatus.trialDaysLeft !== 1 ? "s" : ""}`}
              </Text>
              <Text style={[styles.planBannerSub, { color: colors.mutedForeground }]}>
                {planStatus.plan === "expired"
                  ? "Reative para continuar usando o sistema."
                  : "Toque para assinar Premium por R$59/mês."}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}

        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
              Bem-vindo, {user?.name.split(" ")[0]}
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Dashboard</Text>
          </View>
          <TouchableOpacity
            style={[styles.avatarBtn, { backgroundColor: colors.gold }]}
            onPress={() =>
              Alert.alert("Menu", "O que deseja fazer?", [
                { text: "Cancelar", style: "cancel" },
                { text: "Sair da conta", style: "destructive", onPress: logout },
              ])
            }
          >
            <Text style={styles.avatarText}>
              {user?.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          {new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
        </Text>

        <View style={styles.statsRow}>
          <StatCard
            title="Faturamento do mês"
            value={`R$${monthIncome.toLocaleString("pt-BR")}`}
            icon="trending-up"
            trend="+12% vs mês anterior"
            trendUp
            accent
          />
          <StatCard
            title="Receita hoje"
            value={`R$${todayIncome}`}
            icon="dollar-sign"
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            title="Agendamentos"
            value={monthApts.length.toString()}
            icon="calendar"
            trend="+5 esta semana"
            trendUp
          />
          <StatCard
            title="Clientes ativos"
            value={clients.length.toString()}
            icon="users"
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            title="Concluídos"
            value={completedApts.length.toString()}
            icon="check-circle"
          />
          <StatCard
            title="Cancelamentos"
            value={cancelledApts.length.toString()}
            icon="x-circle"
          />
        </View>

        {topServices.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Serviços mais realizados
            </Text>
            <View style={[styles.topServicesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {topServices.map(([name, count], i) => (
                <View
                  key={name}
                  style={[
                    styles.topServiceRow,
                    i < topServices.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <View style={[styles.topServiceRank, { backgroundColor: colors.gold + "22" }]}>
                    <Text style={[styles.topServiceRankText, { color: colors.gold }]}>
                      {i + 1}
                    </Text>
                  </View>
                  <Text style={[styles.topServiceName, { color: colors.foreground }]}>{name}</Text>
                  <Text style={[styles.topServiceCount, { color: colors.mutedForeground }]}>
                    {count}x
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {pendingApts.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Agenda de hoje ({pendingApts.length})
            </Text>
            {pendingApts.map((apt) => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                isAdmin
                onComplete={() => handleComplete(apt.id)}
                onCancel={() =>
                  Alert.alert("Cancelar", "Deseja cancelar este agendamento?", [
                    { text: "Não", style: "cancel" },
                    { text: "Sim", style: "destructive", onPress: () => cancelAppointment(apt.id) },
                  ])
                }
              />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular" },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0C0C0C" },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: -4,
  },
  statsRow: { flexDirection: "row", gap: 10 },
  topServicesCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  topServiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  topServiceRank: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  topServiceRankText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  topServiceName: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  topServiceCount: { fontSize: 14, fontFamily: "Inter_700Bold" },
  planBanner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  planBannerTitle: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 2 },
  planBannerSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
