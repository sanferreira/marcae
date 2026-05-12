import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Appointment } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";

export const STATUS_CONFIG = {
  pending:   { label: "Pendente",   color: "#F59E0B", icon: "clock"        as const },
  confirmed: { label: "Confirmado", color: "#3B82F6", icon: "check-circle" as const },
  completed: { label: "Concluído",  color: "#22C55E", icon: "check-circle" as const },
  cancelled: { label: "Cancelado",  color: "#EF4444", icon: "x-circle"     as const },
};

interface Props {
  appointment: Appointment;
  onPress?: () => void;
  onCancel?: () => void;
  onComplete?: () => void;
  onReschedule?: () => void;
  isAdmin?: boolean;
}

export function AppointmentCard({ appointment, onPress, onCancel, onComplete, onReschedule, isAdmin }: Props) {
  const colors = useColors();
  const status = STATUS_CONFIG[appointment.status];
  const serviceNames = appointment.services.map((s) => s.name).join(", ");
  const isUpcoming = appointment.status === "confirmed" || appointment.status === "pending";

  // Days until appointment
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const aptDate = new Date(appointment.date + "T12:00:00");
  const diffDays = Math.round((aptDate.getTime() - today.getTime()) / 86400000);
  const countdown =
    diffDays === 0 ? "Hoje!" :
    diffDays === 1 ? "Amanhã" :
    diffDays > 1 ? `Em ${diffDays} dias` : null;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: isUpcoming ? colors.gold + "44" : colors.border }]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress?.(); }}
      activeOpacity={onPress ? 0.78 : 1}
    >
      {/* Top stripe for upcoming */}
      {isUpcoming && (
        <View style={[styles.stripe, { backgroundColor: colors.gold }]} />
      )}

      <View style={styles.header}>
        <View style={[styles.dateBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Text style={[styles.dateDay, { color: colors.gold }]}>
            {appointment.date.split("-")[2]}
          </Text>
          <Text style={[styles.dateMonth, { color: colors.mutedForeground }]}>
            {new Date(appointment.date + "T12:00:00").toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase()}
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
          {isUpcoming && countdown && (
            <View style={[styles.countdownBadge, { backgroundColor: colors.gold + "18" }]}>
              <Text style={[styles.countdownText, { color: colors.gold }]}>{countdown}</Text>
            </View>
          )}
        </View>

        <View style={styles.right}>
          <Text style={[styles.price, { color: colors.gold }]}>R${appointment.totalPrice}</Text>
          <View style={[styles.badge, { backgroundColor: status.color + "22" }]}>
            <Feather name={status.icon} size={10} color={status.color} />
            <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
          </View>
          {onPress && <Feather name="chevron-right" size={14} color={colors.mutedForeground} style={styles.chevron} />}
        </View>
      </View>

      {isAdmin && appointment.clientName && (
        <View style={[styles.clientRow, { borderTopColor: colors.border }]}>
          <Feather name="user" size={12} color={colors.mutedForeground} />
          <Text style={[styles.clientName, { color: colors.mutedForeground }]}>{appointment.clientName}</Text>
        </View>
      )}

      {/* Admin actions only — client actions are handled via detail sheet */}
      {isAdmin && isUpcoming && (onCancel || onComplete) && (
        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          {onCancel && (
            <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.border }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onCancel(); }}>
              <Text style={[styles.actionText, { color: colors.mutedForeground }]}>Cancelar</Text>
            </TouchableOpacity>
          )}
          {onComplete && (
            <TouchableOpacity style={[styles.actionBtn, styles.completeBtn, { backgroundColor: colors.gold }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onComplete(); }}>
              <Text style={[styles.actionText, { color: "#0C0C0C" }]}>Concluir</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: "hidden" },
  stripe: { height: 3, width: "100%" },
  header: { flexDirection: "row", padding: 14, gap: 12, alignItems: "center" },
  dateBox: { alignItems: "center", minWidth: 44, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  dateDay: { fontSize: 22, fontFamily: "Inter_700Bold", lineHeight: 24 },
  dateMonth: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginTop: 2 },
  info: { flex: 1, gap: 3 },
  professional: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  services: { fontSize: 12, fontFamily: "Inter_400Regular" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  countdownBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  countdownText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  right: { alignItems: "flex-end", gap: 5 },
  price: { fontSize: 16, fontFamily: "Inter_700Bold" },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  chevron: { marginTop: 2 },
  clientRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1 },
  clientName: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", borderTopWidth: 1, gap: 8, padding: 12 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  completeBtn: { borderWidth: 0 },
  actionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
