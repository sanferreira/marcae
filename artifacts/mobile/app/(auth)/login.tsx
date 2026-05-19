import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Image,
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
import { isValidEmail, normalizeSlug } from "@/lib/masks";

type LoginErrors = Partial<Record<"slug" | "email" | "password", string>>;

export default function LoginScreen() {
  const colors = useColors();
  const { login } = useAuth();

  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});

  const handleLogin = async () => {
    const nextErrors: LoginErrors = {};
    if (!slug.trim()) nextErrors.slug = "Informe o ID do estabelecimento.";
    if (!email.trim()) nextErrors.email = "Informe seu email.";
    else if (!isValidEmail(email)) nextErrors.email = "Informe um email valido.";
    if (!password) nextErrors.password = "Informe sua senha.";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    const res = await login(normalizeSlug(slug), email.trim().toLowerCase(), password);
    setLoading(false);

    if (!res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showAppAlert("Erro", res.error ?? "Nao foi possivel entrar.");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/");
  };

  const handleForgotPassword = () => {
    showAppAlert(
      "Recuperar senha",
      "Funcionarios e clientes devem solicitar redefinicao ao administrador do estabelecimento. Administradores devem acionar o suporte para validar a titularidade da conta.",
    );
  };

  return (
    <AuthScaffold
      badge="Acesso Marcaê"
      title="Sua operação, agenda e clientes no mesmo lugar."
      subtitle="Entre com o ID do estabelecimento para acessar o painel certo. Admin, funcionário e cliente entram pelo mesmo caminho, cada um com sua área."
      panelTitle="Entrar"
      panelSubtitle="Use o ID do estabelecimento, email e senha para acessar sua área."
      highlights={[
        { icon: "calendar", label: "Agenda, clientes, pedidos e financeiro organizados em um único painel." },
        { icon: "star", label: "Fidelidade, histórico e observações acompanham cada atendimento." },
        { icon: "users", label: "Permissões separadas para dono, equipe e clientes, sem misturar informações." },
      ]}
      footer={
        <View style={styles.bottomLinks}>
          <TouchableOpacity onPress={() => router.push("/(auth)/register-shop")} style={[styles.bigLink, { borderColor: colors.gold, backgroundColor: colors.gold + "12" }]}>
            <Feather name="briefcase" size={16} color={colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bigLinkTitle, { color: colors.foreground }]}>Cadastrar meu estabelecimento</Text>
              <Text style={[styles.bigLinkSub, { color: colors.mutedForeground }]}>Comece com 7 dias grátis e assine depois</Text>
            </View>
            <Feather name="arrow-right" size={16} color={colors.gold} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
            <Text style={[styles.smallLink, { color: colors.mutedForeground }]}>
              Sou cliente - <Text style={{ color: colors.gold }}>criar conta</Text>
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/legal" as never)}>
            <Text style={[styles.smallLink, { color: colors.mutedForeground }]}>
              Termos de uso e privacidade
            </Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={styles.logo}>
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={[styles.logoSub, { color: colors.mutedForeground }]}>
          Gestão para estabelecimentos que trabalham com hora marcada
        </Text>
      </View>

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

        <View>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Email</Text>
          <View style={[styles.inputGroup, { borderColor: errors.email ? colors.destructive : colors.border, backgroundColor: colors.background }]}>
            <Feather name="mail" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="seu@email.com"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={(value) => setEmail(value.trim().toLowerCase())}
              autoComplete="email"
              {...typedInputProps("email")}
            />
          </View>
          {!!errors.email && <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.email}</Text>}
        </View>

        <View>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Senha</Text>
          <View style={[styles.inputGroup, { borderColor: errors.password ? colors.destructive : colors.border, backgroundColor: colors.background }]}>
            <Feather name="lock" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Sua senha"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              autoComplete="password"
              {...typedInputProps("password")}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword((current) => !current)}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          {!!errors.password && <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.password}</Text>}
          <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
            <Text style={[styles.forgotText, { color: colors.gold }]}>Esqueci minha senha</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.loginBtn, { backgroundColor: colors.gold }]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.loginBtnText}>{loading ? "Entrando..." : "Entrar"}</Text>
        </TouchableOpacity>
      </View>

    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  logo: { alignItems: "center", gap: 8 },
  logoImage: { width: 220, height: 90, marginBottom: 4 },
  logoSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  form: { gap: 12 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 6, letterSpacing: 0.3, textTransform: "uppercase" },
  inputGroup: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, borderWidth: 1.5 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  errorText: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 6, lineHeight: 15 },
  loginBtn: { paddingVertical: 16, borderRadius: 16, alignItems: "center", marginTop: 6 },
  loginBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0C0C0C" },
  forgotBtn: { alignSelf: "flex-end", paddingTop: 8 },
  forgotText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  bottomLinks: { gap: 14, alignItems: "stretch" },
  bigLink: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5 },
  bigLinkTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  bigLinkSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  smallLink: { textAlign: "center", fontSize: 13, fontFamily: "Inter_500Medium" },
});
