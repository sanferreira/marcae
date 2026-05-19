import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PaginationBar } from "@/components/PaginationBar";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { planHasFeature } from "@/constants/plans";
import { useColors } from "@/hooks/useColors";
import { usePagination } from "@/hooks/usePagination";
import { typedInputProps } from "@/lib/inputProps";
import { isValidIsoDate, maskCurrencyInput, maskIsoDate, parseCurrencyInput } from "@/lib/masks";

type Period = "day" | "week" | "month";
type EntryType = "income" | "expense";

interface EntryForm {
  type: EntryType;
  description: string;
  amount: string;
  category: string;
  paymentMethod: string;
  date: string;
}

const DEFAULT_INCOME_CATEGORIES = ["Atendimentos", "Produtos", "Outros"];
const DEFAULT_EXPENSE_CATEGORIES = ["Aluguel", "Produtos", "Salários", "Marketing", "Impostos", "Outros"];
const PAYMENT_METHODS = ["Dinheiro", "PIX", "Cartão", "Cartão de Crédito", "Cartão de Débito", "Outro"];

const PM_ICONS: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
  PIX: "zap",
  Dinheiro: "dollar-sign",
  "Cartão de Crédito": "credit-card",
  "Cartão de Débito": "credit-card",
  "Cartao de Credito": "credit-card",
  "Cartao de Debito": "credit-card",
  Cartão: "credit-card",
  Cartao: "credit-card",
  Outro: "help-circle",
};

const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "Hoje" },
  { key: "week", label: "7 dias" },
  { key: "month", label: "Mês" },
];

const localDateString = (date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
};

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDateBR = (date: string) => {
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
};

const uniqueValues = (values: string[]) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));

const defaultEntryForm = (category = DEFAULT_INCOME_CATEGORIES[0]): EntryForm => ({
  type: "income",
  description: "",
  amount: "",
  category,
  paymentMethod: "Dinheiro",
  date: localDateString(),
});

