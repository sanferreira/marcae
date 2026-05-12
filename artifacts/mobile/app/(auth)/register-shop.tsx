import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const PERKS = [
  { icon: "infinity" as const, label: "Recursos ilimitados durante o trial" },
  { icon: "users" as const, label: "Equipe, clientes e funcionários sem limite" },
  { icon: "calendar" as const, label: "Agenda completa e financeiro integrado" },
  { icon: "award" as const, label: "Programa de fidelidade configurável" },
];

export default function RegisterShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { registerBarbershop } = useAuth();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const slugSuggestion = useMemo(() => {
    if (slug) return slug;
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }, [slug, name]);

  const handleRegister = async () => {
    if (!name || !slugSuggestion || !ownerName || !ownerEmail || !password) {
      Alert.alert("Atenção", "Preencha todos os campos obrigatórios.");
      return;
    }
    if (password.length < 6) { Alert.alert("Atenção", "A senha deve ter pelo menos 6 caracteres."); return; }
    if (password !== confirmPassword) { Alert.alert("Atenção", "As senhas não coincidem."); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    const res = await registerBarbershop({
      name, slug: slugSuggestion, phone,
      ownerName, ownerEmail, password,
    });
    setLoading(false);
    if (!res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Erro", res.error ?? "Não foi possível cadastrar.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: colors.gold }]}>
            <Feather name="briefcase" size={22} color="#0C0C0C" />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Cadastre sua barbearia</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Comece com 7 dias grátis. Sem cartão de crédito.
          </Text>
        </View>

        {/* Trial perks */}
        <View style={[styles.trialBanner, { backgroundColor: colors.gold + "12", borderColor: colors.gold + "55" }]}>
          <View style={styles.trialHeader}>
            <View style={[styles.trialBadge, { backgroundColor: colors.gold }]}>
              <Text style={styles.trialBadgeText}>7 DIAS GRÁTIS</Text>
            </View>
            <Text style={[styles.trialPrice, { color: colors.foreground }]}>
              depois R$59<Text style={[styles.trialPriceSub, { color: colors.mutedForeground }]}>/mês</Text>
            </Text>
          </View>
          {PERKS.map((p) => (
            <View key={p.label} style={styles.perkRow}>
              <Feather name="check" size={14} color={colors.gold} />
              <Text style={[styles.perkText, { color: colors.foreground }]}>{p.label}</Text>
            </View>
          ))}
        </View>

        {/* Step 1: Shop */}
        <Text style={[styles.section, { color: colors.foreground }]}>Sobre a barbearia</Text>
        <View style={styles.form}>
          <Field label="Nome da barbearia *" icon="scissors" value={name} onChange={setName} colors={colors} cap="words" placeholder="Ex: Primeiro Núcleo" />
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>ID da barbearia *</Text>
            <View style={[styles.inputGroup, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Feather name="hash" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="primeiro_nucleo"
                placeholderTextColor={colors.mutedForeground}
                value={slug}
                onChangeText={(v) => setSlug(v.toLowerCase().replace(/\s/g, "_").replace(/[^a-z0-9_]/g, ""))}
                autoCapitalize="none"
              />
            </View>
            <Text style={[styles.helper, { color: colors.mutedForeground }]}>
              Será o ID que clientes e funcionários usam para entrar.{slugSuggestion && slugSuggestion !== slug ? `  Sugestão: ${slugSuggestion}` : ""}
            </Text>
          </View>
          <Field label="Telefone" icon="phone" value={phone} onChange={setPhone} colors={colors} type="phone-pad" placeholder="(11) 99999-9999" />
        </View>

        {/* Step 2: Admin */}
        <Text style={[styles.section, { color: colors.foreground, marginTop: 8 }]}>Sua conta de administrador</Text>
        <View style={styles.form}>
          <Field label="Seu nome *" icon="user" value={ownerName} onChange={setOwnerName} colors={colors} cap="words" placeholder="Carlos Ferreira" />
          <Field label="Email *" icon="mail" value={ownerEmail} onChange={setOwnerEmail} colors={colors} type="email-address" placeholder="voce@email.com" />
          <Field label="Senha *" icon="lock" value={password} onChange={setPassword} colors={colors} secure placeholder="Mín. 6 caracteres" />
          <Field label="Confirmar senha *" icon="lock" value={confirmPassword} onChange={setConfirmPassword} colors={colors} secure placeholder="Repita a senha" />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.gold }]}
          onPress={handleRegister} disabled={loading} activeOpacity={0.85}
        >
          <Feather name="check-circle" size={18} color="#0C0C0C" />
          <Text style={styles.submitText}>{loading ? "Criando..." : "Começar 7 dias grátis"}</Text>
        </TouchableOpacity>

        <Text style={[styles.terms, { color: colors.mutedForeground }]}>
          Ao continuar você concorda com os termos de uso. Após o trial, R$59/mês para manter o acesso.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label, icon, value, onChange, colors, type = "default", cap = "none", secure, placeholder,
}: {
  label: string; icon: React.ComponentProps<typeof Feather>["name"]; value: string; onChange: (v: string) => void;
  colors: any; type?: "default" | "email-address" | "phone-pad"; cap?: "none" | "words" | "sentences"; secure?: boolean; placeholder?: string;
}) {
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[styles.inputGroup, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Feather name={icon} size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.input, { color: colors.foreground }]}
          placeholder={placeholder ?? label}
          placeholderTextColor={colors.mutedForeground}
          value={value} onChangeText={onChange}
          keyboardType={type} autoCapitalize={cap} secureTextEntry={secure}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 22, gap: 16 },
  backBtn: { width: 40, height: 40, alignItems: "flex-start", justifyContent: "center" },
  header: { gap: 6 },
  headerIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular" },
  trialBanner: { borderRadius: 16, borderWidth: 1.5, padding: 16, gap: 8 },
  trialHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  trialBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  trialBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#0C0C0C", letterSpacing: 0.5 },
  trialPrice: { fontSize: 14, fontFamily: "Inter_700Bold" },
  trialPriceSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  perkRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  perkText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  section: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 4 },
  form: { gap: 10 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 6, letterSpacing: 0.3, textTransform: "uppercase" },
  inputGroup: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  helper: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 6, lineHeight: 16 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 8 },
  submitText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0C0C0C" },
  terms: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 16, marginTop: 4 },
});
