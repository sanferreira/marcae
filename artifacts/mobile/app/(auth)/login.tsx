import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
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

import { UserRole, useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("client");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Atenção", "Preencha email e senha");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    const ok = await login(email, password, role);
    setLoading(false);
    if (!ok) {
      Alert.alert("Erro", "Credenciais inválidas");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logo}>
          <View style={[styles.logoIcon, { backgroundColor: colors.gold }]}>
            <Feather name="scissors" size={28} color="#0C0C0C" />
          </View>
          <Text style={[styles.logoText, { color: colors.foreground }]}>BarberPro</Text>
          <Text style={[styles.logoSub, { color: colors.mutedForeground }]}>
            Gestão para barbearias modernas
          </Text>
        </View>

        <View style={styles.roleRow}>
          {(["client", "admin"] as UserRole[]).map((r) => (
            <TouchableOpacity
              key={r}
              style={[
                styles.roleBtn,
                {
                  backgroundColor: role === r ? colors.gold : colors.secondary,
                  borderColor: role === r ? colors.gold : colors.border,
                },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setRole(r);
              }}
            >
              <Feather
                name={r === "client" ? "user" : "settings"}
                size={14}
                color={role === r ? "#0C0C0C" : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.roleBtnText,
                  { color: role === r ? "#0C0C0C" : colors.mutedForeground },
                ]}
              >
                {r === "client" ? "Cliente" : "Administrador"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.form}>
          <View style={[styles.inputGroup, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Feather name="mail" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Email"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>
          <View style={[styles.inputGroup, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Feather name="lock" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Senha"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Feather
                name={showPassword ? "eye-off" : "eye"}
                size={16}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.gold }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.loginBtnText}>
              {loading ? "Entrando..." : "Entrar"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hint}>
          <Text style={[styles.hintTitle, { color: colors.mutedForeground }]}>Contas de demonstração:</Text>
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            Admin: admin@barberpro.com / admin123{"\n"}
            Cliente: joao@email.com / 123456
          </Text>
        </View>

        <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
          <Text style={[styles.registerLink, { color: colors.gold }]}>
            Não tem conta? Cadastre-se
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    gap: 28,
  },
  logo: {
    alignItems: "center",
    gap: 10,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  logoText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  logoSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  roleRow: {
    flexDirection: "row",
    gap: 10,
  },
  roleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  roleBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  form: {
    gap: 12,
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  loginBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
  },
  loginBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#0C0C0C",
  },
  hint: {
    gap: 4,
    alignItems: "center",
  },
  hintTitle: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  hintText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  registerLink: {
    textAlign: "center",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
