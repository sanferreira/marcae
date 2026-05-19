import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
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

type RegisterErrors = Partial<Record<"slug" | "name" | "email" | "phone" | "password" | "confirmPassword" | "terms", string>>;

export default function RegisterScreen() {
  const colors = useColors();
  const { registerClient } = useAuth();
  const params = useLocalSearchParams<{ slug?: string | string[] }>();

  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const requestedSlug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  useEffect(() => {
    if (requestedSlug) setSlug(normalizeSlug(requestedSlug));
  }, [requestedSlug]);

  const handleRegister = async () => {
    const nextErrors: RegisterErrors = {};
    if (!slug.trim()) nextErrors.slug = "Informe o ID do estabelecimento.";
    if (!name.trim()) nextErrors.name = "Informe seu nome completo.";
    if (!email.trim()) nextErrors.email = "Informe seu email.";
    else if (!isValidEmail(email)) nextErrors.email = "Informe um email valido.";
    if (!phone.trim()) nextErrors.phone = "Informe seu telefone.";
    else if (!isValidPhone(phone)) nextErrors.phone = "Use um telefone com DDD.";
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
    const res = await registerClient({
      slug: normalizeSlug(slug),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
    });
    setLoading(false);

    if (!res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showAppAlert("Erro", res.error ?? "Nao foi possivel criar a conta.");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/");
  };

  return (
    <AuthScaffold
      badge="Conta do cliente"
      title="Seu cliente entra no mesmo ecossistema da sua marca."
      subtitle="Cadastro simples, acesso rapido e redirecionamento direto para agenda e fidelidade depois do login."
      panelTitle="Criar conta"
      panelSubtitle="Informe o estabelecimento certo para vincular o cliente ao lugar correto antes do primeiro agendamento."
      highlights={[
        { icon: "clock", label: "Cadastro rapido para o cliente marcar horario sem depender de direct." },
        { icon: "star", label: "Historico, fidelidade e perfil ficam concentrados no mesmo app." },
        { icon: "check-circle", label: "Depois do cadastro, o cliente ja cai na area correta automaticamente." },
      ]}
      onBack={() => (router.canGoBack() ? router.back() : router.replace("/login"))}
      footer={
        <TouchableOpacity onPress={() => router.replace("/login")}>
          <Text style={[styles.loginLink, { color: colors.gold }]}>Ja tem conta? Fazer login</Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.form}>
        <View>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>ID do estabelecimento</Text>
          <View style={[styles.inputGroup, { borderColor: errors.slug ? colors.destructive : colors.border, backgroundColor: colors.background }]}>
            <Feather name="hash" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="ex: primeiro_nucleo"
              placeholderTextColor={colors.mutedForeground}
              value={slug}
              onChangeText={(value) => setSlug(normalizeSlug(value))}
              autoCapitalize="none"
              autoCorrect={false}
              {...typedInputProps("text")}
            />
          </View>
          {!!errors.slug && <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.slug}</Text>}
        </View>

        {[
          { key: "name" as const, label: "Nome completo", value: name, setValue: setName, icon: "user" as const, kind: "text" as const, cap: "words" as const },
          { key: "email" as const, label: "Email", value: email, setValue: (value: string) => setEmail(value.trim().toLowerCase()), icon: "mail" as const, kind: "email" as const, cap: "none" as const },
          { key: "phone" as const, label: "Telefone", value: phone, setValue: (value: string) => setPhone(maskPhone(value)), icon: "phone" as const, kind: "phone" as const, cap: "none" as const },
        ].map((field) => (
          <View key={field.key}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{field.label}</Text>
            <View style={[styles.inputGroup, { borderColor: errors[field.key] ? colors.destructive : colors.border, backgroundColor: colors.background }]}>
              <Feather name={field.icon} size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder={field.label}
                placeholderTextColor={colors.mutedForeground}
                value={field.value}
                onChangeText={field.setValue}
                autoCapitalize={field.cap}
                {...typedInputProps(field.kind)}
              />
            </View>
            {!!errors[field.key] && <Text style={[styles.errorText, { color: colors.destructive }]}>{errors[field.key]}</Text>}
          </View>
        ))}

        <View>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Senha</Text>
          <View style={[styles.inputGroup, { borderColor: errors.password ? colors.destructive : colors.border, backgroundColor: colors.background }]}>
            <Feather name="lock" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Min. 8 caracteres, letras e numeros"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              {...typedInputProps("password")}
            />
          </View>
          {!!errors.password && <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.password}</Text>}
        </View>

        <View>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Confirmar senha</Text>
          <View style={[styles.inputGroup, { borderColor: errors.confirmPassword ? colors.destructive : colors.border, backgroundColor: colors.background }]}>
            <Feather name="lock" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Repita a senha"
              placeholderTextColor={colors.mutedForeground}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              {...typedInputProps("password")}
            />
          </View>
          {!!errors.confirmPassword && <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.confirmPassword}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.registerBtn, { backgroundColor: colors.gold }]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.registerBtnText}>{loading ? "Criando conta..." : "Criar conta"}</Text>
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
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 6, letterSpacing: 0.3, textTransform: "uppercase" },
  inputGroup: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, borderWidth: 1.5 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  errorText: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 6, lineHeight: 15 },
  registerBtn: { paddingVertical: 16, borderRadius: 16, alignItems: "center", marginTop: 6 },
  registerBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0C0C0C" },
  loginLink: { textAlign: "center", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  acceptRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 4, marginTop: 2 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  terms: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  legalLink: { textAlign: "center", fontSize: 12, fontFamily: "Inter_700Bold", marginTop: 8 },
});
