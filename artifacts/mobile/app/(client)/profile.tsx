import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
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
import { SupportChannels } from "@/components/SupportChannels";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";
import { pickAvatarImage } from "@/lib/avatarUpload";
import { typedInputProps } from "@/lib/inputProps";
import { isValidEmail, maskPhone } from "@/lib/masks";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type ProfileForm = {
  name: string;
  email: string;
  phone: string;
  avatarImage: string | null;
};

type ShortcutTarget = "appointments" | "completed" | "loyalty";

function deriveAvatar(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, updateProfile } = useAuth();
  const { appointments, clients, clientPackages, productOrders, getClientLoyalty } = useData();

  const topPad = insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const myClientId = user?.clientId ?? user?.id;
  const loyalty = getClientLoyalty(myClientId ?? "");
  const clientRecord = clients.find((client) => client.id === myClientId);
  const myApts = appointments.filter((apt) => apt.clientId === myClientId);
  const completedApts = myApts.filter((apt) => apt.status === "completed");
  const serviceSpent = completedApts
    .filter((apt) => apt.paymentMethod !== "Pacote" && !apt.isFreeByLoyalty)
    .reduce((sum, apt) => sum + apt.totalPrice, 0);
  const orderSpent = productOrders
    .filter((order) => order.clientId === myClientId && (order.status === "paid" || order.status === "delivered"))
    .reduce((sum, order) => sum + order.totalPrice, 0);
  const packageSpent = clientPackages
    .filter((pkg) => pkg.clientId === myClientId)
    .reduce((sum, pkg) => sum + pkg.pricePaid, 0);
  const computedTotalSpent = serviceSpent + orderSpent + packageSpent;
  const totalSpent = Math.max(clientRecord?.totalSpent ?? 0, computedTotalSpent);

  const currentForm = useMemo<ProfileForm>(() => ({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: maskPhone(user?.phone ?? ""),
    avatarImage: user?.avatarImage ?? null,
  }), [user?.avatarImage, user?.email, user?.name, user?.phone]);

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

  const openShortcut = (target: ShortcutTarget) => {
    void Haptics.selectionAsync();

    if (target === "loyalty") {
      router.push("/(client)/loyalty" as never);
      return;
    }

    if (target === "completed") {
      router.push("/(client)/appointments?filter=past" as any);
      return;
    }

    router.push("/(client)/appointments?filter=upcoming" as any);
  };

  const handlePickImage = async () => {
    try {
      const image = await pickAvatarImage();
      if (!image) return;
      setForm((prev) => ({ ...prev, avatarImage: image }));
    } catch (error) {
      Alert.alert("Nao foi possivel carregar a imagem", (error as Error).message ?? "Tente outra foto.");
    }
  };

  const clearImage = () => {
    setForm((prev) => ({ ...prev, avatarImage: null }));
  };

  const saveProfile = async () => {
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    if (!name) {
      Alert.alert("Nome obrigatorio", "Informe seu nome para salvar o perfil.");
      return;
    }
    if (!email) {
      Alert.alert("Email obrigatorio", "Informe seu email para salvar o perfil.");
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
      avatarImage: form.avatarImage,
    });
    setSaving(false);

    if (!result.ok) {
      Alert.alert("Nao foi possivel salvar", result.error ?? "Tente novamente.");
      return;
    }

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

  const MENU_ITEMS: Array<{
    icon: "calendar" | "check-circle" | "award";
    label: string;
    count: number;
    target: ShortcutTarget;
  }> = [
    { icon: "calendar", label: "Meus agendamentos", count: myApts.length, target: "appointments" },
    { icon: "check-circle", label: "Servicos realizados", count: completedApts.length, target: "completed" },
    { icon: "award", label: "Pontos de fidelidade", count: loyalty.currentPoints, target: "loyalty" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 16, paddingBottom: botPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Perfil</Text>

        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <AppAvatar
            imageUri={user?.avatarImage}
            fallback={deriveAvatar(user?.name ?? "")}
            size={64}
            backgroundColor={colors.gold}
            textColor={colors.goldForeground}
            fontSize={22}
          />
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>{user?.name}</Text>
            <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>{user?.email}</Text>
            {user?.phone && (
              <Text style={[styles.profilePhone, { color: colors.mutedForeground }]}>{user.phone}</Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: colors.gold }]}
          onPress={openEditor}
          activeOpacity={0.82}
        >
          <Feather name="edit-2" size={16} color={colors.goldForeground} />
          <Text style={[styles.editBtnText, { color: colors.goldForeground }]}>Editar perfil</Text>
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <TouchableOpacity
            style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => openShortcut("completed")}
            activeOpacity={0.8}
          >
            <Text style={[styles.statValue, { color: colors.gold }]}>{completedApts.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Realizados</Text>
            <Text style={[styles.statHint, { color: colors.mutedForeground }]}>Toque para ver</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => openShortcut("completed")}
            activeOpacity={0.8}
          >
            <Text style={[styles.statValue, { color: colors.gold }]}>{formatCurrency(totalSpent)}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total gasto</Text>
            <Text style={[styles.statHint, { color: colors.mutedForeground }]}>Histórico</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => openShortcut("loyalty")}
            activeOpacity={0.8}
          >
            <Text style={[styles.statValue, { color: colors.gold }]}>{loyalty.currentPoints}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Pontos</Text>
            <Text style={[styles.statHint, { color: colors.mutedForeground }]}>Ver saldo</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.spendingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.spendingTitle, { color: colors.foreground }]}>Resumo de gastos</Text>
          {([
            ["Servicos", serviceSpent],
            ["Pedidos", orderSpent],
            ["Pacotes", packageSpent],
          ] as const).map(([label, value]) => (
            <View key={label} style={[styles.spendingRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.spendingLabel, { color: colors.mutedForeground }]}>{label}</Text>
              <Text style={[styles.spendingValue, { color: colors.foreground }]}>{formatCurrency(value)}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              activeOpacity={0.78}
              onPress={() => openShortcut(item.target)}
              style={[
                styles.menuItem,
                index < MENU_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <View style={[styles.menuIcon, { backgroundColor: colors.secondary }]}>
                <Feather name={item.icon} size={16} color={colors.gold} />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Text style={[styles.menuSubLabel, { color: colors.mutedForeground }]}>Abrir detalhes</Text>
              </View>
              <Text style={[styles.menuCount, { color: colors.gold }]}>{item.count}</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>

        <SupportChannels compact />

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
                fallback={deriveAvatar(form.name || currentForm.name)}
                size={88}
                backgroundColor={colors.gold}
                textColor={colors.goldForeground}
                fontSize={28}
              />
              <View style={styles.avatarActions}>
                <TouchableOpacity
                  style={[styles.photoBtn, { backgroundColor: colors.gold }]}
                  onPress={() => { void handlePickImage(); }}
                >
                  <Feather name="image" size={15} color={colors.goldForeground} />
                  <Text style={[styles.photoBtnText, { color: colors.goldForeground }]}>Escolher foto</Text>
                </TouchableOpacity>
                {!!form.avatarImage && (
                  <TouchableOpacity
                    style={[styles.photoGhostBtn, { borderColor: colors.border }]}
                    onPress={clearImage}
                  >
                    <Feather name="trash-2" size={15} color={colors.foreground} />
                    <Text style={[styles.photoGhostBtnText, { color: colors.foreground }]}>Remover</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={[styles.avatarHint, { color: colors.mutedForeground }]}>
                A foto fica salva no seu perfil de cliente.
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
                  <Text style={[styles.saveBtnText, { color: colors.goldForeground }]}>Salvar alteracoes</Text>
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
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
  },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  profileEmail: { fontSize: 13, fontFamily: "Inter_400Regular" },
  profilePhone: { fontSize: 13, fontFamily: "Inter_400Regular" },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  editBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  statsRow: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  statHint: { fontSize: 10, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  spendingCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  spendingTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  spendingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, paddingTop: 10 },
  spendingLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" },
  spendingValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  menuCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTextWrap: { flex: 1, gap: 2 },
  menuLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  menuSubLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  menuCount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  modalContent: { padding: 20, gap: 16 },
  avatarPreviewWrap: { alignItems: "center", gap: 10, marginBottom: 4 },
  avatarActions: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  avatarHint: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    maxWidth: 320,
  },
  photoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  photoBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  photoGhostBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  photoGhostBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  modalFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
