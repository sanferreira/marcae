import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Platform, Pressable, Share, Text } from "react-native";

import {
  Section,
  SettingsPage,
  settingsStyles as styles,
} from "@/components/admin-settings/SettingsShared";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

export default function DataSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, barbershop } = useAuth();

  if (!user || user.role !== "admin") {
    router.replace("/" as never);
    return null;
  }

  const handleExportData = async () => {
    const result = await apiFetch<Record<string, unknown>>("/establishment/export");
    if (!result.ok) {
      Alert.alert("Erro ao exportar", result.error);
      return;
    }
    const json = JSON.stringify(result.data, null, 2);
    const filename = `export-${barbershop?.slug ?? "estabelecimento"}.json`;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    await Share.share({ title: filename, message: json });
  };

  return (
    <SettingsPage title="Exportar dados">
      <Section title="Dados" colors={colors}>
        <Text style={[styles.help, { color: colors.mutedForeground }]}>
          Exporte cadastros, agenda, financeiro, produtos, pedidos e pacotes em JSON.
        </Text>
        <Pressable onPress={handleExportData} style={[styles.linkRow, { borderColor: colors.border }]}>
          <Feather name="download" size={16} color={colors.gold} />
          <Text style={[styles.linkRowText, { color: colors.foreground }]}>Exportar dados do estabelecimento</Text>
          <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
        </Pressable>
      </Section>
    </SettingsPage>
  );
}
