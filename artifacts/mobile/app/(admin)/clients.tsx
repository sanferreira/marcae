import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
import { Client, useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";
import { usePagination } from "@/hooks/usePagination";
import { typedInputProps } from "@/lib/inputProps";
import { isValidEmail, isValidIsoDate, maskIsoDate, maskPhone, passwordPolicyError } from "@/lib/masks";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ClientsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { barbershop } = useAuth();
  const {
    appointments, clients, inactiveClients, clientPackages, productOrders, servicePackages, loyaltySettings,
    getClientLoyalty, adjustClientLoyalty,
    updateClient, createClientAccess, archiveClient, reactivateClient, exportClientsCsv, importClientsCsv,
    assignClientPackage, cancelClientPackage,
  } = useData();
  const [search, setSearch] = useState("");
  const [clientStatus, setClientStatus] = useState<"active" | "inactive">("active");
  const [selected, setSelected] = useState<Client | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "", phone: "", email: "", birthDate: "", notes: "",
    allergies: "", restrictions: "", preferences: "", emergencyContact: "",
    intakeData: {} as Record<string, string>,
  });
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessForm, setAccessForm] = useState({ email: "", password: "" });
  const [savingAccess, setSavingAccess] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importCsv, setImportCsv] = useState("");
  const [importing, setImporting] = useState(false);

  const topPad = insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const intakeFields = barbershop?.intakeFields ?? [];
  const importPreview = useMemo(() => {
    const rows = importCsv.replace(/\r/g, "").split("\n").map((line) => line.trim()).filter(Boolean);
    if (rows.length === 0) return { total: 0, namedHeader: false };
    const first = rows[0].toLowerCase();
    const namedHeader = first.includes("name") || first.includes("nome");
    return { total: namedHeader ? Math.max(0, rows.length - 1) : rows.length, namedHeader };
  }, [importCsv]);

  const displayedClients = clientStatus === "active" ? clients : inactiveClients;
  const filtered = displayedClients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );
  const clientsPage = usePagination(filtered, 12);

  const applyPointAdjustment = (client: Client, points: number, description: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void adjustClientLoyalty(client.id, points, description);
    if (selected?.id === client.id) {
      setSelected((prev) => prev ? {
        ...prev,
        loyaltyPoints: Math.max(0, Math.min(prev.loyaltyPoints + points, loyaltySettings.requiredPoints)),
      } : prev);
    }
  };

  const openEditClient = (client: Client) => {
    setEditForm({
      name: client.name,
      phone: maskPhone(client.phone),
      email: client.email,
      birthDate: client.birthDate ?? "",
      notes: client.notes ?? "",
      allergies: client.allergies ?? "",
      restrictions: client.restrictions ?? "",
      preferences: client.preferences ?? "",
      emergencyContact: maskPhone(client.emergencyContact ?? ""),
      intakeData: client.intakeData ?? {},
    });
    setEditOpen(true);
  };

  const saveClient = async () => {
    if (!selected) return;
    if (!editForm.name.trim()) {
      Alert.alert("Nome obrigatorio", "Informe o nome do cliente.");
      return;
    }
    if (editForm.email.trim() && !isValidEmail(editForm.email)) {
      Alert.alert("Email invalido", "Informe um email valido para o cliente.");
      return;
    }
    if (editForm.birthDate.trim() && !isValidIsoDate(editForm.birthDate)) {
      Alert.alert("Data invalida", "Use nascimento no formato AAAA-MM-DD.");
      return;
    }
    const invalidIntakeDate = intakeFields.find((field) =>
      field.type === "date" &&
      !!editForm.intakeData[field.key]?.trim() &&
      !isValidIsoDate(editForm.intakeData[field.key]),
    );
    if (invalidIntakeDate) {
      Alert.alert("Data invalida", `Use ${invalidIntakeDate.label} no formato AAAA-MM-DD.`);
      return;
    }
    const intakeData = Object.fromEntries(
      Object.entries(editForm.intakeData)
        .map(([key, value]) => [key, value.trim()] as const)
        .filter(([, value]) => value.length > 0),
    );
    const next: Client = {
      ...selected,
      ...editForm,
      name: editForm.name.trim(),
      email: editForm.email.trim().toLowerCase(),
      phone: editForm.phone.trim(),
      birthDate: editForm.birthDate.trim() || undefined,
      emergencyContact: editForm.emergencyContact.trim() || undefined,
      intakeData,
    };
    try {
      await updateClient(next);
      setSelected(next);
      setEditOpen(false);
    } catch (err) {
      Alert.alert("Erro", err instanceof Error ? err.message : "Nao foi possivel salvar a ficha.");
    }
  };

  const openAccessClient = (client: Client) => {
    setAccessForm({ email: client.email, password: "" });
    setAccessOpen(true);
  };

  const saveClientAccess = async () => {
    if (!selected || savingAccess) return;
    const email = accessForm.email.trim().toLowerCase();
    if (!email || !isValidEmail(email)) {
      Alert.alert("Email obrigatorio", "Informe um email valido para o acesso do cliente.");
      return;
    }
    const passwordError = accessForm.password ? passwordPolicyError(accessForm.password) : "Informe uma senha.";
    if (passwordError) {
      Alert.alert("Senha insegura", passwordError);
      return;
    }

    const alreadyHadAccess = !!(selected.hasAccess || selected.userId);
    try {
      setSavingAccess(true);
      const updated = await createClientAccess(selected.id, accessForm.password, email);
      setSelected(updated);
      setAccessOpen(false);
      setAccessForm({ email: "", password: "" });
      Alert.alert(
        alreadyHadAccess ? "Senha redefinida" : "Acesso criado",
        "Informe ao cliente o ID do estabelecimento, email e senha inicial para entrar.",
      );
    } catch (err) {
      Alert.alert("Erro no acesso", err instanceof Error ? err.message : "Nao foi possivel criar acesso.");
    } finally {
      setSavingAccess(false);
    }
  };

  const confirmArchiveClient = (client: Client) => {
    Alert.alert(
      "Inativar cliente",
      `Inativar "${client.name}"? O cliente sai da lista ativa, mas o historico de agendamentos, pedidos e financeiro continua preservado.`,
      [
        { text: "Voltar", style: "cancel" },
        {
          text: "Inativar",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await archiveClient(client.id);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setSelected(null);
                Alert.alert("Cliente inativado", `${client.name} saiu da lista ativa de clientes.`);
              } catch (err) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert("Nao foi possivel inativar", err instanceof Error ? err.message : "Tente novamente.");
              }
            })();
          },
        },
      ],
    );
  };

  const confirmReactivateClient = (client: Client) => {
    Alert.alert(
      "Reativar cliente",
      `Reativar "${client.name}"? Ele volta para a lista ativa e pode ser usado em novos agendamentos.`,
      [
        { text: "Voltar", style: "cancel" },
        {
          text: "Reativar",
          onPress: () => {
            void (async () => {
              try {
                await reactivateClient(client.id);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setSelected(null);
                setClientStatus("active");
                Alert.alert("Cliente reativado", `${client.name} voltou para a lista ativa.`);
              } catch (err) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert("Nao foi possivel reativar", err instanceof Error ? err.message : "Tente novamente.");
              }
            })();
          },
        },
      ],
    );
  };

  const handleExport = async () => {
    try {
      const result = await exportClientsCsv();
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      await Share.share({ title: result.filename, message: result.csv });
    } catch (err) {
      Alert.alert("Erro", err instanceof Error ? err.message : "Nao foi possivel exportar.");
    }
  };

  const handleImport = async () => {
    setImportOpen(true);
  };

  const runImport = async () => {
    if (!importCsv.trim()) {
      Alert.alert("CSV vazio", "Cole uma lista de clientes antes de importar.");
      return;
    }
    try {
      setImporting(true);
      const result = await importClientsCsv(importCsv);
      setImportOpen(false);
      setImportCsv("");
      Alert.alert("Importacao concluida", `Criados: ${result.created}\nIgnorados: ${result.skipped}`);
    } catch (err) {
      Alert.alert("Erro", err instanceof Error ? err.message : "Nao foi possivel importar.");
    } finally {
      setImporting(false);
    }
  };

  const sellPackage = async (pkgId: string) => {
    if (!selected) return;
    const pkg = servicePackages.find((item) => item.id === pkgId);
    if (!pkg) return;
    try {
      await assignClientPackage(selected.id, pkg.id, pkg.price);
      Alert.alert("Pacote vinculado", `${pkg.name} foi adicionado para ${selected.name}.`);
    } catch (err) {
      Alert.alert("Erro", err instanceof Error ? err.message : "Nao foi possivel vincular o pacote.");
    }
  };

  const handleAdjustPoints = (client: Client) => {
    const loyalty = getClientLoyalty(client.id);
    const redeemDescription = `Beneficio resgatado: ${loyaltySettings.benefitDescription}`;

    Alert.alert(
      `Pontos de ${client.name.split(" ")[0]}`,
      `Pontos atuais: ${loyalty.currentPoints}/${loyaltySettings.requiredPoints}\n\nEscolha uma ação:`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "+1 Ponto",
          onPress: () => {
            applyPointAdjustment(client, 1, "Ajuste manual pelo admin");
          },
        },
        {
          text: "-1 Ponto",
          onPress: () => {
            applyPointAdjustment(client, -1, "Ajuste manual pelo admin");
          },
        },
        {
          text: "Resgatar benefício",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            applyPointAdjustment(client, -loyaltySettings.requiredPoints, redeemDescription);
          },
        },
      ]
    );
  };

  if (selected) {
    const selectedIsInactive = !!selected.archivedAt;
    const selectedHasAccess = !!(selected.hasAccess || selected.userId);
    const loyalty = getClientLoyalty(selected.id);
    const selectedCompletedAppointments = appointments
      .filter((appointment) => appointment.clientId === selected.id && appointment.status === "completed");
    const serviceSpent = selectedCompletedAppointments
      .filter((appointment) => appointment.paymentMethod !== "Pacote" && !appointment.isFreeByLoyalty)
      .reduce((sum, appointment) => sum + appointment.totalPrice, 0);
    const orderSpent = productOrders
      .filter((order) => order.clientId === selected.id && (order.status === "paid" || order.status === "delivered"))
      .reduce((sum, order) => sum + order.totalPrice, 0);
    const packageSpent = clientPackages
      .filter((pkg) => pkg.clientId === selected.id)
      .reduce((sum, pkg) => sum + pkg.pricePaid, 0);
    const computedTotalSpent = serviceSpent + orderSpent + packageSpent;
    const selectedTotalSpent = Math.max(selected.totalSpent, computedTotalSpent);
    const legacyFichaRows = ([
      ["Nascimento", selected.birthDate ? new Date(selected.birthDate + "T12:00:00").toLocaleDateString("pt-BR") : ""],
      ["Alergias", selected.allergies ?? ""],
      ["Restricoes", selected.restrictions ?? ""],
      ["Preferencias", selected.preferences ?? ""],
      ["Contato emergencia", selected.emergencyContact ?? ""],
    ] as const).filter(([, value]) => value.trim().length > 0);
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.detailHeader, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setSelected(null)}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.detailTitle, { color: colors.foreground }]}>{selectedIsInactive ? "Cliente inativo" : "Detalhes do Cliente"}</Text>
          <View style={{ width: 22 }} />
        </View>
        <ScrollView
          contentContainerStyle={[styles.detailContent, { paddingBottom: botPad + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.clientDetailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.clientAvatar, { backgroundColor: colors.gold }]}>
              <Text style={[styles.clientAvatarText, { color: colors.goldForeground }]}>
                {selected.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.clientDetailName, { color: colors.foreground }]}>{selected.name}</Text>
            <View style={styles.contactRow}>
              <Feather name="phone" size={14} color={colors.mutedForeground} />
              <Text style={[styles.contactText, { color: colors.mutedForeground }]}>{selected.phone}</Text>
            </View>
            <View style={styles.contactRow}>
              <Feather name="mail" size={14} color={colors.mutedForeground} />
              <Text style={[styles.contactText, { color: colors.mutedForeground }]}>{selected.email}</Text>
            </View>
            {selectedHasAccess && (
              <View style={[styles.accessBadge, { backgroundColor: colors.gold + "18", borderColor: colors.gold + "55" }]}>
                <Feather name="key" size={12} color={colors.gold} />
                <Text style={[styles.accessBadgeText, { color: colors.gold }]}>Acesso ativo</Text>
              </View>
            )}
            <View style={styles.clientDetailActions}>
              {selectedIsInactive ? (
                <TouchableOpacity style={[styles.reactivateClientBtn, { backgroundColor: colors.gold, borderColor: colors.gold }]} onPress={() => confirmReactivateClient(selected)}>
                  <Feather name="user-check" size={14} color={colors.goldForeground} />
                  <Text style={[styles.reactivateClientBtnText, { color: colors.goldForeground }]}>Reativar</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity style={[styles.editClientBtn, { backgroundColor: colors.secondary }]} onPress={() => openEditClient(selected)}>
                    <Feather name="file-text" size={14} color={colors.foreground} />
                    <Text style={[styles.editClientBtnText, { color: colors.foreground }]}>Editar ficha</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.editClientBtn, { backgroundColor: colors.gold + "18" }]} onPress={() => openAccessClient(selected)}>
                    <Feather name={selectedHasAccess ? "key" : "user-plus"} size={14} color={colors.gold} />
                    <Text style={[styles.editClientBtnText, { color: colors.gold }]}>
                      {selectedHasAccess ? "Redefinir senha" : "Criar acesso"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.archiveClientBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]} onPress={() => confirmArchiveClient(selected)}>
                    <Feather name="user-x" size={14} color={colors.foreground} />
                    <Text style={[styles.archiveClientBtnText, { color: colors.foreground }]}>Inativar</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          <View style={styles.statsGrid}>
            {[
              { label: "Total gasto", value: formatCurrency(selectedTotalSpent), icon: "dollar-sign" as const },
              { label: "Atendimentos", value: selected.appointmentsCount.toString(), icon: "scissors" as const },
              { label: "Pontos fidelidade", value: `${loyalty.currentPoints}/${loyaltySettings.requiredPoints}`, icon: "award" as const },
              { label: "Última visita", value: selected.lastVisit ? new Date(selected.lastVisit + "T12:00:00").toLocaleDateString("pt-BR") : "N/A", icon: "calendar" as const },
            ].map((stat) => (
              <View key={stat.label} style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name={stat.icon} size={16} color={colors.gold} />
                <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.notesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.notesTitle, { color: colors.foreground }]}>Composicao do gasto</Text>
            {([
              ["Servicos", serviceSpent],
              ["Pedidos", orderSpent],
              ["Pacotes", packageSpent],
            ] as const).map(([label, value]) => (
              <View key={label} style={[styles.fichaRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.fichaLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <Text style={[styles.fichaValue, { color: colors.foreground }]}>{formatCurrency(value)}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.notesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.notesTitle, { color: colors.foreground }]}>
              {intakeFields.length > 0 ? "Ficha personalizada" : "Ficha do cliente"}
            </Text>
            {intakeFields.length > 0 ? (
              intakeFields.map((field) => (
                <View key={field.key} style={[styles.fichaRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.fichaLabel, { color: colors.mutedForeground }]}>{field.label}</Text>
                  <Text style={[styles.fichaValue, { color: colors.foreground }]}>
                    {selected.intakeData?.[field.key] || "Nao informado"}
                  </Text>
                </View>
              ))
            ) : (
              [
                ["Nascimento", selected.birthDate ? new Date(selected.birthDate + "T12:00:00").toLocaleDateString("pt-BR") : "Nao informado"],
                ["Alergias", selected.allergies || "Nao informado"],
                ["Restricoes", selected.restrictions || "Nao informado"],
                ["Preferencias", selected.preferences || "Nao informado"],
                ["Contato emergencia", selected.emergencyContact || "Nao informado"],
              ].map(([label, value]) => (
                <View key={label} style={[styles.fichaRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.fichaLabel, { color: colors.mutedForeground }]}>{label}</Text>
                  <Text style={[styles.fichaValue, { color: colors.foreground }]}>{value}</Text>
                </View>
              ))
            )}
          </View>

          {intakeFields.length > 0 && legacyFichaRows.length > 0 && (
            <View style={[styles.notesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.notesTitle, { color: colors.foreground }]}>Informacoes complementares</Text>
              {legacyFichaRows.map(([label, value]) => (
                <View key={label} style={[styles.fichaRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.fichaLabel, { color: colors.mutedForeground }]}>{label}</Text>
                  <Text style={[styles.fichaValue, { color: colors.foreground }]}>{value}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={[styles.notesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.notesTitle, { color: colors.foreground }]}>Pacotes e sessoes</Text>
            {clientPackages.filter((pkg) => pkg.clientId === selected.id).length === 0 ? (
              <Text style={[styles.notesText, { color: colors.mutedForeground }]}>Nenhum pacote ativo para este cliente.</Text>
            ) : (
              clientPackages.filter((pkg) => pkg.clientId === selected.id).map((pkg) => (
                <View key={pkg.id} style={[styles.packageRow, { borderTopColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.packageTitle, { color: colors.foreground }]}>{pkg.packageName}</Text>
                    <Text style={[styles.packageMeta, { color: colors.mutedForeground }]}>{pkg.sessionsRemaining}/{pkg.sessionsTotal} sessoes restantes - {pkg.serviceName}</Text>
                  </View>
                  {pkg.status === "active" && (
                    <TouchableOpacity onPress={() => { void cancelClientPackage(pkg.id); }}>
                      <Feather name="x" size={16} color={colors.destructive} />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
            {servicePackages.filter((pkg) => pkg.isActive).length > 0 && (
              <View style={styles.packageActions}>
                {servicePackages.filter((pkg) => pkg.isActive).slice(0, 4).map((pkg) => (
                  <TouchableOpacity key={pkg.id} style={[styles.packageSellBtn, { backgroundColor: colors.gold + "18", borderColor: colors.gold + "55" }]} onPress={() => { void sellPackage(pkg.id); }}>
                    <Text style={[styles.packageSellText, { color: colors.gold }]}>{pkg.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Loyalty management */}
          <View style={[styles.loyaltySection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.loyaltyHeader}>
              <View>
                <Text style={[styles.loyaltySectionTitle, { color: colors.foreground }]}>Fidelidade</Text>
                <Text style={[styles.loyaltySub, { color: colors.mutedForeground }]}>
                  {loyaltySettings.benefitDescription}
                </Text>
              </View>
              {!selectedIsInactive && (
                <TouchableOpacity
                  style={[styles.adjustBtn, { backgroundColor: colors.gold }]}
                  onPress={() => handleAdjustPoints(selected)}
                >
                  <Feather name="edit-2" size={14} color={colors.goldForeground} />
                  <Text style={[styles.adjustBtnText, { color: colors.goldForeground }]}>Ajustar</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={[styles.loyaltyTrack, { backgroundColor: colors.secondary }]}>
              <View
                style={[
                  styles.loyaltyFill,
                  {
                    backgroundColor: colors.gold,
                    width: `${Math.min((loyalty.currentPoints / loyaltySettings.requiredPoints) * 100, 100)}%` as any,
                  },
                ]}
              />
            </View>
            <View style={styles.loyaltyDotsRow}>
              {Array.from({ length: loyaltySettings.requiredPoints }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.loyaltyDot,
                    {
                      backgroundColor: i < loyalty.currentPoints ? colors.gold : colors.secondary,
                      borderColor: i < loyalty.currentPoints ? colors.gold : colors.border,
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.loyaltyPoints, { color: colors.mutedForeground }]}>
              {loyalty.currentPoints} de {loyaltySettings.requiredPoints} pontos
            </Text>

            {loyalty.history.length > 0 && (
              <>
                <Text style={[styles.historyLabel, { color: colors.foreground }]}>Histórico</Text>
                {loyalty.history.slice(0, 5).map((h) => (
                  <View key={h.id} style={[styles.historyRow, { borderTopColor: colors.border }]}>
                    <View style={[styles.historyIcon, { backgroundColor: h.type === "earned" ? "#22C55E22" : h.type === "redeemed" ? colors.gold + "22" : "#60A5FA22" }]}>
                      <Feather
                        name={h.type === "earned" ? "plus-circle" : h.type === "redeemed" ? "gift" : "edit-2"}
                        size={12}
                        color={h.type === "earned" ? "#22C55E" : h.type === "redeemed" ? colors.gold : "#60A5FA"}
                      />
                    </View>
                    <View style={styles.historyInfo}>
                      <Text style={[styles.historyDesc, { color: colors.foreground }]}>{h.description}</Text>
                      <Text style={[styles.historyDate, { color: colors.mutedForeground }]}>
                        {new Date(h.date + "T12:00:00").toLocaleDateString("pt-BR")}
                      </Text>
                    </View>
                    <Text style={[styles.historyPts, { color: h.type === "redeemed" ? colors.destructive : colors.gold }]}>
                      {h.type === "redeemed" ? "-" : "+"}{h.points}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </View>

          {selected.notes && (
            <View style={[styles.notesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.notesTitle, { color: colors.foreground }]}>Observações</Text>
              <Text style={[styles.notesText, { color: colors.mutedForeground }]}>{selected.notes}</Text>
            </View>
          )}
        </ScrollView>
        <Modal visible={editOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditOpen(false)}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setEditOpen(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Ficha do cliente</Text>
              <TouchableOpacity onPress={saveClient}>
                <Text style={[styles.modalSave, { color: colors.gold }]}>Salvar</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 30 }]}>
              {([
                ["Nome", "name", "text"],
                ["Telefone", "phone", "phone"],
                ["Email", "email", "email"],
                ["Nascimento", "birthDate", "date"],
                ["Observacoes", "notes", "text"],
              ] as const).map(([label, key, kind]) => (
                <View key={key}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
                  <TextInput
                    {...typedInputProps(kind)}
                    style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                    value={editForm[key]}
                    onChangeText={(value) => {
                      const next = kind === "phone" ? maskPhone(value) : kind === "date" ? maskIsoDate(value) : value;
                      setEditForm((current) => ({ ...current, [key]: next }));
                    }}
                    placeholder={label}
                    placeholderTextColor={colors.mutedForeground}
                    multiline={key === "notes"}
                  />
                </View>
              ))}
              {intakeFields.length > 0 && (
                <View style={[styles.customFieldsBlock, { borderColor: colors.border }]}>
                  <Text style={[styles.notesTitle, { color: colors.foreground }]}>Ficha personalizada</Text>
                  {intakeFields.map((field) => (
                    <View key={field.key}>
                      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{field.label}</Text>
                      <TextInput
                        {...typedInputProps(field.type === "phone" ? "phone" : field.type === "date" ? "date" : "text")}
                        style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                        value={editForm.intakeData[field.key] ?? ""}
                        onChangeText={(value) => {
                          const next = field.type === "phone" ? maskPhone(value) : field.type === "date" ? maskIsoDate(value) : value;
                          setEditForm((current) => ({
                            ...current,
                            intakeData: { ...current.intakeData, [field.key]: next },
                          }));
                        }}
                        placeholder={field.label}
                        placeholderTextColor={colors.mutedForeground}
                        multiline={field.type === "textarea"}
                      />
                    </View>
                  ))}
                </View>
              )}
              {intakeFields.length === 0 && (
                <View style={[styles.customFieldsBlock, { borderColor: colors.border }]}>
                  <Text style={[styles.notesTitle, { color: colors.foreground }]}>Ficha padrao</Text>
                  {([
                    ["Alergias", "allergies", "text"],
                    ["Restricoes", "restrictions", "text"],
                    ["Preferencias", "preferences", "text"],
                    ["Contato emergencia", "emergencyContact", "phone"],
                  ] as const).map(([label, key, kind]) => (
                    <View key={key}>
                      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
                      <TextInput
                        {...typedInputProps(kind)}
                        style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                        value={editForm[key]}
                        onChangeText={(value) => {
                          const next = kind === "phone" ? maskPhone(value) : value;
                          setEditForm((current) => ({ ...current, [key]: next }));
                        }}
                        placeholder={label}
                        placeholderTextColor={colors.mutedForeground}
                        multiline={key !== "emergencyContact"}
                      />
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>
        <Modal visible={accessOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAccessOpen(false)}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setAccessOpen(false)} disabled={savingAccess}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {selectedHasAccess ? "Redefinir acesso" : "Criar acesso"}
              </Text>
              <TouchableOpacity onPress={saveClientAccess} disabled={savingAccess}>
                <Text style={[styles.modalSave, { color: savingAccess ? colors.mutedForeground : colors.gold }]}>
                  {savingAccess ? "Salvando..." : "Salvar"}
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 30 }]}>
              <View style={[styles.importInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="key" size={18} color={colors.gold} />
                <Text style={[styles.notesText, { color: colors.mutedForeground }]}>
                  O cliente entra com o ID {barbershop?.slug ?? "do estabelecimento"}, email e senha inicial.
                </Text>
              </View>
              <View>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Email de acesso</Text>
                <TextInput
                  {...typedInputProps("email")}
                  style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                  value={accessForm.email}
                  onChangeText={(value) => setAccessForm((current) => ({ ...current, email: value.trim().toLowerCase() }))}
                  placeholder="cliente@email.com"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                />
              </View>
              <View>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Senha inicial</Text>
                <TextInput
                  {...typedInputProps("password")}
                  style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                  value={accessForm.password}
                  onChangeText={(value) => setAccessForm((current) => ({ ...current, password: value }))}
                  placeholder="Minimo 8 caracteres"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            </ScrollView>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {clientStatus === "active" ? `Clientes (${clients.length})` : `Inativos (${inactiveClients.length})`}
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.secondary }]} onPress={handleImport}>
              <Feather name="upload" size={14} color={colors.foreground} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.secondary }]} onPress={handleExport}>
              <Feather name="download" size={14} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Buscar clientes..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={(value) => { setSearch(value); clientsPage.setPage(1); }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
        <View style={[styles.statusTabs, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {([
            ["active", `Ativos (${clients.length})`],
            ["inactive", `Inativos (${inactiveClients.length})`],
          ] as const).map(([status, label]) => {
            const active = clientStatus === status;
            return (
              <TouchableOpacity
                key={status}
                style={[styles.statusTab, { backgroundColor: active ? colors.gold : "transparent" }]}
                onPress={() => { setClientStatus(status); clientsPage.setPage(1); }}
              >
                <Text style={[styles.statusTabText, { color: active ? colors.goldForeground : colors.mutedForeground }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={clientsPage.data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: botPad + 100 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const loyalty = getClientLoyalty(item.id);
          const isInactive = !!item.archivedAt;
          const inactiveSince = item.archivedAt ? new Date(item.archivedAt).toLocaleDateString("pt-BR") : "";
          return (
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
                <Text style={[styles.clientMeta, { color: colors.mutedForeground }]}>
                  {isInactive ? `Inativo desde ${inactiveSince}` : `${item.appointmentsCount} visitas · ${formatCurrency(item.totalSpent)}`}
                </Text>
              </View>
              <View style={styles.clientRight}>
                {isInactive ? (
                  <View style={[styles.inactivePill, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.inactivePillText, { color: colors.mutedForeground }]}>Inativo</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.loyaltyPill, { backgroundColor: loyalty.currentPoints >= loyaltySettings.requiredPoints ? colors.gold : colors.gold + "22" }]}
                    onPress={() => handleAdjustPoints(item)}
                  >
                    <Feather name="award" size={10} color={loyalty.currentPoints >= loyaltySettings.requiredPoints ? colors.goldForeground : colors.gold} />
                    <Text style={[styles.loyaltyPillText, { color: loyalty.currentPoints >= loyaltySettings.requiredPoints ? colors.goldForeground : colors.gold }]}>
                      {loyalty.currentPoints}/{loyaltySettings.requiredPoints}
                    </Text>
                  </TouchableOpacity>
                )}
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={40} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {clientStatus === "active" ? "Nenhum cliente encontrado" : "Nenhum cliente inativo"}
            </Text>
          </View>
        }
        ListFooterComponent={
          <PaginationBar
            page={clientsPage.page}
            totalPages={clientsPage.totalPages}
            totalItems={clientsPage.totalItems}
            pageSize={clientsPage.pageSize}
            onPageChange={clientsPage.setPage}
          />
        }
      />
      <Modal visible={importOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setImportOpen(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setImportOpen(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Importar clientes</Text>
            <TouchableOpacity onPress={runImport} disabled={importing}>
              <Text style={[styles.modalSave, { color: colors.gold }]}>{importing ? "Importando..." : "Importar"}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 30 }]}>
            <View style={[styles.importInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="file-text" size={18} color={colors.gold} />
              <Text style={[styles.notesText, { color: colors.mutedForeground }]}>
                Cole CSV com colunas name, phone, email, birthDate, notes, allergies, restrictions, preferences, emergencyContact. Campos personalizados tambem podem virar colunas.
              </Text>
            </View>
            <TextInput
              style={[styles.csvInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={importCsv}
              onChangeText={setImportCsv}
              placeholder={"name,phone,email\nMaria,11999999999,maria@email.com"}
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
              {...typedInputProps("text")}
            />
            <View style={[styles.importPreview, { backgroundColor: colors.gold + "12", borderColor: colors.gold + "44" }]}>
              <Text style={[styles.importPreviewText, { color: colors.gold }]}>
                Previa: {importPreview.total} cliente(s) detectado(s){importPreview.namedHeader ? " com cabecalho" : ""}
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, gap: 14 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statusTabs: { flexDirection: "row", borderRadius: 12, borderWidth: 1, padding: 4, gap: 4 },
  statusTab: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 9, borderRadius: 9 },
  statusTabText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  list: { padding: 20 },
  clientCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  clientInfo: { flex: 1, gap: 3 },
  clientName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  clientPhone: { fontSize: 12, fontFamily: "Inter_400Regular" },
  clientMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  clientRight: { alignItems: "flex-end", gap: 8 },
  loyaltyPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  loyaltyPillText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  inactivePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  inactivePillText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  // detail
  detailHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1,
  },
  detailTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  detailContent: { padding: 20, gap: 16 },
  clientDetailCard: {
    alignItems: "center", padding: 24, borderRadius: 18, borderWidth: 1, gap: 8,
  },
  clientAvatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  clientAvatarText: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#0C0C0C" },
  clientDetailName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  contactText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  accessBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, marginTop: 4 },
  accessBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  editClientBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  editClientBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  clientDetailActions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
  archiveClientBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  archiveClientBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  reactivateClientBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  reactivateClientBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statBox: { flex: 1, minWidth: "45%", padding: 16, borderRadius: 14, borderWidth: 1, gap: 6 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  // loyalty section
  loyaltySection: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 10 },
  loyaltyHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  loyaltySectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  loyaltySub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  adjustBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
  },
  adjustBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0C0C0C" },
  loyaltyTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  loyaltyFill: { height: "100%", borderRadius: 3 },
  loyaltyDotsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  loyaltyDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5 },
  loyaltyPoints: { fontSize: 12, fontFamily: "Inter_400Regular" },
  historyLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 10, borderTopWidth: 0.5 },
  historyIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  historyInfo: { flex: 1 },
  historyDesc: { fontSize: 13, fontFamily: "Inter_500Medium" },
  historyDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  historyPts: { fontSize: 14, fontFamily: "Inter_700Bold" },
  // notes
  notesCard: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 8 },
  notesTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  notesText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  fichaRow: { borderTopWidth: 1, paddingTop: 8, gap: 2 },
  fichaLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" },
  fichaValue: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  packageRow: { borderTopWidth: 1, paddingTop: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  packageTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  packageMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  packageActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  packageSellBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  packageSellText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  modalSave: { fontSize: 15, fontFamily: "Inter_700Bold" },
  modalContent: { padding: 20, gap: 12 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 48 },
  customFieldsBlock: { borderTopWidth: 1, paddingTop: 14, marginTop: 6, gap: 12 },
  importInfo: { borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  csvInput: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, minHeight: 220, fontSize: 13, fontFamily: "Inter_400Regular" },
  importPreview: { borderRadius: 12, borderWidth: 1, padding: 12 },
  importPreviewText: { fontSize: 13, fontFamily: "Inter_700Bold" },
});
