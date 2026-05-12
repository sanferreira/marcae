import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";

import { Appointment } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  appointment: Appointment;
  onCancel?: () => void;
  onComplete?: () => void;
  isAdmin?: boolean;
}

const STATUS_CONFIG = {
  pending: { label: "Pendente", color: "#F59E0B", icon: "clock" as const },
  confirmed: { label: "Confirmado", color: "#3B82F6", icon: "check-circle" as const },
  completed: { label: "Concluído", color: "#22C55E", icon: "check-circle" as const },
  cancelled: { label: "Cancelado", color: "#EF4444", icon: "x-circle" as const },
};

export function AppointmentCard({ appointment, onCancel, onComplete, isAdmin }: Props) {
  const colors = useColors();
  const isDark = useColorScheme() === "dark";
  const status = STATUS_CONFIG[appointment.status];
  const serviceNames = appointment.services.map((s) => s.name).join(", ");

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCancel?.();
  };

  const handleComplete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onComplete?.();
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.dateBox}>
          <Text style={[styles.dateDay, { color: colors.gold }]}>
            {appointment.date.split("-")[2]}
          </Text>
          <Text style={[styles.dateMonth, { color: colors.mutedForeground }]}>
            {new Date(appointment.date + "T12:00:00").toLocaleDateString("pt-BR", { month: "short" }).toUpperCase()}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.professional, { color: colors.foreground }]} numberOfLines={1}>
            {appointment.professionalName}
          </Text>
          <Text style={[styles.services, { color: colors.mutedForeground }]} numberOfLines={1}>
            {serviceNames}
          </Text>
          <View style={styles.metaRow}>
            <Feather name="clock" size={12} color={colors.mutedForeground} />
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {appointment.time} · {appointment.totalDuration}min
            </Text>
          </View>
        </View>
        <View style={styles.right}>
          <Text style={[styles.price, { color: colors.gold }]}>
            R${appointment.totalPrice}
          </Text>
          <View style={[styles.badge, { backgroundColor: status.color + "22" }]}>
            <Feather name={status.icon} size={10} color={status.color} />
            <Text style={[styles.badgeText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>
      </View>

      {isAdmin && appointment.clientName && (
        <View style={[styles.clientRow, { borderTopColor: colors.border }]}>
          <Feather name="user" size={12} color={colors.mutedForeground} />
          <Text style={[styles.clientName, { color: colors.mutedForeground }]}>
            {appointment.clientName}
          </Text>
        </View>
      )}

      {(appointment.status === "confirmed" || appointment.status === "pending") && (
        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          {onCancel && (
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.border }]}
              onPress={handleCancel}
            >
              <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          )}
          {onComplete && isAdmin && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.completeBtn, { backgroundColor: colors.gold }]}
              onPress={handleComplete}
            >
              <Text style={[styles.actionText, { color: "#0C0C0C" }]}>
                Concluir
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    alignItems: "center",
  },
  dateBox: {
    alignItems: "center",
    minWidth: 36,
  },
  dateDay: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    lineHeight: 24,
  },
  dateMonth: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  professional: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  services: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  meta: {
    fontSize: 12,
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
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  clientName: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  actions: {
    flexDirection: "row",
    borderTopWidth: 1,
    gap: 8,
    padding: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  completeBtn: {
    borderWidth: 0,
  },
  actionText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
