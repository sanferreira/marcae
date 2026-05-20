import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { STATUS_CONFIG } from "@/components/AppointmentCard";
import { PaginationBar } from "@/components/PaginationBar";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";
import { usePagination } from "@/hooks/usePagination";
import { addLocalDays, toLocalDateString } from "@/lib/dates";

const DATES = Array.from({ length: 33 }, (_, i) => addLocalDays(i - 3));

type StatusFilter = "all" | "pending" | "confirmed" | "completed" | "cancelled";

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendentes" },
  { key: "confirmed", label: "Confirmados" },
  { key: "completed", label: "Concluidos" },
  { key: "cancelled", label: "Cancelados" },
];

export default function EmployeeAgendaScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { appointments } = useData();

  const [selectedDate, setSelectedDate] = useState<Date>(addLocalDays(0));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const topPad = insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const profId = user?.professionalId;
  const dateStr = toLocalDateString(selectedDate);
  const today = toLocalDateString();

  const dayAppointments = useMemo(() =>
    appointments
      .filter((a) => a.professionalId === profId && a.date === dateStr)
      .sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, profId, dateStr]
  );

  const completed = dayAppointments.filter((a) => a.status === "completed");
  const dayRevenue = completed.reduce((s, a) => s + a.totalPrice, 0);
  const visibleAppointments = statusFilter === "all"
    ? dayAppointments
    : dayAppointments.filter((appointment) => appointment.status === statusFilter);
  const appointmentsPage = usePagination(visibleAppointments, 8);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Minha Agenda</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Veja todos os seus atendimentos por dia
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
          {DATES.map((d) => {
            const dStr = toLocalDateString(d);
            const isSelected = dStr === dateStr;
            const isToday = dStr === today;
            const dayApts = appointments.filter((a) => a.professionalId === profId && a.date === dStr && a.status !== "cancelled");
            const count = dayApts.length;
            return (
              <TouchableOpacity
                key={dStr}
                style={[styles.dateChip, {
                  backgroundColor: isSelected ? colors.gold : colors.card,
                  borderColor: isSelected ? colors.gold : isToday ? colors.gold + "55" : colors.border,
                }]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedDate(d);
                  appointmentsPage.setPage(1);
                }}
              >
                <Text style={[styles.dateChipDay, { color: isSelected ? colors.goldForeground : colors.mutedForeground }]}>
                  {d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase()}
                </Text>
                <Text style={[styles.dateChipNum, { color: isSelected ? colors.goldForeground : colors.foreground }]}>
                  {d.getDate()}
                </Text>
                {count > 0 && (
                  <View style={[styles.countDot, { backgroundColor: isSelected ? colors.goldForeground : colors.gold }]}>
                    <Text style={[styles.countDotText, { color: isSelected ? colors.gold : colors.goldForeground }]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: botPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Day header */}
        <View style={styles.dayHeader}>
          <View>
            <Text style={[styles.dayTitle, { color: colors.foreground }]}>
              {selectedDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </Text>
            <Text style={[styles.daySub, { color: colors.mutedForeground }]}>
              {dayAppointments.length} atendimento{dayAppointments.length !== 1 ? "s" : ""} · R${dayRevenue} faturado
            </Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {STATUS_FILTERS.map((item) => {
            const selected = statusFilter === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.filterBtn, { backgroundColor: selected ? colors.gold : colors.card, borderColor: selected ? colors.gold : colors.border }]}
                onPress={() => {
                  setStatusFilter(item.key);
                  appointmentsPage.setPage(1);
                }}
              >
                <Text style={[styles.filterText, { color: selected ? colors.goldForeground : colors.mutedForeground }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {visibleAppointments.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="calendar" size={36} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Nenhum atendimento neste dia
            </Text>
          </View>
        ) : (
          appointmentsPage.data.map((apt) => {
            const sc = STATUS_CONFIG[apt.status];
            return (
              <View key={apt.id} style={[styles.timelineRow]}>
                <View style={styles.timelineLeft}>
                  <Text style={[styles.timeBig, { color: colors.foreground }]}>{apt.time}</Text>
                  <Text style={[styles.duration, { color: colors.mutedForeground }]}>{apt.totalDuration}min</Text>
                </View>
                <View style={[styles.timelineLine, { backgroundColor: sc.color }]} />
                <View style={[styles.timelineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.timelineHeader}>
                    <Text style={[styles.timelineClient, { color: colors.foreground }]}>{apt.clientName}</Text>
                    <View style={[styles.statusPill, { backgroundColor: sc.color + "22" }]}>
                      <Feather name={sc.icon} size={10} color={sc.color} />
                      <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
                    </View>
                  </View>
                  <Text style={[styles.timelineSvc, { color: colors.mutedForeground }]}>
                    {apt.services.map((s) => s.name).join(" + ")}
                  </Text>
                  <View style={styles.timelineFooter}>
                    <Text style={[styles.timelinePrice, { color: colors.gold }]}>R${apt.totalPrice}</Text>
                    {apt.paymentMethod && (
                      <Text style={[styles.timelinePay, { color: colors.mutedForeground }]}>· {apt.paymentMethod}</Text>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
        <PaginationBar
          page={appointmentsPage.page}
          totalPages={appointmentsPage.totalPages}
          totalItems={appointmentsPage.totalItems}
          pageSize={appointmentsPage.pageSize}
          onPageChange={appointmentsPage.setPage}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, gap: 4 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 12 },
  dateScroll: { flexDirection: "row", gap: 8, paddingRight: 20 },
  dateChip: { width: 54, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, alignItems: "center", gap: 2, position: "relative" },
  dateChipDay: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  dateChipNum: { fontSize: 18, fontFamily: "Inter_700Bold" },
  countDot: { position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, alignItems: "center", justifyContent: "center" },
  countDotText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  list: { padding: 20 },
  dayHeader: { marginBottom: 16 },
  dayTitle: { fontSize: 17, fontFamily: "Inter_700Bold", textTransform: "capitalize" },
  daySub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  filterRow: { flexDirection: "row", gap: 8, paddingRight: 20, marginBottom: 16 },
  filterBtn: { minHeight: 34, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  filterText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", paddingVertical: 50, gap: 10 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  timelineRow: { flexDirection: "row", gap: 12, marginBottom: 14, alignItems: "stretch" },
  timelineLeft: { width: 48, alignItems: "flex-end", paddingTop: 12 },
  timeBig: { fontSize: 15, fontFamily: "Inter_700Bold" },
  duration: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  timelineLine: { width: 3, borderRadius: 2 },
  timelineCard: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, gap: 6 },
  timelineHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  timelineClient: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  timelineSvc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  timelineFooter: { flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 2 },
  timelinePrice: { fontSize: 14, fontFamily: "Inter_700Bold" },
  timelinePay: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
