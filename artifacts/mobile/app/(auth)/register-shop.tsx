import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { showAppAlert } from "@/components/AppAlert";
import { AuthScaffold } from "@/components/auth/AuthScaffold";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { typedInputProps } from "@/lib/inputProps";
import { isValidEmail, isValidPhone, maskPhone, normalizeSlug, passwordPolicyError } from "@/lib/masks";

const PERKS = [
  { icon: "clock" as const, label: "Painel liberado por 7 dias sem checkout no cadastro." },
  { icon: "users" as const, label: "Equipe, clientes e funcionarios podem ser configurados no trial." },
  { icon: "calendar" as const, label: "Agenda completa e financeiro integrado desde o primeiro acesso." },
  { icon: "credit-card" as const, label: "Assinatura fica disponivel depois na tela de planos." },
];

export default function RegisterShopScreen() {
  const colors = useColors();
  const { registerBarbershop } = useAuth();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const slugSuggestion = useMemo(() => {
    if (slug) return normalizeSlug(slug);
    return normalizeSlug(name);
  }, [slug, name]);

  const handleRegister = async () => {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = "Informe o nome do estabelecimento.";
    if (!slugSuggestion) nextErrors.slug = "Informe um ID para o estabelecimento.";
    if (phone.trim() && !isValidPhone(phone)) nextErrors.phone = "Use um telefone com DDD.";
    if (!ownerName.trim()) nextErrors.ownerName = "Informe seu nome.";
    if (!ownerEmail.trim()) nextErrors.ownerEmail = "Informe seu email.";
    else if (!isValidEmail(ownerEmail)) nextErrors.ownerEmail = "Informe um email valido.";
    const passwordError = password ? passwordPolicyError(password) : "Informe uma senha.";
    if (passwordError) nextErrors.password = passwordError;
    if (password !== confirmPassword) nextErrors.confirmPassword = "As senhas nao coincidem.";
    if (!acceptedTerms) nextErrors.terms = "Aceite os termos e a politica de privacidade.";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    const res = await registerBarbershop({
      name: name.trim(),
      slug: slugSuggestion,
      phone: phone.trim(),
      ownerName: ownerName.trim(),
      ownerEmail: ownerEmail.trim().toLowerCase(),
      password,
    });

    if (!res.ok) {
      setLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showAppAlert("Erro", res.error ?? "Nao foi possivel cadastrar.");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(false);
    router.replace("/");
  };

  return (
    <AuthScaffold
      badge="7 dias gratis"
      title="Crie a conta e acesse o painel."
      subtitle="O estabelecimento entra com 7 dias liberados. A assinatura fica para depois, antes do fim do trial."
      panelTitle="Cadastrar estabelecimento"
      panelSubtitle="Crie a conta principal do negocio. O painel fica liberado por 7 dias para configurar equipe, servicos e agenda."
      highlights={[
        { icon: "clock", label: "Painel liberado por 7 dias sem checkout no cadastro." },
        { icon: "users", label: "Clientes, servicos e funcionarios podem ser configurados durante o trial." },
        { icon: "award", label: "Depois, o administrador escolhe o plano pela tela de assinatura." },
      ]}
      onBack={() => (router.canGoBack() ? router.back() : router.replace("/login"))}
    >
      <View style={[styles.trialBanner, { backgroundColor: colors.gold + "12", borderColor: colors.gold + "55" }]}>
        <View style={styles.trialHeader}>
          <View style={[styles.trialBadge, { backgroundColor: colors.gold }]}>
            <Text style={styles.trialBadgeText}>TRIAL DE 7 DIAS</Text>
          </View>
          <Text style={[styles.trialPrice, { color: colors.foreground }]}>
            Acesso liberado agora
          </Text>
        </View>
        {PERKS.map((perk) => (
          <View key={perk.label} style={styles.perkRow}>
            <Feather name="check" size={14} color={colors.gold} />
            <Text style={[styles.perkText, { color: colors.foreground }]}>{perk.label}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.section, { color: colors.foreground }]}>Sobre o estabelecimento</Text>
      <View style={styles.form}>
        <Field label="Nome do estabelecimento *" icon="briefcase" value={name} onChange={setName} error={errors.name} colors={colors} cap="words" placeholder="Ex: Studio Bella" />

        <View>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>ID do estabelecimento *</Text>
          <View style={[styles.inputGroup, { borderColor: errors.slug ? colors.destructive : colors.border, backgroundColor: colors.background }]}>
            <Feather name="hash" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="primeiro_nucleo"
              placeholderTextColor={colors.mutedForeground}
              value={slug}
              onChangeText={(value) => setSlug(normalizeSlug(value))}
              autoCapitalize="none"
              {...typedInputProps("text")}
            />
          </View>
          {!!errors.slug && <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.slug}</Text>}
          <Text style={[styles.helper, { color: colors.mutedForeground }]}>
            Sera o ID que clientes e funcionarios usam para entrar.
            {slugSuggestion && slugSuggestion !== slug ? `  Sugestao: ${slugSuggestion}` : ""}
          </Text>
        </View>

        <Field label="Telefone" icon="phone" value={phone} onChange={(value) => setPhone(maskPhone(value))} error={errors.phone} colors={colors} type="phone-pad" placeholder="(11) 99999-9999" />
      </View>

      <Text style={[styles.section, { color: colors.foreground, marginTop: 8 }]}>Sua conta de administrador</Text>
      <View style={styles.form}>
        <Field label="Seu nome *" icon="user" value={ownerName} onChange={setOwnerName} error={errors.ownerName} colors={colors} cap="words" placeholder="Carlos Ferreira" />
        <Field label="Email *" icon="mail" value={ownerEmail} onChange={(value) => setOwnerEmail(value.trim().toLowerCase())} error={errors.ownerEmail} colors={colors} type="email-address" placeholder="voce@email.com" />
        <Field label="Senha *" icon="lock" value={password} onChange={setPassword} error={errors.password} colors={colors} secure placeholder="Min. 8 caracteres, letras e numeros" />
        <Field label="Confirmar senha *" icon="lock" value={confirmPassword} onChange={setConfirmPassword} error={errors.confirmPassword} colors={colors} secure placeholder="Repita a senha" />
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: colors.gold }]}
        onPress={handleRegister}
        disabled={loading}
        activeOpacity={0.85}
      >
        <Feather name="check-circle" size={18} color="#0C0C0C" />
        <Text style={styles.submitText}>{loading ? "Criando conta..." : "Criar conta e acessar painel"}</Text>
      </TouchableOpacity>

      <View>
        <TouchableOpacity style={styles.acceptRow} onPress={() => setAcceptedTerms((current) => !current)} activeOpacity={0.85}>
          <View style={[styles.checkbox, { borderColor: errors.terms ? colors.destructive : colors.border, backgroundColor: acceptedTerms ? colors.gold : colors.background }]}>
            {acceptedTerms && <Feather name="check" size={13} color="#0C0C0C" />}
          </View>
          <Text style={[styles.terms, { color: colors.mutedForeground }]}>
            Li e concordo com os termos de uso e politica de privacidade.
          </Text>
        </TouchableOpacity>
        {!!errors.terms && <Text style={[styles.errorText, { color: colors.destructive, textAlign: "center" }]}>{errors.terms}</Text>}
        <TouchableOpacity onPress={() => router.push("/legal" as never)}>
          <Text style={[styles.legalLink, { color: colors.gold }]}>Ver termos e privacidade</Text>
        </TouchableOpacity>
      </View>
    </AuthScaffold>
  );
}

