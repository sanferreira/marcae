import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { AppAvatar } from "@/components/AppAvatar";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useAuth } from "@/contexts/AuthContext";
import { DAY_KEYS, DAY_SHORT, DEFAULT_SCHEDULE, useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";
import { pickAvatarImage } from "@/lib/avatarUpload";
import { typedInputProps } from "@/lib/inputProps";
import { isValidEmail, maskPhone } from "@/lib/masks";

type ProfileForm = {
  name: string;
  email: string;
  phone: string;
  specialty: string;
  bio: string;
  avatar: string;
  avatarImage: string | null;
};

function deriveAvatar(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function EmployeeProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user, barbershop, logout, updateProfile } = useAuth();
  const { professionals, professionalSchedules, getProfessionalStats, appointments } = useData();

  const topPad = insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const me = professionals.find((p) => p.id === user?.professionalId);
  const stats = me ? getProfessionalStats(me.id) : { completed: 0, revenue: 0, cancelRate: 0 };
  const schedule = me ? (professionalSchedules[me.id] ?? DEFAULT_SCHEDULE) : DEFAULT_SCHEDULE;
  const totalCommission = Math.round(stats.revenue * ((me?.commissionRate ?? 50) / 100));
  const upcomingCount = appointments.filter((a) =>
    a.professionalId === user?.professionalId &&
    (a.status === "confirmed" || a.status === "pending")
  ).length;

  const currentForm = useMemo<ProfileForm>(() => ({
    name: user?.name ?? me?.name ?? "",
    email: user?.email ?? me?.email ?? "",
    phone: maskPhone(user?.phone ?? me?.phone ?? ""),
    specialty: me?.specialty ?? "",
    bio: me?.bio ?? "",
    avatar: me?.avatar ?? deriveAvatar(user?.name ?? me?.name ?? ""),
    avatarImage: me?.avatarImage ?? user?.avatarImage ?? null,
  }), [me?.avatar, me?.avatarImage, me?.bio, me?.email, me?.name, me?.phone, me?.specialty, user?.avatarImage, user?.email, user?.name, user?.phone]);

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileForm>(currentForm);

  const openEditor = () => {
    setForm(currentForm);
    setEditOpen(true);
  };

  const closeEditor = () => {
    if (saving) return;
    setEditOpen(false);
  };

  const setField = (field: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePickImage = async () => {
    try {
      const image = await pickAvatarImage();
      if (!image) return;
      setForm((prev) => ({ ...prev, avatarImage: image }));
    } catch (error) {
      Alert.alert("Não foi possível carregar a imagem", (error as Error).message ?? "Tente outra foto.");
    }
  };

  const clearImage = () => {
    setForm((prev) => ({ ...prev, avatarImage: null }));
  };

  const saveProfile = async () => {
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const avatar = form.avatar.trim().toUpperCase().slice(0, 4);

    if (!name) {
      Alert.alert("Nome obrigatório", "Informe seu nome para salvar o perfil.");
      return;
    }
    if (!email) {
      Alert.alert("Email obrigatório", "Informe seu email para salvar o perfil.");
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert("Email invalido", "Informe um email valido para salvar o perfil.");
      return;
    }

    setSaving(true);
    const result = await updateProfile({
      name,
      email,
      phone: form.phone.trim() || null,
      specialty: form.specialty.trim(),
      bio: form.bio.trim(),
      avatar: avatar || deriveAvatar(name),
      avatarImage: form.avatarImage,
    });
    setSaving(false);

    if (!result.ok) {
      Alert.alert("Não foi possível salvar", result.error ?? "Tente novamente.");
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["professionals", barbershop?.id ?? "_none"] });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditOpen(false);
  };

  const runLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await logout();
  };

  const handleLogout = () => {
    Alert.alert("Sair", "Deseja sair da conta?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => { void runLogout(); } },
    ]);
  };

  const previewAvatar = form.avatar.trim().toUpperCase().slice(0, 4) || deriveAvatar(form.name || currentForm.name);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: botPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Perfil</Text>

        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <AppAvatar
            imageUri={me?.avatarImage ?? user?.avatarImage}
            fallback={me?.avatar ?? deriveAvatar(user?.name ?? "")}
            size={64}
            backgroundColor={colors.gold}
            textColor={colors.goldForeground}
            fontSize={22}
          />
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>{user?.name}</Text>
            {!!me?.specialty && (
              <Text style={[styles.profileSpecialty, { color: colors.gold }]}>{me.specialty}</Text>
            )}
            <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>{user?.email}</Text>
            {!!(user?.phone ?? me?.phone) && (
              <Text style={[styles.profilePhone, { color: colors.mutedForeground }]}>{user?.phone ?? me?.phone}</Text>
            )}
            {barbershop && (
              <View style={styles.shopRow}>
                <Feather name="briefcase" size={11} color={colors.mutedForeground} />
                <Text style={[styles.shopText, { color: colors.mutedForeground }]}>
                  {barbershop.name}
                </Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: colors.gold }]}
          onPress={openEditor}
          activeOpacity={0.82}
        >
          <Feather name="edit-2" size={16} color={colors.goldForeground} />
          <Text style={[styles.editBtnText, { color: colors.goldForeground }]}>Editar meus dados</Text>
        </TouchableOpacity>

        {!!me?.bio && (
          <View style={[styles.bioCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.bioTitle, { color: colors.foreground }]}>Sobre você</Text>
            <Text style={[styles.bioText, { color: colors.mutedForeground }]}>{me.bio}</Text>
          </View>
        )}

        <Text style={[styles.section, { color: colors.foreground }]}>Suas estatísticas</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="check-circle" size={16} color={"#22C55E"} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{stats.completed}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Atendimentos concluídos</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="dollar-sign" size={16} color={colors.gold} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>R${stats.revenue}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Receita gerada</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="award" size={16} color={colors.gold} />
            <Text style={[styles.statValue, { color: colors.gold }]}>R${totalCommission}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total em comissão ({me?.commissionRate ?? 50}%)</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="calendar" size={16} color={colors.gold} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{upcomingCount}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Próximos agendamentos</Text>
          </View>
        </View>

        <Text style={[styles.section, { color: colors.foreground }]}>Sua escala</Text>
        <View style={[styles.scheduleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.scheduleDays}>
            {DAY_KEYS.map((k) => (
              <View key={k} style={[styles.schedDay, { backgroundColor: schedule[k].enabled ? colors.gold + "22" : colors.secondary }]}>
                <Text style={[styles.schedDayLabel, { color: schedule[k].enabled ? colors.gold : colors.mutedForeground }]}>
                  {DAY_SHORT[k]}
                </Text>
                {schedule[k].enabled ? (
                  <Text style={[styles.schedHours, { color: colors.foreground }]}>
                    {schedule[k].startTime}–{schedule[k].endTime}
                  </Text>
                ) : (
                  <Text style={[styles.schedHours, { color: colors.mutedForeground }]}>Folga</Text>
                )}
              </View>
            ))}
          </View>
          <Text style={[styles.scheduleHint, { color: colors.mutedForeground }]}>
            Sua escala continua sendo controlada pelo administrador.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: colors.destructive + "44" }]}
          onPress={handleLogout}
          activeOpacity={0.75}
        >
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={editOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeEditor}
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={closeEditor} disabled={saving}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Editar perfil</Text>
            <View style={{ width: 22 }} />
          </View>

          <KeyboardAwareScrollViewCompat
            contentContainerStyle={[styles.modalContent, { paddingBottom: botPad + 140 }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.avatarPreviewWrap}>
              <AppAvatar
                imageUri={form.avatarImage}
                fallback={previewAvatar}
                size={88}
                backgroundColor={colors.gold}
                textColor={colors.goldForeground}
                fontSize={28}
              />
              <View style={styles.avatarActions}>
                <TouchableOpacity style={[styles.photoBtn, { backgroundColor: colors.gold }]} onPress={() => { void handlePickImage(); }}>
                  <Feather name="image" size={15} color={colors.goldForeground} />
                  <Text style={[styles.photoBtnText, { color: colors.goldForeground }]}>Escolher foto</Text>
                </TouchableOpacity>
                {!!form.avatarImage && (
                  <TouchableOpacity style={[styles.photoGhostBtn, { borderColor: colors.border }]} onPress={clearImage}>
                    <Feather name="trash-2" size={15} color={colors.foreground} />
                    <Text style={[styles.photoGhostBtnText, { color: colors.foreground }]}>Remover</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={[styles.avatarHint, { color: colors.mutedForeground }]}>
                A foto fica salva no perfil do funcionário e aparece no próprio app.
              </Text>
            </View>

            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Nome</Text>
              <TextInput
                value={form.name}
                onChangeText={(value) => setField("name", value)}
                style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                placeholder="Seu nome"
                placeholderTextColor={colors.mutedForeground}
                {...typedInputProps("text")}
              />
            </View>

            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Email</Text>
              <TextInput
                value={form.email}
                onChangeText={(value) => setField("email", value.trim().toLowerCase())}
                style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                placeholder="voce@email.com"
                placeholderTextColor={colors.mutedForeground}
                {...typedInputProps("email")}
              />
            </View>

            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Telefone</Text>
              <TextInput
                value={form.phone}
                onChangeText={(value) => setField("phone", maskPhone(value))}
                style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                placeholder="(11) 99999-9999"
                placeholderTextColor={colors.mutedForeground}
                {...typedInputProps("phone")}
              />
            </View>

            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Especialidade</Text>
              <TextInput
                value={form.specialty}
                onChangeText={(value) => setField("specialty", value)}
                style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                placeholder="Ex: Cortes modernos"
                placeholderTextColor={colors.mutedForeground}
                {...typedInputProps("text")}
              />
            </View>

            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Iniciais de fallback</Text>
              <TextInput
                value={form.avatar}
                onChangeText={(value) => setField("avatar", value)}
                autoCapitalize="characters"
                maxLength={4}
                style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                placeholder="RM"
                placeholderTextColor={colors.mutedForeground}
                {...typedInputProps("text")}
              />
            </View>

            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Bio</Text>
              <TextInput
                value={form.bio}
                onChangeText={(value) => setField("bio", value)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                {...typedInputProps("text")}
                style={[styles.fieldInput, styles.fieldArea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                placeholder="Conte um pouco sobre sua experiência"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </KeyboardAwareScrollViewCompat>

          <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: botPad + 16 }]}>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.gold, opacity: saving ? 0.85 : 1 }]}
              onPress={saveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.goldForeground} />
              ) : (
                <>
                  <Feather name="check" size={16} color={colors.goldForeground} />
                  <Text style={[styles.saveBtnText, { color: colors.goldForeground }]}>Salvar alterações</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 16, padding: 18, borderRadius: 18, borderWidth: 1 },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { fontSize: 17, fontFamily: "Inter_700Bold" },
  profileSpecialty: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  profileEmail: { fontSize: 12, fontFamily: "Inter_400Regular" },
  profilePhone: { fontSize: 12, fontFamily: "Inter_400Regular" },
  shopRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  shopText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  editBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  editBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  bioCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  bioTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  bioText: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  section: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 4 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statBox: { width: "48%", padding: 14, borderRadius: 14, borderWidth: 1, gap: 6 },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 14 },
  scheduleCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  scheduleDays: { gap: 6 },
  schedDay: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  schedDayLabel: { fontSize: 12, fontFamily: "Inter_700Bold" },
  schedHours: { fontSize: 12, fontFamily: "Inter_500Medium" },
  scheduleHint: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, marginTop: 4 },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  modalContent: { padding: 20, gap: 16 },
  avatarPreviewWrap: { alignItems: "center", gap: 10, marginBottom: 4 },
  avatarActions: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  avatarHint: { fontSize: 12, lineHeight: 18, textAlign: "center", fontFamily: "Inter_400Regular", maxWidth: 320 },
  photoBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  photoBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  photoGhostBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  photoGhostBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  fieldInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: "Inter_500Medium" },
  fieldArea: { minHeight: 108, paddingTop: 12 },
  modalFooter: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 14 },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
