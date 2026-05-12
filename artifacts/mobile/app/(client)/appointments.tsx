import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppointmentCard } from "@/components/AppointmentCard";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";

type Filter = "upcoming" | "past" | "cancelled";

export default function AppointmentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { appointments, cancelAppointment } = useData();
  const [filter, setFilter] = useState<Filter>("upcoming");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const myApts = appointments.filter((a) => a.clientId === user?.id);
  const today = new Date().toISOString().split("T")[0];

  const filtered = myApts.filter((a) => {
    if (filter === "upcoming")
      return (a.date >= today) && (a.status === "confirmed" || a.status === "pending");
    if (filter === "past") return a.status === "completed";
    return a.status === "cancelled";
  });

  const handleCancel = (id: string) => {
    Alert.alert(
      "Cancelar agendamento",
      "Tem certeza que deseja cancelar?",
      [
        { text: "Não", style: "cancel" },
        {
          text: "Sim, cancelar",
          style: "destructive",
          onPress: () => cancelAppointment(id),
        },
      ]
    );
  };

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "upcoming", label: "Próximos" },
    { key: "past", label: "Concluídos" },
    { key: "cancelled", label: "Cancelados" },
  ];

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
        <Text style={[styles.title, { color: colors.foreground }]}>Meus Agendamentos</Text>
        <View style={[styles.filterRow]}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterBtn,
                {
                  backgroundColor: filter === f.key ? colors.gold : colors.secondary,
                },
              ]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: filter === f.key ? "#0C0C0C" : colors.mutedForeground },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: botPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <AppointmentCard
            appointment={item}
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
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Nenhum agendamento encontrado
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
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  filterRow: { flexDirection: "row", gap: 8 },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  list: { padding: 20, gap: 4 },
  empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
