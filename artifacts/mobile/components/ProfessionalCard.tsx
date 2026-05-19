import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AppAvatar } from "@/components/AppAvatar";
import { Professional } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  professional: Professional;
  selected?: boolean;
  onPress: () => void;
}

export function ProfessionalCard({ professional, selected, onPress }: Props) {
  const colors = useColors();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const initials = professional.avatar || professional.name.split(" ").map((n) => n[0]).join("").slice(0, 2);

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
      <AppAvatar
        imageUri={professional.avatarImage}
        fallback={initials}
        size={48}
        backgroundColor={selected ? colors.gold : colors.secondary}
        textColor={selected ? colors.primaryForeground : colors.mutedForeground}
        fontSize={16}
      />
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]}>{professional.name}</Text>
        <Text style={[styles.specialty, { color: colors.mutedForeground }]}>
          {professional.specialty}
        </Text>
        <View style={styles.meta}>
          <Feather name="star" size={11} color={colors.gold} />
          <Text style={[styles.rating, { color: colors.gold }]}>{professional.rating}</Text>
          <Text style={[styles.dot, { color: colors.border }]}>·</Text>
          <Text style={[styles.count, { color: colors.mutedForeground }]}>
            {professional.appointmentsCount} atendimentos
          </Text>
        </View>
      </View>
      <View style={styles.right}>
        {selected ? (
          <Feather name="check-circle" size={20} color={colors.gold} />
        ) : (
          <View
            style={[
              styles.availBadge,
              {
                backgroundColor: professional.isAvailable
                  ? colors.success + "22"
                  : colors.destructive + "22",
              },
            ]}
          >
            <View
              style={[
                styles.dot2,
                {
                  backgroundColor: professional.isAvailable
                    ? colors.success
                    : colors.destructive,
                },
              ]}
            />
            <Text
              style={[
                styles.availText,
                {
                  color: professional.isAvailable ? colors.success : colors.destructive,
                },
              ]}
            >
              {professional.isAvailable ? "Disponível" : "Ocupado"}
            </Text>
          </View>
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
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  specialty: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  rating: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  dot: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  count: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  right: {
    alignItems: "center",
  },
  availBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  dot2: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  availText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
});
