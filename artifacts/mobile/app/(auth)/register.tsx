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

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !phone || !password) {
      Alert.alert("Atenção", "Preencha todos os campos");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Atenção", "As senhas não coincidem");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    await register(name, email, phone, password);
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Criar conta</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Cadastre-se para agendar seus serviços
          </Text>
        </View>

        <View style={styles.form}>
          {[
            { label: "Nome completo", value: name, set: setName, icon: "user" as const, type: "default" as const },
            { label: "Email", value: email, set: setEmail, icon: "mail" as const, type: "email-address" as const },
            { label: "Telefone", value: phone, set: setPhone, icon: "phone" as const, type: "phone-pad" as const },
          ].map((field) => (
            <View key={field.label} style={[styles.inputGroup, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Feather name={field.icon} size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder={field.label}
                placeholderTextColor={colors.mutedForeground}
                value={field.value}
                onChangeText={field.set}
                keyboardType={field.type}
                autoCapitalize={field.label === "Nome completo" ? "words" : "none"}
              />
            </View>
          ))}

          <View style={[styles.inputGroup, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Feather name="lock" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Senha"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
          <View style={[styles.inputGroup, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Feather name="lock" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Confirmar senha"
              placeholderTextColor={colors.mutedForeground}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.registerBtn, { backgroundColor: colors.gold }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.registerBtnText}>
              {loading ? "Criando conta..." : "Criar conta"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.loginLink, { color: colors.gold }]}>
            Já tem conta? Fazer login
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
    gap: 24,
  },
  backBtn: {
    width: 40,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
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
  registerBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
  },
  registerBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#0C0C0C",
  },
  loginLink: {
    textAlign: "center",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
