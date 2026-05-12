import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Client, useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";

export default function ClientsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { clients, loyaltyInfo } = useData();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Client | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  if (selected) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.detailHeader,
            { paddingTop: topPad + 16, borderBottomColor: colors.border },
          ]}
        >
          <TouchableOpacity onPress={() => setSelected(null)}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.detailTitle, { color: colors.foreground }]}>
            Detalhes do Cliente
          </Text>
          <View style={{ width: 22 }} />
        </View>
        <FlatList
          data={[selected]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.detailContent,
            { paddingBottom: botPad + 100 },
          ]}
          renderItem={() => (
            <>
              <View style={[styles.clientDetailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.clientAvatar, { backgroundColor: colors.gold }]}>
                  <Text style={styles.clientAvatarText}>
                    {selected.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.clientDetailName, { color: colors.foreground }]}>
                  {selected.name}
                </Text>
                <View style={styles.contactRow}>
                  <Feather name="phone" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.contactText, { color: colors.mutedForeground }]}>
                    {selected.phone}
                  </Text>
                </View>
                <View style={styles.contactRow}>
                  <Feather name="mail" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.contactText, { color: colors.mutedForeground }]}>
                    {selected.email}
                  </Text>
                </View>
              </View>

              <View style={styles.statsGrid}>
                {[
                  { label: "Total gasto", value: `R$${selected.totalSpent}`, icon: "dollar-sign" as const },
                  { label: "Atendimentos", value: selected.appointmentsCount.toString(), icon: "scissors" as const },
                  { label: "Pontos fidelidade", value: selected.loyaltyPoints.toString(), icon: "award" as const },
                  { label: "Última visita", value: selected.lastVisit ? new Date(selected.lastVisit + "T12:00:00").toLocaleDateString("pt-BR") : "N/A", icon: "calendar" as const },
                ].map((stat) => (
                  <View key={stat.label} style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Feather name={stat.icon} size={16} color={colors.gold} />
                    <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.loyaltyBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.loyaltyBarRow}>
                  <Text style={[styles.loyaltyBarLabel, { color: colors.foreground }]}>Programa de Fidelidade</Text>
                  <Text style={[styles.loyaltyBarValue, { color: colors.gold }]}>
                    {selected.loyaltyPoints}/{loyaltyInfo.requiredPoints}
                  </Text>
                </View>
                <View style={[styles.loyaltyTrack, { backgroundColor: colors.secondary }]}>
                  <View
                    style={[
                      styles.loyaltyFill,
                      {
                        backgroundColor: colors.gold,
                        width: `${(selected.loyaltyPoints / loyaltyInfo.requiredPoints) * 100}%` as any,
                      },
                    ]}
                  />
                </View>
              </View>

              {selected.notes && (
                <View style={[styles.notesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.notesTitle, { color: colors.foreground }]}>Observações</Text>
                  <Text style={[styles.notesText, { color: colors.mutedForeground }]}>{selected.notes}</Text>
                </View>
              )}
            </>
          )}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 16, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          Clientes ({clients.length})
        </Text>
        <View
          style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Buscar clientes..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: botPad + 100 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.clientCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setSelected(item)}
            activeOpacity={0.8}
          >
            <View style={[styles.avatar, { backgroundColor: colors.gold + "22" }]}>
              <Text style={[styles.avatarText, { color: colors.gold }]}>
                {item.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.clientInfo}>
              <Text style={[styles.clientName, { color: colors.foreground }]}>{item.name}</Text>
              <Text style={[styles.clientPhone, { color: colors.mutedForeground }]}>{item.phone}</Text>
              <View style={styles.clientMeta}>
                <Text style={[styles.clientMetaText, { color: colors.mutedForeground }]}>
                  {item.appointmentsCount} visitas · R${item.totalSpent} total
                </Text>
              </View>
            </View>
            <View style={styles.clientRight}>
              <View style={[styles.loyaltyPill, { backgroundColor: colors.gold + "22" }]}>
                <Feather name="award" size={10} color={colors.gold} />
                <Text style={[styles.loyaltyPillText, { color: colors.gold }]}>
                  {item.loyaltyPoints}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={40} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Nenhum cliente encontrado
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
    gap: 14,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  list: { padding: 20, gap: 4 },
  clientCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  clientInfo: { flex: 1, gap: 3 },
  clientName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  clientPhone: { fontSize: 12, fontFamily: "Inter_400Regular" },
  clientMeta: { marginTop: 2 },
  clientMetaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  clientRight: { alignItems: "flex-end", gap: 8 },
  loyaltyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  loyaltyPillText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  detailTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  detailContent: { padding: 20, gap: 16 },
  clientDetailCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
  },
  clientAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  clientAvatarText: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#0C0C0C" },
  clientDetailName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  contactText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statBox: {
    flex: 1,
    minWidth: "45%",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  loyaltyBar: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 10 },
  loyaltyBarRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  loyaltyBarLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  loyaltyBarValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  loyaltyTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  loyaltyFill: { height: "100%", borderRadius: 4 },
  notesCard: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 8 },
  notesTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  notesText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
});
