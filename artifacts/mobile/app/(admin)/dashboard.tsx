import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
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
import { BASE_PLAN_PRICE_LABEL, PAYMENT_PENDING_PLAN, getPlanDisplayName, planHasFeature } from "@/constants/plans";
import { toLocalDateString } from "@/lib/dates";

const PAY_METHODS = ["PIX", "Dinheiro", "Cartao", "Pacote"];

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, barbershop, planStatus } = useAuth();
  const {
    appointments, cashEntries, clients, professionals, services, products, categories,
    getProfessionalStats, updateAppointmentStatus, cancelAppointment,
  } = useData();
  const router = useRouter();

  const topPad = insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const today = toLocalDateString();
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
  const showReports = planHasFeature(planStatus.plan, "reports");
  const professionalReport = professionals
    .map((professional) => ({ professional, stats: getProfessionalStats(professional.id) }))
    .filter((item) => item.stats.completed > 0 || item.stats.revenue > 0)
    .sort((a, b) => b.stats.revenue - a.stats.revenue)
    .slice(0, 5);
  const hasLinkedServices = professionals.some((professional) => (professional.serviceIds ?? []).length > 0);
  const hasScheduleReviewed = professionals.some((professional) => !!professional.schedule);
  const onboardingSteps = [
    {
      key: "services",
      label: "Cadastrar serviços",
      done: services.length > 0,
      route: "/(admin)/services?tab=services",
    },
    {
      key: "team",
      label: "Cadastrar funcionários",
      done: professionals.length > 0,
      route: "/(admin)/services?tab=team",
    },
    {
      key: "links",
      label: "Vincular serviços à equipe",
      done: hasLinkedServices,
      route: "/(admin)/services?tab=team",
    },
    {
      key: "schedule",
      label: "Revisar horários da equipe",
      done: hasScheduleReviewed,
      route: "/(admin)/services?tab=team",
    },
    {
      key: "categories",
      label: "Organizar categorias",
      done: categories.length > 0,
      route: "/(admin)/services?tab=categories",
    },
    {
      key: "appointment",
      label: "Testar um agendamento",
      done: appointments.length > 0,
      route: "/(admin)/agenda",
    },
  ] as const;
  const optionalOnboardingStep = {
    label: "Cadastrar produtos para venda",
    done: products.length > 0,
    route: "/(admin)/services?tab=products",
  } as const;
  const completedOnboarding = onboardingSteps.filter((step) => step.done).length;
  const showOnboarding = completedOnboarding < onboardingSteps.length;

  const handleAvatarPress = () => {
    if (Platform.OS === "web") {
      router.push("/admin-settings" as never);
      return;
    }

    Alert.alert("Menu", "O que deseja fazer?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Configurações", onPress: () => router.push("/admin-settings" as never) },
      { text: "Sair da conta", style: "destructive", onPress: logout },
    ]);
  };

  const normalizePayment = (value: string | null) => {
    const normalized = value?.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") ?? "";
    if (!normalized) return null;
    if (normalized.includes("pix")) return "PIX";
    if (normalized.includes("pacote")) return "Pacote";
    if (normalized.includes("dinheiro")) return "Dinheiro";
    if (normalized.includes("cartao") || normalized.includes("credito") || normalized.includes("debito")) return "Cartao";
    return null;
  };

  const completeAppointment = (id: string, paymentMethod: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    void updateAppointmentStatus(id, "completed", paymentMethod);
  };

  const handleComplete = (id: string) => {
    Alert.alert("Concluir atendimento", "Selecione a forma de pagamento:", [
      { text: "Cancelar", style: "cancel" },
      ...PAY_METHODS.map((method) => ({
        text: method,
        onPress: () => completeAppointment(id, method),
      })),
    ]);
  };

  const handleCancel = (id: string) => {
    Alert.alert("Cancelar", "Deseja cancelar este agendamento?", [
      { text: "Nao", style: "cancel" },
      { text: "Sim", style: "destructive", onPress: () => { void cancelAppointment(id); } },
    ]);
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
        {barbershop && !planStatus.isPremium && (
          <TouchableOpacity
            onPress={() => router.push("/(admin)/services?tab=plan" as any)}
            style={[
              styles.planBanner,
              {
                backgroundColor: !planStatus.isActive ? "#7F1D1D22" : colors.gold + "15",
                borderColor: !planStatus.isActive ? colors.destructive : colors.gold + "55",
              },
            ]}
          >
            <Feather
              name={!planStatus.isActive ? "alert-circle" : "clock"}
              size={18}
              color={!planStatus.isActive ? colors.destructive : colors.gold}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.planBannerTitle, { color: colors.foreground }]}>
                {!planStatus.isActive
                  ? planStatus.plan === PAYMENT_PENDING_PLAN ? "Pagamento pendente" : "Plano expirado"
                  : `Trial gratuito · ${planStatus.trialDaysLeft} dia${planStatus.trialDaysLeft !== 1 ? "s" : ""} restante${planStatus.trialDaysLeft !== 1 ? "s" : ""}`}
              </Text>
              <Text style={[styles.planBannerSub, { color: colors.mutedForeground }]}>
                {!planStatus.isActive
                  ? planStatus.plan === PAYMENT_PENDING_PLAN ? "Atualize o pagamento para continuar usando o sistema." : "Reative para continuar usando o sistema."
                  : `Após o trial, o painel bloqueia até assinar. Planos a partir de ${BASE_PLAN_PRICE_LABEL}/mes.`}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}

        <LinearGradient
          colors={[colors.primary, colors.goldDark, colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>Bem-vindo, {user?.name.split(" ")[0]}</Text>
              <Text style={styles.title}>Operação sob controle.</Text>
              <Text style={styles.heroSub}>
                {barbershop?.name ?? "Seu estabelecimento"} com agenda, financeiro e clientes no mesmo painel.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.avatarBtn, { backgroundColor: colors.gold }]}
              onPress={handleAvatarPress}
            >
              <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
                {user?.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroChip}>
              <Feather name="calendar" size={13} color="#FFF7E5" />
              <Text style={styles.heroChipText}>
                {new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
              </Text>
            </View>
            <View style={styles.heroChip}>
              <Feather name="briefcase" size={13} color="#FFF7E5" />
              <Text style={styles.heroChipText}>
                {planStatus.isPremium ? `Plano ${getPlanDisplayName(planStatus.plan)}` : `Trial: ${planStatus.trialDaysLeft} dias`}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {showOnboarding && (
          <View style={[styles.onboardingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.onboardingHeader}>
              <View style={[styles.onboardingIcon, { backgroundColor: colors.gold + "22" }]}>
                <Feather name="check-square" size={18} color={colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.onboardingTitle, { color: colors.foreground }]}>Comece por aqui</Text>
                <Text style={[styles.onboardingSub, { color: colors.mutedForeground }]}>
                  {completedOnboarding}/{onboardingSteps.length} passos prontos para abrir a agenda.
                </Text>
              </View>
            </View>

            <View style={[styles.onboardingProgress, { backgroundColor: colors.secondary }]}>
              <View
                style={[
                  styles.onboardingProgressFill,
                  { backgroundColor: colors.gold, width: `${(completedOnboarding / onboardingSteps.length) * 100}%` },
                ]}
              />
            </View>

            {onboardingSteps.map((step) => (
              <TouchableOpacity
                key={step.key}
                style={styles.onboardingStep}
                onPress={() => router.push(step.route as never)}
                activeOpacity={0.85}
              >
                <View style={[styles.stepCheck, { backgroundColor: step.done ? "#22C55E" : colors.secondary }]}>
                  <Feather name={step.done ? "check" : "arrow-right"} size={13} color={step.done ? "#FFFFFF" : colors.mutedForeground} />
                </View>
                <Text style={[styles.stepLabel, { color: step.done ? colors.mutedForeground : colors.foreground }]}>{step.label}</Text>
              </TouchableOpacity>
            ))}

            {!optionalOnboardingStep.done && (
              <TouchableOpacity
                style={[styles.optionalStep, { backgroundColor: colors.secondary }]}
                onPress={() => router.push(optionalOnboardingStep.route as never)}
                activeOpacity={0.85}
              >
                <Feather name="package" size={14} color={colors.gold} />
                <Text style={[styles.optionalStepText, { color: colors.foreground }]}>{optionalOnboardingStep.label}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Visão geral do dia</Text>

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

        {showReports && professionalReport.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Comissoes e ocupacao
            </Text>
            <View style={[styles.topServicesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {professionalReport.map(({ professional, stats }, i) => (
                <View
                  key={professional.id}
                  style={[
                    styles.topServiceRow,
                    i < professionalReport.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <View style={[styles.topServiceRank, { backgroundColor: colors.gold + "22" }]}>
                    <Text style={[styles.topServiceRankText, { color: colors.gold }]}>
                      {professional.name.split(" ").map((name) => name[0]).join("").slice(0, 2)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.topServiceName, { color: colors.foreground }]}>{professional.name}</Text>
                    <Text style={[styles.reportSub, { color: colors.mutedForeground }]}>
                      {stats.completed} atend. - {stats.occupancyPct}% ocupacao
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.topServiceCount, { color: colors.gold }]}>R${stats.commission}</Text>
                    <Text style={[styles.reportSub, { color: colors.mutedForeground }]}>comissao</Text>
                  </View>
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
                onCancel={() => handleCancel(apt.id)}
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
  heroCard: {
    borderRadius: 28,
    padding: 20,
    gap: 16,
    shadowColor: "#3A3328",
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  greeting: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#F5EFE0CC" },
  title: { fontSize: 30, lineHeight: 34, fontFamily: "Inter_700Bold", color: "#FFFDF7" },
  heroSub: { marginTop: 8, fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", color: "#F5EFE0CC", maxWidth: 420 },
  heroMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  heroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF22",
  },
  heroChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFF7E5" },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: -4,
  },
  statsRow: { flexDirection: "row", gap: 10 },
  onboardingCard: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  onboardingHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  onboardingIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  onboardingTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  onboardingSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  onboardingProgress: { height: 7, borderRadius: 999, overflow: "hidden" },
  onboardingProgressFill: { height: "100%", borderRadius: 999 },
  onboardingStep: { minHeight: 36, flexDirection: "row", alignItems: "center", gap: 10 },
  stepCheck: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  stepLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  optionalStep: { marginTop: 2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  optionalStepText: { flex: 1, fontSize: 12, fontFamily: "Inter_600SemiBold" },
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
  reportSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  planBanner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  planBannerTitle: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 2 },
  planBannerSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
