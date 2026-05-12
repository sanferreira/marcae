import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LoyaltyProgressCard } from "@/components/LoyaltyProgressCard";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";

export default function LoyaltyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getClientLoyalty } = useData();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const loyalty = getClientLoyalty(user?.id ?? "");

  const TYPE_CONFIG = {
    earned: { icon: "plus-circle" as const, color: "#22C55E", label: "Ganhou" },
    redeemed: { icon: "gift" as const, color: "#C9A96E", label: "Resgatado" },
    adjusted: { icon: "edit-2" as const, color: "#60A5FA", label: "Ajuste" },
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={loyalty.history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 16, paddingBottom: botPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>Fidelidade</Text>
            <LoyaltyProgressCard loyalty={loyalty} />

            <View style={[styles.howItWorksCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.howTitle, { color: colors.foreground }]}>Como funciona?</Text>
              {[
                { icon: "scissors" as const, text: "A cada serviço concluído, você ganha 1 ponto de fidelidade" },
                { icon: "award" as const, text: `Ao atingir ${loyalty.requiredPoints} pontos, você ganha: ${loyalty.benefitDescription}` },
                { icon: "gift" as const, text: "O benefício é aplicado automaticamente no próximo agendamento" },
              ].map((item, i) => (
                <View key={i} style={styles.howRow}>
                  <View style={[styles.howIcon, { backgroundColor: colors.gold + "22" }]}>
                    <Feather name={item.icon} size={14} color={colors.gold} />
                  </View>
                  <Text style={[styles.howText, { color: colors.mutedForeground }]}>
                    {item.text}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={[styles.historyTitle, { color: colors.foreground }]}>
              Histórico de Pontos
            </Text>
          </>
        }
        renderItem={({ item }) => {
          const config = TYPE_CONFIG[item.type];
          return (
            <View style={[styles.historyItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.historyIcon, { backgroundColor: config.color + "22" }]}>
                <Feather name={config.icon} size={16} color={config.color} />
              </View>
              <View style={styles.historyInfo}>
                <Text style={[styles.historyDesc, { color: colors.foreground }]}>
                  {item.description}
                </Text>
                <Text style={[styles.historyDate, { color: colors.mutedForeground }]}>
                  {new Date(item.date + "T12:00:00").toLocaleDateString("pt-BR")}
                </Text>
              </View>
              <Text style={[styles.historyPoints, { color: config.color }]}>
                {item.type === "redeemed" ? "-" : "+"}{item.points}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="star" size={32} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Nenhum histórico ainda
            </Text>
            <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>
              Seus pontos aparecerão aqui após cada atendimento
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  howItWorksCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  howTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 4 },
  howRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  howIcon: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: "center", justifyContent: "center", marginTop: 1,
  },
  howText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  historyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 4 },
  historyItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, padding: 14, borderWidth: 1,
  },
  historyIcon: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  historyInfo: { flex: 1, gap: 3 },
  historyDesc: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  historyDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  historyPoints: { fontSize: 18, fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptySubText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
});
