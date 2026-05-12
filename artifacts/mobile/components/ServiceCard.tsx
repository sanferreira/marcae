import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Service } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  service: Service;
  selected?: boolean;
  onPress: () => void;
  showAdmin?: boolean;
}

const CATEGORY_ICONS: Record<string, "scissors" | "user" | "star" | "package" | "zap"> = {
  Cabelo: "scissors",
  Barba: "user",
  Combo: "star",
  Estética: "zap",
  Tratamento: "package",
};

export function ServiceCard({ service, selected, onPress, showAdmin }: Props) {
  const colors = useColors();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const icon = CATEGORY_ICONS[service.category] ?? "scissors";

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: selected ? colors.gold + "18" : colors.card,
          borderColor: selected ? colors.gold : colors.border,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.iconBox,
          { backgroundColor: selected ? colors.gold : colors.secondary },
        ]}
      >
        <Feather name={icon} size={18} color={selected ? "#0C0C0C" : colors.mutedForeground} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.foreground }]}>{service.name}</Text>
        <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={1}>
          {service.description}
        </Text>
        <View style={styles.meta}>
          <Feather name="clock" size={11} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
            {service.duration}min
          </Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={[styles.price, { color: colors.gold }]}>
          R${service.price}
        </Text>
        {selected && (
          <Feather name="check-circle" size={18} color={colors.gold} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  desc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  right: {
    alignItems: "flex-end",
    gap: 6,
  },
  price: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
