import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const PRIMARY_PRESETS = [
  "#C9A96E", "#D4AF37", "#E11D48", "#EC4899", "#A855F7", "#6366F1",
  "#0EA5E9", "#14B8A6", "#22C55E", "#F59E0B", "#EF4444", "#1F2937",
];
const ACCENT_PRESETS = [
  "#0C0C0C", "#1F1B16", "#2D1B2E", "#1E1B4B", "#0F172A", "#0C2616",
  "#7C2D12", "#3F0F0F", "#FFFFFF", "#F4F4F5", "#FEF3C7", "#FFE4E6",
];

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export default function AdminSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, barbershop, updateBarbershop, openBillingPortal, logout, planStatus } = useAuth();

  const [name, setName] = useState(barbershop?.name ?? "");
  const [primary, setPrimary] = useState(barbershop?.brandPrimary ?? "#C9A96E");
  const [accent, setAccent] = useState(barbershop?.brandAccent ?? "#0C0C0C");
  const [busy, setBusy] = useState(false);

  if (!user || user.role !== "admin") {
    router.replace("/" as never);
    return null;
  }

  const dirty = name.trim() !== barbershop?.name
    || primary.toUpperCase() !== (barbershop?.brandPrimary ?? "").toUpperCase()
    || accent.toUpperCase() !== (barbershop?.brandAccent ?? "").toUpperCase();

  const save = async () => {
    if (!HEX_RE.test(primary) || !HEX_RE.test(accent)) {
      Alert.alert("Cor inválida", "Use o formato hexadecimal #RRGGBB (ex: #C9A96E).");
      return;
    }
    if (!name.trim()) {
      Alert.alert("Nome obrigatório", "Informe o nome do estabelecimento.");
      return;
    }
    setBusy(true);
    const r = await updateBarbershop({
      name: name.trim(),
      brandPrimary: primary.toUpperCase(),
      brandAccent: accent.toUpperCase(),
    });
    setBusy(false);
    if (!r.ok) {
      Alert.alert("Erro ao salvar", r.error ?? "Tente novamente em instantes.");
      return;
    }
    Alert.alert("Pronto!", "As mudanças foram salvas.");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: "Configurações", headerShown: false }} />
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Configurações</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Section title="Estabelecimento" colors={colors}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Nome exibido para clientes</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="briefcase" size={16} color={colors.mutedForeground} />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nome do estabelecimento"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground }]}
            />
          </View>
        </Section>

        <Section title="Cores da marca" colors={colors}>
          <Text style={[styles.help, { color: colors.mutedForeground }]}>
            A cor principal pinta botões, destaques e ícones do app. A cor de destaque é usada em
            elementos secundários e fundos contrastantes. Mude e veja o app inteiro acompanhar.
          </Text>

          <ColorField
            label="Cor principal"
            value={primary}
            onChange={setPrimary}
            presets={PRIMARY_PRESETS}
            colors={colors}
          />

          <ColorField
            label="Cor de destaque"
            value={accent}
            onChange={setAccent}
            presets={ACCENT_PRESETS}
            colors={colors}
          />

          <View style={[styles.previewCard, { backgroundColor: accent, borderColor: colors.border }]}>
            <View style={[styles.previewBadge, { backgroundColor: primary + "33", borderColor: primary }]}>
              <Text style={[styles.previewBadgeText, { color: primary }]}>PRÉ-VISUALIZAÇÃO</Text>
            </View>
            <Text style={[styles.previewName, { color: hexLuminance(accent) > 0.5 ? "#0C0C0C" : "#FFFFFF" }]}>
              {name || "Seu estabelecimento"}
            </Text>
            <Pressable style={[styles.previewBtn, { backgroundColor: primary }]}>
              <Text style={[styles.previewBtnText, { color: hexLuminance(primary) > 0.5 ? "#0C0C0C" : "#FFFFFF" }]}>
                Botão de ação
              </Text>
            </Pressable>
          </View>
        </Section>

        <Pressable
          onPress={save}
          disabled={!dirty || busy}
          style={[
            styles.saveBtn,
            { backgroundColor: dirty ? colors.gold : colors.muted, opacity: busy ? 0.7 : 1 },
          ]}
        >
          {busy
            ? <ActivityIndicator color={colors.primaryForeground} />
            : <Text style={[styles.saveBtnText, { color: dirty ? colors.primaryForeground : colors.mutedForeground }]}>
                {dirty ? "Salvar mudanças" : "Sem alterações"}
              </Text>}
        </Pressable>

        <Section title="Assinatura" colors={colors}>
          <Text style={[styles.help, { color: colors.mutedForeground }]}>
            {planStatus.plan === "premium"
              ? "Plano ativo — renovação mensal automática."
              : planStatus.plan === "trial"
                ? `Você está no período gratuito (${planStatus.trialDaysLeft} ${planStatus.trialDaysLeft === 1 ? "dia restante" : "dias restantes"}).`
                : "Sua assinatura está vencida."}
          </Text>
          {planStatus.isPremium ? (
            <Pressable onPress={openBillingPortal} style={[styles.linkRow, { borderColor: colors.border }]}>
              <Feather name="credit-card" size={16} color={colors.gold} />
              <Text style={[styles.linkRowText, { color: colors.foreground }]}>Gerenciar pagamento</Text>
              <Feather name="external-link" size={14} color={colors.mutedForeground} />
            </Pressable>
          ) : (
            <Pressable onPress={() => router.push("/upgrade" as never)} style={[styles.linkRow, { borderColor: colors.border }]}>
              <Feather name="zap" size={16} color={colors.gold} />
              <Text style={[styles.linkRowText, { color: colors.foreground }]}>Assinar Premium — R$59/mês</Text>
              <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
            </Pressable>
          )}
        </Section>

        <Pressable onPress={logout} style={styles.logoutBtn}>
          <Text style={[styles.logoutText, { color: colors.destructive }]}>Sair da conta</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, colors, children }: { title: string; colors: ReturnType<typeof useColors>; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
      {children}
    </View>
  );
}

