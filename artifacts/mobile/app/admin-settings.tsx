import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SupportChannels } from "@/components/SupportChannels";
import { useAuth, type BusinessSchedule, type IntakeField, type ScheduleDayKey } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { BASE_PLAN_PRICE_LABEL, PAYMENT_PENDING_PLAN, getPlanDisplayName } from "@/constants/plans";
import { apiFetch } from "@/lib/api";
import { typedInputProps } from "@/lib/inputProps";
import { isValidTime, maskInteger, maskPhone, maskTime } from "@/lib/masks";

const PRIMARY_PRESETS = [
  "#556B2F", "#C49A4A", "#A07A30", "#E11D48", "#A855F7", "#6366F1",
  "#0EA5E9", "#14B8A6", "#22C55E", "#F59E0B", "#EF4444", "#1F2937",
];

const ACCENT_PRESETS = [
  "#3A3328", "#1F1C16", "#2D1B2E", "#1E1B4B", "#0F172A", "#0C2616",
  "#7C2D12", "#3F0F0F", "#FFFFFF", "#F4F4F5", "#FEF3C7", "#FFE4E6",
];

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
const AVAILABILITY_MODES = [
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
const DAY_KEYS: ScheduleDayKey[] = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];
const DAY_LABELS: Record<ScheduleDayKey, string> = {
  seg: "Segunda",
  ter: "Terca",
  qua: "Quarta",
  qui: "Quinta",
  sex: "Sexta",
  sab: "Sabado",
  dom: "Domingo",
};
const DEFAULT_BUSINESS_SCHEDULE: BusinessSchedule = {
  seg: { enabled: true, startTime: "08:00", endTime: "18:00" },
  ter: { enabled: true, startTime: "08:00", endTime: "18:00" },
  qua: { enabled: true, startTime: "08:00", endTime: "18:00" },
  qui: { enabled: true, startTime: "08:00", endTime: "18:00" },
  sex: { enabled: true, startTime: "08:00", endTime: "18:00" },
  sab: { enabled: true, startTime: "08:00", endTime: "13:00" },
  dom: { enabled: false, startTime: "08:00", endTime: "12:00" },
};
const INTAKE_PRESETS: { label: string; fields: IntakeField[] }[] = [
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

export default function AdminSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, barbershop, updateBarbershop, openBillingPortal, logout, planStatus } = useAuth();

  const [name, setName] = useState(barbershop?.name ?? "");
  const [phone, setPhone] = useState(maskPhone(barbershop?.phone ?? ""));
  const [address, setAddress] = useState(barbershop?.address ?? "");
  const [primary, setPrimary] = useState(barbershop?.brandPrimary ?? "#556B2F");
  const [accent, setAccent] = useState(barbershop?.brandAccent ?? "#3A3328");
  const [bufferMinutes, setBufferMinutes] = useState(String(barbershop?.bookingBufferMinutes ?? 0));
  const [availabilityMode, setAvailabilityMode] = useState<"duration_buffer" | "release_on_complete">(
    barbershop?.bookingAvailabilityMode ?? "duration_buffer",
  );
  const [businessSchedule, setBusinessSchedule] = useState<BusinessSchedule>(
    barbershop?.businessSchedule ?? DEFAULT_BUSINESS_SCHEDULE,
  );
  const [intakeFields, setIntakeFields] = useState<IntakeField[]>(
    barbershop?.intakeFields?.length ? barbershop.intakeFields : INTAKE_PRESETS[0].fields,
  );
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user || user.role !== "admin") {
    router.replace("/" as never);
    return null;
  }

  const dirty = name.trim() !== barbershop?.name
    || phone.trim() !== maskPhone(barbershop?.phone ?? "")
    || address.trim() !== (barbershop?.address ?? "")
    || primary.toUpperCase() !== (barbershop?.brandPrimary ?? "").toUpperCase()
    || accent.toUpperCase() !== (barbershop?.brandAccent ?? "").toUpperCase()
    || Number(bufferMinutes || "0") !== (barbershop?.bookingBufferMinutes ?? 0)
    || availabilityMode !== (barbershop?.bookingAvailabilityMode ?? "duration_buffer")
    || JSON.stringify(businessSchedule) !== JSON.stringify(barbershop?.businessSchedule ?? DEFAULT_BUSINESS_SCHEDULE)
    || JSON.stringify(intakeFields) !== JSON.stringify(barbershop?.intakeFields?.length ? barbershop.intakeFields : INTAKE_PRESETS[0].fields);

  const updateScheduleDay = (day: ScheduleDayKey, patch: Partial<BusinessSchedule[ScheduleDayKey]>) => {
    setBusinessSchedule((current) => ({
      ...current,
      [day]: { ...current[day], ...patch },
    }));
  };

  const applyIntakePreset = (fields: IntakeField[]) => {
    setIntakeFields(fields.map((field) => ({ ...field })));
  };

  const addCustomField = () => {
    const label = newFieldLabel.trim();
    if (!label || intakeFields.length >= 12) return;
    const key = label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || `campo_${intakeFields.length + 1}`;
    const uniqueKey = intakeFields.some((field) => field.key === key) ? `${key}_${intakeFields.length + 1}` : key;
    setIntakeFields((current) => [...current, { key: uniqueKey, label, type: "text" }]);
    setNewFieldLabel("");
  };

  const save = async () => {
    const parsedBuffer = Number(bufferMinutes || "0");
    if (!HEX_RE.test(primary) || !HEX_RE.test(accent)) {
      Alert.alert("Cor invalida", "Use o formato hexadecimal #RRGGBB, por exemplo #556B2F.");
      return;
    }
    if (!Number.isInteger(parsedBuffer) || parsedBuffer < 0 || parsedBuffer > 120) {
      Alert.alert("Intervalo invalido", "Use um numero inteiro entre 0 e 120 minutos.");
      return;
    }

    if (!name.trim()) {
      Alert.alert("Nome obrigatorio", "Informe o nome do estabelecimento.");
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
    if (intakeFields.length === 0) {
      Alert.alert("Ficha vazia", "Mantenha pelo menos um campo na ficha do cliente.");
      return;
    }

    setBusy(true);
    const result = await updateBarbershop({
      name: name.trim(),
      phone: phone.trim() || null,
      address: address.trim() || null,
      brandPrimary: primary.toUpperCase(),
      brandAccent: accent.toUpperCase(),
      bookingBufferMinutes: parsedBuffer,
      bookingAvailabilityMode: availabilityMode,
      businessSchedule,
      intakeFields,
    });
    setBusy(false);

    if (!result.ok) {
      Alert.alert("Erro ao salvar", result.error ?? "Tente novamente em instantes.");
      return;
    }

    Alert.alert("Pronto!", "As mudancas foram salvas.");
  };

  const runLogout = async () => {
    await logout();
  };

  const handleLogout = () => {
    Alert.alert("Sair", "Deseja sair da conta?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => { void runLogout(); } },
    ]);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/" as never);
  };

  const handleBillingPortal = async () => {
    const result = await openBillingPortal();
    if (!result.ok) Alert.alert("Nao foi possivel abrir o portal", result.error ?? "Tente novamente em instantes.");
  };

  const handleExportData = async () => {
    const result = await apiFetch<Record<string, unknown>>("/establishment/export");
    if (!result.ok) {
      Alert.alert("Erro ao exportar", result.error);
      return;
    }
    const json = JSON.stringify(result.data, null, 2);
    const filename = `export-${barbershop?.slug ?? "estabelecimento"}.json`;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    await Share.share({ title: filename, message: json });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: "Configuracoes", headerShown: false }} />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={handleBack} hitSlop={12}>
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Configuracoes</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Section title="Estabelecimento" colors={colors}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Nome exibido para clientes</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="briefcase" size={16} color={colors.mutedForeground} />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nome do estabelecimento"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground }]}
              {...typedInputProps("text")}
            />
          </View>
          <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 12 }]}>Telefone</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="phone" size={16} color={colors.mutedForeground} />
            <TextInput
              value={phone}
              onChangeText={(value) => setPhone(maskPhone(value))}
              placeholder="(11) 99999-9999"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground }]}
              {...typedInputProps("phone")}
            />
          </View>
          <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 12 }]}>Endereco</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="map-pin" size={16} color={colors.mutedForeground} />
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Rua, numero, bairro"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground }]}
              {...typedInputProps("text")}
            />
          </View>
        </Section>

        <Section title="Cores da marca" colors={colors}>
          <Text style={[styles.help, { color: colors.mutedForeground }]}>
            A cor principal pinta botoes, destaques e icones do app. A cor de destaque entra em
            elementos secundarios e fundos contrastantes. Mude e veja o app acompanhar.
          </Text>

          <ColorField
            label="Cor principal"
            value={primary}
            onChange={setPrimary}
            presets={PRIMARY_PRESETS}
            colors={colors}
          />

          <ColorField
            label="Cor de destaque"
            value={accent}
            onChange={setAccent}
            presets={ACCENT_PRESETS}
            colors={colors}
          />

          <View style={[styles.previewCard, { backgroundColor: accent, borderColor: colors.border }]}>
            <View style={[styles.previewBadge, { backgroundColor: primary + "33", borderColor: primary }]}>
              <Text style={[styles.previewBadgeText, { color: primary }]}>PRE-VISUALIZACAO</Text>
            </View>
            <Text style={[styles.previewName, { color: hexLuminance(accent) > 0.5 ? "#0C0C0C" : "#FFFFFF" }]}>
              {name || "Seu estabelecimento"}
            </Text>
            <View style={[styles.previewBtn, { backgroundColor: primary }]}>
              <Text style={[styles.previewBtnText, { color: hexLuminance(primary) > 0.5 ? "#0C0C0C" : "#FFFFFF" }]}>
                Botao de acao
              </Text>
            </View>
          </View>
        </Section>

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

        <Section title="Ficha do cliente" colors={colors}>
          <Text style={[styles.help, { color: colors.mutedForeground }]}>
            Defina campos de anamnese para o seu nicho. Eles aparecem na ficha editavel do cliente.
          </Text>
          <View style={styles.presetRow}>
            {INTAKE_PRESETS.map((preset) => (
              <Pressable
                key={preset.label}
                onPress={() => applyIntakePreset(preset.fields)}
                style={[styles.bufferPreset, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={[styles.bufferPresetText, { color: colors.foreground }]}>{preset.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.intakeList}>
            {intakeFields.map((field, index) => (
              <View key={field.key} style={[styles.intakeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.businessDayLabel, { color: colors.foreground }]}>{field.label}</Text>
                  <Text style={[styles.bufferHint, { color: colors.mutedForeground, marginTop: 2 }]}>{field.type}</Text>
                </View>
                <Pressable
                  onPress={() => setIntakeFields((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  hitSlop={10}
                >
                  <Feather name="trash-2" size={16} color={colors.destructive} />
                </Pressable>
              </View>
            ))}
          </View>
          <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 10 }]}>
            <Feather name="plus" size={16} color={colors.mutedForeground} />
            <TextInput
              value={newFieldLabel}
              onChangeText={setNewFieldLabel}
              placeholder="Novo campo da ficha"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground }]}
              {...typedInputProps("text")}
            />
            <Pressable onPress={addCustomField}>
              <Text style={[styles.linkInline, { color: colors.gold }]}>Adicionar</Text>
            </Pressable>
          </View>
        </Section>

        <Pressable
          onPress={save}
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

        <Section title="Assinatura" colors={colors}>
          <Text style={[styles.help, { color: colors.mutedForeground }]}>
            {planStatus.isPremium
              ? `Plano ${getPlanDisplayName(planStatus.plan)} ativo com renovacao mensal automatica.`
              : planStatus.plan === "trial"
                ? `Voce esta no periodo gratuito (${planStatus.trialDaysLeft} ${planStatus.trialDaysLeft === 1 ? "dia restante" : "dias restantes"}).`
                : planStatus.plan === PAYMENT_PENDING_PLAN
                  ? "Seu pagamento esta pendente."
                  : "Sua assinatura esta vencida."}
          </Text>

          {planStatus.isPremium ? (
            <Pressable onPress={handleBillingPortal} style={[styles.linkRow, { borderColor: colors.border }]}>
              <Feather name="credit-card" size={16} color={colors.gold} />
              <Text style={[styles.linkRowText, { color: colors.foreground }]}>Gerenciar pagamento</Text>
              <Feather name="external-link" size={14} color={colors.mutedForeground} />
            </Pressable>
          ) : (
            <Pressable onPress={() => router.push("/upgrade" as never)} style={[styles.linkRow, { borderColor: colors.border }]}>
              <Feather name="zap" size={16} color={colors.gold} />
              <Text style={[styles.linkRowText, { color: colors.foreground }]}>Escolher plano - a partir de {BASE_PLAN_PRICE_LABEL}/mes</Text>
              <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
            </Pressable>
          )}
        </Section>

        <Section title="Dados" colors={colors}>
          <Text style={[styles.help, { color: colors.mutedForeground }]}>
            Exporte cadastros, agenda, financeiro, produtos, pedidos e pacotes em JSON.
          </Text>
          <Pressable onPress={handleExportData} style={[styles.linkRow, { borderColor: colors.border }]}>
            <Feather name="download" size={16} color={colors.gold} />
            <Text style={[styles.linkRowText, { color: colors.foreground }]}>Exportar dados do estabelecimento</Text>
            <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
          </Pressable>
        </Section>

        <Section title="Suporte" colors={colors}>
          <SupportChannels compact />
        </Section>

        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: colors.destructive + "44" }]}
          onPress={handleLogout}
          activeOpacity={0.75}
        >
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  colors,
  children,
}: {
  title: string;
  colors: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
      {children}
    </View>
  );
}

function ColorField({
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
  colors: ReturnType<typeof useColors>;
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

function hexLuminance(hex: string): number {
  const match = /^#([0-9A-F]{6})$/i.exec(hex);
  if (!match) return 0;

  const number = parseInt(match[1], 16);
  const red = (number >> 16) & 255;
  const green = (number >> 8) & 255;
  const blue = number & 255;

  return (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
}

const styles = StyleSheet.create({
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
  timeInput: { width: 86, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "center" },
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
