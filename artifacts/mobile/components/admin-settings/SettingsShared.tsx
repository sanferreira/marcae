import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { BusinessSchedule, IntakeField, ScheduleDayKey } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { typedInputProps } from "@/lib/inputProps";

export const PRIMARY_PRESETS = [
  "#556B2F", "#C49A4A", "#A07A30", "#E11D48", "#A855F7", "#6366F1",
  "#0EA5E9", "#14B8A6", "#22C55E", "#F59E0B", "#EF4444", "#1F2937",
];

export const ACCENT_PRESETS = [
  "#3A3328", "#1F1C16", "#2D1B2E", "#1E1B4B", "#0F172A", "#0C2616",
  "#7C2D12", "#3F0F0F", "#FFFFFF", "#F4F4F5", "#FEF3C7", "#FFE4E6",
];

export const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export const AVAILABILITY_MODES = [
  {
    value: "duration_buffer" as const,
    title: "Respeitar duracao + intervalo",
    description: "Mantem o horario bloqueado pela duracao configurada do atendimento e pela folga extra.",
  },
  {
    value: "release_on_complete" as const,
    title: "Liberar ao concluir",
    description: "Assim que o atendimento for marcado como concluido, o horario para de bloquear novos encaixes.",
  },
];

export const DAY_KEYS: ScheduleDayKey[] = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];

export const DAY_LABELS: Record<ScheduleDayKey, string> = {
  seg: "Segunda",
  ter: "Terca",
  qua: "Quarta",
  qui: "Quinta",
  sex: "Sexta",
  sab: "Sabado",
  dom: "Domingo",
};

export const DEFAULT_BUSINESS_SCHEDULE: BusinessSchedule = {
  seg: { enabled: true, startTime: "08:00", endTime: "18:00" },
  ter: { enabled: true, startTime: "08:00", endTime: "18:00" },
  qua: { enabled: true, startTime: "08:00", endTime: "18:00" },
  qui: { enabled: true, startTime: "08:00", endTime: "18:00" },
  sex: { enabled: true, startTime: "08:00", endTime: "18:00" },
  sab: { enabled: true, startTime: "08:00", endTime: "13:00" },
  dom: { enabled: false, startTime: "08:00", endTime: "12:00" },
};

export const INTAKE_PRESETS: { label: string; fields: IntakeField[] }[] = [
  {
    label: "Geral",
    fields: [
      { key: "goal", label: "Objetivo do atendimento", type: "textarea" },
      { key: "reference", label: "Referencia ou preferencia", type: "textarea" },
      { key: "care", label: "Cuidados ou observacoes", type: "textarea" },
    ],
  },
  {
    label: "Tatuagem",
    fields: [
      { key: "tattoo_area", label: "Area do corpo", type: "text" },
      { key: "tattoo_size", label: "Tamanho aproximado", type: "text" },
      { key: "tattoo_reference", label: "Referencia da arte", type: "textarea" },
      { key: "skin_condition", label: "Restricoes de pele ou cicatriz", type: "textarea" },
    ],
  },
  {
    label: "Estetica",
    fields: [
      { key: "skin_type", label: "Tipo de pele", type: "text" },
      { key: "current_products", label: "Produtos em uso", type: "textarea" },
      { key: "contraindications", label: "Contraindicacoes", type: "textarea" },
    ],
  },
  {
    label: "Massagem",
    fields: [
      { key: "pain_points", label: "Pontos de tensao ou dor", type: "textarea" },
      { key: "pressure_level", label: "Pressao preferida", type: "text" },
      { key: "medical_notes", label: "Observacoes medicas", type: "textarea" },
    ],
  },
];

type Colors = ReturnType<typeof useColors>;

export function SettingsPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const colors = useColors();
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/" as never);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title, headerShown: false }} />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={handleBack} hitSlop={12}>
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Section({
  title,
  colors,
  children,
}: {
  title: string;
  colors: Colors;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
      {children}
    </View>
  );
}

