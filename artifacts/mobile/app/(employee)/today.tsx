import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppAvatar } from "@/components/AppAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { Appointment, useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";
import { toLocalDateString } from "@/lib/dates";
import { typedInputProps } from "@/lib/inputProps";

const PAY_METHODS = ["Dinheiro", "PIX", "Cartão de Débito", "Cartão de Crédito", "Pacote"];

export default function EmployeeTodayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, barbershop } = useAuth();
  const { appointments, professionals, updateAppointmentStatus, cancelAppointment, updateAppointmentNotes } = useData();

  const [completing, setCompleting] = useState<Appointment | null>(null);
  const [payMethod, setPayMethod] = useState("");
  const [professionalNotes, setProfessionalNotes] = useState("");

  const topPad = insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const profId = user?.professionalId;
  const me = useMemo(() => professionals.find((p) => p.id === profId), [professionals, profId]);
  const today = toLocalDateString();

  const myToday = useMemo(() =>
    appointments
      .filter((a) => a.professionalId === profId && a.date === today)
      .sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, profId, today]
  );

  const myWeek = useMemo(() => {
    const start = new Date(); start.setDate(start.getDate() - 7);
    return appointments.filter((a) =>
      a.professionalId === profId &&
      a.status === "completed" &&
      new Date(a.date + "T12:00:00") >= start
    );
  }, [appointments, profId]);

  const todayConfirmed = myToday.filter((a) => a.status === "confirmed" || a.status === "pending");
  const todayDone = myToday.filter((a) => a.status === "completed");
  const todayRevenue = todayDone.reduce((s, a) => s + a.totalPrice, 0);
  const weekRevenue = myWeek.reduce((s, a) => s + a.totalPrice, 0);
  const weekCount = myWeek.length;
  const commissionPct = me?.commissionRate ?? 50;
  const todayCommission = Math.round(todayRevenue * (commissionPct / 100));
  const weekCommission = Math.round(weekRevenue * (commissionPct / 100));

  const openComplete = (apt: Appointment) => {
    setCompleting(apt);
    setPayMethod("");
    setProfessionalNotes(apt.professionalNotes ?? "");
  };

  const confirmComplete = async () => {
    if (!completing || !payMethod) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (professionalNotes.trim()) {
      await updateAppointmentNotes(completing.id, professionalNotes.trim());
    }
    await updateAppointmentStatus(completing.id, "completed", payMethod);
    setCompleting(null);
  };

  const handleCancel = (apt: Appointment) => {
    Alert.alert("Cancelar atendimento", `Cancelar o horário de ${apt.clientName} às ${apt.time}?`, [
      { text: "Voltar", style: "cancel" },
      { text: "Cancelar", style: "destructive", onPress: async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        await cancelAppointment(apt.id);
      }},
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: botPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
              Olá, {user?.name.split(" ")[0]}
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Sua agenda de hoje</Text>
            {barbershop && (
              <Text style={[styles.shopHint, { color: colors.mutedForeground }]}>
                {barbershop.name}
              </Text>
            )}
          </View>
          <AppAvatar
            imageUri={me?.avatarImage ?? user?.avatarImage}
            fallback={me?.avatar ?? user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? ""}
            size={50}
            backgroundColor={colors.gold}
            textColor={colors.primaryForeground}
            fontSize={16}
          />
        </View>

        {/* Today Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="calendar" size={16} color={colors.gold} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{myToday.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Atendimentos</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="check-circle" size={16} color={"#22C55E"} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{todayDone.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Concluídos</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="dollar-sign" size={16} color={colors.gold} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>R${todayRevenue}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Receita</Text>
          </View>
        </View>

        {/* Commission summary */}
        <View style={[styles.commissionCard, { backgroundColor: colors.gold + "12", borderColor: colors.gold + "55" }]}>
          <View style={styles.commissionHeader}>
            <Feather name="award" size={16} color={colors.gold} />
            <Text style={[styles.commissionTitle, { color: colors.foreground }]}>Sua comissão</Text>
            <View style={[styles.commissionPctBadge, { backgroundColor: colors.gold }]}>
              <Text style={[styles.commissionPctText, { color: colors.primaryForeground }]}>{commissionPct}%</Text>
            </View>
          </View>
          <View style={styles.commissionRow}>
            <View style={styles.commissionItem}>
              <Text style={[styles.commissionVal, { color: colors.gold }]}>R${todayCommission}</Text>
              <Text style={[styles.commissionLabel, { color: colors.mutedForeground }]}>Hoje</Text>
            </View>
            <View style={[styles.commissionSep, { backgroundColor: colors.gold + "44" }]} />
            <View style={styles.commissionItem}>
              <Text style={[styles.commissionVal, { color: colors.foreground }]}>R${weekCommission}</Text>
              <Text style={[styles.commissionLabel, { color: colors.mutedForeground }]}>Últimos 7 dias</Text>
            </View>
            <View style={[styles.commissionSep, { backgroundColor: colors.gold + "44" }]} />
            <View style={styles.commissionItem}>
              <Text style={[styles.commissionVal, { color: colors.foreground }]}>{weekCount}</Text>
              <Text style={[styles.commissionLabel, { color: colors.mutedForeground }]}>Atendimentos sem.</Text>
            </View>
          </View>
        </View>

        {/* Up next */}
        {todayConfirmed.length > 0 && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Próximos atendimentos</Text>
            {todayConfirmed.map((apt) => (
              <View key={apt.id} style={[styles.aptCard, { backgroundColor: colors.card, borderColor: colors.gold + "33" }]}>
                <View style={[styles.aptStripe, { backgroundColor: colors.gold }]} />
                <View style={styles.aptHeader}>
                  <View style={[styles.timeBox, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.timeText, { color: colors.gold }]}>{apt.time}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.clientName, { color: colors.foreground }]}>{apt.clientName}</Text>
                    <Text style={[styles.svcText, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {apt.services.map((s) => s.name).join(" + ")}
                    </Text>
                    <View style={styles.aptMeta}>
                      <Feather name="clock" size={11} color={colors.mutedForeground} />
                      <Text style={[styles.aptMetaText, { color: colors.mutedForeground }]}>{apt.totalDuration} min</Text>
                      <Text style={[styles.aptMetaDot, { color: colors.border }]}>·</Text>
                      <Text style={[styles.aptPrice, { color: colors.gold }]}>R${apt.totalPrice}</Text>
                    </View>
                    {!!apt.clientNotes && (
                      <Text style={[styles.clientNote, { color: colors.mutedForeground }]} numberOfLines={2}>
                        Obs: {apt.clientNotes}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={[styles.aptActions, { borderTopColor: colors.border }]}>
                  <TouchableOpacity style={[styles.aptBtn, { borderColor: colors.destructive + "55" }]} onPress={() => handleCancel(apt)}>
                    <Feather name="x" size={14} color={colors.destructive} />
                    <Text style={[styles.aptBtnText, { color: colors.destructive }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.aptBtnPrimary, { backgroundColor: colors.gold }]} onPress={() => openComplete(apt)}>
                    <Feather name="check" size={14} color={colors.primaryForeground} />
                    <Text style={[styles.aptBtnPrimaryText, { color: colors.primaryForeground }]}>Concluir atendimento</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Done */}
        {todayDone.length > 0 && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Concluídos hoje</Text>
            {todayDone.map((apt) => (
              <View key={apt.id} style={[styles.aptCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: 0.85 }]}>
                <View style={styles.aptHeader}>
                  <View style={[styles.timeBox, { backgroundColor: "#22C55E22" }]}>
                    <Feather name="check" size={16} color="#22C55E" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.clientName, { color: colors.foreground }]}>{apt.clientName}</Text>
                    <Text style={[styles.svcText, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {apt.time} · {apt.services.map((s) => s.name).join(", ")}
                    </Text>
                    {apt.paymentMethod && (
                      <Text style={[styles.paidText, { color: colors.mutedForeground }]}>Pago via {apt.paymentMethod}</Text>
                    )}
                  </View>
                  <Text style={[styles.aptPrice, { color: colors.gold }]}>R${apt.totalPrice}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {myToday.length === 0 && (
          <View style={styles.empty}>
            <Feather name="coffee" size={40} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Dia tranquilo!</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Você não tem atendimentos marcados para hoje. Aproveite para descansar.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Complete modal */}
      <Modal visible={!!completing} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCompleting(null)}>
        {completing && (
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setCompleting(null)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Concluir atendimento</Text>
              <View style={{ width: 22 }} />
            </View>
            <ScrollView contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 30 }]}>
              <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.summaryLine, { color: colors.foreground }]}>{completing.clientName}</Text>
                <Text style={[styles.summaryHint, { color: colors.mutedForeground }]}>
                  {completing.time} · {completing.services.map((s) => s.name).join(", ")}
                </Text>
                <Text style={[styles.summaryPrice, { color: colors.gold }]}>R${completing.totalPrice}</Text>
              </View>
              <Text style={[styles.payLabel, { color: colors.foreground }]}>Forma de pagamento</Text>
              {PAY_METHODS.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.payOption, { borderColor: payMethod === m ? colors.gold : colors.border, backgroundColor: payMethod === m ? colors.gold + "18" : colors.card }]}
                  onPress={() => { Haptics.selectionAsync(); setPayMethod(m); }}
                >
                  <Feather name={payMethod === m ? "check-circle" : "circle"} size={18} color={payMethod === m ? colors.gold : colors.mutedForeground} />
                  <Text style={[styles.payOptionText, { color: colors.foreground }]}>{m}</Text>
                </TouchableOpacity>
              ))}
              <Text style={[styles.payLabel, { color: colors.foreground }]}>Ficha da sessao</Text>
              <TextInput
                style={[styles.notesInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                value={professionalNotes}
                onChangeText={setProfessionalNotes}
                placeholder="Resumo, materiais usados, restricoes, retorno ou evolucao do cliente"
                placeholderTextColor={colors.mutedForeground}
                multiline
                {...typedInputProps("text")}
              />
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: payMethod ? colors.gold : colors.secondary }]}
                onPress={confirmComplete}
                disabled={!payMethod}
              >
                <Feather name="check" size={16} color={payMethod ? colors.primaryForeground : colors.mutedForeground} />
                <Text style={[styles.confirmBtnText, { color: payMethod ? colors.primaryForeground : colors.mutedForeground }]}>
                  Confirmar conclusão
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 2 },
  shopHint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, alignItems: "flex-start", padding: 14, borderRadius: 14, borderWidth: 1, gap: 4 },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  commissionCard: { borderRadius: 16, borderWidth: 1.5, padding: 16, gap: 12 },
  commissionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  commissionTitle: { flex: 1, fontSize: 14, fontFamily: "Inter_700Bold" },
  commissionPctBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  commissionPctText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  commissionRow: { flexDirection: "row", alignItems: "center" },
  commissionItem: { flex: 1, alignItems: "center", gap: 2 },
  commissionVal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  commissionLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  commissionSep: { width: 1, height: 30, marginHorizontal: 6 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 10 },
  aptCard: { borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: "hidden" },
  aptStripe: { height: 3, width: "100%" },
  aptHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  timeBox: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, alignItems: "center", justifyContent: "center", minWidth: 56 },
  timeText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  clientName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  svcText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  clientNote: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 5, lineHeight: 15 },
  aptMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  aptMetaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  aptMetaDot: { fontSize: 12 },
  aptPrice: { fontSize: 14, fontFamily: "Inter_700Bold" },
  paidText: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  aptActions: { flexDirection: "row", borderTopWidth: 1, padding: 10, gap: 8 },
  aptBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5 },
  aptBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  aptBtnPrimary: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11, borderRadius: 10 },
  aptBtnPrimaryText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", paddingVertical: 50, gap: 10, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  modalContent: { padding: 20, gap: 12 },
  summary: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 4 },
  summaryLine: { fontSize: 16, fontFamily: "Inter_700Bold" },
  summaryHint: { fontSize: 13, fontFamily: "Inter_400Regular" },
  summaryPrice: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 4 },
  payLabel: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 6, marginBottom: 4 },
  payOption: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1.5 },
  payOptionText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  notesInput: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, minHeight: 92, fontSize: 14, fontFamily: "Inter_400Regular", textAlignVertical: "top" },
  confirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 10 },
  confirmBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