function Field({
  label,
  icon,
  value,
  onChange,
  error,
  colors,
  type = "default",
  cap = "none",
  secure,
  placeholder,
}: {
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  colors: ReturnType<typeof useColors>;
  type?: "default" | "email-address" | "phone-pad";
  cap?: "none" | "words" | "sentences";
  secure?: boolean;
  placeholder?: string;
}) {
  const inputKind = secure ? "password" : type === "email-address" ? "email" : type === "phone-pad" ? "phone" : "text";

  return (
    <View>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[styles.inputGroup, { borderColor: error ? colors.destructive : colors.border, backgroundColor: colors.background }]}>
        <Feather name={icon} size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.input, { color: colors.foreground }]}
          placeholder={placeholder ?? label}
          placeholderTextColor={colors.mutedForeground}
          value={value}
          onChangeText={onChange}
          autoCapitalize={cap}
          {...typedInputProps(inputKind)}
        />
      </View>
      {!!error && <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  trialBanner: { borderRadius: 18, borderWidth: 1.5, padding: 16, gap: 8 },
  trialHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 6 },
  trialBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  trialBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#0C0C0C", letterSpacing: 0.5 },
  trialPrice: { flexShrink: 1, fontSize: 14, fontFamily: "Inter_700Bold", textAlign: "right" },
  perkRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  perkText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  section: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 4 },
  form: { gap: 10 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 6, letterSpacing: 0.3, textTransform: "uppercase" },
  inputGroup: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, borderWidth: 1.5 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  helper: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 6, lineHeight: 16 },
  errorText: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 6, lineHeight: 15 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 16, marginTop: 8 },
  submitText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0C0C0C" },
  acceptRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 4, marginTop: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  terms: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  legalLink: { textAlign: "center", fontSize: 12, fontFamily: "Inter_700Bold", marginTop: 8 },
});
