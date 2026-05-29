import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
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

const CATEGORY_ICONS: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
  Cabelo: "scissors",
  Barba: "user",
  Combo: "star",
  "Estética": "zap",
  Tratamento: "package",
  Tatuagem: "edit-3",
  Piercing: "circle",
  Consulta: "clipboard",
};

export function ServiceCard({ service, selected, onPress, showAdmin }: Props) {
  const colors = useColors();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const icon = CATEGORY_ICONS[service.category] ?? "briefcase";

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
      <View style={[styles.mediaBox, { backgroundColor: selected ? colors.gold + "18" : colors.secondary }]}>
        {service.imageUrl ? (
          <Image source={{ uri: service.imageUrl }} style={styles.mediaImage} contentFit="cover" transition={120} />
        ) : (
          <Feather name={icon} size={20} color={selected ? colors.gold : colors.mutedForeground} />
        )}
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
    padding: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
    gap: 12,
  },
  mediaBox: {
    width: 72,
    height: 72,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  mediaImage: { width: "100%", height: "100%" },
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
