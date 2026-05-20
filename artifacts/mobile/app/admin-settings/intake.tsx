import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import {
  INTAKE_PRESETS,
  SaveButton,
  Section,
  SettingsPage,
  settingsStyles as styles,
} from "@/components/admin-settings/SettingsShared";
import { useAuth, type IntakeField } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { typedInputProps } from "@/lib/inputProps";

export default function IntakeSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, barbershop, updateBarbershop } = useAuth();
  const [intakeFields, setIntakeFields] = useState<IntakeField[]>(
    barbershop?.intakeFields?.length ? barbershop.intakeFields : INTAKE_PRESETS[0].fields,
  );
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user || user.role !== "admin") {
    router.replace("/" as never);
    return null;
  }

  const dirty = JSON.stringify(intakeFields) !== JSON.stringify(
    barbershop?.intakeFields?.length ? barbershop.intakeFields : INTAKE_PRESETS[0].fields,
  );

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
    if (intakeFields.length === 0) {
      Alert.alert("Ficha vazia", "Mantenha pelo menos um campo na ficha do cliente.");
      return;
    }

    setBusy(true);
    const result = await updateBarbershop({ intakeFields });
    setBusy(false);

    if (!result.ok) {
      Alert.alert("Erro ao salvar", result.error ?? "Tente novamente em instantes.");
      return;
    }
    Alert.alert("Pronto!", "A ficha do cliente foi salva.");
  };

  return (
    <SettingsPage title="Ficha do cliente">
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

      <SaveButton dirty={dirty} busy={busy} onPress={save} />
    </SettingsPage>
  );
}
