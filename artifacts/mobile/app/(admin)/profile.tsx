import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { SupportChannels } from "@/components/SupportChannels";
import { BASE_PLAN_PRICE_LABEL, PAYMENT_PENDING_PLAN, getPlanDisplayName } from "@/constants/plans";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

function appOrigin() {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }

  const domain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  if (domain) {
    return domain.startsWith("http") ? domain.replace(/\/+$/, "") : `https://${domain.replace(/\/+$/, "")}`;
  }

  return "https://app.marcae.net";
}

function clientRegisterUrl(slug?: string | null) {
  if (!slug) return "";
  return `${appOrigin()}/register?slug=${encodeURIComponent(slug)}`;
}

export default function AdminProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { barbershop, planStatus, logout } = useAuth();
  const registerUrl = clientRegisterUrl(barbershop?.slug);
  const planLabel = planStatus.plan === "trial"
    ? `Trial: ${planStatus.trialDaysLeft} dia${planStatus.trialDaysLeft === 1 ? "" : "s"}`
    : planStatus.plan === PAYMENT_PENDING_PLAN
      ? "Pagamento pendente"
      : planStatus.isPremium
        ? `Plano ${getPlanDisplayName(planStatus.plan)}`
        : "Assinatura inativa";

  const copyRegisterLink = async () => {
    if (!registerUrl) return;
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(registerUrl);
        Alert.alert("Link copiado", "Agora e so enviar para o cliente se cadastrar.");
        return;
      }
      await Share.share({ title: "Cadastro de cliente", message: registerUrl });
    } catch {
      Alert.alert("Nao foi possivel copiar", "Tente compartilhar o link manualmente.");
    }
  };

  const shareRegisterLink = async () => {
    if (!registerUrl) return;
    await Share.share({
      title: "Cadastro de cliente",
      message: `Cadastre-se em ${barbershop?.name ?? "nosso estabelecimento"}: ${registerUrl}`,
    });
  };

  const confirmLogout = () => {
    Alert.alert("Sair", "Deseja sair da conta?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => { void logout(); } },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 124 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>Perfil do estabelecimento</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>{barbershop?.name ?? "Seu estabelecimento"}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>ID: {barbershop?.slug ?? "-"}</Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: colors.gold + "22" }]}>
            <Text style={[styles.avatarText, { color: colors.gold }]}>{(barbershop?.name ?? "M").slice(0, 1).toUpperCase()}</Text>
          </View>
        </View>

        <View style={[styles.shareCard, { backgroundColor: colors.card, borderColor: colors.gold + "66" }]}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.iconBox, { backgroundColor: colors.gold + "18" }]}>
              <Feather name="link" size={20} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Link de cadastro do cliente</Text>
              <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
                Use em bio, WhatsApp, QR Code ou campanhas para o cliente criar conta ja vinculado ao seu estabelecimento.
              </Text>
            </View>
          </View>
          <View style={[styles.linkBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Text style={[styles.linkText, { color: colors.foreground }]} numberOfLines={2}>{registerUrl || "Configure o ID do estabelecimento"}</Text>
          </View>
          <View style={styles.shareActions}>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.gold }]} onPress={copyRegisterLink}>
              <Feather name="copy" size={16} color={colors.goldForeground} />
              <Text style={[styles.primaryBtnText, { color: colors.goldForeground }]}>Copiar link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border }]} onPress={shareRegisterLink}>
              <Feather name="share-2" size={16} color={colors.foreground} />
              <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Compartilhar</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Section title="Conta" colors={colors}>
          <ActionRow
            icon="credit-card"
            title="Plano e pagamento"
            description={`${planLabel}. Planos a partir de ${BASE_PLAN_PRICE_LABEL}/mes.`}
            onPress={() => router.push("/upgrade" as never)}
            colors={colors}
          />
          <ActionRow
            icon="briefcase"
            title="Dados do estabelecimento"
            description="Nome, telefone, endereco e informacoes exibidas para clientes."
            onPress={() => router.push("/admin-settings" as never)}
            colors={colors}
          />
        </Section>

        <Section title="Personalizacao" colors={colors}>
          <ActionRow
            icon="sliders"
            title="Cores e marca"
            description="Ajuste cor principal, destaque visual e pre-visualizacao do app."
            onPress={() => router.push("/admin-settings" as never)}
            colors={colors}
          />
          <ActionRow
            icon="calendar"
            title="Agenda e disponibilidade"
            description="Horario do estabelecimento, intervalo e regra de liberacao da agenda."
            onPress={() => router.push("/admin-settings" as never)}
            colors={colors}
          />
          <ActionRow
            icon="clipboard"
            title="Ficha do cliente"
            description="Campos personalizados para anamnese, observacoes e nichos diferentes."
            onPress={() => router.push("/admin-settings" as never)}
            colors={colors}
          />
        </Section>

        <Section title="Dados e suporte" colors={colors}>
          <ActionRow
            icon="download"
            title="Exportar dados"
            description="Use a tela de configuracoes para baixar cadastros, agenda, financeiro, produtos e pedidos."
            onPress={() => router.push("/admin-settings" as never)}
            colors={colors}
          />
          <SupportChannels compact />
        </Section>

        <Pressable style={[styles.logoutBtn, { borderColor: colors.destructive + "44" }]} onPress={confirmLogout}>
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>Sair da conta</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  colors,
  children,
}: {
  title: string;
  colors: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function ActionRow({
  icon,
  title,
  description,
  onPress,
  colors,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  description: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={onPress}
      style={[styles.actionRow, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={[styles.actionIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={16} color={colors.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.actionTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.actionDescription, { color: colors.mutedForeground }]}>{description}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, gap: 22 },
  header: { flexDirection: "row", alignItems: "center", gap: 16 },
  eyebrow: { fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.8 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginTop: 4 },
  subtitle: { fontSize: 14, fontFamily: "Inter_500Medium", marginTop: 4 },
  avatar: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 22, fontFamily: "Inter_700Bold" },
  shareCard: { borderRadius: 18, borderWidth: 1.5, padding: 18, gap: 14 },
  cardTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconBox: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  cardSubtitle: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular", marginTop: 4 },
  linkBox: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12 },
  linkText: { fontSize: 13, lineHeight: 18, fontFamily: "Inter_600SemiBold" },
  shareActions: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 14, flexGrow: 1 },
  primaryBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  secondaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, flexGrow: 1 },
  secondaryBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  section: { gap: 10 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1 },
  sectionBody: { gap: 10 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, padding: 14 },
  actionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  actionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  actionDescription: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 2 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderRadius: 14, paddingVertical: 14 },
  logoutText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
