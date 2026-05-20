import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";

import {
  SaveButton,
  Section,
  SettingsPage,
  settingsStyles as styles,
} from "@/components/admin-settings/SettingsShared";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { typedInputProps } from "@/lib/inputProps";
import { maskPhone } from "@/lib/masks";

export default function EstablishmentSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, barbershop, updateBarbershop } = useAuth();
  const [name, setName] = useState(barbershop?.name ?? "");
  const [phone, setPhone] = useState(maskPhone(barbershop?.phone ?? ""));
  const [address, setAddress] = useState(barbershop?.address ?? "");
  const [busy, setBusy] = useState(false);

  if (!user || user.role !== "admin") {
    router.replace("/" as never);
    return null;
  }

  const dirty = name.trim() !== (barbershop?.name ?? "")
    || phone.trim() !== maskPhone(barbershop?.phone ?? "")
    || address.trim() !== (barbershop?.address ?? "");

  const save = async () => {
    if (!name.trim()) {
      Alert.alert("Nome obrigatorio", "Informe o nome do estabelecimento.");
      return;
    }

    setBusy(true);
    const result = await updateBarbershop({
      name: name.trim(),
      phone: phone.trim() || null,
      address: address.trim() || null,
    });
    setBusy(false);

    if (!result.ok) {
      Alert.alert("Erro ao salvar", result.error ?? "Tente novamente em instantes.");
      return;
    }
    Alert.alert("Pronto!", "Os dados do estabelecimento foram salvos.");
  };

  return (
    <SettingsPage title="Dados do estabelecimento">
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

      <SaveButton dirty={dirty} busy={busy} onPress={save} />
    </SettingsPage>
  );
}
