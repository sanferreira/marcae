import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Pressable, Text } from "react-native";

import {
  Section,
  SettingsActionRow,
  SettingsPage,
  settingsStyles as styles,
} from "@/components/admin-settings/SettingsShared";
import { SupportChannels } from "@/components/SupportChannels";
import { BASE_PLAN_PRICE_LABEL, PAYMENT_PENDING_PLAN, getPlanDisplayName } from "@/constants/plans";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function AdminSettingsIndexScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, barbershop, planStatus, logout } = useAuth();

  if (!user || user.role !== "admin") {
    router.replace("/" as never);
    return null;
  }

  const planLabel = planStatus.plan === "trial"
    ? `Trial: ${planStatus.trialDaysLeft} dia${planStatus.trialDaysLeft === 1 ? "" : "s"}`
    : planStatus.plan === PAYMENT_PENDING_PLAN
      ? "Pagamento pendente"
      : planStatus.isPremium
        ? `Plano ${getPlanDisplayName(planStatus.plan)}`
        : "Assinatura inativa";

  const confirmLogout = () => {
    Alert.alert("Sair", "Deseja sair da conta?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => { void logout(); } },
    ]);
  };

  return (
    <SettingsPage title="Configuracoes">
      <Section title="Conta" colors={colors}>
        <SettingsActionRow
          icon="credit-card"
          title="Plano e pagamento"
          description={`${planLabel}. Planos a partir de ${BASE_PLAN_PRICE_LABEL}/mes.`}
          onPress={() => router.push("/admin-settings/billing" as never)}
          colors={colors}
        />
        <SettingsActionRow
          icon="briefcase"
          title="Dados do estabelecimento"
          description={`Nome, telefone e endereco de ${barbershop?.name ?? "seu estabelecimento"}.`}
          onPress={() => router.push("/admin-settings/establishment" as never)}
          colors={colors}
        />
      </Section>

      <Section title="Personalizacao" colors={colors}>
        <SettingsActionRow
          icon="sliders"
          title="Cores e marca"
          description="Cor principal, destaque visual e pre-visualizacao do app."
          onPress={() => router.push("/admin-settings/brand" as never)}
          colors={colors}
        />
        <SettingsActionRow
          icon="calendar"
          title="Agenda e disponibilidade"
          description="Horario do estabelecimento, intervalo e regra de liberacao da agenda."
          onPress={() => router.push("/admin-settings/booking" as never)}
          colors={colors}
        />
        <SettingsActionRow
          icon="clipboard"
          title="Ficha do cliente"
          description="Campos personalizados para anamnese, observacoes e nichos diferentes."
          onPress={() => router.push("/admin-settings/intake" as never)}
          colors={colors}
        />
      </Section>

      <Section title="Dados e suporte" colors={colors}>
        <SettingsActionRow
          icon="download"
          title="Exportar dados"
          description="Baixar cadastros, agenda, financeiro, produtos, pedidos e pacotes."
          onPress={() => router.push("/admin-settings/data" as never)}
          colors={colors}
        />
        <SettingsActionRow
          icon="headphones"
          title="Suporte Marcae"
          description="WhatsApp e Instagram oficiais para duvidas sobre o sistema."
          onPress={() => router.push("/admin-settings/support" as never)}
          colors={colors}
        />
      </Section>

      <Section title="Canais rapidos" colors={colors}>
        <SupportChannels compact />
      </Section>

      <Pressable
        style={[styles.logoutBtn, { borderColor: colors.destructive + "44" }]}
        onPress={confirmLogout}
      >
        <Feather name="log-out" size={16} color={colors.destructive} />
        <Text style={[styles.logoutText, { color: colors.destructive }]}>Sair da conta</Text>
      </Pressable>
    </SettingsPage>
  );
}
