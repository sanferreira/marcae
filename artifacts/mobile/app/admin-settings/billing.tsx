import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Pressable, Text } from "react-native";

import {
  Section,
  SettingsPage,
  settingsStyles as styles,
} from "@/components/admin-settings/SettingsShared";
import { BASE_PLAN_PRICE_LABEL, PAYMENT_PENDING_PLAN, getPlanDisplayName } from "@/constants/plans";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function BillingSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, openBillingPortal, planStatus } = useAuth();

  if (!user || user.role !== "admin") {
    router.replace("/" as never);
    return null;
  }

  const handleBillingPortal = async () => {
    const result = await openBillingPortal();
    if (!result.ok) Alert.alert("Nao foi possivel abrir o portal", result.error ?? "Tente novamente em instantes.");
  };

  return (
    <SettingsPage title="Plano e pagamento">
      <Section title="Assinatura" colors={colors}>
        <Text style={[styles.help, { color: colors.mutedForeground }]}>
          {planStatus.isPremium
            ? `Plano ${getPlanDisplayName(planStatus.plan)} ativo com renovacao mensal automatica.`
            : planStatus.plan === "trial"
              ? `Voce esta no periodo gratuito (${planStatus.trialDaysLeft} ${planStatus.trialDaysLeft === 1 ? "dia restante" : "dias restantes"}).`
              : planStatus.plan === PAYMENT_PENDING_PLAN
                ? "Seu pagamento esta pendente."
                : "Sua assinatura esta vencida."}
        </Text>

        {planStatus.isPremium ? (
          <Pressable onPress={handleBillingPortal} style={[styles.linkRow, { borderColor: colors.border }]}>
            <Feather name="credit-card" size={16} color={colors.gold} />
            <Text style={[styles.linkRowText, { color: colors.foreground }]}>Gerenciar pagamento</Text>
            <Feather name="external-link" size={14} color={colors.mutedForeground} />
          </Pressable>
        ) : (
          <Pressable onPress={() => router.push("/upgrade" as never)} style={[styles.linkRow, { borderColor: colors.border }]}>
            <Feather name="zap" size={16} color={colors.gold} />
            <Text style={[styles.linkRowText, { color: colors.foreground }]}>Escolher plano - a partir de {BASE_PLAN_PRICE_LABEL}/mes</Text>
            <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
          </Pressable>
        )}
      </Section>
    </SettingsPage>
  );
}
