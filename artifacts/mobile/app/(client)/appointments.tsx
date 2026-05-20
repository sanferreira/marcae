import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
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

import { AppAvatar } from "@/components/AppAvatar";
import { AppointmentCard, STATUS_CONFIG } from "@/components/AppointmentCard";
import { PaginationBar } from "@/components/PaginationBar";
import {
  canClientChangeAppointment,
  CLIENT_APPOINTMENT_CHANGE_BLOCKED_NOTICE,
  CLIENT_APPOINTMENT_CHANGE_POLICY_NOTICE,
  getAppointmentDateTime,
} from "@/constants/appointmentPolicy";
import { useAuth } from "@/contexts/AuthContext";
import { Appointment, useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";
import { usePagination } from "@/hooks/usePagination";
import { addLocalDays, toLocalDateString } from "@/lib/dates";

type Filter = "upcoming" | "past" | "cancelled";

const DATES = Array.from({ length: 60 }, (_, i) => addLocalDays(i));

export default function AppointmentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ filter?: string | string[] }>();
  const {
    appointments,
    professionals,
    cancelAppointment,
    confirmAppointment,
    rescheduleAppointment,
    getAvailableSlots,
  } = useData();

  const [filter, setFilter] = useState<Filter>("upcoming");
  const [detail, setDetail] = useState<Appointment | null>(null);
  const [rescheduleApt, setRescheduleApt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date>(DATES[1]);
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [saving, setSaving] = useState(false);

  const topPad = insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const myApts = appointments
    .filter((apt) => apt.clientId === (user?.clientId ?? user?.id))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const today = toLocalDateString();
  const requestedFilter = Array.isArray(params.filter) ? params.filter[0] : params.filter;

  useEffect(() => {
    if (requestedFilter === "upcoming" || requestedFilter === "past" || requestedFilter === "cancelled") {
      setFilter(requestedFilter);
    }
  }, [requestedFilter]);

  const showMessage = (title: string, message: string) => {
    Alert.alert(title, message);
  };

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

  const filtered = myApts.filter((apt) => {
    if (filter === "upcoming") return apt.date >= today && (apt.status === "confirmed" || apt.status === "pending");
    if (filter === "past") return apt.status === "completed";
    return apt.status === "cancelled";
  });
  const appointmentsPage = usePagination(filtered, 10);

  const upcomingCount = myApts.filter((apt) =>
    apt.date >= today && (apt.status === "confirmed" || apt.status === "pending")).length;

  const runCancelAppointment = async (apt: Appointment) => {
    try {
      await cancelAppointment(apt.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDetail(null);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showMessage("Nao foi possivel cancelar", getErrorMessage(error, "Tente novamente em instantes."));
    }
  };

  const runConfirmAppointment = async (apt: Appointment) => {
    try {
      await confirmAppointment(apt.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDetail((current) => current?.id === apt.id ? { ...current, status: "confirmed" } : current);
      showMessage("Presenca confirmada", "O estabelecimento recebeu sua confirmacao.");
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showMessage("Nao foi possivel confirmar", getErrorMessage(error, "Tente novamente em instantes."));
    }
  };

  const handleCancel = (apt: Appointment) => {
    if (!canClientChangeAppointment(apt)) {
      showMessage("Prazo encerrado", CLIENT_APPOINTMENT_CHANGE_BLOCKED_NOTICE);
      return;
    }

    const aptDate = getAppointmentDateTime(apt.date, apt.time) ?? new Date(`${apt.date}T12:00:00`);
    const prompt = `Tem certeza que deseja cancelar o horario com ${apt.professionalName} em ${aptDate.toLocaleDateString("pt-BR")} as ${apt.time}?`;

    Alert.alert("Cancelar agendamento", prompt, [
      { text: "Manter", style: "cancel" },
      {
        text: "Cancelar agendamento",
        style: "destructive",
        onPress: () => { void runCancelAppointment(apt); },
      },
    ]);
  };

  const openReschedule = (apt: Appointment) => {
    if (!canClientChangeAppointment(apt)) {
      showMessage("Prazo encerrado", CLIENT_APPOINTMENT_CHANGE_BLOCKED_NOTICE);
      return;
    }

    setDetail(null);
    setRescheduleApt(apt);
    setRescheduleDate(DATES[1]);
    setRescheduleTime("");
  };

  const rescheduleDateStr = toLocalDateString(rescheduleDate);
  const availableSlots = rescheduleApt
    ? getAvailableSlots(rescheduleDateStr, rescheduleApt.professionalId, rescheduleApt.totalDuration)
      .filter((slot) => slot !== rescheduleApt.time || rescheduleDateStr !== rescheduleApt.date)
    : [];

  const confirmReschedule = async () => {
    if (!rescheduleApt || !rescheduleTime) return;

    setSaving(true);
    try {
      await rescheduleAppointment(rescheduleApt.id, rescheduleDateStr, rescheduleTime);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRescheduleApt(null);
      showMessage(
        "Reagendado!",
        `Seu novo horario e ${rescheduleDate.toLocaleDateString("pt-BR")} as ${rescheduleTime} com ${rescheduleApt.professionalName}.`,
      );
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showMessage("Nao foi possivel reagendar", getErrorMessage(error, "Tente outro horario ou outra data."));
    } finally {
      setSaving(false);
    }
  };

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "upcoming", label: `Proximos${upcomingCount > 0 ? ` (${upcomingCount})` : ""}` },
    { key: "past", label: "Concluidos" },
    { key: "cancelled", label: "Cancelados" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Meus Agendamentos</Text>
        <View style={styles.filterRow}>
          {FILTERS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.filterBtn, { backgroundColor: filter === item.key ? colors.gold : colors.secondary }]}
              onPress={() => {
                setFilter(item.key);
                appointmentsPage.setPage(1);
              }}
            >
              <Text style={[styles.filterText, { color: filter === item.key ? colors.goldForeground : colors.mutedForeground }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={appointmentsPage.data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: botPad + 100 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <AppointmentCard appointment={item} onPress={() => setDetail(item)} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="calendar" size={40} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {filter === "upcoming" ? "Nenhum agendamento proximo" : filter === "past" ? "Nenhum atendimento concluido" : "Nenhum cancelamento"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {filter === "upcoming" ? "Use o botao 'Agendar' na tela inicial para marcar um horario." : "Seus historicos aparecerao aqui."}
            </Text>
          </View>
        }
        ListFooterComponent={
          <PaginationBar
            page={appointmentsPage.page}
            totalPages={appointmentsPage.totalPages}
            totalItems={appointmentsPage.totalItems}
            pageSize={appointmentsPage.pageSize}
            onPageChange={appointmentsPage.setPage}
          />
        }
      />

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

            <ScrollView
              contentContainerStyle={[styles.detailContent, { paddingBottom: insets.bottom + 40 }]}
              showsVerticalScrollIndicator={false}
            >
              {(() => {
                const statusConfig = STATUS_CONFIG[detail.status];
                return (
                  <View style={[styles.statusBanner, { backgroundColor: statusConfig.color + "18", borderColor: statusConfig.color + "44" }]}>
                    <Feather name={statusConfig.icon} size={18} color={statusConfig.color} />
                    <Text style={[styles.statusBannerText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                  </View>
                );
              })()}

              <View style={[styles.profCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <AppAvatar
                  imageUri={professionals.find((professional) => professional.id === detail.professionalId)?.avatarImage}
                  fallback={detail.professionalName.split(" ").map((name) => name[0]).join("").slice(0, 2).toUpperCase()}
                  size={48}
                  backgroundColor={colors.gold}
                  textColor={colors.goldForeground}
                  fontSize={16}
                />
                <View>
                  <Text style={[styles.profName, { color: colors.foreground }]}>{detail.professionalName}</Text>
                  <Text style={[styles.profSub, { color: colors.mutedForeground }]}>Profissional</Text>
                </View>
              </View>

              <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {[
                  {
                    icon: "calendar" as const,
                    label: "Data",
                    value: new Date(`${detail.date}T12:00:00`).toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }),
                  },
                  { icon: "clock" as const, label: "Horario", value: `${detail.time} · ${detail.totalDuration} minutos` },
                  { icon: "scissors" as const, label: "Servicos", value: detail.services.map((service) => service.name).join(", ") },
                  ...(detail.paymentMethod ? [{ icon: "credit-card" as const, label: "Pagamento", value: detail.paymentMethod }] : []),
                  { icon: "hash" as const, label: "Codigo", value: `#${detail.id.slice(-6).toUpperCase()}` },
                ].map((row, index, rows) => (
                  <View
                    key={row.label}
                    style={[styles.infoRow, index < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                  >
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

              <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.breakdownTitle, { color: colors.foreground }]}>Resumo financeiro</Text>
                {detail.services.map((service, index, rows) => (
                  <View
                    key={service.id}
                    style={[styles.breakdownRow, index < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                  >
                    <Text style={[styles.breakdownName, { color: colors.foreground }]}>{service.name}</Text>
                    <Text style={[styles.breakdownDuration, { color: colors.mutedForeground }]}>{service.duration}min</Text>
                    <Text style={[styles.breakdownPrice, { color: colors.gold }]}>R${service.price}</Text>
                  </View>
                ))}
                <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
                  <Text style={[styles.totalValue, { color: colors.gold }]}>R${detail.totalPrice}</Text>
                </View>
              </View>

              {(detail.clientNotes || detail.professionalNotes) && (
                <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.breakdownTitle, { color: colors.foreground }]}>Observacoes</Text>
                  {!!detail.clientNotes && (
                    <View style={[styles.infoRow, { borderBottomColor: colors.border, borderBottomWidth: detail.professionalNotes ? 1 : 0 }]}>
                      <View style={[styles.infoIcon, { backgroundColor: colors.secondary }]}>
                        <Feather name="message-square" size={14} color={colors.gold} />
                      </View>
                      <View style={styles.infoText}>
                        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Enviadas por voce</Text>
                        <Text style={[styles.infoValue, { color: colors.foreground }]}>{detail.clientNotes}</Text>
                      </View>
                    </View>
                  )}
                  {!!detail.professionalNotes && (
                    <View style={styles.infoRow}>
                      <View style={[styles.infoIcon, { backgroundColor: colors.secondary }]}>
                        <Feather name="file-text" size={14} color={colors.gold} />
                      </View>
                      <View style={styles.infoText}>
                        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Ficha da sessao</Text>
                        <Text style={[styles.infoValue, { color: colors.foreground }]}>{detail.professionalNotes}</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {(() => {
                const isActive = detail.status === "confirmed" || detail.status === "pending";
                if (!isActive) return null;

                const canChange = canClientChangeAppointment(detail);
                const noticeColor = canChange ? colors.gold : colors.destructive;

                return (
                  <>
                    <View style={[styles.policyNotice, { backgroundColor: noticeColor + "12", borderColor: noticeColor + "44" }]}>
                      <Feather name={canChange ? "info" : "alert-circle"} size={15} color={noticeColor} />
                      <Text style={[styles.policyNoticeText, { color: noticeColor }]}>
                        {canChange ? CLIENT_APPOINTMENT_CHANGE_POLICY_NOTICE : CLIENT_APPOINTMENT_CHANGE_BLOCKED_NOTICE}
                      </Text>
                    </View>

                    {detail.status === "pending" && (
                      <TouchableOpacity
                        style={[styles.confirmPresenceBtn, { backgroundColor: colors.gold }]}
                        onPress={() => { void runConfirmAppointment(detail); }}
                      >
                        <Feather name="check-circle" size={15} color={colors.goldForeground} />
                        <Text style={[styles.confirmPresenceText, { color: colors.goldForeground }]}>Confirmar presenca</Text>
                      </TouchableOpacity>
                    )}

                    {canChange && (
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
                  </>
                );
              })()}
            </ScrollView>
          </View>
        )}
      </Modal>

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

            <ScrollView
              contentContainerStyle={[styles.rescheduleContent, { paddingBottom: insets.bottom + 120 }]}
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.currentPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="info" size={13} color={colors.mutedForeground} />
                <Text style={[styles.currentPillText, { color: colors.mutedForeground }]}>
                  Atual: {new Date(`${rescheduleApt.date}T12:00:00`).toLocaleDateString("pt-BR")} as {rescheduleApt.time} com {rescheduleApt.professionalName}
                </Text>
              </View>

              <Text style={[styles.pickLabel, { color: colors.foreground }]}>Escolha a nova data</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
                <View style={styles.dateRow}>
                  {DATES.map((date) => {
                    const dateStr = toLocalDateString(date);
                    const isSelected = dateStr === rescheduleDateStr;
                    const isToday = dateStr === today;
                    return (
                      <TouchableOpacity
                        key={dateStr}
                        style={[styles.dateChip, {
                          backgroundColor: isSelected ? colors.gold : colors.card,
                          borderColor: isSelected ? colors.gold : colors.border,
                        }]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setRescheduleDate(date);
                          setRescheduleTime("");
                        }}
                      >
                        <Text style={[styles.dateChipDay, { color: isSelected ? colors.goldForeground : colors.mutedForeground }]}>
                          {isToday ? "Hoje" : date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase()}
                        </Text>
                        <Text style={[styles.dateChipNum, { color: isSelected ? colors.goldForeground : colors.foreground }]}>
                          {date.getDate()}
                        </Text>
                        <Text style={[styles.dateChipMonth, { color: isSelected ? `${colors.goldForeground}99` : colors.mutedForeground }]}>
                          {date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <Text style={[styles.pickLabel, { color: colors.foreground, marginTop: 20 }]}>Escolha o horario</Text>
              {availableSlots.length === 0 ? (
                <View style={styles.noSlots}>
                  <Feather name="x-circle" size={28} color={colors.border} />
                  <Text style={[styles.noSlotsText, { color: colors.mutedForeground }]}>
                    Nenhum horario disponivel nessa data
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
                      onPress={() => {
                        Haptics.selectionAsync();
                        setRescheduleTime(slot);
                      }}
                    >
                      <Text style={[styles.slotText, { color: rescheduleTime === slot ? colors.goldForeground : colors.foreground }]}>
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={[styles.confirmBar, { borderTopColor: colors.border, paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
              {rescheduleTime !== "" && (
                <View style={[styles.selectedSummary, { backgroundColor: colors.gold + "18", borderColor: colors.gold + "44" }]}>
                  <Feather name="check-circle" size={14} color={colors.gold} />
                  <Text style={[styles.selectedSummaryText, { color: colors.gold }]}>
                    {rescheduleDate.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })} as {rescheduleTime}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: rescheduleTime ? colors.gold : colors.secondary }]}
                onPress={confirmReschedule}
                disabled={!rescheduleTime || saving}
              >
                <Feather name="calendar" size={16} color={rescheduleTime ? colors.goldForeground : colors.mutedForeground} />
                <Text style={[styles.confirmBtnText, { color: rescheduleTime ? colors.goldForeground : colors.mutedForeground }]}>
                  {saving ? "Reagendando..." : "Confirmar novo horario"}
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
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
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
  policyNotice: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  policyNoticeText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 18 },
  confirmPresenceBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  confirmPresenceText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  actionRow: { flexDirection: "row", gap: 10 },
  detailActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  detailActionText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  rescheduleContent: { padding: 20 },
  currentPill: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
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
  confirmBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  selectedSummary: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 12, borderWidth: 1 },
  selectedSummaryText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  confirmBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
