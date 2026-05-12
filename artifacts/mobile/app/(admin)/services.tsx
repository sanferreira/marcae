import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

import { Service, useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";

export default function ServicesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { services, addService, updateService } = useData();
  const [editing, setEditing] = useState<Service | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    price: "",
    duration: "",
    description: "",
    category: "Cabelo",
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const CATEGORIES = ["Cabelo", "Barba", "Combo", "Estética", "Tratamento"];

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", price: "", duration: "", description: "", category: "Cabelo" });
    setModalOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({
      name: s.name,
      price: s.price.toString(),
      duration: s.duration.toString(),
      description: s.description,
      category: s.category,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.duration) {
      Alert.alert("Preencha nome, preço e duração");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const service: Service = {
      id: editing?.id ?? Date.now().toString(),
      name: form.name,
      price: parseFloat(form.price),
      duration: parseInt(form.duration, 10),
      description: form.description,
      category: form.category,
      isActive: editing?.isActive ?? true,
    };
    if (editing) {
      await updateService(service);
    } else {
      await addService(service);
    }
    setModalOpen(false);
  };

  const toggleActive = (s: Service) => {
    Haptics.selectionAsync();
    updateService({ ...s, isActive: !s.isActive });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 16, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Serviços</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.gold }]}
          onPress={openNew}
        >
          <Feather name="plus" size={18} color="#0C0C0C" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: botPad + 100 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View
            style={[
              styles.serviceCard,
              {
                backgroundColor: colors.card,
                borderColor: item.isActive ? colors.border : colors.border + "44",
                opacity: item.isActive ? 1 : 0.6,
              },
            ]}
          >
            <View style={styles.serviceMain}>
              <View style={styles.serviceInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.serviceName, { color: colors.foreground }]}>
                    {item.name}
                  </Text>
                  <View
                    style={[
                      styles.catBadge,
                      { backgroundColor: colors.secondary },
                    ]}
                  >
                    <Text style={[styles.catText, { color: colors.mutedForeground }]}>
                      {item.category}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.serviceDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.description}
                </Text>
                <View style={styles.serviceMeta}>
                  <Text style={[styles.servicePrice, { color: colors.gold }]}>
                    R${item.price}
                  </Text>
                  <Text style={[styles.metaDot, { color: colors.border }]}>·</Text>
                  <Feather name="clock" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.serviceDuration, { color: colors.mutedForeground }]}>
                    {item.duration}min
                  </Text>
                </View>
              </View>
              <View style={styles.serviceActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
                  onPress={() => openEdit(item)}
                >
                  <Feather name="edit-2" size={14} color={colors.foreground} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: item.isActive
                        ? "#16A34A22"
                        : colors.secondary,
                    },
                  ]}
                  onPress={() => toggleActive(item)}
                >
                  <Feather
                    name={item.isActive ? "eye" : "eye-off"}
                    size={14}
                    color={item.isActive ? "#22C55E" : colors.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      <Modal
        visible={modalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setModalOpen(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editing ? "Editar Serviço" : "Novo Serviço"}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={[styles.saveText, { color: colors.gold }]}>Salvar</Text>
            </TouchableOpacity>
          </View>
          <KeyboardAwareScrollViewCompat
            contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 40 }]}
            keyboardShouldPersistTaps="handled"
          >
            {[
              { label: "Nome do serviço", key: "name", type: "default" as const },
              { label: "Preço (R$)", key: "price", type: "decimal-pad" as const },
              { label: "Duração (minutos)", key: "duration", type: "number-pad" as const },
              { label: "Descrição", key: "description", type: "default" as const },
            ].map((field) => (
              <View key={field.key}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                  {field.label}
                </Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card },
                  ]}
                  value={form[field.key as keyof typeof form]}
                  onChangeText={(v) => setForm((f) => ({ ...f, [field.key]: v }))}
                  keyboardType={field.type}
                  placeholder={field.label}
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            ))}
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Categoria</Text>
            <View style={styles.catRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: form.category === cat ? colors.gold : colors.secondary,
                    },
                  ]}
                  onPress={() => setForm((f) => ({ ...f, category: cat }))}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      { color: form.category === cat ? "#0C0C0C" : colors.mutedForeground },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </KeyboardAwareScrollViewCompat>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { padding: 20, gap: 4 },
  serviceCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  serviceMain: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  serviceInfo: { flex: 1, gap: 5 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  serviceName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  catText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  serviceDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  serviceMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  servicePrice: { fontSize: 15, fontFamily: "Inter_700Bold" },
  metaDot: { fontSize: 14 },
  serviceDuration: { fontSize: 12, fontFamily: "Inter_400Regular" },
  serviceActions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  saveText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  modalContent: { padding: 20, gap: 12 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6 },
  fieldInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
  },
  catRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  catChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
