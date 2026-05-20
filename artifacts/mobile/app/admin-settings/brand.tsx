import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Text, View } from "react-native";

import {
  ACCENT_PRESETS,
  ColorField,
  HEX_RE,
  PRIMARY_PRESETS,
  SaveButton,
  Section,
  SettingsPage,
  hexLuminance,
  settingsStyles as styles,
} from "@/components/admin-settings/SettingsShared";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function BrandSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, barbershop, updateBarbershop } = useAuth();
  const [primary, setPrimary] = useState(barbershop?.brandPrimary ?? "#556B2F");
  const [accent, setAccent] = useState(barbershop?.brandAccent ?? "#3A3328");
  const [busy, setBusy] = useState(false);

  if (!user || user.role !== "admin") {
    router.replace("/" as never);
    return null;
  }

  const dirty = primary.toUpperCase() !== (barbershop?.brandPrimary ?? "").toUpperCase()
    || accent.toUpperCase() !== (barbershop?.brandAccent ?? "").toUpperCase();

  const save = async () => {
    if (!HEX_RE.test(primary) || !HEX_RE.test(accent)) {
      Alert.alert("Cor invalida", "Use o formato hexadecimal #RRGGBB, por exemplo #556B2F.");
      return;
    }

    setBusy(true);
    const result = await updateBarbershop({
      brandPrimary: primary.toUpperCase(),
      brandAccent: accent.toUpperCase(),
    });
    setBusy(false);

    if (!result.ok) {
      Alert.alert("Erro ao salvar", result.error ?? "Tente novamente em instantes.");
      return;
    }
    Alert.alert("Pronto!", "As cores da marca foram salvas.");
  };

  return (
    <SettingsPage title="Cores e marca">
      <Section title="Cores da marca" colors={colors}>
        <Text style={[styles.help, { color: colors.mutedForeground }]}>
          A cor principal pinta botoes, destaques e icones do app. A cor de destaque entra em
          elementos secundarios e fundos contrastantes.
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
            {barbershop?.name ?? "Seu estabelecimento"}
          </Text>
          <View style={[styles.previewBtn, { backgroundColor: primary }]}>
            <Text style={[styles.previewBtnText, { color: hexLuminance(primary) > 0.5 ? "#0C0C0C" : "#FFFFFF" }]}>
              Botao de acao
            </Text>
          </View>
        </View>
      </Section>

      <SaveButton dirty={dirty} busy={busy} onPress={save} />
    </SettingsPage>
  );
}
