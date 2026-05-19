import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppointmentCard } from "@/components/AppointmentCard";
import { PaginationBar } from "@/components/PaginationBar";
import { useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";
import { usePagination } from "@/hooks/usePagination";

const DAYS = Array.from({ length: 14 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i - 3);
  return d;
});

const PAY_METHODS = ["PIX", "Dinheiro", "Cartao de Credito", "Cartao de Debito", "Pacote"];
type StatusFilter = "all" | "pending" | "confirmed" | "completed" | "cancelled";

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendentes" },
  { key: "confirmed", label: "Confirmados" },
  { key: "completed", label: "Concluidos" },
  { key: "cancelled", label: "Cancelados" },
];

export default function AgendaScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { appointments, updateAppointmentStatus, cancelAppointment } = useData();

  const topPad = insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const dateStr = selectedDate.toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];

  const dayApts = appointments
    .filter((a) => a.date === dateStr)
    .sort((a, b) => a.time.localeCompare(b.time));

  const pendingCount = dayApts.filter(
    (a) => a.status === "confirmed" || a.status === "pending"
  ).length;
  const filteredApts = statusFilter === "all"
    ? dayApts
    : dayApts.filter((appointment) => appointment.status === statusFilter);
  const appointmentsPage = usePagination(filteredApts, 10);

  const normalizePayment = (value: string | null) => {
    const normalized = value?.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") ?? "";
    if (!normalized) return null;
    if (normalized.includes("pix")) return "PIX";
    if (normalized.includes("pacote")) return "Pacote";
    if (normalized.includes("dinheiro")) return "Dinheiro";
    if (normalized.includes("debito")) return "Cartao de Debito";
    if (normalized.includes("credito") || normalized.includes("cartao")) return "Cartao de Credito";
    return null;
  };

  const handleComplete = (id: string) => {
    Alert.alert("Concluir atendimento", "Forma de pagamento:", [
      { text: "Cancelar", style: "cancel" },
      ...PAY_METHODS.map((method) => ({
        text: method,
        onPress: () => { void updateAppointmentStatus(id, "completed", method); },
      })),
    ]);
  };

  const handleCancel = (id: string) => {
    Alert.alert("Cancelar", "Deseja cancelar?", [
      { text: "Nao", style: "cancel" },
      { text: "Sim", style: "destructive", onPress: () => { void cancelAppointment(id); } },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 16,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Agenda</Text>
          {pendingCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.gold }]}>
              <Text style={[styles.badgeText, { color: colors.goldForeground }]}>{pendingCount}</Text>
            </View>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.dateRow}>
            {DAYS.map((d) => {
              const ds = d.toISOString().split("T")[0];
              const isSelected = ds === dateStr;
              const isToday = ds === today;
              return (
                <TouchableOpacity
                  key={ds}
                  style={[
                    styles.dateChip,
                    {
                      backgroundColor: isSelected ? colors.gold : colors.card,
                      borderColor: isToday && !isSelected ? colors.gold : isSelected ? colors.gold : colors.border,
                    },
                  ]}
                  onPress={() => {
                    setSelectedDate(d);
                    appointmentsPage.setPage(1);
                  }}
                >
                  <Text
                    style={[
                      styles.dateChipDay,
                      { color: isSelected ? colors.goldForeground : isToday ? colors.gold : colors.mutedForeground },
                    ]}
                  >
                    {d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").slice(0, 3).toUpperCase()}
                  </Text>
                  <Text
                    style={[
                      styles.dateChipNum,
                      { color: isSelected ? colors.goldForeground : colors.foreground },
                    ]}
                  >
                    {d.getDate()}
                  </Text>
                  {dayApts.length > 0 && ds === dateStr && (
                    <View style={[styles.dot, { backgroundColor: isSelected ? colors.goldForeground : colors.gold }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
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
          </View>
        </ScrollView>
      </View>

      <FlatList
        data={appointmentsPage.data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: botPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <AppointmentCard
            appointment={item}
            isAdmin
            onComplete={
              item.status === "confirmed" || item.status === "pending"
                ? () => handleComplete(item.id)
                : undefined
            }
            onCancel={
              item.status === "confirmed" || item.status === "pending"
                ? () => handleCancel(item.id)
                : undefined
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="calendar" size={40} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Dia livre
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Nenhum agendamento para este dia
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#0C0C0C" },
  dateRow: { flexDirection: "row", gap: 8 },
  filterRow: { flexDirection: "row", gap: 8, paddingRight: 20 },
  filterBtn: { minHeight: 34, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  filterText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  dateChip: {
    width: 54,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    gap: 3,
  },
  dateChipDay: { fontSize: 10, fontFamily: "Inter_500Medium" },
  dateChipNum: { fontSize: 18, fontFamily: "Inter_700Bold" },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 1,
  },
  list: { padding: 20 },
  empty: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
