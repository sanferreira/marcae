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
import { useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";

const DAYS = Array.from({ length: 14 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i - 3);
  return d;
});

export default function AgendaScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { appointments, updateAppointmentStatus, cancelAppointment } = useData();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = selectedDate.toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];

  const dayApts = appointments
    .filter((a) => a.date === dateStr)
    .sort((a, b) => a.time.localeCompare(b.time));

  const pendingCount = dayApts.filter(
    (a) => a.status === "confirmed" || a.status === "pending"
  ).length;

  const handleComplete = (id: string) => {
    Alert.alert("Concluir atendimento", "Forma de pagamento:", [
      { text: "Cancelar", style: "cancel" },
      { text: "PIX", onPress: () => updateAppointmentStatus(id, "completed", "PIX") },
      { text: "Dinheiro", onPress: () => updateAppointmentStatus(id, "completed", "Dinheiro") },
      { text: "Cartão de Crédito", onPress: () => updateAppointmentStatus(id, "completed", "Cartão de Crédito") },
      { text: "Cartão de Débito", onPress: () => updateAppointmentStatus(id, "completed", "Cartão de Débito") },
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
              <Text style={styles.badgeText}>{pendingCount}</Text>
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
                  onPress={() => setSelectedDate(d)}
                >
                  <Text
                    style={[
                      styles.dateChipDay,
                      { color: isSelected ? "#0C0C0C" : isToday ? colors.gold : colors.mutedForeground },
                    ]}
                  >
                    {d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").slice(0, 3).toUpperCase()}
                  </Text>
                  <Text
                    style={[
                      styles.dateChipNum,
                      { color: isSelected ? "#0C0C0C" : colors.foreground },
                    ]}
                  >
                    {d.getDate()}
                  </Text>
                  {dayApts.length > 0 && ds === dateStr && (
                    <View style={[styles.dot, { backgroundColor: isSelected ? "#0C0C0C" : colors.gold }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <FlatList
        data={dayApts}
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
                ? () =>
                    Alert.alert("Cancelar", "Deseja cancelar?", [
                      { text: "Não", style: "cancel" },
                      { text: "Sim", style: "destructive", onPress: () => cancelAppointment(item.id) },
                    ])
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
