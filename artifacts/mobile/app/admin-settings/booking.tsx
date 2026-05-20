import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import {
  AVAILABILITY_MODES,
  DAY_KEYS,
  DAY_LABELS,
  DEFAULT_BUSINESS_SCHEDULE,
  SaveButton,
  Section,
  SettingsPage,
  settingsStyles as styles,
} from "@/components/admin-settings/SettingsShared";
import { useAuth, type BusinessSchedule, type ScheduleDayKey } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { typedInputProps } from "@/lib/inputProps";
import { isValidTime, maskInteger, maskTime } from "@/lib/masks";

export default function BookingSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, barbershop, updateBarbershop } = useAuth();
  const [bufferMinutes, setBufferMinutes] = useState(String(barbershop?.bookingBufferMinutes ?? 0));
  const [availabilityMode, setAvailabilityMode] = useState<"duration_buffer" | "release_on_complete">(
    barbershop?.bookingAvailabilityMode ?? "duration_buffer",
  );
  const [businessSchedule, setBusinessSchedule] = useState<BusinessSchedule>(
    barbershop?.businessSchedule ?? DEFAULT_BUSINESS_SCHEDULE,
  );
  const [busy, setBusy] = useState(false);

  if (!user || user.role !== "admin") {
    router.replace("/" as never);
    return null;
  }

  const dirty = Number(bufferMinutes || "0") !== (barbershop?.bookingBufferMinutes ?? 0)
    || availabilityMode !== (barbershop?.bookingAvailabilityMode ?? "duration_buffer")
    || JSON.stringify(businessSchedule) !== JSON.stringify(barbershop?.businessSchedule ?? DEFAULT_BUSINESS_SCHEDULE);

  const updateScheduleDay = (day: ScheduleDayKey, patch: Partial<BusinessSchedule[ScheduleDayKey]>) => {
    setBusinessSchedule((current) => ({
      ...current,
      [day]: { ...current[day], ...patch },
    }));
  };

  const save = async () => {
    const parsedBuffer = Number(bufferMinutes || "0");
    if (!Number.isInteger(parsedBuffer) || parsedBuffer < 0 || parsedBuffer > 120) {
      Alert.alert("Intervalo invalido", "Use um numero inteiro entre 0 e 120 minutos.");
      return;
    }

    const invalidDay = DAY_KEYS.find((day) => {
      const row = businessSchedule[day];
      return !isValidTime(row.startTime) ||
        !isValidTime(row.endTime) ||
        row.startTime >= row.endTime;
    });
    if (invalidDay) {
      Alert.alert("Horario invalido", `Revise o horario de ${DAY_LABELS[invalidDay]}.`);
      return;
    }

    setBusy(true);
    const result = await updateBarbershop({
      bookingBufferMinutes: parsedBuffer,
      bookingAvailabilityMode: availabilityMode,
      businessSchedule,
    });
    setBusy(false);

    if (!result.ok) {
      Alert.alert("Erro ao salvar", result.error ?? "Tente novamente em instantes.");
      return;
    }
    Alert.alert("Pronto!", "A disponibilidade foi salva.");
  };

  return (
    <SettingsPage title="Agenda e disponibilidade">
      <Section title="Agendamento" colors={colors}>
        <Text style={[styles.help, { color: colors.mutedForeground }]}>
          A duracao dos servicos bloqueia o horario real do atendimento. Aqui voce define se a
          agenda segue sempre a duracao prevista ou se o horario pode ser liberado assim que o
          atendimento for concluido.
        </Text>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Modo de liberacao</Text>
        <View style={styles.modeList}>
          {AVAILABILITY_MODES.map((mode) => {
            const selected = availabilityMode === mode.value;
            return (
              <Pressable
                key={mode.value}
                onPress={() => setAvailabilityMode(mode.value)}
                style={[
                  styles.modeCard,
                  {
                    backgroundColor: selected ? colors.gold + "18" : colors.card,
                    borderColor: selected ? colors.gold : colors.border,
                  },
                ]}
              >
                <View style={styles.modeHeader}>
                  <Text style={[styles.modeTitle, { color: selected ? colors.gold : colors.foreground }]}>
                    {mode.title}
                  </Text>
                  <View style={[
                    styles.modeDot,
                    { borderColor: selected ? colors.gold : colors.border, backgroundColor: selected ? colors.gold : "transparent" },
                  ]} />
                </View>
                <Text style={[styles.modeDescription, { color: colors.mutedForeground }]}>
                  {mode.description}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Intervalo entre atendimentos</Text>
        <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="clock" size={16} color={colors.mutedForeground} />
          <TextInput
            value={bufferMinutes}
            onChangeText={(next) => setBufferMinutes(maskInteger(next, 3))}
            placeholder="0"
            placeholderTextColor={colors.mutedForeground}
            maxLength={3}
            style={[styles.input, { color: colors.foreground }]}
            {...typedInputProps("number")}
          />
          <Text style={[styles.inputSuffix, { color: colors.mutedForeground }]}>min</Text>
        </View>

        <View style={styles.presetRow}>
          {[0, 5, 10, 15, 20, 30].map((preset) => {
            const selected = Number(bufferMinutes || "0") === preset;
            return (
              <Pressable
                key={preset}
                onPress={() => setBufferMinutes(String(preset))}
                style={[
                  styles.bufferPreset,
                  {
                    backgroundColor: selected ? colors.gold : colors.card,
                    borderColor: selected ? colors.gold : colors.border,
                  },
                ]}
              >
                <Text style={[styles.bufferPresetText, { color: selected ? colors.goldForeground : colors.foreground }]}>
                  {preset} min
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.bufferHint, { color: colors.mutedForeground }]}>
          No modo "Liberar ao concluir", esse intervalo continua valendo enquanto o atendimento estiver aberto.
        </Text>

        <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 18 }]}>Horario do estabelecimento</Text>
        <Text style={[styles.help, { color: colors.mutedForeground }]}>
          A agenda do cliente respeita este horario e tambem a escala do profissional.
        </Text>
        <View style={styles.businessScheduleList}>
          {DAY_KEYS.map((day) => {
            const row = businessSchedule[day];
            return (
              <View key={day} style={[styles.businessDayRow, { backgroundColor: colors.card, borderColor: row.enabled ? colors.gold : colors.border }]}>
                <Pressable
                  onPress={() => updateScheduleDay(day, { enabled: !row.enabled })}
                  style={styles.businessDayToggle}
                >
                  <View style={[styles.modeDot, { borderColor: row.enabled ? colors.gold : colors.border, backgroundColor: row.enabled ? colors.gold : "transparent" }]} />
                  <Text style={[styles.businessDayLabel, { color: colors.foreground }]}>{DAY_LABELS[day]}</Text>
                </Pressable>
                {row.enabled ? (
                  <View style={styles.timePair}>
                    <TextInput
                      value={row.startTime}
                      onChangeText={(value) => updateScheduleDay(day, { startTime: maskTime(value) })}
                      style={[styles.timeInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                      {...typedInputProps("time")}
                    />
                    <Text style={[styles.timeSep, { color: colors.mutedForeground }]}>as</Text>
                    <TextInput
                      value={row.endTime}
                      onChangeText={(value) => updateScheduleDay(day, { endTime: maskTime(value) })}
                      style={[styles.timeInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                      {...typedInputProps("time")}
                    />
                  </View>
                ) : (
                  <Text style={[styles.closedText, { color: colors.mutedForeground }]}>Fechado</Text>
                )}
              </View>
            );
          })}
        </View>
      </Section>

      <SaveButton dirty={dirty} busy={busy} onPress={save} />
    </SettingsPage>
  );
}