export function SaveButton({
  dirty,
  busy,
  onPress,
}: {
  dirty: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      disabled={!dirty || busy}
      style={[
        styles.saveBtn,
        { backgroundColor: dirty ? colors.gold : colors.muted, opacity: busy ? 0.7 : 1 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={colors.primaryForeground} />
      ) : (
        <Text style={[styles.saveBtnText, { color: dirty ? colors.primaryForeground : colors.mutedForeground }]}>
          {dirty ? "Salvar mudancas" : "Sem alteracoes"}
        </Text>
      )}
    </Pressable>
  );
}

export function SettingsActionRow({
  icon,
  title,
  description,
  onPress,
  colors,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  description: string;
  onPress: () => void;
  colors: Colors;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={onPress}
      style={[styles.actionRow, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={[styles.actionIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={16} color={colors.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.actionTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.actionDescription, { color: colors.mutedForeground }]}>{description}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

export function ColorField({
  label,
  value,
  onChange,
  presets,
  colors,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  presets: string[];
  colors: Colors;
}) {
  const valid = HEX_RE.test(value);

  return (
    <View style={{ marginTop: 14 }}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: valid ? colors.border : colors.destructive }]}>
        <View style={[styles.swatchPreview, { backgroundColor: valid ? value : colors.muted, borderColor: colors.border }]} />
        <TextInput
          value={value}
          onChangeText={(next) => {
            const cleaned = next.replace(/[^0-9A-Fa-f]/g, "").slice(0, 6).toUpperCase();
            onChange(cleaned ? `#${cleaned}` : "");
          }}
          placeholder="#RRGGBB"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={7}
          style={[styles.input, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
          {...typedInputProps("text")}
        />
      </View>

      <View style={styles.presetRow}>
        {presets.map((color) => (
          <Pressable
            key={color}
            onPress={() => onChange(color)}
            style={[
              styles.swatch,
              {
                backgroundColor: color,
                borderColor: value.toUpperCase() === color.toUpperCase() ? colors.foreground : colors.border,
                borderWidth: value.toUpperCase() === color.toUpperCase() ? 3 : 1,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export function hexLuminance(hex: string): number {
  const match = /^#([0-9A-F]{6})$/i.exec(hex);
  if (!match) return 0;

  const number = parseInt(match[1], 16);
  const red = (number >> 16) & 255;
  const green = (number >> 8) & 255;
  const blue = number & 255;

  return (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
}

export const settingsStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  scroll: { padding: 20, paddingBottom: 60 },
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  help: { fontSize: 13, lineHeight: 19, marginBottom: 8, fontFamily: "Inter_400Regular" },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  inputSuffix: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  swatchPreview: { width: 24, height: 24, borderRadius: 6, borderWidth: 1 },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  swatch: { width: 32, height: 32, borderRadius: 8 },
  modeList: { gap: 10, marginTop: 4, marginBottom: 14 },
  modeCard: { borderRadius: 14, borderWidth: 1.5, padding: 14, gap: 8 },
  modeHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  modeTitle: { flex: 1, fontSize: 14, fontFamily: "Inter_700Bold" },
  modeDescription: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  modeDot: { width: 16, height: 16, borderRadius: 999, borderWidth: 2 },
  bufferPreset: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  bufferPresetText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  bufferHint: { fontSize: 12, lineHeight: 18, marginTop: 10, fontFamily: "Inter_400Regular" },
  businessScheduleList: { gap: 8, marginTop: 8 },
  businessDayRow: { borderRadius: 14, borderWidth: 1.5, padding: 12, gap: 10 },
  businessDayToggle: { flexDirection: "row", alignItems: "center", gap: 10 },
  businessDayLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  timePair: { flexDirection: "row", alignItems: "center", gap: 8 },
  timeInput: {
    width: 86,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  timeSep: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  closedText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  intakeList: { gap: 8, marginTop: 12 },
  intakeRow: { borderRadius: 14, borderWidth: 1, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  linkInline: { fontSize: 13, fontFamily: "Inter_700Bold" },
  previewCard: {
    marginTop: 18,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 12,
  },
  previewBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  previewBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.4 },
  previewName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  previewBtn: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  previewBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  saveBtn: { paddingVertical: 16, borderRadius: 14, alignItems: "center", marginBottom: 24 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  linkRowText: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  actionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  actionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  actionDescription: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 2 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 4,
  },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});

const styles = settingsStyles;
