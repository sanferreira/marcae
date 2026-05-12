import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { LoyaltyInfo } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  loyalty: LoyaltyInfo;
}

export function LoyaltyProgressCard({ loyalty }: Props) {
  const colors = useColors();
  const progress = loyalty.currentPoints / loyalty.requiredPoints;
  const remaining = loyalty.requiredPoints - loyalty.currentPoints;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Programa de Fidelidade
          </Text>
          <Text style={[styles.benefit, { color: colors.foreground }]}>
            {loyalty.benefitDescription}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.gold + "22" }]}>
          <Feather name="award" size={18} color={colors.gold} />
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={[styles.track, { backgroundColor: colors.secondary }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${Math.min(progress * 100, 100)}%` as any,
                backgroundColor: colors.gold,
              },
            ]}
          />
        </View>
        <View style={styles.counters}>
          {Array.from({ length: loyalty.requiredPoints }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i < loyalty.currentPoints ? colors.gold : colors.secondary,
                  borderColor:
                    i < loyalty.currentPoints ? colors.gold : colors.border,
                },
              ]}
            >
              {i < loyalty.currentPoints && (
                <Feather name="check" size={8} color="#0C0C0C" />
              )}
            </View>
          ))}
        </View>
      </View>

      <Text style={[styles.description, { color: colors.mutedForeground }]}>
        {loyalty.currentPoints === loyalty.requiredPoints
          ? "Parabéns! Você ganhou um benefício gratuito!"
          : `Você possui ${loyalty.currentPoints} de ${loyalty.requiredPoints} pontos. Faltam ${remaining} para ganhar seu prêmio.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    gap: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  benefit: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  progressSection: {
    gap: 10,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  counters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  description: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
});
