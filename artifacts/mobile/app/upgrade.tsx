import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

export default function UpgradeScreen() {
  const colors = useColors();
  const { barbershop, planStatus, upgradeToPremium, refreshSession, logout } = useAuth();
  const [busy, setBusy] = useState<"checkout" | "sync" | null>(null);

  const expired = !planStatus.isActive && planStatus.plan !== "premium";
  const title = expired
    ? "Seu período gratuito acabou"
    : planStatus.isPremium
      ? "Sua assinatura está ativa"
      : "Continue aproveitando o BarberPro";
  const subtitle = expired
    ? "Para voltar a usar o painel, ative a assinatura mensal."
    : planStatus.isPremium
      ? "Renovação automática mensal."
      : `Você ainda tem ${planStatus.trialDaysLeft} ${planStatus.trialDaysLeft === 1 ? "dia" : "dias"} de teste.`;

  const handleCheckout = async () => {
    setBusy("checkout");
    const r = await upgradeToPremium();
    setBusy(null);
    if (!r.ok) Alert.alert("Não foi possível abrir o pagamento", r.error ?? "Tente novamente em instantes.");
  };

  const handleAlreadyPaid = async () => {
    setBusy("sync");
    // Force Stripe → DB sync first so we don't depend on a (possibly degraded) webhook.
    await apiFetch("/billing/sync", { method: "POST", body: {} });
    await refreshSession();
    setBusy(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.badge, { backgroundColor: colors.gold + "22", borderColor: colors.gold }]}>
          <Text style={[styles.badgeText, { color: colors.gold }]}>BARBERPRO PREMIUM</Text>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>

        <View style={[styles.priceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Plano mensal</Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 4 }}>
            <Text style={[styles.priceCurrency, { color: colors.foreground }]}>R$</Text>
            <Text style={[styles.priceValue, { color: colors.foreground }]}>59</Text>
            <Text style={[styles.pricePeriod, { color: colors.mutedForeground }]}>/mês</Text>
          </View>
          <Text style={[styles.priceTagline, { color: colors.mutedForeground }]}>
            Cancele quando quiser pelo portal de assinatura.
          </Text>

          <View style={styles.divider} />

          {[
            "Agenda completa multi-profissional",
            "Cadastro ilimitado de clientes e serviços",
            "Painel financeiro (entradas, saídas, lucro)",
            "Programa de fidelidade automático",
            "Notificações push em tempo real",
            "Suporte prioritário",
          ].map((feat) => (
            <View key={feat} style={styles.featRow}>
              <View style={[styles.bullet, { backgroundColor: colors.gold }]} />
              <Text style={[styles.featText, { color: colors.foreground }]}>{feat}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={handleCheckout}
          disabled={busy !== null}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: colors.gold, opacity: pressed || busy ? 0.85 : 1 },
          ]}
        >
          {busy === "checkout"
            ? <ActivityIndicator color={colors.primaryForeground} />
            : <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Assinar agora</Text>}
        </Pressable>

        <Pressable onPress={handleAlreadyPaid} disabled={busy !== null} style={styles.secondaryBtn}>
          {busy === "sync"
            ? <ActivityIndicator color={colors.gold} />
            : <Text style={[styles.secondaryBtnText, { color: colors.gold }]}>Já paguei — atualizar status</Text>}
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
  container: { padding: 24, paddingBottom: 40, alignItems: "stretch" },
  badge: { alignSelf: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, marginBottom: 24 },
  badgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5 },
  title: { fontSize: 26, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 15, textAlign: "center", marginTop: 8, marginBottom: 28 },
  priceCard: { borderRadius: 16, borderWidth: 1, padding: 24, marginBottom: 20 },
  priceLabel: { fontSize: 12, letterSpacing: 1, textTransform: "uppercase", fontWeight: "600" },
  priceCurrency: { fontSize: 20, fontWeight: "600", marginRight: 4 },
  priceValue: { fontSize: 48, fontWeight: "800", letterSpacing: -1 },
  pricePeriod: { fontSize: 16, marginLeft: 4 },
  priceTagline: { fontSize: 13, marginTop: 8 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginVertical: 16 },
  featRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginRight: 12 },
  featText: { fontSize: 15 },
  primaryBtn: { paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  primaryBtnText: { fontSize: 16, fontWeight: "700" },
  secondaryBtn: { paddingVertical: 14, alignItems: "center", marginTop: 8 },
  secondaryBtnText: { fontSize: 15, fontWeight: "600" },
  shopLine: { fontSize: 13, textAlign: "center", marginTop: 24 },
  logoutBtn: { alignSelf: "center", marginTop: 12, padding: 8 },
  logoutText: { fontSize: 14, textDecorationLine: "underline" },
});
