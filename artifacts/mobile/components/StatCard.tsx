import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  title: string;
  value: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  trend?: string;
  trendUp?: boolean;
  accent?: boolean;
}

export function StatCard({ title, value, icon, trend, trendUp, accent }: Props) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: accent ? colors.gold : colors.card,
          borderColor: accent ? colors.gold : colors.border,
        },
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: accent ? "#00000022" : colors.secondary }]}>
        <Feather name={icon} size={18} color={accent ? "#0C0C0C" : colors.gold} />
      </View>
      <Text style={[styles.value, { color: accent ? "#0C0C0C" : colors.foreground }]}>
        {value}
      </Text>
      <Text style={[styles.title, { color: accent ? "#0C0C0C" + "aa" : colors.mutedForeground }]}>
        {title}
      </Text>
      {trend && (
        <View style={styles.trendRow}>
          <Feather
            name={trendUp ? "trending-up" : "trending-down"}
            size={11}
            color={trendUp ? colors.success : colors.destructive}
          />
          <Text
            style={[
              styles.trend,
              { color: trendUp ? colors.success : colors.destructive },
            ]}
          >
            {trend}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 6,
    minWidth: 140,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  value: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  title: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  trend: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
});
