import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";

type Period = "day" | "week" | "month";

export default function FinancialScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { cashEntries, appointments } = useData();
  const [period, setPeriod] = useState<Period>("month");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const monthStr = todayStr.slice(0, 7);

  const filterByPeriod = (date: string) => {
    if (period === "day") return date === todayStr;
    if (period === "week") return date >= weekStart.toISOString().split("T")[0];
    return date.startsWith(monthStr);
  };

  const periodEntries = cashEntries.filter((e) => filterByPeriod(e.date));
  const income = periodEntries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const expenses = periodEntries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
  const profit = income - expenses;

  const periodApts = appointments.filter(
    (a) => a.status === "completed" && filterByPeriod(a.date)
  );

  const byPayment: Record<string, number> = {};
  periodApts.forEach((a) => {
    const pm = a.paymentMethod ?? "Outro";
    byPayment[pm] = (byPayment[pm] ?? 0) + a.totalPrice;
  });

  const byProfessional: Record<string, number> = {};
  periodApts.forEach((a) => {
    byProfessional[a.professionalName] = (byProfessional[a.professionalName] ?? 0) + a.totalPrice;
  });

  const PERIODS: { key: Period; label: string }[] = [
    { key: "day", label: "Hoje" },
    { key: "week", label: "7 dias" },
    { key: "month", label: "Mês" },
  ];

  const PM_ICONS: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
    PIX: "zap",
    Dinheiro: "dollar-sign",
    "Cartão de Crédito": "credit-card",
    "Cartão de Débito": "credit-card",
    Cartão: "credit-card",
    Outro: "help-circle",
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 16, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Financeiro</Text>
        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.periodBtn,
                { backgroundColor: period === p.key ? colors.gold : colors.secondary },
              ]}
              onPress={() => setPeriod(p.key)}
            >
              <Text
                style={[
                  styles.periodText,
                  { color: period === p.key ? "#0C0C0C" : colors.mutedForeground },
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={periodEntries.slice(0, 20)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 100 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: "#16A34A22", borderColor: "#16A34A44" }]}>
                <Feather name="trending-up" size={18} color="#22C55E" />
                <Text style={[styles.summaryValue, { color: "#22C55E" }]}>R${income}</Text>
                <Text style={[styles.summaryLabel, { color: "#16A34A" }]}>Receita</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: colors.destructive + "11", borderColor: colors.destructive + "33" }]}>
                <Feather name="trending-down" size={18} color={colors.destructive} />
                <Text style={[styles.summaryValue, { color: colors.destructive }]}>R${expenses}</Text>
                <Text style={[styles.summaryLabel, { color: colors.destructive }]}>Despesas</Text>
              </View>
              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: profit >= 0 ? colors.gold + "18" : colors.destructive + "11",
                    borderColor: profit >= 0 ? colors.gold + "55" : colors.destructive + "33",
                  },
                ]}
              >
                <Feather name="dollar-sign" size={18} color={profit >= 0 ? colors.gold : colors.destructive} />
                <Text style={[styles.summaryValue, { color: profit >= 0 ? colors.gold : colors.destructive }]}>
                  R${profit}
                </Text>
                <Text style={[styles.summaryLabel, { color: profit >= 0 ? colors.goldDark : colors.destructive }]}>
                  Lucro
                </Text>
              </View>
            </View>

            {Object.keys(byPayment).length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Por forma de pagamento
                </Text>
                {Object.entries(byPayment).map(([pm, val]) => (
                  <View key={pm} style={[styles.pmRow, { borderBottomColor: colors.border }]}>
                    <View style={[styles.pmIcon, { backgroundColor: colors.secondary }]}>
                      <Feather name={PM_ICONS[pm] ?? "help-circle"} size={14} color={colors.gold} />
                    </View>
                    <Text style={[styles.pmLabel, { color: colors.foreground }]}>{pm}</Text>
                    <Text style={[styles.pmValue, { color: colors.gold }]}>R${val}</Text>
                  </View>
                ))}
              </View>
            )}

            {Object.keys(byProfessional).length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Por profissional
                </Text>
                {Object.entries(byProfessional)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, val]) => (
                    <View key={name} style={[styles.pmRow, { borderBottomColor: colors.border }]}>
                      <View style={[styles.pmAvatar, { backgroundColor: colors.gold + "22" }]}>
                        <Text style={[styles.pmAvatarText, { color: colors.gold }]}>
                          {name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </Text>
                      </View>
                      <Text style={[styles.pmLabel, { color: colors.foreground }]}>{name}</Text>
                      <Text style={[styles.pmValue, { color: colors.gold }]}>R${val}</Text>
                    </View>
                  ))}
              </View>
            )}

            <Text style={[styles.entriesTitle, { color: colors.foreground }]}>
              Lançamentos
            </Text>
          </>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.entryCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.entryIcon,
                {
                  backgroundColor:
                    item.type === "income" ? "#16A34A22" : colors.destructive + "22",
                },
              ]}
            >
              <Feather
                name={item.type === "income" ? "arrow-down-left" : "arrow-up-right"}
                size={16}
                color={item.type === "income" ? "#22C55E" : colors.destructive}
              />
            </View>
            <View style={styles.entryInfo}>
              <Text style={[styles.entryDesc, { color: colors.foreground }]}>
                {item.description}
              </Text>
              <Text style={[styles.entryCat, { color: colors.mutedForeground }]}>
                {item.category} · {item.paymentMethod}
              </Text>
            </View>
            <Text
              style={[
                styles.entryAmount,
                { color: item.type === "income" ? "#22C55E" : colors.destructive },
              ]}
            >
              {item.type === "income" ? "+" : "-"}R${item.amount}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="dollar-sign" size={40} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Nenhum lançamento neste período
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
  periodRow: { flexDirection: "row", gap: 8 },
  periodBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  periodText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  content: { padding: 20, gap: 16 },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 6,
    alignItems: "center",
  },
  summaryValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    gap: 0,
  },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 10 },
  pmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  pmIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  pmLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  pmValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  pmAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  pmAvatarText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  entriesTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  entryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  entryIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  entryInfo: { flex: 1, gap: 3 },
  entryDesc: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  entryCat: { fontSize: 11, fontFamily: "Inter_400Regular" },
  entryAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
