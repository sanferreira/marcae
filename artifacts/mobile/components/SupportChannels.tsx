import { Feather } from "@expo/vector-icons";
import React from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import {
  SUPPORT_INSTAGRAM_HANDLE,
  SUPPORT_INSTAGRAM_URL,
  SUPPORT_PHONE_LABEL,
  SUPPORT_WHATSAPP_URL,
} from "@/constants/contact";
import { useColors } from "@/hooks/useColors";

const CHANNELS = [
  {
    icon: "message-circle" as const,
    label: "WhatsApp",
    value: SUPPORT_PHONE_LABEL,
    url: SUPPORT_WHATSAPP_URL,
  },
  {
    icon: "instagram" as const,
    label: "Instagram",
    value: SUPPORT_INSTAGRAM_HANDLE,
    url: SUPPORT_INSTAGRAM_URL,
  },
];

export function SupportChannels({ compact = false }: { compact?: boolean }) {
  const colors = useColors();

  const openChannel = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Nao foi possivel abrir", "Use o telefone ou Instagram exibido na tela para falar com o suporte.");
    }
  };

  return (
    <View style={[styles.card, compact && styles.cardCompact, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.gold + "18" }]}>
          <Feather name="headphones" size={17} color={colors.gold} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.title, { color: colors.foreground }]}>Suporte Marcae</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Canais oficiais para duvidas de acesso, assinatura e uso do sistema.
          </Text>
        </View>
      </View>

      <View style={styles.channelList}>
        {CHANNELS.map((channel) => (
          <Pressable
            key={channel.label}
            onPress={() => { void openChannel(channel.url); }}
            style={({ pressed }) => [
              styles.channelRow,
              { backgroundColor: colors.secondary, opacity: pressed ? 0.78 : 1 },
            ]}
          >
            <View style={[styles.channelIcon, { backgroundColor: colors.background }]}>
              <Feather name={channel.icon} size={16} color={colors.gold} />
            </View>
            <View style={styles.channelTextWrap}>
              <Text style={[styles.channelLabel, { color: colors.mutedForeground }]}>{channel.label}</Text>
              <Text style={[styles.channelValue, { color: colors.foreground }]}>{channel.value}</Text>
            </View>
            <Feather name="external-link" size={14} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  cardCompact: { padding: 14 },
  header: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  headerIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerTextWrap: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
  channelList: { gap: 8 },
  channelRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 },
  channelIcon: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  channelTextWrap: { flex: 1, gap: 1 },
  channelLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" },
  channelValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
