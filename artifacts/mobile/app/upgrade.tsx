import React, { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";
import {
  DEFAULT_PAID_PLAN,
  PAYMENT_PENDING_PLAN,
  PAID_PLAN_BY_KEY,
  PAID_PLANS,
  type PaidPlanKey,
  getPlanDisplayName,
} from "@/constants/plans";

export default function UpgradeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { barbershop, planStatus, upgradeToPremium, openBillingPortal, refreshSession, logout } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<PaidPlanKey>(DEFAULT_PAID_PLAN);
  const [busy, setBusy] = useState<"checkout" | "portal" | "sync" | null>(null);

  const selectedPlanData = PAID_PLAN_BY_KEY[selectedPlan];
  const expired = !planStatus.isActive && !planStatus.isPremium;
  const activePlanName = getPlanDisplayName(planStatus.plan);
  const pending = planStatus.plan === PAYMENT_PENDING_PLAN;
  const title = expired
    ? pending ? "Pagamento pendente" : "Assinatura inativa"
    : planStatus.isPremium
      ? `Plano ${activePlanName} ativo`
      : "Escolha seu plano Marcae";
  const subtitle = expired
    ? pending ? "Atualize o pagamento ou refaca o checkout para liberar o painel." : "Escolha um plano para voltar a usar o painel."
    : planStatus.isPremium
      ? "Use o portal para trocar, cancelar ou atualizar o pagamento."
      : "O trial libera o painel por 7 dias. Para manter acesso depois disso, escolha um plano e finalize o checkout seguro da Stripe.";

  const handlePrimary = async () => {
    if (planStatus.isPremium) {
      setBusy("portal");
      const r = await openBillingPortal();
      setBusy(null);
      if (!r.ok) Alert.alert("Nao foi possivel abrir o portal", r.error ?? "Tente novamente em instantes.");
      return;
    }

    setBusy("checkout");
    const r = await upgradeToPremium(selectedPlan);
    setBusy(null);
    if (!r.ok) Alert.alert("Nao foi possivel abrir o pagamento", r.error ?? "Tente novamente em instantes.");
  };

  const handleAlreadyPaid = async () => {
    setBusy("sync");
    const r = await apiFetch("/billing/sync", { method: "POST", body: {} });
    await refreshSession();
    setBusy(null);
    if (!r.ok) Alert.alert("Nao foi possivel atualizar", r.error ?? "Tente novamente em instantes.");
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/" as never);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={12}>
          <Feather name="chevron-left" size={22} color={colors.foreground} />
          <Text style={[styles.backText, { color: colors.foreground }]}>Voltar</Text>
        </Pressable>
        <View style={{ width: 78 }} />
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.badge, { backgroundColor: colors.gold + "22", borderColor: colors.gold }]}>
          <Text style={[styles.badgeText, { color: colors.gold }]}>PLANOS MARCAE</Text>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>

        <View style={styles.plansList}>
          {PAID_PLANS.map((plan) => {
            const selected = selectedPlan === plan.key;
            const current = planStatus.plan === plan.key;
            return (
              <Pressable
                key={plan.key}
                onPress={() => setSelectedPlan(plan.key)}
                style={[
                  styles.priceCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: selected || current ? colors.gold : colors.border,
                  },
                ]}
              >
                <View style={styles.planHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>{plan.badge}</Text>
                    <Text style={[styles.planName, { color: colors.foreground }]}>{plan.name}</Text>
                  </View>
                  {(selected || current) && (
                    <View style={[styles.planPill, { backgroundColor: colors.gold + "22" }]}>
                      <Text style={[styles.planPillText, { color: colors.gold }]}>
                        {current ? "Atual" : "Selecionado"}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.priceRow}>
                  <Text style={[styles.priceCurrency, { color: colors.foreground }]}>R$</Text>
                  <Text style={[styles.priceValue, { color: colors.foreground }]}>{plan.price.replace("R$", "")}</Text>
                  <Text style={[styles.pricePeriod, { color: colors.mutedForeground }]}>/mes</Text>
                </View>
                <Text style={[styles.priceTagline, { color: colors.mutedForeground }]}>{plan.summary}</Text>

                <View style={styles.divider} />

                {plan.features.map((feat) => (
                  <View key={feat} style={styles.featRow}>
                    <View style={[styles.bullet, { backgroundColor: colors.gold }]} />
                    <Text style={[styles.featText, { color: colors.foreground }]}>{feat}</Text>
                  </View>
                ))}
                {plan.key === "super" && (
                  <View style={[styles.enterpriseCallout, { backgroundColor: colors.gold + "12", borderColor: colors.gold + "44" }]}>
                    <Feather name="message-circle" size={15} color={colors.gold} />
                    <Text style={[styles.enterpriseCalloutText, { color: colors.gold }]}>
                      Acima de 20 profissionais? Fale com suporte para um plano sob medida.
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.priceTagline, { color: colors.mutedForeground, textAlign: "center", marginBottom: 14 }]}>
          Cancele quando quiser pelo portal de assinatura.
        </Text>

        <Pressable
          onPress={handlePrimary}
          disabled={busy !== null}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: colors.gold, opacity: pressed || busy ? 0.85 : 1 },
          ]}
        >
          {busy === "checkout" || busy === "portal"
            ? <ActivityIndicator color={colors.primaryForeground} />
            : (
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                {planStatus.isPremium ? "Gerenciar assinatura" : `Assinar ${selectedPlanData.name}`}
              </Text>
            )}
        </Pressable>

        <Pressable onPress={handleAlreadyPaid} disabled={busy !== null} style={styles.secondaryBtn}>
          {busy === "sync"
            ? <ActivityIndicator color={colors.gold} />
            : <Text style={[styles.secondaryBtnText, { color: colors.gold }]}>Ja paguei - atualizar status</Text>}
        </Pressable>

        <Text style={[styles.shopLine, { color: colors.mutedForeground }]}>
          {barbershop?.name ?? ""}
        </Text>

        <Pressable onPress={logout} style={styles.logoutBtn}>
          <Text style={[styles.logoutText, { color: colors.mutedForeground }]}>Sair</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingRight: 10 },
  backText: { fontSize: 14, fontWeight: "700" },
  container: { padding: 24, paddingBottom: 40, alignItems: "stretch" },
  badge: { alignSelf: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, marginBottom: 24 },
  badgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5 },
  title: { fontSize: 26, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 15, textAlign: "center", marginTop: 8, marginBottom: 24 },
  plansList: { gap: 14, marginBottom: 16 },
  priceCard: { borderRadius: 16, borderWidth: 1.5, padding: 18 },
  planHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  priceLabel: { fontSize: 12, letterSpacing: 1, textTransform: "uppercase", fontWeight: "700" },
  planName: { fontSize: 22, fontWeight: "800", marginTop: 2 },
  planPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  planPillText: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  priceRow: { flexDirection: "row", alignItems: "baseline", marginTop: 2 },
  priceCurrency: { fontSize: 17, fontWeight: "700", marginRight: 4 },
  priceValue: { fontSize: 38, fontWeight: "800" },
  pricePeriod: { fontSize: 15, marginLeft: 4 },
  priceTagline: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginVertical: 14 },
  featRow: { flexDirection: "row", alignItems: "center", marginBottom: 9 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginRight: 12 },
  featText: { fontSize: 14, flex: 1 },
  enterpriseCallout: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 12, borderWidth: 1, padding: 10, marginTop: 6 },
  enterpriseCalloutText: { flex: 1, fontSize: 12, fontWeight: "700", lineHeight: 17 },
  primaryBtn: { paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  primaryBtnText: { fontSize: 16, fontWeight: "700" },
  secondaryBtn: { paddingVertical: 14, alignItems: "center", marginTop: 8 },
  secondaryBtnText: { fontSize: 15, fontWeight: "600" },
  shopLine: { fontSize: 13, textAlign: "center", marginTop: 24 },
  logoutBtn: { alignSelf: "center", marginTop: 12, padding: 8 },
  logoutText: { fontSize: 14, textDecorationLine: "underline" },
});