function ColorField({
  label, value, onChange, presets, colors,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  presets: string[];
  colors: ReturnType<typeof useColors>;
}) {
  const valid = HEX_RE.test(value);
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: valid ? colors.border : colors.destructive }]}>
        <View style={[styles.swatchPreview, { backgroundColor: valid ? value : colors.muted, borderColor: colors.border }]} />
        <TextInput
          value={value}
          onChangeText={(v) => onChange(v.toUpperCase())}
          placeholder="#RRGGBB"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={7}
          style={[styles.input, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
        />
      </View>
      <View style={styles.presetRow}>
        {presets.map((c) => (
          <Pressable
            key={c}
            onPress={() => onChange(c)}
            style={[
              styles.swatch,
              {
                backgroundColor: c,
                borderColor: value.toUpperCase() === c.toUpperCase() ? colors.foreground : colors.border,
                borderWidth: value.toUpperCase() === c.toUpperCase() ? 3 : 1,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function hexLuminance(hex: string): number {
  const m = /^#([0-9A-F]{6})$/i.exec(hex);
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  scroll: { padding: 20, paddingBottom: 60 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 11, letterSpacing: 1, fontFamily: "Inter_700Bold", textTransform: "uppercase", marginBottom: 12 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 },
  help: { fontSize: 13, lineHeight: 19, marginBottom: 8, fontFamily: "Inter_400Regular" },
  inputBox: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  swatchPreview: { width: 24, height: 24, borderRadius: 6, borderWidth: 1 },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  swatch: { width: 32, height: 32, borderRadius: 8 },
  previewCard: { marginTop: 18, borderRadius: 16, borderWidth: 1, padding: 20, alignItems: "center", gap: 12 },
  previewBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  previewBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.4 },
  previewName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  previewBtn: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  previewBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  saveBtn: { paddingVertical: 16, borderRadius: 14, alignItems: "center", marginBottom: 24 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  linkRowText: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  logoutBtn: { alignItems: "center", padding: 16 },
  logoutText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
