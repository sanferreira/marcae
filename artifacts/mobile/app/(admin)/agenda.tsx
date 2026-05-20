import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

import { AppointmentCard } from "@/components/AppointmentCard";
import { PaginationBar } from "@/components/PaginationBar";
import { Client, Professional, Service, useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";
import { usePagination } from "@/hooks/usePagination";
import { addLocalDays, toLocalDateString } from "@/lib/dates";
import { typedInputProps } from "@/lib/inputProps";
import { maskPhone } from "@/lib/masks";

const DAYS = Array.from({ length: 14 }, (_, i) => addLocalDays(i - 3));
const BOOKING_DATES = Array.from({ length: 21 }, (_, i) => addLocalDays(i));

const PAY_METHODS = ["PIX", "Dinheiro", "Cartao de Credito", "Cartao de Debito", "Pacote"];
type StatusFilter = "all" | "pending" | "confirmed" | "completed" | "cancelled";
type AdminBookingStep = "client" | "services" | "professional" | "datetime" | "confirm";

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendentes" },
  { key: "confirmed", label: "Confirmados" },
  { key: "completed", label: "Concluidos" },
  { key: "cancelled", label: "Cancelados" },
];

const STEPS: AdminBookingStep[] = ["client", "services", "professional", "datetime", "confirm"];
const STEP_LABELS: Record<AdminBookingStep, string> = {
  client: "Cliente",
  services: "Servicos",
  professional: "Profissional",
  datetime: "Data e horario",
  confirm: "Confirmar",
};
const JS_DAY_KEYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function normalized(value: string | null | undefined) {
  return (value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function professionalCanDoServices(professional: Professional, serviceIds: string[]) {
  const allowed = professional.serviceIds ?? [];
  if (allowed.length === 0) return true;
  return serviceIds.every((id) => allowed.includes(id));
}

function enabledDaysLabel(professional?: Professional) {
  const schedule = professional?.schedule;
  if (!schedule) return "Escala ainda nao configurada.";
  const labels: Record<string, string> = { seg: "Seg", ter: "Ter", qua: "Qua", qui: "Qui", sex: "Sex", sab: "Sab", dom: "Dom" };
  const days = Object.entries(schedule)
    .filter(([, day]) => day.enabled)
    .map(([key, day]) => `${labels[key] ?? key} ${day.startTime}-${day.endTime}`);
  return days.length > 0 ? days.join(" · ") : "Sem dias ativos na escala.";
}

function isWorkingDay(professional: Professional | undefined, date: Date) {
  const schedule = professional?.schedule;
  if (!schedule) return true;
  const key = JS_DAY_KEYS[date.getDay()];
  return schedule[key]?.enabled ?? true;
}

export default function AgendaScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    appointments,
    clients,
    services,
    professionals,
    getAvailableSlots,
    addAppointment,
    addClient,
    updateAppointmentStatus,
    cancelAppointment,
  } = useData();

  const topPad = insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [selectedDate, setSelectedDate] = useState(addLocalDays(0));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState<AdminBookingStep>("client");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [quickClientName, setQuickClientName] = useState("");
  const [quickClientPhone, setQuickClientPhone] = useState("");
  const [quickClientEmail, setQuickClientEmail] = useState("");
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedProfId, setSelectedProfId] = useState("");
  const [bookingDate, setBookingDate] = useState(BOOKING_DATES[0]);
  const [selectedTime, setSelectedTime] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [appointmentStatus, setAppointmentStatus] = useState<"confirmed" | "pending">("confirmed");
  const [savingBooking, setSavingBooking] = useState(false);
  const dateStr = toLocalDateString(selectedDate);
  const today = toLocalDateString();
  const bookingDateStr = toLocalDateString(bookingDate);
  const selectedClient = clients.find((client) => client.id === selectedClientId);
  const selectedProf = professionals.find((professional) => professional.id === selectedProfId);
  const selectedServiceIds = selectedServices.map((service) => service.id);
  const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);
  const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0);
  const activeServices = services.filter((service) => service.isActive);
  const availableProfessionals = professionals
    .filter((professional) => professional.isAvailable)
    .filter((professional) => selectedServiceIds.length === 0 || professionalCanDoServices(professional, selectedServiceIds));
  const availableSlots = selectedProfId && totalDuration > 0
    ? getAvailableSlots(bookingDateStr, selectedProfId, totalDuration, selectedClientId || null)
    : [];
  const filteredClients = useMemo(() => {
    const query = normalized(clientSearch).trim();
    const rows = [...clients].sort((a, b) => a.name.localeCompare(b.name));
    if (!query) return rows.slice(0, 30);
    return rows.filter((client) =>
      normalized(client.name).includes(query) ||
      normalized(client.phone).includes(query) ||
      normalized(client.email).includes(query)).slice(0, 30);
  }, [clientSearch, clients]);

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

  const resetBooking = () => {
    setBookingStep("client");
    setClientSearch("");
    setSelectedClientId("");
    setQuickClientName("");
    setQuickClientPhone("");
    setQuickClientEmail("");
    setSelectedServices([]);
    setSelectedProfId("");
    setBookingDate(BOOKING_DATES[0]);
    setSelectedTime("");
    setClientNotes("");
    setAppointmentStatus("confirmed");
  };

  const openBooking = () => {
    resetBooking();
    setBookingOpen(true);
  };

  const closeBooking = () => {
    if (savingBooking) return;
    setBookingOpen(false);
  };

  const toggleService = (service: Service) => {
    setSelectedServices((current) => {
      const next = current.some((item) => item.id === service.id)
        ? current.filter((item) => item.id !== service.id)
        : [...current, service];
      const nextIds = next.map((item) => item.id);
      if (selectedProf && !professionalCanDoServices(selectedProf, nextIds)) {
        setSelectedProfId("");
        setSelectedTime("");
      }
      return next;
    });
  };

  const selectClient = (client: Client) => {
    setSelectedClientId(client.id);
    setQuickClientName("");
    setQuickClientPhone("");
    setQuickClientEmail("");
  };

  const handleBookingBack = () => {
    if (bookingStep === "client") {
      closeBooking();
      return;
    }
    const index = STEPS.indexOf(bookingStep);
    setBookingStep(STEPS[Math.max(0, index - 1)]);
  };

  const handleBookingNext = () => {
    if (bookingStep === "client") {
      if (!selectedClientId && !quickClientName.trim()) {
        Alert.alert("Selecione um cliente", "Escolha um cliente existente ou informe o nome para cadastro rapido.");
        return;
      }
      if (quickClientEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(quickClientEmail.trim())) {
        Alert.alert("Email invalido", "Revise o email do cliente ou deixe em branco.");
        return;
      }
      setBookingStep("services");
      return;
    }
    if (bookingStep === "services") {
      if (selectedServices.length === 0) {
        Alert.alert("Selecione ao menos um servico");
        return;
      }
      if (selectedProfId) setBookingStep("datetime");
      else setBookingStep("professional");
      return;
    }
    if (bookingStep === "professional") {
      if (!selectedProfId) {
        Alert.alert("Selecione um profissional");
        return;
      }
      setBookingStep("datetime");
      return;
    }
    if (bookingStep === "datetime") {
      if (!selectedTime) {
        Alert.alert("Selecione um horario");
        return;
      }
      setBookingStep("confirm");
      return;
    }
    void handleBookingConfirm();
  };

  const handleBookingConfirm = async () => {
    if (!selectedProf) return;
    if (selectedServices.length === 0 || !selectedTime) return;

    setSavingBooking(true);
    try {
      let bookingClient = selectedClient;
      if (!bookingClient) {
        bookingClient = await addClient({
          name: quickClientName.trim(),
          phone: quickClientPhone.trim(),
          email: quickClientEmail.trim().toLowerCase(),
          totalSpent: 0,
          appointmentsCount: 0,
          loyaltyPoints: 0,
          notes: "Criado durante agendamento pelo admin.",
          allergies: "",
          restrictions: "",
          preferences: "",
          emergencyContact: "",
          intakeData: {},
        });
      }

      await addAppointment({
        clientId: bookingClient.id,
        clientName: bookingClient.name,
        professionalId: selectedProf.id,
        professionalName: selectedProf.name,
        services: selectedServices,
        date: bookingDateStr,
        time: selectedTime,
        totalPrice,
        totalDuration,
        status: appointmentStatus,
        isFreeByLoyalty: false,
        clientNotes: clientNotes.trim(),
      });

      setBookingOpen(false);
      Alert.alert(
        "Agendamento criado",
        `${bookingClient.name} ficou agendado com ${selectedProf.name} em ${bookingDate.toLocaleDateString("pt-BR")} as ${selectedTime}.`,
      );
      resetBooking();
    } catch (err) {
      Alert.alert("Nao foi possivel agendar", err instanceof Error ? err.message : "Tente outro horario.");
    } finally {
      setSavingBooking(false);
    }
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
          <View style={styles.titleLeft}>
            <Text style={[styles.title, { color: colors.foreground }]}>Agenda</Text>
            {pendingCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.gold }]}>
                <Text style={[styles.badgeText, { color: colors.goldForeground }]}>{pendingCount}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={[styles.newBookingBtn, { backgroundColor: colors.gold }]} onPress={openBooking} activeOpacity={0.82}>
            <Feather name="plus" size={16} color={colors.goldForeground} />
            <Text style={[styles.newBookingText, { color: colors.goldForeground }]}>Agendar</Text>
          </TouchableOpacity>
        </View>
        <Modal
          visible={bookingOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleBookingBack}
        >
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity disabled={savingBooking} onPress={handleBookingBack}>
                <Feather name="arrow-left" size={22} color={savingBooking ? colors.mutedForeground : colors.foreground} />
              </TouchableOpacity>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>{STEP_LABELS[bookingStep]}</Text>
                <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>Novo agendamento pelo estabelecimento</Text>
              </View>
              <TouchableOpacity disabled={savingBooking} onPress={closeBooking}>
                <Feather name="x" size={22} color={savingBooking ? colors.mutedForeground : colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={styles.stepBar}>
              {STEPS.map((step) => {
                const active = STEPS.indexOf(step) <= STEPS.indexOf(bookingStep);
                return (
                  <View
                    key={step}
                    style={[styles.stepDot, { backgroundColor: active ? colors.gold : colors.border }]}
                  />
                );
              })}
            </View>

            <ScrollView
              contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 120 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {bookingStep === "client" && (
                <View style={styles.modalSection}>
                  <Text style={[styles.pickLabel, { color: colors.foreground }]}>Buscar cliente existente</Text>
                  <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Feather name="search" size={16} color={colors.mutedForeground} />
                    <TextInput
                      value={clientSearch}
                      onChangeText={setClientSearch}
                      placeholder="Nome, telefone ou email"
                      placeholderTextColor={colors.mutedForeground}
                      style={[styles.searchInput, { color: colors.foreground }]}
                      {...typedInputProps("text")}
                    />
                  </View>

                  <View style={styles.clientList}>
                    {filteredClients.map((client) => {
                      const selected = selectedClientId === client.id;
                      return (
                        <TouchableOpacity
                          key={client.id}
                          style={[
                            styles.clientRow,
                            {
                              backgroundColor: selected ? colors.gold + "18" : colors.card,
                              borderColor: selected ? colors.gold : colors.border,
                            },
                          ]}
                          onPress={() => selectClient(client)}
                          activeOpacity={0.78}
                        >
                          <View style={[styles.clientAvatar, { backgroundColor: selected ? colors.gold : colors.secondary }]}>
                            <Text style={[styles.clientAvatarText, { color: selected ? colors.goldForeground : colors.mutedForeground }]}>
                              {client.name.slice(0, 1).toUpperCase()}
                            </Text>
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.clientName, { color: colors.foreground }]} numberOfLines={1}>{client.name}</Text>
                            <Text style={[styles.clientMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                              {[client.phone, client.email].filter(Boolean).join(" · ") || "Sem contato"}
                            </Text>
                          </View>
                          {selected && <Feather name="check" size={18} color={colors.gold} />}
                        </TouchableOpacity>
                      );
                    })}
                    {filteredClients.length === 0 && (
                      <View style={styles.emptyInline}>
                        <Feather name="user" size={22} color={colors.mutedForeground} />
                        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nenhum cliente encontrado.</Text>
                      </View>
                    )}
                  </View>

                  <View style={[styles.quickClientCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.quickTitle, { color: colors.foreground }]}>Cadastro rapido</Text>
                    <Text style={[styles.quickHint, { color: colors.mutedForeground }]}>
                      Se o cliente ainda nao existe, informe o basico e ele sera criado junto com o agendamento.
                    </Text>
                    <TextInput
                      value={quickClientName}
                      onChangeText={(value) => {
                        setQuickClientName(value);
                        if (value.trim()) setSelectedClientId("");
                      }}
                      placeholder="Nome do cliente"
                      placeholderTextColor={colors.mutedForeground}
                      style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                      {...typedInputProps("text")}
                    />
                    <TextInput
                      value={quickClientPhone}
                      onChangeText={(value) => {
                        setQuickClientPhone(maskPhone(value));
                        if (value.trim()) setSelectedClientId("");
                      }}
                      placeholder="Telefone"
                      placeholderTextColor={colors.mutedForeground}
                      style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                      {...typedInputProps("phone")}
                    />
                    <TextInput
                      value={quickClientEmail}
                      onChangeText={(value) => {
                        setQuickClientEmail(value.trim().toLowerCase());
                        if (value.trim()) setSelectedClientId("");
                      }}
                      placeholder="Email opcional"
                      placeholderTextColor={colors.mutedForeground}
                      style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                      {...typedInputProps("email")}
                    />
                  </View>
                </View>
              )}

              {bookingStep === "services" && (
                <View style={styles.modalSection}>
                  {activeServices.map((service) => {
                    const selected = selectedServices.some((item) => item.id === service.id);
                    return (
                      <TouchableOpacity
                        key={service.id}
                        style={[
                          styles.serviceRow,
                          {
                            backgroundColor: selected ? colors.gold + "18" : colors.card,
                            borderColor: selected ? colors.gold : colors.border,
                          },
                        ]}
                        onPress={() => toggleService(service)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.serviceName, { color: colors.foreground }]}>{service.name}</Text>
                          <Text style={[styles.serviceMeta, { color: colors.mutedForeground }]}>
                            {formatCurrency(service.price)} · {service.duration} min
                          </Text>
                        </View>
                        <View style={[styles.checkCircle, { borderColor: selected ? colors.gold : colors.border, backgroundColor: selected ? colors.gold : "transparent" }]}>
                          {selected && <Feather name="check" size={13} color={colors.goldForeground} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  {activeServices.length === 0 && (
                    <View style={styles.emptyInline}>
                      <Feather name="briefcase" size={22} color={colors.mutedForeground} />
                      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Cadastre servicos antes de agendar.</Text>
                    </View>
                  )}
                </View>
              )}

              {bookingStep === "professional" && (
                <View style={styles.modalSection}>
                  {availableProfessionals.map((professional) => {
                    const selected = selectedProfId === professional.id;
                    return (
                      <TouchableOpacity
                        key={professional.id}
                        style={[
                          styles.professionalRow,
                          {
                            backgroundColor: selected ? colors.gold + "18" : colors.card,
                            borderColor: selected ? colors.gold : colors.border,
                          },
                        ]}
                        onPress={() => {
                          setSelectedProfId(professional.id);
                          setSelectedTime("");
                        }}
                        activeOpacity={0.78}
                      >
                        <View style={[styles.clientAvatar, { backgroundColor: selected ? colors.gold : colors.secondary }]}>
                          <Text style={[styles.clientAvatarText, { color: selected ? colors.goldForeground : colors.mutedForeground }]}>
                            {professional.avatar || professional.name.slice(0, 2).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[styles.clientName, { color: colors.foreground }]}>{professional.name}</Text>
                          <Text style={[styles.clientMeta, { color: colors.mutedForeground }]}>{professional.specialty}</Text>
                          <Text style={[styles.scheduleText, { color: colors.mutedForeground }]} numberOfLines={2}>
                            {enabledDaysLabel(professional)}
                          </Text>
                        </View>
                        {selected && <Feather name="check" size={18} color={colors.gold} />}
                      </TouchableOpacity>
                    );
                  })}
                  {availableProfessionals.length === 0 && (
                    <View style={styles.emptyInline}>
                      <Feather name="users" size={22} color={colors.mutedForeground} />
                      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                        Nenhum profissional disponivel realiza todos os servicos selecionados.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {bookingStep === "datetime" && (
                <View style={styles.modalSection}>
                  {selectedProf && (
                    <View style={[styles.scheduleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Feather name="calendar" size={15} color={colors.gold} />
                      <Text style={[styles.scheduleText, { color: colors.foreground }]}>{enabledDaysLabel(selectedProf)}</Text>
                    </View>
                  )}
                  <Text style={[styles.pickLabel, { color: colors.foreground }]}>Selecione a data</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.bookingDateRow}>
                      {BOOKING_DATES.map((day) => {
                        const value = toLocalDateString(day);
                        const selected = value === bookingDateStr;
                        const works = isWorkingDay(selectedProf, day);
                        return (
                          <TouchableOpacity
                            key={value}
                            style={[
                              styles.bookingDateChip,
                              {
                                opacity: works ? 1 : 0.42,
                                backgroundColor: selected ? colors.gold : colors.card,
                                borderColor: selected ? colors.gold : colors.border,
                              },
                            ]}
                            onPress={() => {
                              setBookingDate(day);
                              setSelectedTime("");
                            }}
                          >
                            <Text style={[styles.dateChipDay, { color: selected ? colors.goldForeground : colors.mutedForeground }]}>
                              {day.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").slice(0, 3).toUpperCase()}
                            </Text>
                            <Text style={[styles.dateChipNum, { color: selected ? colors.goldForeground : colors.foreground }]}>
                              {day.getDate()}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>

                  <Text style={[styles.pickLabel, { color: colors.foreground, marginTop: 16 }]}>Horarios disponiveis</Text>
                  {availableSlots.length === 0 ? (
                    <View style={styles.emptyInline}>
                      <Feather name="x-circle" size={22} color={colors.mutedForeground} />
                      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nenhum horario disponivel.</Text>
                    </View>
                  ) : (
                    <View style={styles.slotsGrid}>
                      {availableSlots.map((slot) => {
                        const selected = selectedTime === slot;
                        return (
                          <TouchableOpacity
                            key={slot}
                            style={[
                              styles.slotChip,
                              {
                                backgroundColor: selected ? colors.gold : colors.card,
                                borderColor: selected ? colors.gold : colors.border,
                              },
                            ]}
                            onPress={() => setSelectedTime(slot)}
                          >
                            <Text style={[styles.slotText, { color: selected ? colors.goldForeground : colors.foreground }]}>{slot}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {bookingStep === "confirm" && (
                <View style={styles.modalSection}>
                  <View style={[styles.confirmCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <ConfirmRow icon="user" label="Cliente" value={selectedClient?.name || quickClientName.trim()} colors={colors} />
                    <ConfirmRow icon="scissors" label="Profissional" value={selectedProf?.name ?? ""} colors={colors} />
                    <ConfirmRow icon="calendar" label="Data" value={bookingDate.toLocaleDateString("pt-BR")} colors={colors} />
                    <ConfirmRow icon="clock" label="Horario" value={selectedTime} colors={colors} />
                    <ConfirmRow icon="briefcase" label="Servicos" value={selectedServices.map((service) => service.name).join(", ")} colors={colors} />
                    <ConfirmRow icon="dollar-sign" label="Valor" value={formatCurrency(totalPrice)} colors={colors} />
                  </View>

                  <Text style={[styles.pickLabel, { color: colors.foreground }]}>Status inicial</Text>
                  <View style={styles.statusModeRow}>
                    {(["confirmed", "pending"] as const).map((status) => {
                      const selected = appointmentStatus === status;
                      return (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.statusModeBtn,
                            {
                              backgroundColor: selected ? colors.gold : colors.card,
                              borderColor: selected ? colors.gold : colors.border,
                            },
                          ]}
                          onPress={() => setAppointmentStatus(status)}
                        >
                          <Text style={[styles.statusModeText, { color: selected ? colors.goldForeground : colors.foreground }]}>
                            {status === "confirmed" ? "Confirmado" : "Pendente"}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.pickLabel, { color: colors.foreground }]}>Observacoes</Text>
                  <TextInput
                    value={clientNotes}
                    onChangeText={setClientNotes}
                    placeholder="Detalhes passados pelo cliente"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.notesInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
                    multiline
                    {...typedInputProps("text")}
                  />
                </View>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
              {selectedServices.length > 0 && (
                <Text style={[styles.summaryText, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {selectedServices.length} servico(s) · {formatCurrency(totalPrice)} · {totalDuration} min
                </Text>
              )}
              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: colors.gold, opacity: savingBooking ? 0.72 : 1 }]}
                disabled={savingBooking}
                onPress={handleBookingNext}
              >
                {savingBooking ? (
                  <ActivityIndicator color={colors.goldForeground} />
                ) : (
                  <>
                    <Text style={[styles.nextBtnText, { color: colors.goldForeground }]}>
                      {bookingStep === "confirm" ? "Criar agendamento" : "Proximo"}
                    </Text>
                    {bookingStep !== "confirm" && <Feather name="arrow-right" size={18} color={colors.goldForeground} />}
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.dateRow}>
            {DAYS.map((d) => {
              const ds = toLocalDateString(d);
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
            <TouchableOpacity
              style={[styles.emptyActionBtn, { backgroundColor: colors.gold }]}
              onPress={openBooking}
              activeOpacity={0.82}
            >
              <Feather name="plus" size={16} color={colors.goldForeground} />
              <Text style={[styles.emptyActionText, { color: colors.goldForeground }]}>Agendar cliente</Text>
            </TouchableOpacity>
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
      <TouchableOpacity
        style={[
          styles.floatingBookingBtn,
          { backgroundColor: colors.gold, bottom: botPad + 82 },
        ]}
        onPress={openBooking}
        activeOpacity={0.86}
      >
        <Feather name="plus" size={18} color={colors.goldForeground} />
        <Text style={[styles.floatingBookingText, { color: colors.goldForeground }]}>Agendar</Text>
      </TouchableOpacity>
    </View>
  );
}

function ConfirmRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[confirmStyles.row, { borderBottomColor: colors.border }]}>
      <View style={[confirmStyles.iconBox, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={14} color={colors.gold} />
      </View>
      <View style={confirmStyles.info}>
        <Text style={[confirmStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[confirmStyles.value, { color: colors.foreground }]}>{value || "-"}</Text>
      </View>
    </View>
  );
}

const confirmStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  label: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 2 },
  value: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});

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
    justifyContent: "space-between",
    gap: 10,
  },
  titleLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  newBookingBtn: {
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  newBookingText: { fontSize: 13, fontFamily: "Inter_700Bold" },
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
  modal: { flex: 1 },
  modalHeader: {
    minHeight: 64,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  stepBar: { flexDirection: "row", gap: 5, paddingHorizontal: 20, paddingTop: 12 },
  stepDot: { flex: 1, height: 3, borderRadius: 2 },
  modalContent: { padding: 20 },
  modalSection: { gap: 12 },
  pickLabel: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 4 },
  searchBox: {
    minHeight: 46,
    borderRadius: 13,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", paddingVertical: 8 },
  clientList: { gap: 8 },
  clientRow: { minHeight: 64, borderRadius: 14, borderWidth: 1.5, padding: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  clientAvatar: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  clientAvatarText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  clientName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  clientMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  quickClientCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10, marginTop: 4 },
  quickTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  quickHint: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
  fieldInput: { minHeight: 46, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, fontSize: 14, fontFamily: "Inter_400Regular" },
  serviceRow: { minHeight: 68, borderRadius: 14, borderWidth: 1.5, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  serviceName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  serviceMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3 },
  checkCircle: { width: 22, height: 22, borderRadius: 999, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  professionalRow: { borderRadius: 14, borderWidth: 1.5, padding: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  scheduleCard: { borderRadius: 14, borderWidth: 1, padding: 12, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  scheduleText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
  bookingDateRow: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  bookingDateChip: { width: 58, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, alignItems: "center", gap: 3 },
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotChip: { minWidth: 74, minHeight: 42, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  slotText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  emptyInline: { alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 24 },
  confirmCard: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 14 },
  statusModeRow: { flexDirection: "row", gap: 10 },
  statusModeBtn: { flex: 1, minHeight: 42, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  statusModeText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  notesInput: { minHeight: 92, borderRadius: 14, borderWidth: 1.5, padding: 12, textAlignVertical: "top", fontSize: 14, fontFamily: "Inter_400Regular" },
  modalFooter: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 12, gap: 10 },
  summaryText: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  nextBtn: { minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  nextBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  empty: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  emptyActionBtn: {
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyActionText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  floatingBookingBtn: {
    position: "absolute",
    right: 18,
    minHeight: 48,
    borderRadius: 999,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  floatingBookingText: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
