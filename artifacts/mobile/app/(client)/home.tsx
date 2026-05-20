import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
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

import { ProfessionalCard } from "@/components/ProfessionalCard";
import { ServiceCard } from "@/components/ServiceCard";
import { CLIENT_APPOINTMENT_CHANGE_POLICY_NOTICE } from "@/constants/appointmentPolicy";
import { useAuth } from "@/contexts/AuthContext";
import { Product, Professional, Service, useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";
import { addLocalDays, toLocalDateString } from "@/lib/dates";
import { typedInputProps } from "@/lib/inputProps";
import { maskIsoDate, maskPhone } from "@/lib/masks";

type BookingStep = "services" | "professional" | "datetime" | "confirm";

const DATES = Array.from({ length: 14 }, (_, i) => addLocalDays(i + 1));

const JS_DAY_KEYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function professionalCanDoServices(professional: Professional, serviceIds: string[]) {
  const allowed = professional.serviceIds ?? [];
  if (allowed.length === 0) return true;
  return serviceIds.every((id) => allowed.includes(id));
}

function enabledDaysLabel(professional?: Professional) {
  const schedule = professional?.schedule;
  if (!schedule) return "Escala ainda não configurada.";
  const labels: Record<string, string> = { seg: "Seg", ter: "Ter", qua: "Qua", qui: "Qui", sex: "Sex", sab: "Sáb", dom: "Dom" };
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

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, barbershop } = useAuth();
  const {
    services,
    products,
    professionals,
    clients,
    getAvailableSlots,
    addAppointment,
    createProductOrder,
    updateClient,
  } = useData();

  const [bookingOpen, setBookingOpen] = useState(false);
  const [step, setStep] = useState<BookingStep>("services");
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedProfId, setSelectedProfId] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(DATES[0]);
  const [selectedTime, setSelectedTime] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [intakeAnswers, setIntakeAnswers] = useState<Record<string, string>>({});
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const topPad = insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const activeServices = services.filter((service) => service.isActive);
  const activeProducts = products.filter((product) => product.isActive && product.stock > 0);
  const intakeFields = barbershop?.intakeFields ?? [];
  const selectedServiceIds = selectedServices.map((service) => service.id);
  const selectedProf = professionals.find((p) => p.id === selectedProfId);
  const currentClient = clients.find((client) => client.id === user?.clientId);
  const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);
  const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0);

  const dateStr = toLocalDateString(selectedDate);
  const availableSlots = selectedProfId && totalDuration > 0
    ? getAvailableSlots(dateStr, selectedProfId, totalDuration)
    : [];

  const servicesForCurrentContext = useMemo(() => {
    if (!selectedProf) return activeServices;
    const allowed = selectedProf.serviceIds ?? [];
    if (allowed.length === 0) return activeServices;
    return activeServices.filter((service) => allowed.includes(service.id));
  }, [activeServices, selectedProf]);

  const filteredProfessionals = professionals
    .filter((professional) => professional.isAvailable)
    .filter((professional) => selectedServiceIds.length === 0 || professionalCanDoServices(professional, selectedServiceIds));

  const productCartItems = activeProducts
    .map((product) => ({ product, quantity: productQuantities[product.id] ?? 0 }))
    .filter((item) => item.quantity > 0);
  const productTotal = productCartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const resetBooking = () => {
    setSelectedServices([]);
    setSelectedProfId("");
    setSelectedDate(DATES[0]);
    setSelectedTime("");
    setClientNotes("");
    setIntakeAnswers({});
    setProductQuantities({});
  };

  const openBooking = () => {
    resetBooking();
    setStep("services");
    setBookingOpen(true);
  };

  const openBookingWithService = (service: Service) => {
    resetBooking();
    setSelectedServices([service]);
    setStep("professional");
    setBookingOpen(true);
  };

  const openBookingWithProfessional = (professional: Professional) => {
    resetBooking();
    setSelectedProfId(professional.id);
    setStep("services");
    setBookingOpen(true);
  };

  const toggleService = (service: Service) => {
    Haptics.selectionAsync();
    setSelectedServices((current) => {
      const next = current.find((item) => item.id === service.id)
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

  const updateProductQuantity = (product: Product, next: number) => {
    Haptics.selectionAsync();
    setProductQuantities((current) => ({
      ...current,
      [product.id]: Math.max(0, Math.min(product.stock, next)),
    }));
  };

  const updateIntakeAnswer = (key: string, type: string, value: string) => {
    const next = type === "phone" ? maskPhone(value) : type === "date" ? maskIsoDate(value) : value;
    setIntakeAnswers((current) => ({ ...current, [key]: next }));
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === "services") {
      if (selectedServices.length === 0) {
        Alert.alert("Selecione ao menos um serviço");
        return;
      }
      if (selectedProfId) setStep("datetime");
      else setStep("professional");
      return;
    }

    if (step === "professional") {
      if (!selectedProfId) {
        Alert.alert("Selecione um profissional");
        return;
      }
      setStep("datetime");
      return;
    }

    if (step === "datetime") {
      if (!selectedTime) {
        Alert.alert("Selecione um horário");
        return;
      }
      setStep("confirm");
      return;
    }

    void handleConfirm();
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === "professional") setStep("services");
    else if (step === "datetime") setStep("professional");
    else if (step === "confirm") setStep("datetime");
    else setBookingOpen(false);
  };

  const handleConfirm = async () => {
    if (!user || !selectedProf) return;
    if (!user.clientId) {
      Alert.alert("Erro", "Sua conta não está vinculada a um cliente. Faça login novamente.");
      return;
    }

    setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const rawIntakeAnswers = { ...(currentClient?.intakeData ?? {}), ...intakeAnswers };
      const cleanIntakeAnswers = Object.fromEntries(
        Object.entries(rawIntakeAnswers)
          .map(([key, value]) => [key, value.trim()] as const)
          .filter(([, value]) => value.length > 0),
      );
      const intakeNotes = intakeFields
        .map((field) => {
          const value = cleanIntakeAnswers[field.key];
          return value ? `${field.label}: ${value}` : "";
        })
        .filter(Boolean)
        .join("\n");
      const notesWithFicha = [
        clientNotes.trim(),
        intakeNotes ? `Ficha do atendimento:\n${intakeNotes}` : "",
      ].filter(Boolean).join("\n\n");

      const appointment = await addAppointment({
        clientId: user.clientId,
        clientName: user.name,
        professionalId: selectedProfId,
        professionalName: selectedProf.name,
        services: selectedServices,
        date: dateStr,
        time: selectedTime,
        totalPrice,
        totalDuration,
        status: "pending",
        isFreeByLoyalty: false,
        clientNotes: notesWithFicha,
      });

      let productWarning = "";
      let fichaWarning = "";
      if (currentClient && Object.keys(intakeAnswers).length > 0) {
        try {
          await updateClient({
            ...currentClient,
            intakeData: {
              ...(currentClient.intakeData ?? {}),
              ...Object.fromEntries(Object.entries(intakeAnswers).map(([key, value]) => [key, value.trim()])),
            },
          });
        } catch (err) {
          fichaWarning = `\n\nFicha: ${err instanceof Error ? err.message : "nao foi possivel salvar a ficha personalizada."}`;
        }
      }
      if (productCartItems.length > 0) {
        try {
          await createProductOrder(
            productCartItems.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
            `Pedido junto ao agendamento de ${dateStr} as ${selectedTime}`,
            appointment.id,
          );
        } catch (err) {
          productWarning = `\n\nProdutos: ${err instanceof Error ? err.message : "não foi possível enviar o pedido."}`;
        }
      }

      setBookingOpen(false);
      Alert.alert(
        "Agendamento solicitado!",
        `Seu horario com ${selectedProf.name} ficou pendente para ${selectedDate.toLocaleDateString("pt-BR")} as ${selectedTime}. Voce pode confirmar presenca em Meus Agendamentos.${productWarning}${fichaWarning}`,
      );
      resetBooking();
    } catch (e) {
      Alert.alert("Não foi possível agendar", (e as Error).message ?? "Tente outro horário.");
    } finally {
      setLoading(false);
    }
  };

  const STEPS: BookingStep[] = ["services", "professional", "datetime", "confirm"];
  const stepIdx = STEPS.indexOf(step);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 16, paddingBottom: botPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
              Olá, {user?.name.split(" ")[0]}
            </Text>
            <Text style={[styles.subtitle, { color: colors.foreground }]}>
              O que vamos fazer hoje?
            </Text>
          </View>
          <Image
            source={require("@/assets/images/logo-small.png")}
            style={styles.logoMark}
            resizeMode="contain"
          />
        </View>

        <TouchableOpacity
          style={[styles.bookBanner, { backgroundColor: colors.gold }]}
          onPress={openBooking}
          activeOpacity={0.88}
        >
          <View>
            <Text style={[styles.bannerLabel, { color: colors.goldForeground }]}>Novo agendamento</Text>
            <Text style={[styles.bannerTitle, { color: colors.goldForeground }]}>Agendar horário</Text>
            <Text style={[styles.bannerSub, { color: colors.goldForeground }]}>Escolha serviço, profissional e horário</Text>
          </View>
          <View style={styles.bannerIcon}>
            <Feather name="plus-circle" size={28} color={colors.goldForeground} />
          </View>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Serviços</Text>
        <View style={styles.servicesGrid}>
          {activeServices.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={[styles.serviceChip, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => openBookingWithService(service)}
              activeOpacity={0.75}
            >
              <Text style={[styles.serviceChipName, { color: colors.foreground }]}>
                {service.name}
              </Text>
              <Text style={[styles.serviceChipPrice, { color: colors.gold }]}>
                {formatCurrency(service.price)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Equipe</Text>
        {professionals.filter((p) => p.isAvailable).map((p) => (
          <ProfessionalCard key={p.id} professional={p} onPress={() => openBookingWithProfessional(p)} />
        ))}
      </ScrollView>

      <Modal
        visible={bookingOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleBack}
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={handleBack}>
              <Feather name="arrow-left" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {step === "services" && (selectedProf ? `Serviços de ${selectedProf.name}` : "Escolha os serviços")}
              {step === "professional" && "Escolha o profissional"}
              {step === "datetime" && "Data e horário"}
              {step === "confirm" && "Confirmar agendamento"}
            </Text>
            <TouchableOpacity onPress={() => setBookingOpen(false)}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={styles.stepBar}>
            {STEPS.map((s, i) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: i <= stepIdx ? colors.gold : colors.border,
                    flex: 1,
                    height: 3,
                    borderRadius: 2,
                  },
                ]}
              />
            ))}
          </View>

          <ScrollView
            contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 118 }]}
            showsVerticalScrollIndicator={false}
          >
            {step === "services" && (
              <>
                {servicesForCurrentContext.map((s) => (
                  <ServiceCard
                    key={s.id}
                    service={s}
                    selected={!!selectedServices.find((sv) => sv.id === s.id)}
                    onPress={() => toggleService(s)}
                  />
                ))}
                {servicesForCurrentContext.length === 0 && (
                  <View style={styles.noSlots}>
                    <Feather name="briefcase" size={24} color={colors.mutedForeground} />
                    <Text style={[styles.noSlotsText, { color: colors.mutedForeground }]}>
                      Este profissional ainda não tem serviços vinculados.
                    </Text>
                  </View>
                )}
              </>
            )}

            {step === "professional" && (
              <>
                {filteredProfessionals.map((p) => (
                  <View key={p.id}>
                    <ProfessionalCard
                      professional={p}
                      selected={selectedProfId === p.id}
                      onPress={() => {
                        setSelectedProfId(p.id);
                        setSelectedTime("");
                      }}
                    />
                    {selectedProfId === p.id && (
                      <View style={[styles.scheduleCard, { backgroundColor: colors.gold + "12", borderColor: colors.gold + "55" }]}>
                        <Feather name="calendar" size={15} color={colors.gold} />
                        <Text style={[styles.scheduleText, { color: colors.foreground }]}>
                          {enabledDaysLabel(p)}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
                {filteredProfessionals.length === 0 && (
                  <View style={styles.noSlots}>
                    <Feather name="users" size={24} color={colors.mutedForeground} />
                    <Text style={[styles.noSlotsText, { color: colors.mutedForeground }]}>
                      Nenhum profissional realiza todos os serviços selecionados.
                    </Text>
                  </View>
                )}
              </>
            )}

            {step === "datetime" && (
              <>
                {selectedProf && (
                  <View style={[styles.scheduleCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 14 }]}>
                    <Feather name="calendar" size={15} color={colors.gold} />
                    <Text style={[styles.scheduleText, { color: colors.foreground }]}>
                      {enabledDaysLabel(selectedProf)}
                    </Text>
                  </View>
                )}
                <Text style={[styles.pickLabel, { color: colors.foreground }]}>
                  Selecione a data
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
                  <View style={styles.dateRow}>
                    {DATES.map((d) => {
                      const dateValue = toLocalDateString(d);
                      const isSelected = dateValue === dateStr;
                      const works = isWorkingDay(selectedProf, d);
                      return (
                        <TouchableOpacity
                          key={dateValue}
                          style={[
                            styles.dateChip,
                            {
                              opacity: works ? 1 : 0.42,
                              backgroundColor: isSelected ? colors.gold : colors.card,
                              borderColor: isSelected ? colors.gold : colors.border,
                            },
                          ]}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setSelectedDate(d);
                            setSelectedTime("");
                          }}
                        >
                          <Text
                            style={[
                              styles.dateChipDay,
                              { color: isSelected ? colors.goldForeground : colors.mutedForeground },
                            ]}
                          >
                            {d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase()}
                          </Text>
                          <Text
                            style={[
                              styles.dateChipNum,
                              { color: isSelected ? colors.goldForeground : colors.foreground },
                            ]}
                          >
                            {d.getDate()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                <Text style={[styles.pickLabel, { color: colors.foreground, marginTop: 16 }]}>
                  Horários disponíveis
                </Text>
                {availableSlots.length === 0 ? (
                  <View style={styles.noSlots}>
                    <Feather name="x-circle" size={24} color={colors.mutedForeground} />
                    <Text style={[styles.noSlotsText, { color: colors.mutedForeground }]}>
                      Nenhum horário disponível
                    </Text>
                  </View>
                ) : (
                  <View style={styles.slotsGrid}>
                    {availableSlots.map((slot) => (
                      <TouchableOpacity
                        key={slot}
                        style={[
                          styles.slotChip,
                          {
                            backgroundColor: selectedTime === slot ? colors.gold : colors.card,
                            borderColor: selectedTime === slot ? colors.gold : colors.border,
                          },
                        ]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setSelectedTime(slot);
                        }}
                      >
                        <Text
                          style={[
                            styles.slotText,
                            { color: selectedTime === slot ? colors.goldForeground : colors.foreground },
                          ]}
                        >
                          {slot}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            {step === "confirm" && (
              <View style={styles.confirmSection}>
                <View style={[styles.confirmCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <ConfirmRow icon="user" label="Profissional" value={selectedProf?.name ?? ""} colors={colors} />
                  <ConfirmRow icon="calendar" label="Data" value={selectedDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })} colors={colors} />
                  <ConfirmRow icon="clock" label="Horário" value={selectedTime} colors={colors} />
                  <ConfirmRow icon="briefcase" label="Serviços" value={selectedServices.map((s) => s.name).join(", ")} colors={colors} />
                  <ConfirmRow icon="clock" label="Duração" value={`${totalDuration} minutos`} colors={colors} />
                </View>

                {activeProducts.length > 0 && (
                  <View style={[styles.productBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.productTitle, { color: colors.foreground }]}>Produtos opcionais</Text>
                    <Text style={[styles.productHint, { color: colors.mutedForeground }]}>
                      Separe produtos para retirar ou combinar com a equipe no atendimento.
                    </Text>
                    {activeProducts.slice(0, 8).map((product) => {
                      const quantity = productQuantities[product.id] ?? 0;
                      return (
                        <View key={product.id} style={[styles.productRow, { borderTopColor: colors.border }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.productName, { color: colors.foreground }]}>{product.name}</Text>
                            <Text style={[styles.productMeta, { color: colors.mutedForeground }]}>
                              {formatCurrency(product.price)} · {product.stock} em estoque
                            </Text>
                          </View>
                          <View style={styles.productStepper}>
                            <TouchableOpacity style={[styles.productStepBtn, { backgroundColor: colors.secondary }]} onPress={() => updateProductQuantity(product, quantity - 1)}>
                              <Feather name="minus" size={13} color={colors.foreground} />
                            </TouchableOpacity>
                            <Text style={[styles.productQty, { color: colors.foreground }]}>{quantity}</Text>
                            <TouchableOpacity style={[styles.productStepBtn, { backgroundColor: colors.gold }]} onPress={() => updateProductQuantity(product, quantity + 1)}>
                              <Feather name="plus" size={13} color={colors.goldForeground} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                    {productCartItems.length > 0 && (
                      <View style={[styles.productTotal, { borderTopColor: colors.border }]}>
                        <Text style={[styles.productTotalLabel, { color: colors.mutedForeground }]}>Produtos</Text>
                        <Text style={[styles.productTotalValue, { color: colors.gold }]}>{formatCurrency(productTotal)}</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={[styles.totalRow, { backgroundColor: colors.gold + "18", borderColor: colors.gold }]}>
                  <Text style={[styles.totalLabel, { color: colors.foreground }]}>Atendimento</Text>
                  <Text style={[styles.totalValue, { color: colors.gold }]}>{formatCurrency(totalPrice)}</Text>
                </View>
                <View style={[styles.notesBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.productTitle, { color: colors.foreground }]}>Observacoes para o atendimento</Text>
                  <TextInput
                    style={[styles.notesInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={clientNotes}
                    onChangeText={setClientNotes}
                    placeholder="Ex: alergia, preferencia, referencia ou detalhe importante"
                    placeholderTextColor={colors.mutedForeground}
                    multiline
                    {...typedInputProps("text")}
                  />
                </View>
                {intakeFields.length > 0 && (
                  <View style={[styles.notesBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.productTitle, { color: colors.foreground }]}>Ficha personalizada</Text>
                    <Text style={[styles.productHint, { color: colors.mutedForeground }]}>
                      Preencha as informacoes que ajudam a equipe a preparar o atendimento.
                    </Text>
                    {intakeFields.map((field) => (
                      <View key={field.key} style={styles.intakeField}>
                        <Text style={[styles.intakeLabel, { color: colors.mutedForeground }]}>{field.label}</Text>
                        <TextInput
                          {...typedInputProps(field.type === "phone" ? "phone" : field.type === "date" ? "date" : "text")}
                          style={[styles.notesInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, minHeight: field.type === "textarea" ? 76 : 48 }]}
                          value={intakeAnswers[field.key] ?? currentClient?.intakeData?.[field.key] ?? ""}
                          onChangeText={(value) => updateIntakeAnswer(field.key, field.type, value)}
                          placeholder={field.label}
                          placeholderTextColor={colors.mutedForeground}
                          multiline={field.type === "textarea"}
                        />
                      </View>
                    ))}
                  </View>
                )}
                <View style={[styles.policyNotice, { backgroundColor: colors.gold + "12", borderColor: colors.gold + "44" }]}>
                  <Feather name="info" size={15} color={colors.gold} />
                  <Text style={[styles.policyNoticeText, { color: colors.gold }]}>
                    {CLIENT_APPOINTMENT_CHANGE_POLICY_NOTICE}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={[styles.nextBtnContainer, { paddingBottom: insets.bottom + 16, borderTopColor: colors.border }]}>
            {selectedServices.length > 0 && (
              <View style={[styles.summaryBar, { borderColor: colors.border }]}>
                <Text style={[styles.summaryText, { color: colors.mutedForeground }]}>
                  {selectedServices.length} serviço(s) · {formatCurrency(totalPrice)} · {totalDuration}min
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: colors.gold }]}
              onPress={handleNext}
              disabled={loading}
            >
              <Text style={[styles.nextBtnText, { color: colors.goldForeground }]}>
                {step === "confirm"
                  ? loading ? "Enviando..." : "Solicitar agendamento"
                  : "Próximo"}
              </Text>
              {step !== "confirm" && <Feather name="arrow-right" size={18} color={colors.goldForeground} />}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ConfirmRow({ icon, label, value, colors }: { icon: React.ComponentProps<typeof Feather>["name"]; label: string; value: string; colors: any }) {
  return (
    <View style={[confirmStyles.row, { borderBottomColor: colors.border }]}>
      <View style={[confirmStyles.iconBox, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={14} color={colors.gold} />
      </View>
      <View style={confirmStyles.info}>
        <Text style={[confirmStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[confirmStyles.value, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

const confirmStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1 },
  label: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 2 },
  value: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: { fontSize: 14, fontFamily: "Inter_400Regular" },
  subtitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 2 },
  logoMark: {
    width: 124,
    height: 52,
  },
  bookBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 20,
    padding: 22,
  },
  bannerLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#0C0C0C",
    opacity: 0.7,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#0C0C0C",
  },
  bannerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#0C0C0C",
    opacity: 0.7,
    marginTop: 2,
  },
  bannerIcon: { opacity: 0.8 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: -8,
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  serviceChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  serviceChipName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  serviceChipPrice: { fontSize: 12, fontFamily: "Inter_700Bold" },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { flex: 1, textAlign: "center", fontSize: 16, fontFamily: "Inter_700Bold" },
  stepBar: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  stepDot: {},
  modalContent: { paddingHorizontal: 20, paddingTop: 16 },
  scheduleCard: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: -4, marginBottom: 10 },
  scheduleText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 17 },
  pickLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 12 },
  dateScroll: { marginBottom: 8 },
  dateRow: { flexDirection: "row", gap: 8 },
  dateChip: {
    width: 54,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    gap: 4,
  },
  dateChipDay: { fontSize: 10, fontFamily: "Inter_500Medium" },
  dateChipNum: { fontSize: 18, fontFamily: "Inter_700Bold" },
  noSlots: { alignItems: "center", paddingVertical: 32, gap: 8 },
  noSlotsText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  slotChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  slotText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  confirmSection: { gap: 16 },
  confirmCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  productBox: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 6 },
  productTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  productHint: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17, marginBottom: 4 },
  productRow: { flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, paddingTop: 10, marginTop: 6 },
  productName: { fontSize: 13, fontFamily: "Inter_700Bold" },
  productMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  productStepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  productStepBtn: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  productQty: { minWidth: 18, textAlign: "center", fontSize: 14, fontFamily: "Inter_700Bold" },
  productTotal: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, paddingTop: 10, marginTop: 6 },
  productTotalLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  productTotalValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  notesBox: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  notesInput: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, minHeight: 76, fontSize: 14, fontFamily: "Inter_400Regular", textAlignVertical: "top" },
  intakeField: { gap: 6 },
  intakeLabel: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  totalLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  totalValue: { fontSize: 24, fontFamily: "Inter_700Bold" },
  policyNotice: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  policyNoticeText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 18 },
  nextBtnContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 10,
    backgroundColor: "transparent",
  },
  summaryBar: {
    alignItems: "center",
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 10,
  },
  summaryText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  nextBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0C0C0C" },
});
