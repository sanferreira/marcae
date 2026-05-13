import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProfessionalCard } from "@/components/ProfessionalCard";
import { ServiceCard } from "@/components/ServiceCard";
import { useAuth } from "@/contexts/AuthContext";
import { Appointment, Service, useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";

type BookingStep = "services" | "professional" | "datetime" | "confirm";

const DATES = Array.from({ length: 14 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i + 1);
  return d;
});

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { services, professionals, getAvailableSlots, addAppointment } = useData();

  const [bookingOpen, setBookingOpen] = useState(false);
  const [step, setStep] = useState<BookingStep>("services");
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedProfId, setSelectedProfId] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(DATES[0]);
  const [selectedTime, setSelectedTime] = useState("");
  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const totalPrice = selectedServices.reduce((s, sv) => s + sv.price, 0);
  const totalDuration = selectedServices.reduce((s, sv) => s + sv.duration, 0);
  const selectedProf = professionals.find((p) => p.id === selectedProfId);

  const dateStr = selectedDate
    ? selectedDate.toISOString().split("T")[0]
    : "";
  const availableSlots = selectedProfId
    ? getAvailableSlots(dateStr, selectedProfId, totalDuration)
    : [];

  const toggleService = (s: Service) => {
    Haptics.selectionAsync();
    setSelectedServices((prev) =>
      prev.find((sv) => sv.id === s.id)
        ? prev.filter((sv) => sv.id !== s.id)
        : [...prev, s]
    );
  };

  const openBooking = () => {
    setStep("services");
    setSelectedServices([]);
    setSelectedProfId("");
    setSelectedDate(DATES[0]);
    setSelectedTime("");
    setBookingOpen(true);
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === "services") {
      if (selectedServices.length === 0) {
        Alert.alert("Selecione ao menos um serviço");
        return;
      }
      setStep("professional");
    } else if (step === "professional") {
      if (!selectedProfId) {
        Alert.alert("Selecione um profissional");
        return;
      }
      setStep("datetime");
    } else if (step === "datetime") {
      if (!selectedTime) {
        Alert.alert("Selecione um horário");
        return;
      }
      setStep("confirm");
    } else {
      handleConfirm();
    }
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
    setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!user.clientId) {
      setLoading(false);
      Alert.alert("Erro", "Sua conta não está vinculada a um cliente. Faça login novamente.");
      return;
    }
    try {
      await addAppointment({
        clientId: user.clientId,
        clientName: user.name,
        professionalId: selectedProfId,
        professionalName: selectedProf.name,
        services: selectedServices,
        date: dateStr,
        time: selectedTime,
        totalPrice,
        totalDuration,
        status: "confirmed",
        isFreeByLoyalty: false,
      });
      setBookingOpen(false);
      Alert.alert("Agendado!", `Seu horário com ${selectedProf.name} foi confirmado para ${selectedDate.toLocaleDateString("pt-BR")} às ${selectedTime}.`);
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
              Olá, {user?.name.split(" ")[0]} 👋
            </Text>
            <Text style={[styles.subtitle, { color: colors.foreground }]}>
              O que vamos fazer hoje?
            </Text>
          </View>
          <Image
            source={require("@/assets/images/logo.png")}
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
            <Text style={styles.bannerLabel}>Novo agendamento</Text>
            <Text style={styles.bannerTitle}>Agendar horário</Text>
            <Text style={styles.bannerSub}>Rápido e fácil, em poucos passos</Text>
          </View>
          <View style={styles.bannerIcon}>
            <Feather name="calendar-plus" size={28} color="#0C0C0C" />
          </View>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Nossos Serviços</Text>
        <View style={styles.servicesGrid}>
          {services.filter((s) => s.isActive).map((service) => (
            <TouchableOpacity
              key={service.id}
              style={[styles.serviceChip, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={openBooking}
              activeOpacity={0.75}
            >
              <Text style={[styles.serviceChipName, { color: colors.foreground }]}>
                {service.name}
              </Text>
              <Text style={[styles.serviceChipPrice, { color: colors.gold }]}>
                R${service.price}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Nossa Equipe</Text>
        {professionals.map((p) => (
          <ProfessionalCard key={p.id} professional={p} onPress={openBooking} />
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
              {step === "services" && "Escolha os serviços"}
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
            contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 100 }]}
            showsVerticalScrollIndicator={false}
          >
            {step === "services" && (
              <>
                {services.filter((s) => s.isActive).map((s) => (
                  <ServiceCard
                    key={s.id}
                    service={s}
                    selected={!!selectedServices.find((sv) => sv.id === s.id)}
                    onPress={() => toggleService(s)}
                  />
                ))}
              </>
            )}

            {step === "professional" && (
              <>
                {professionals.map((p) => (
                  <ProfessionalCard
                    key={p.id}
                    professional={p}
                    selected={selectedProfId === p.id}
                    onPress={() => {
                      setSelectedProfId(p.id);
                      setSelectedTime("");
                    }}
                  />
                ))}
              </>
            )}

            {step === "datetime" && (
              <>
                <Text style={[styles.pickLabel, { color: colors.foreground }]}>
                  Selecione a data
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
                  <View style={styles.dateRow}>
                    {DATES.map((d) => {
                      const isSelected =
                        d.toISOString().split("T")[0] === dateStr;
                      return (
                        <TouchableOpacity
                          key={d.toISOString()}
                          style={[
                            styles.dateChip,
                            {
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
                              { color: isSelected ? "#0C0C0C" : colors.mutedForeground },
                            ]}
                          >
                            {d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase()}
                          </Text>
                          <Text
                            style={[
                              styles.dateChipNum,
                              { color: isSelected ? "#0C0C0C" : colors.foreground },
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
                    <Feather name="calendar-x" size={24} color={colors.mutedForeground} />
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
                            { color: selectedTime === slot ? "#0C0C0C" : colors.foreground },
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
                  <ConfirmRow icon="scissors" label="Serviços" value={selectedServices.map((s) => s.name).join(", ")} colors={colors} />
                  <ConfirmRow icon="clock" label="Duração" value={`${totalDuration} minutos`} colors={colors} />
                </View>
                <View style={[styles.totalRow, { backgroundColor: colors.gold + "18", borderColor: colors.gold }]}>
                  <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
                  <Text style={[styles.totalValue, { color: colors.gold }]}>R${totalPrice}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={[styles.nextBtnContainer, { paddingBottom: insets.bottom + 16, borderTopColor: colors.border }]}>
            {step === "services" && selectedServices.length > 0 && (
              <View style={[styles.summaryBar, { borderColor: colors.border }]}>
                <Text style={[styles.summaryText, { color: colors.mutedForeground }]}>
                  {selectedServices.length} serviço(s) · R${totalPrice} · {totalDuration}min
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: colors.gold }]}
              onPress={handleNext}
              disabled={loading}
            >
              <Text style={styles.nextBtnText}>
                {step === "confirm"
                  ? loading ? "Confirmando..." : "Confirmar Agendamento"
                  : "Próximo"}
              </Text>
              {step !== "confirm" && <Feather name="arrow-right" size={18} color="#0C0C0C" />}
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
    width: 100,
    height: 44,
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
  modalTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  stepBar: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  stepDot: {},
  modalContent: { paddingHorizontal: 20, paddingTop: 16 },
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
  noSlotsText: { fontSize: 14, fontFamily: "Inter_400Regular" },
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
