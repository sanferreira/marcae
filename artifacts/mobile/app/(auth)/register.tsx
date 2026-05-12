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
  const { registerClient } = useAuth();

  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!slug || !name || !email || !phone || !password) {
      Alert.alert("Atenção", "Preencha todos os campos.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Atenção", "As senhas não coincidem.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    const res = await registerClient({ slug, name, email, phone, password });
    setLoading(false);
    if (!res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Erro", res.error ?? "Não foi possível criar a conta.");
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
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: colors.gold + "22" }]}>
            <Feather name="user-plus" size={20} color={colors.gold} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Criar conta de cliente</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Informe o ID da barbearia onde deseja se cadastrar para começar a marcar horários.
          </Text>
        </View>

        <View style={styles.form}>
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>ID da barbearia</Text>
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

          {[
            { label: "Nome completo", value: name, set: setName, icon: "user" as const, type: "default" as const, cap: "words" as const },
            { label: "Email", value: email, set: setEmail, icon: "mail" as const, type: "email-address" as const, cap: "none" as const },
            { label: "Telefone", value: phone, set: setPhone, icon: "phone" as const, type: "phone-pad" as const, cap: "none" as const },
          ].map((field) => (
            <View key={field.label}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{field.label}</Text>
              <View style={[styles.inputGroup, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Feather name={field.icon} size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder={field.label}
                  placeholderTextColor={colors.mutedForeground}
                  value={field.value}
                  onChangeText={field.set}
                  keyboardType={field.type}
                  autoCapitalize={field.cap}
                />
              </View>
            </View>
          ))}

          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Senha</Text>
            <View style={[styles.inputGroup, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Feather name="lock" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Mín. 6 caracteres"
                placeholderTextColor={colors.mutedForeground}
                value={password} onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Confirmar senha</Text>
            <View style={[styles.inputGroup, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Feather name="lock" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Repita a senha"
                placeholderTextColor={colors.mutedForeground}
                value={confirmPassword} onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.registerBtn, { backgroundColor: colors.gold }]}
            onPress={handleRegister} disabled={loading} activeOpacity={0.85}
          >
            <Text style={styles.registerBtnText}>{loading ? "Criando conta..." : "Criar conta"}</Text>
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
  container: { flexGrow: 1, paddingHorizontal: 24, gap: 22 },
  backBtn: { width: 40, height: 40, alignItems: "flex-start", justifyContent: "center" },
  header: { gap: 8 },
  headerIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  form: { gap: 12 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 6, letterSpacing: 0.3, textTransform: "uppercase" },
  inputGroup: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  registerBtn: { paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 6 },
  registerBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0C0C0C" },
  loginLink: { textAlign: "center", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