export default function FinancialScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { planStatus } = useAuth();
  const { cashEntries, categories, addCategory, addCashEntry } = useData();
  const [period, setPeriod] = useState<Period>("month");
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EntryForm>(defaultEntryForm);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | EntryType>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const topPad = insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const now = new Date();
  const todayStr = localDateString(now);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const weekStartStr = localDateString(weekStart);
  const monthStr = todayStr.slice(0, 7);

  const filterByPeriod = (date: string) => {
    if (period === "day") return date === todayStr;
    if (period === "week") return date >= weekStartStr;
    return date.startsWith(monthStr);
  };

  const periodEntries = cashEntries
    .filter((entry) => filterByPeriod(entry.date))
    .sort((a, b) => b.date.localeCompare(a.date));
  const financialCategoryOptions = uniqueValues(["all", ...periodEntries.map((entry) => entry.category)]);
  const filteredEntries = periodEntries.filter((entry) => {
    const term = search.trim().toLowerCase();
    const matchesTerm = !term ||
      entry.description.toLowerCase().includes(term) ||
      entry.category.toLowerCase().includes(term) ||
      entry.paymentMethod.toLowerCase().includes(term) ||
      (entry.professionalName ?? "").toLowerCase().includes(term);
    const matchesType = typeFilter === "all" || entry.type === typeFilter;
    const matchesCategory = categoryFilter === "all" || entry.category === categoryFilter;
    return matchesTerm && matchesType && matchesCategory;
  });
  const entriesPage = usePagination(filteredEntries, 12);
  const incomeEntries = filteredEntries.filter((entry) => entry.type === "income");
  const income = incomeEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const expenses = filteredEntries
    .filter((entry) => entry.type === "expense")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const profit = income - expenses;

  const byPayment: Record<string, number> = {};
  incomeEntries.forEach((entry) => {
    const pm = entry.paymentMethod || "Outro";
    byPayment[pm] = (byPayment[pm] ?? 0) + entry.amount;
  });

  const byProfessional: Record<string, number> = {};
  incomeEntries.forEach((entry) => {
    if (!entry.professionalName) return;
    byProfessional[entry.professionalName] = (byProfessional[entry.professionalName] ?? 0) + entry.amount;
  });
  const showSuperInsights = planHasFeature(planStatus.plan, "advancedReports");
  const averageTicket = incomeEntries.length > 0 ? income / incomeEntries.length : 0;
  const expenseRatio = income > 0 ? Math.round((expenses / income) * 100) : 0;
  const topPayment = Object.entries(byPayment).sort((a, b) => b[1] - a[1])[0];
  const superInsights = [
    income > 0 ? `Ticket medio de ${formatCurrency(averageTicket)} nos lancamentos filtrados.` : "Sem receita no periodo filtrado.",
    income > 0 ? `Despesas consomem ${expenseRatio}% da receita.` : "Adicione entradas para calcular margem.",
    topPayment ? `${topPayment[0]} concentra ${formatCurrency(topPayment[1])} da receita.` : "Nenhuma forma de pagamento registrada.",
  ];

  const incomeCategoryOptions = useMemo(
    () => uniqueValues([
      ...DEFAULT_INCOME_CATEGORIES,
      ...categories.filter((category) => category.type === "income").map((category) => category.name),
      ...cashEntries.filter((entry) => entry.type === "income").map((entry) => entry.category),
    ]),
    [cashEntries, categories],
  );
  const expenseCategoryOptions = useMemo(
    () => uniqueValues([
      ...DEFAULT_EXPENSE_CATEGORIES,
      ...categories.filter((category) => category.type === "expense").map((category) => category.name),
      ...cashEntries.filter((entry) => entry.type === "expense").map((entry) => entry.category),
    ]),
    [cashEntries, categories],
  );
  const categoryOptions = form.type === "income" ? incomeCategoryOptions : expenseCategoryOptions;

  const openModal = () => {
    setForm(defaultEntryForm(incomeCategoryOptions[0] ?? DEFAULT_INCOME_CATEGORIES[0]));
    setModalVisible(true);
  };

  const updateType = (type: EntryType) => {
    const nextCategories = type === "income" ? incomeCategoryOptions : expenseCategoryOptions;
    setForm((current) => ({
      ...current,
      type,
      category: nextCategories[0] ?? (type === "income" ? DEFAULT_INCOME_CATEGORIES[0] : DEFAULT_EXPENSE_CATEGORIES[0]),
    }));
  };

  const handleSave = async () => {
    const amount = parseCurrencyInput(form.amount);
    if (!form.description.trim()) {
      Alert.alert("Atenção", "Informe uma descrição para o lançamento.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Atenção", "Informe um valor maior que zero.");
      return;
    }
    if (!isValidIsoDate(form.date)) {
      Alert.alert("Atenção", "Use a data no formato AAAA-MM-DD.");
      return;
    }

    try {
      setSaving(true);
      const category = form.category.trim() || categoryOptions[0] || "Outros";
      await addCategory({ type: form.type, name: category });
      await addCashEntry({
        type: form.type,
        description: form.description.trim(),
        amount,
        category,
        paymentMethod: form.paymentMethod,
        date: form.date,
      });
      setModalVisible(false);
      setForm(defaultEntryForm(incomeCategoryOptions[0] ?? DEFAULT_INCOME_CATEGORIES[0]));
    } catch (err) {
      Alert.alert("Erro", err instanceof Error ? err.message : "Não foi possível criar o lançamento.");
    } finally {
      setSaving(false);
    }
  };

  const handleClosePeriod = async () => {
    const report = [
      `Fechamento - ${PERIODS.find((item) => item.key === period)?.label ?? period}`,
      `Receita: ${formatCurrency(income)}`,
      `Despesas: ${formatCurrency(expenses)}`,
      `Lucro: ${formatCurrency(profit)}`,
      `Lancamentos: ${filteredEntries.length}`,
      topPayment ? `Principal forma de pagamento: ${topPayment[0]} (${formatCurrency(topPayment[1])})` : "",
    ].filter(Boolean).join("\n");

    if (Platform.OS === "web" && typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(report);
      Alert.alert("Fechamento copiado", "O resumo do periodo foi copiado para a area de transferencia.");
      return;
    }

    await Share.share({ title: "Fechamento financeiro", message: report });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 16, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Financeiro</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={handleClosePeriod}
              activeOpacity={0.85}
            >
              <Feather name="clipboard" size={15} color={colors.foreground} />
              <Text style={[styles.closeBtnText, { color: colors.foreground }]}>Fechamento</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.gold }]}
              onPress={openModal}
              activeOpacity={0.85}
            >
              <Feather name="plus" size={16} color={colors.goldForeground} />
              <Text style={[styles.addBtnText, { color: colors.goldForeground }]}>Novo</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.periodBtn,
                { backgroundColor: period === p.key ? colors.gold : colors.secondary },
              ]}
              onPress={() => { setPeriod(p.key); entriesPage.setPage(1); }}
            >
              <Text
                style={[
                  styles.periodText,
                  { color: period === p.key ? colors.goldForeground : colors.mutedForeground },
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={entriesPage.data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 100 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: "#16A34A22", borderColor: "#16A34A44" }]}>
                <Feather name="trending-up" size={18} color="#22C55E" />
                <Text style={[styles.summaryValue, { color: "#22C55E" }]}>{formatCurrency(income)}</Text>
                <Text style={[styles.summaryLabel, { color: "#16A34A" }]}>Receita</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: colors.destructive + "11", borderColor: colors.destructive + "33" }]}>
                <Feather name="trending-down" size={18} color={colors.destructive} />
                <Text style={[styles.summaryValue, { color: colors.destructive }]}>{formatCurrency(expenses)}</Text>
                <Text style={[styles.summaryLabel, { color: colors.destructive }]}>Despesas</Text>
              </View>
              <View
                style={[
                  styles.summaryCard,
                  styles.summaryCardWide,
                  {
                    backgroundColor: profit >= 0 ? colors.gold + "18" : colors.destructive + "11",
                    borderColor: profit >= 0 ? colors.gold + "55" : colors.destructive + "33",
                  },
                ]}
              >
                <Feather name="dollar-sign" size={18} color={profit >= 0 ? colors.gold : colors.destructive} />
                <Text style={[styles.summaryValue, { color: profit >= 0 ? colors.gold : colors.destructive }]}>
                  {formatCurrency(profit)}
                </Text>
                <Text style={[styles.summaryLabel, { color: profit >= 0 ? colors.goldDark : colors.destructive }]}>
                  Lucro
                </Text>
              </View>
            </View>

            {showSuperInsights && (
              <View style={[styles.superInsights, { backgroundColor: colors.gold + "12", borderColor: colors.gold + "44" }]}>
                <View style={styles.superHeader}>
                  <Feather name="zap" size={16} color={colors.gold} />
                  <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>Insights Super</Text>
                </View>
                {superInsights.map((insight) => (
                  <View key={insight} style={styles.insightRow}>
                    <Feather name="check-circle" size={13} color={colors.gold} />
                    <Text style={[styles.insightText, { color: colors.foreground }]}>{insight}</Text>
                  </View>
                ))}
              </View>
            )}

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
                    <Text style={[styles.pmValue, { color: colors.gold }]}>{formatCurrency(val)}</Text>
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
                      <Text style={[styles.pmValue, { color: colors.gold }]}>{formatCurrency(val)}</Text>
                    </View>
                  ))}
              </View>
            )}

            <Text style={[styles.entriesTitle, { color: colors.foreground }]}>
              Lançamentos
            </Text>
            <View style={[styles.filtersCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Feather name="search" size={15} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Buscar descricao, categoria ou pagamento"
                  placeholderTextColor={colors.mutedForeground}
                  value={search}
                  onChangeText={(value) => { setSearch(value); entriesPage.setPage(1); }}
                />
              </View>
              <View style={styles.chipRow}>
                {[
                  ["all", "Todos"],
                  ["income", "Entradas"],
                  ["expense", "Despesas"],
                ].map(([value, label]) => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.chip, { borderColor: typeFilter === value ? colors.gold : colors.border, backgroundColor: typeFilter === value ? colors.gold + "18" : colors.background }]}
                    onPress={() => { setTypeFilter(value as "all" | EntryType); entriesPage.setPage(1); }}
                  >
                    <Text style={[styles.chipText, { color: typeFilter === value ? colors.gold : colors.foreground }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.chipRow}>
                {financialCategoryOptions.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[styles.chip, { borderColor: categoryFilter === category ? colors.gold : colors.border, backgroundColor: categoryFilter === category ? colors.gold + "18" : colors.background }]}
                    onPress={() => { setCategoryFilter(category); entriesPage.setPage(1); }}
                  >
                    <Text style={[styles.chipText, { color: categoryFilter === category ? colors.gold : colors.foreground }]}>
                      {category === "all" ? "Todas categorias" : category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
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
                {formatDateBR(item.date)} · {item.category} · {item.paymentMethod}
              </Text>
            </View>
            <Text
              style={[
                styles.entryAmount,
                { color: item.type === "income" ? "#22C55E" : colors.destructive },
              ]}
            >
              {item.type === "income" ? "+" : "-"}{formatCurrency(item.amount)}
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
        ListFooterComponent={
          <PaginationBar
            page={entriesPage.page}
            totalPages={entriesPage.totalPages}
            totalItems={entriesPage.totalItems}
            pageSize={entriesPage.pageSize}
            onPageChange={entriesPage.setPage}
          />
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Novo lançamento</Text>
            <View style={{ width: 22 }} />
          </View>

          <ScrollView contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 28 }]}>
            <View style={styles.formBlock}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Tipo</Text>
              <View style={styles.typeRow}>
                {(["income", "expense"] as EntryType[]).map((type) => {
                  const selected = form.type === type;
                  const label = type === "income" ? "Entrada" : "Despesa";
                  const icon = type === "income" ? "arrow-down-left" : "arrow-up-right";
                  const activeColor = type === "income" ? "#22C55E" : colors.destructive;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeBtn,
                        {
                          borderColor: selected ? activeColor : colors.border,
                          backgroundColor: selected ? activeColor + "18" : colors.card,
                        },
                      ]}
                      onPress={() => updateType(type)}
                    >
                      <Feather name={icon} size={16} color={selected ? activeColor : colors.mutedForeground} />
                      <Text style={[styles.typeText, { color: selected ? activeColor : colors.foreground }]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.formBlock}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Descrição</Text>
              <View style={[styles.inputGroup, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Feather name="edit-3" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Ex: venda de produto"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.description}
                  onChangeText={(description) => setForm((current) => ({ ...current, description }))}
                  {...typedInputProps("text")}
                />
              </View>
            </View>

            <View style={styles.formBlock}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Valor</Text>
              <View style={[styles.inputGroup, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Feather name="dollar-sign" size={16} color={colors.mutedForeground} />
                <TextInput
                  {...typedInputProps("decimal")}
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="0,00"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.amount}
                  onChangeText={(amount) => setForm((current) => ({ ...current, amount: maskCurrencyInput(amount) }))}
                />
              </View>
            </View>

            <View style={styles.formBlock}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Data</Text>
              <View style={[styles.inputGroup, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Feather name="calendar" size={16} color={colors.mutedForeground} />
                <TextInput
                  {...typedInputProps("date")}
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Data"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.date}
                  onChangeText={(date) => setForm((current) => ({ ...current, date: maskIsoDate(date) }))}
                />
              </View>
            </View>

            <View style={styles.formBlock}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Categoria</Text>
              <Text style={[styles.fieldHelp, { color: colors.mutedForeground }]}>
                Selecione uma categoria ou digite uma nova. Ela fica salva para os próximos lançamentos.
              </Text>
              <View style={styles.chipRow}>
                {categoryOptions.map((category) => {
                  const selected = form.category === category;
                  return (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.chip,
                        {
                          borderColor: selected ? colors.gold : colors.border,
                          backgroundColor: selected ? colors.gold + "18" : colors.card,
                        },
                      ]}
                      onPress={() => setForm((current) => ({ ...current, category }))}
                    >
                      <Text style={[styles.chipText, { color: selected ? colors.gold : colors.foreground }]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={[styles.inputGroup, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Feather name="tag" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder={form.type === "income" ? "Nova categoria de entrada" : "Nova categoria de despesa"}
                  placeholderTextColor={colors.mutedForeground}
                  value={form.category}
                  onChangeText={(category) => setForm((current) => ({ ...current, category }))}
                  {...typedInputProps("text")}
                />
              </View>
            </View>

            <View style={styles.formBlock}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Pagamento</Text>
              <View style={styles.chipRow}>
                {PAYMENT_METHODS.map((paymentMethod) => {
                  const selected = form.paymentMethod === paymentMethod;
                  return (
                    <TouchableOpacity
                      key={paymentMethod}
                      style={[
                        styles.chip,
                        {
                          borderColor: selected ? colors.gold : colors.border,
                          backgroundColor: selected ? colors.gold + "18" : colors.card,
                        },
                      ]}
                      onPress={() => setForm((current) => ({ ...current, paymentMethod }))}
                    >
                      <Text style={[styles.chipText, { color: selected ? colors.gold : colors.foreground }]}>
                        {paymentMethod}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.gold, opacity: saving ? 0.7 : 1 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              <Feather name="check" size={16} color={colors.goldForeground} />
              <Text style={[styles.saveBtnText, { color: colors.goldForeground }]}>
                {saving ? "Salvando..." : "Salvar lançamento"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
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
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  addBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  closeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  closeBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  periodRow: { flexDirection: "row", gap: 8 },
  periodBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  periodText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  content: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 20 },
  listHeader: { gap: 18, marginBottom: 8 },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  summaryCard: {
    flexGrow: 1,
    flexBasis: "46%",
    minHeight: 104,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderWidth: 1,
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCardWide: { flexBasis: "100%", minHeight: 84 },
  summaryValue: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "center" },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  superInsights: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  superHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  insightRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  insightText: { flex: 1, fontSize: 13, lineHeight: 19, fontFamily: "Inter_500Medium" },
  section: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 0,
  },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 12 },
  pmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingVertical: 13,
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
  entriesTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginTop: 4 },
  filtersCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 12 },
  searchBox: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5 },
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
  entryAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  modal: { flex: 1 },
  modalHeader: {
    minHeight: 58,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  modalContent: { padding: 20, gap: 18 },
  formBlock: { gap: 8 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.3, textTransform: "uppercase" },
  fieldHelp: { fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: -2 },
  typeRow: { flexDirection: "row", gap: 10 },
  typeBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  typeText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  inputGroup: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", paddingVertical: 11 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  saveBtn: {
    minHeight: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
