import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
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

const DEMO_ACCOUNTS = [
  { role: "Administrador", icon: "settings" as const, slug: "primeiro_nucleo", email: "admin@barberpro.com", password: "admin123" },
  { role: "Funcionário",   icon: "user-check" as const, slug: "primeiro_nucleo", email: "rafael@barberpro.com", password: "func123" },
  { role: "Cliente",       icon: "user" as const, slug: "primeiro_nucleo", email: "joao@email.com", password: "123456" },
];

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!slug || !email || !password) {
      Alert.alert("Atenção", "Preencha o ID do estabelecimento, email e senha.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    const res = await login(slug, email, password);
    setLoading(false);
    if (!res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Erro", res.error ?? "Não foi possível entrar.");
    }
  };

  const fillDemo = (d: typeof DEMO_ACCOUNTS[number]) => {
    Haptics.selectionAsync();
    setSlug(d.slug);
    setEmail(d.email);
    setPassword(d.password);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 30, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logo}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={[styles.logoSub, { color: colors.mutedForeground }]}>
            Agenda e gestão para profissionais que marcam hora
          </Text>
        </View>

        <View style={styles.form}>
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>ID do estabelecimento</Text>
            <View style={[styles.inputGroup, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Feather name="hash" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="ex: primeiro_nucleo"
                placeholderTextColor={colors.mutedForeground}
                value={slug}
                onChangeText={(v) => setSlug(v.toLowerCase().replace(/\s/g, "_"))}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Email</Text>
            <View style={[styles.inputGroup, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Feather name="mail" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="seu@email.com"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Senha</Text>
            <View style={[styles.inputGroup, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Feather name="lock" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Sua senha"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
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

        <View style={styles.demoSection}>
          <Text style={[styles.demoTitle, { color: colors.mutedForeground }]}>
            Contas de demonstração — toque para preencher
          </Text>
          {DEMO_ACCOUNTS.map((d) => (
            <TouchableOpacity
              key={d.email}
              style={[styles.demoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => fillDemo(d)}
              activeOpacity={0.78}
            >
              <View style={[styles.demoIcon, { backgroundColor: colors.gold + "22" }]}>
                <Feather name={d.icon} size={14} color={colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.demoRole, { color: colors.foreground }]}>{d.role}</Text>
                <Text style={[styles.demoCreds, { color: colors.mutedForeground }]}>
                  {d.email} · {d.password}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bottomLinks}>
          <TouchableOpacity onPress={() => router.push("/(auth)/register-shop")} style={[styles.bigLink, { borderColor: colors.gold, backgroundColor: colors.gold + "12" }]}>
            <Feather name="briefcase" size={16} color={colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bigLinkTitle, { color: colors.foreground }]}>Cadastrar meu estabelecimento</Text>
              <Text style={[styles.bigLinkSub, { color: colors.mutedForeground }]}>7 dias grátis com todos recursos</Text>
            </View>
            <Feather name="arrow-right" size={16} color={colors.gold} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
            <Text style={[styles.smallLink, { color: colors.mutedForeground }]}>
              Sou cliente — <Text style={{ color: colors.gold }}>criar conta</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, gap: 24 },
  logo: { alignItems: "center", gap: 8 },
  logoImage: { width: 220, height: 90, marginBottom: 4 },
  logoSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  form: { gap: 12 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 6, letterSpacing: 0.3, textTransform: "uppercase" },
  inputGroup: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  loginBtn: { paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 6 },
  loginBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0C0C0C" },
  demoSection: { gap: 8 },
  demoTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3, textTransform: "uppercase", textAlign: "center", marginBottom: 4 },
  demoCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  demoIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  demoRole: { fontSize: 13, fontFamily: "Inter_700Bold" },
  demoCreds: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  bottomLinks: { gap: 14, alignItems: "stretch" },
  bigLink: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  bigLinkTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  bigLinkSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  smallLink: { textAlign: "center", fontSize: 13, fontFamily: "Inter_500Medium" },
});
