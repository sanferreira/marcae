import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppointmentCard, STATUS_CONFIG } from "@/components/AppointmentCard";
import { useAuth } from "@/contexts/AuthContext";
import { Appointment, useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";

type Filter = "upcoming" | "past" | "cancelled";

const DATES = Array.from({ length: 60 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  return d;
});

export default function AppointmentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { appointments, cancelAppointment, rescheduleAppointment, getAvailableSlots } = useData();

  const [filter, setFilter] = useState<Filter>("upcoming");
  const [detail, setDetail] = useState<Appointment | null>(null);
  const [rescheduleApt, setRescheduleApt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date>(DATES[1]);
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [saving, setSaving] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const myApts = appointments
    .filter((a) => a.clientId === user?.id)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const today = new Date().toISOString().split("T")[0];

  const filtered = myApts.filter((a) => {
    if (filter === "upcoming") return (a.date >= today) && (a.status === "confirmed" || a.status === "pending");
    if (filter === "past") return a.status === "completed";
    return a.status === "cancelled";
  });

  const upcomingCount = myApts.filter((a) => (a.date >= today) && (a.status === "confirmed" || a.status === "pending")).length;

  // ── Cancel ──────────────────────────────────────────────────────────────────
  const handleCancel = (apt: Appointment) => {
    const aptDate = new Date(apt.date + "T12:00:00");
    const now = new Date();
    const hoursUntil = (aptDate.getTime() - now.getTime()) / 3600000;
    const warning = hoursUntil < 24 && hoursUntil > 0
      ? "\n\nAtenção: o horário é em menos de 24h."
      : "";
    Alert.alert(
      "Cancelar agendamento",
      `Tem certeza que deseja cancelar o horário com ${apt.professionalName} em ${new Date(apt.date + "T12:00:00").toLocaleDateString("pt-BR")} às ${apt.time}?${warning}`,
      [
        { text: "Manter", style: "cancel" },
        {
          text: "Cancelar agendamento",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            await cancelAppointment(apt.id);
            setDetail(null);
          },
        },
      ]
    );
  };

  // ── Reschedule ───────────────────────────────────────────────────────────────
  const openReschedule = (apt: Appointment) => {
    setDetail(null);
    setRescheduleApt(apt);
    setRescheduleDate(DATES[1]);
    setRescheduleTime("");
  };

  const rescheduleDateStr = rescheduleDate.toISOString().split("T")[0];
  const availableSlots = rescheduleApt
    ? getAvailableSlots(rescheduleDateStr, rescheduleApt.professionalId, rescheduleApt.totalDuration)
        .filter((s) => s !== rescheduleApt.time || rescheduleDateStr !== rescheduleApt.date)
    : [];

  const confirmReschedule = async () => {
    if (!rescheduleApt || !rescheduleTime) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await rescheduleAppointment(rescheduleApt.id, rescheduleDateStr, rescheduleTime);
    setSaving(false);
    setRescheduleApt(null);
    Alert.alert("Reagendado!", `Seu novo horário é ${rescheduleDate.toLocaleDateString("pt-BR")} às ${rescheduleTime} com ${rescheduleApt.professionalName}.`);
  };

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "upcoming", label: `Próximos${upcomingCount > 0 ? ` (${upcomingCount})` : ""}` },
    { key: "past", label: "Concluídos" },
    { key: "cancelled", label: "Cancelados" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Meus Agendamentos</Text>
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterBtn, { backgroundColor: filter === f.key ? colors.gold : colors.secondary }]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, { color: filter === f.key ? "#0C0C0C" : colors.mutedForeground }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: botPad + 100 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <AppointmentCard
            appointment={item}
            onPress={() => setDetail(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="calendar" size={40} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {filter === "upcoming" ? "Nenhum agendamento próximo" : filter === "past" ? "Nenhum atendimento concluído" : "Nenhum cancelamento"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {filter === "upcoming" ? "Use o botão 'Agendar' na tela inicial para marcar um horário." : "Seus históricos aparecerão aqui."}
            </Text>
          </View>
        }
      />

      {/* ── DETAIL MODAL ── */}
      <Modal
        visible={!!detail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetail(null)}
      >
        {detail && (
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setDetail(null)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Detalhes</Text>
              <View style={{ width: 22 }} />
            </View>

            <ScrollView contentContainerStyle={[styles.detailContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
              {/* Status banner */}
              {(() => {
                const sc = STATUS_CONFIG[detail.status];
                return (
                  <View style={[styles.statusBanner, { backgroundColor: sc.color + "18", borderColor: sc.color + "44" }]}>
                    <Feather name={sc.icon} size={18} color={sc.color} />
                    <Text style={[styles.statusBannerText, { color: sc.color }]}>{sc.label}</Text>
                  </View>
                );
              })()}

              {/* Professional */}
              <View style={[styles.profCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.profAvatar, { backgroundColor: colors.gold }]}>
                  <Text style={styles.profAvatarText}>
                    {detail.professionalName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={[styles.profName, { color: colors.foreground }]}>{detail.professionalName}</Text>
                  <Text style={[styles.profSub, { color: colors.mutedForeground }]}>Profissional</Text>
                </View>
              </View>

              {/* Info rows */}
              <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {[
                  { icon: "calendar" as const, label: "Data", value: new Date(detail.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) },
                  { icon: "clock" as const, label: "Horário", value: `${detail.time} · ${detail.totalDuration} minutos` },
                  { icon: "scissors" as const, label: "Serviços", value: detail.services.map((s) => s.name).join(", ") },
                  ...(detail.paymentMethod ? [{ icon: "credit-card" as const, label: "Pagamento", value: detail.paymentMethod }] : []),
                  { icon: "hash" as const, label: "Código", value: `#${detail.id.slice(-6).toUpperCase()}` },
                ].map((row, i, arr) => (
                  <View key={row.label} style={[styles.infoRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                    <View style={[styles.infoIcon, { backgroundColor: colors.secondary }]}>
                      <Feather name={row.icon} size={14} color={colors.gold} />
                    </View>
                    <View style={styles.infoText}>
                      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                      <Text style={[styles.infoValue, { color: colors.foreground }]}>{row.value}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Services breakdown */}
              <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.breakdownTitle, { color: colors.foreground }]}>Resumo financeiro</Text>
                {detail.services.map((s, i, arr) => (
                  <View key={s.id} style={[styles.breakdownRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                    <Text style={[styles.breakdownName, { color: colors.foreground }]}>{s.name}</Text>
                    <Text style={[styles.breakdownDuration, { color: colors.mutedForeground }]}>{s.duration}min</Text>
                    <Text style={[styles.breakdownPrice, { color: colors.gold }]}>R${s.price}</Text>
                  </View>
                ))}
                <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
                  <Text style={[styles.totalValue, { color: colors.gold }]}>R${detail.totalPrice}</Text>
                </View>
              </View>

              {/* Actions for upcoming */}
              {(detail.status === "confirmed" || detail.status === "pending") && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.detailActionBtn, { borderColor: colors.destructive + "55", backgroundColor: colors.destructive + "11" }]}
                    onPress={() => handleCancel(detail)}
                  >
                    <Feather name="x-circle" size={15} color={colors.destructive} />
                    <Text style={[styles.detailActionText, { color: colors.destructive }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.detailActionBtn, { borderColor: colors.gold + "55", backgroundColor: colors.gold + "18", flex: 1.2 }]}
                    onPress={() => openReschedule(detail)}
                  >
                    <Feather name="calendar" size={15} color={colors.gold} />
                    <Text style={[styles.detailActionText, { color: colors.gold }]}>Reagendar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* ── RESCHEDULE MODAL ── */}
      <Modal
        visible={!!rescheduleApt}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setRescheduleApt(null)}
      >
        {rescheduleApt && (
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setRescheduleApt(null)}>
                <Feather name="arrow-left" size={22} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Reagendar</Text>
              <View style={{ width: 22 }} />
            </View>

            <ScrollView contentContainerStyle={[styles.rescheduleContent, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
              {/* Current info pill */}
              <View style={[styles.currentPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="info" size={13} color={colors.mutedForeground} />
                <Text style={[styles.currentPillText, { color: colors.mutedForeground }]}>
                  Atual: {new Date(rescheduleApt.date + "T12:00:00").toLocaleDateString("pt-BR")} às {rescheduleApt.time} com {rescheduleApt.professionalName}
                </Text>
              </View>

              <Text style={[styles.pickLabel, { color: colors.foreground }]}>Escolha a nova data</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
                <View style={styles.dateRow}>
                  {DATES.map((d) => {
                    const dStr = d.toISOString().split("T")[0];
                    const isSelected = dStr === rescheduleDateStr;
                    const isToday = dStr === today;
                    return (
                      <TouchableOpacity
                        key={dStr}
                        style={[styles.dateChip, {
                          backgroundColor: isSelected ? colors.gold : colors.card,
                          borderColor: isSelected ? colors.gold : colors.border,
                        }]}
                        onPress={() => { Haptics.selectionAsync(); setRescheduleDate(d); setRescheduleTime(""); }}
                      >
                        <Text style={[styles.dateChipDay, { color: isSelected ? "#0C0C0C" : colors.mutedForeground }]}>
                          {isToday ? "Hoje" : d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase()}
                        </Text>
                        <Text style={[styles.dateChipNum, { color: isSelected ? "#0C0C0C" : colors.foreground }]}>
                          {d.getDate()}
                        </Text>
                        <Text style={[styles.dateChipMonth, { color: isSelected ? "#0C0C0C66" : colors.mutedForeground }]}>
                          {d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <Text style={[styles.pickLabel, { color: colors.foreground, marginTop: 20 }]}>Escolha o horário</Text>
              {availableSlots.length === 0 ? (
                <View style={styles.noSlots}>
                  <Feather name="calendar-x" size={28} color={colors.border} />
                  <Text style={[styles.noSlotsText, { color: colors.mutedForeground }]}>
                    Nenhum horário disponível nessa data
                  </Text>
                  <Text style={[styles.noSlotsSub, { color: colors.mutedForeground }]}>Tente outra data</Text>
                </View>
              ) : (
                <View style={styles.slotsGrid}>
                  {availableSlots.map((slot) => (
                    <TouchableOpacity
                      key={slot}
                      style={[styles.slotChip, {
                        backgroundColor: rescheduleTime === slot ? colors.gold : colors.card,
                        borderColor: rescheduleTime === slot ? colors.gold : colors.border,
                      }]}
                      onPress={() => { Haptics.selectionAsync(); setRescheduleTime(slot); }}
                    >
                      <Text style={[styles.slotText, { color: rescheduleTime === slot ? "#0C0C0C" : colors.foreground }]}>
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Confirm bar */}
            <View style={[styles.confirmBar, { borderTopColor: colors.border, paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
              {rescheduleTime !== "" && (
                <View style={[styles.selectedSummary, { backgroundColor: colors.gold + "18", borderColor: colors.gold + "44" }]}>
                  <Feather name="check-circle" size={14} color={colors.gold} />
                  <Text style={[styles.selectedSummaryText, { color: colors.gold }]}>
                    {rescheduleDate.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })} às {rescheduleTime}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: rescheduleTime ? colors.gold : colors.secondary }]}
                onPress={confirmReschedule}
                disabled={!rescheduleTime || saving}
              >
                <Feather name="calendar" size={16} color={rescheduleTime ? "#0C0C0C" : colors.mutedForeground} />
                <Text style={[styles.confirmBtnText, { color: rescheduleTime ? "#0C0C0C" : colors.mutedForeground }]}>
                  {saving ? "Reagendando..." : "Confirmar novo horário"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, gap: 14 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  filterRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  filterText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  list: { padding: 20 },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  // modals
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  // detail
  detailContent: { padding: 20, gap: 14 },
  statusBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 14, borderWidth: 1 },
  statusBannerText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  profCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, borderWidth: 1 },
  profAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  profAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0C0C0C" },
  profName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  profSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  infoCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  infoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 2 },
  infoValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  breakdownTitle: { fontSize: 14, fontFamily: "Inter_700Bold", padding: 14, paddingBottom: 10 },
  breakdownRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 11, gap: 8 },
  breakdownName: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  breakdownDuration: { fontSize: 12, fontFamily: "Inter_400Regular" },
  breakdownPrice: { fontSize: 14, fontFamily: "Inter_700Bold", minWidth: 50, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderTopWidth: 1 },
  totalLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  totalValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  actionRow: { flexDirection: "row", gap: 10 },
  detailActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
  detailActionText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  // reschedule
  rescheduleContent: { padding: 20 },
  currentPill: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  currentPillText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  pickLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 12 },
  dateScroll: { marginBottom: 4 },
  dateRow: { flexDirection: "row", gap: 8 },
  dateChip: { width: 54, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, alignItems: "center", gap: 2 },
  dateChipDay: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  dateChipNum: { fontSize: 20, fontFamily: "Inter_700Bold" },
  dateChipMonth: { fontSize: 9, fontFamily: "Inter_400Regular" },
  noSlots: { alignItems: "center", paddingVertical: 40, gap: 8 },
  noSlotsText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  noSlotsSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  slotText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  // confirm bar
  confirmBar: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, gap: 8 },
  selectedSummary: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 12, borderWidth: 1 },
  selectedSummaryText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  confirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 14 },
  confirmBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
