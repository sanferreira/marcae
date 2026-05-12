import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
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
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

import { Product, Service, useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";

type Tab = "services" | "products" | "loyalty";

export default function ServicesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    services, products, addService, updateService,
    addProduct, updateProduct, loyaltySettings, updateLoyaltySettings,
  } = useData();

  const [tab, setTab] = useState<Tab>("services");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  // --- Service state ---
  const [serviceModal, setServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceForm, setServiceForm] = useState({ name: "", price: "", duration: "", description: "", category: "Cabelo" });

  // --- Product state ---
  const [productModal, setProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({ name: "", price: "", costPrice: "", stock: "", category: "Pomada", description: "" });

  // --- Loyalty state ---
  const [loyaltyForm, setLoyaltyForm] = useState({
    requiredPoints: loyaltySettings.requiredPoints.toString(),
    benefitDescription: loyaltySettings.benefitDescription,
  });
  const [loyaltySaving, setLoyaltySaving] = useState(false);

  const SERVICE_CATEGORIES = ["Cabelo", "Barba", "Combo", "Estética", "Tratamento"];
  const PRODUCT_CATEGORIES = ["Pomada", "Barba", "Cabelo", "Tratamento", "Acessório"];

  // --- Service handlers ---
  const openNewService = () => {
    setEditingService(null);
    setServiceForm({ name: "", price: "", duration: "", description: "", category: "Cabelo" });
    setServiceModal(true);
  };
  const openEditService = (s: Service) => {
    setEditingService(s);
    setServiceForm({ name: s.name, price: s.price.toString(), duration: s.duration.toString(), description: s.description, category: s.category });
    setServiceModal(true);
  };
  const saveService = async () => {
    if (!serviceForm.name || !serviceForm.price || !serviceForm.duration) {
      Alert.alert("Preencha nome, preço e duração");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const s: Service = {
      id: editingService?.id ?? Date.now().toString(),
      name: serviceForm.name, price: parseFloat(serviceForm.price),
      duration: parseInt(serviceForm.duration, 10), description: serviceForm.description,
      category: serviceForm.category, isActive: editingService?.isActive ?? true,
    };
    if (editingService) await updateService(s); else await addService(s);
    setServiceModal(false);
  };
  const toggleServiceActive = (s: Service) => { Haptics.selectionAsync(); updateService({ ...s, isActive: !s.isActive }); };

  // --- Product handlers ---
  const openNewProduct = () => {
    setEditingProduct(null);
    setProductForm({ name: "", price: "", costPrice: "", stock: "", category: "Pomada", description: "" });
    setProductModal(true);
  };
  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProductForm({ name: p.name, price: p.price.toString(), costPrice: p.costPrice.toString(), stock: p.stock.toString(), category: p.category, description: p.description });
    setProductModal(true);
  };
  const saveProduct = async () => {
    if (!productForm.name || !productForm.price || !productForm.stock) {
      Alert.alert("Preencha nome, preço e estoque");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const p: Product = {
      id: editingProduct?.id ?? Date.now().toString(),
      name: productForm.name, price: parseFloat(productForm.price),
      costPrice: parseFloat(productForm.costPrice || "0"),
      stock: parseInt(productForm.stock, 10), category: productForm.category,
      description: productForm.description, isActive: editingProduct?.isActive ?? true,
    };
    if (editingProduct) await updateProduct(p); else await addProduct(p);
    setProductModal(false);
  };
  const toggleProductActive = (p: Product) => { Haptics.selectionAsync(); updateProduct({ ...p, isActive: !p.isActive }); };

  // --- Loyalty handler ---
  const saveLoyalty = async () => {
    const pts = parseInt(loyaltyForm.requiredPoints, 10);
    if (!pts || pts < 1 || pts > 50) {
      Alert.alert("Pontos necessários deve ser entre 1 e 50");
      return;
    }
    if (!loyaltyForm.benefitDescription.trim()) {
      Alert.alert("Descreva o benefício");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoyaltySaving(true);
    await updateLoyaltySettings({ requiredPoints: pts, benefitDescription: loyaltyForm.benefitDescription.trim() });
    setLoyaltySaving(false);
    Alert.alert("Salvo!", "Configurações de fidelidade atualizadas.");
  };

  const TABS: { key: Tab; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
    { key: "services", label: "Serviços", icon: "scissors" },
    { key: "products", label: "Produtos", icon: "package" },
    { key: "loyalty", label: "Fidelidade", icon: "award" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Gerenciamento</Text>
          {tab === "services" && (
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.gold }]} onPress={openNewService}>
              <Feather name="plus" size={18} color="#0C0C0C" />
            </TouchableOpacity>
          )}
          {tab === "products" && (
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.gold }]} onPress={openNewProduct}>
              <Feather name="plus" size={18} color="#0C0C0C" />
            </TouchableOpacity>
          )}
        </View>
        <View style={[styles.tabBar, { backgroundColor: colors.secondary }]}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, tab === t.key && { backgroundColor: colors.card }]}
              onPress={() => { Haptics.selectionAsync(); setTab(t.key); }}
            >
              <Feather name={t.icon} size={14} color={tab === t.key ? colors.gold : colors.mutedForeground} />
              <Text style={[styles.tabLabel, { color: tab === t.key ? colors.foreground : colors.mutedForeground }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Services Tab */}
      {tab === "services" && (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: botPad + 100 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: item.isActive ? 1 : 0.55 }]}>
              <View style={styles.itemMain}>
                <View style={styles.itemInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                    <View style={[styles.catBadge, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.catText, { color: colors.mutedForeground }]}>{item.category}</Text>
                    </View>
                  </View>
                  <Text style={[styles.itemDesc, { color: colors.mutedForeground }]} numberOfLines={1}>{item.description}</Text>
                  <View style={styles.itemMeta}>
                    <Text style={[styles.itemPrice, { color: colors.gold }]}>R${item.price}</Text>
                    <Text style={[styles.metaDot, { color: colors.border }]}>·</Text>
                    <Feather name="clock" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.duration}min</Text>
                  </View>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.secondary }]} onPress={() => openEditService(item)}>
                    <Feather name="edit-2" size={14} color={colors.foreground} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: item.isActive ? "#16A34A22" : colors.secondary }]} onPress={() => toggleServiceActive(item)}>
                    <Feather name={item.isActive ? "eye" : "eye-off"} size={14} color={item.isActive ? "#22C55E" : colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* Products Tab */}
      {tab === "products" && (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: botPad + 100 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const stockLow = item.stock <= 3;
            const margin = item.costPrice > 0 ? Math.round(((item.price - item.costPrice) / item.price) * 100) : null;
            return (
              <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: item.isActive ? 1 : 0.55 }]}>
                <View style={styles.itemMain}>
                  <View style={styles.itemInfo}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                      <View style={[styles.catBadge, { backgroundColor: colors.secondary }]}>
                        <Text style={[styles.catText, { color: colors.mutedForeground }]}>{item.category}</Text>
                      </View>
                    </View>
                    <Text style={[styles.itemDesc, { color: colors.mutedForeground }]} numberOfLines={1}>{item.description}</Text>
                    <View style={styles.itemMeta}>
                      <Text style={[styles.itemPrice, { color: colors.gold }]}>R${item.price}</Text>
                      {item.costPrice > 0 && (
                        <>
                          <Text style={[styles.metaDot, { color: colors.border }]}>·</Text>
                          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Custo: R${item.costPrice}</Text>
                        </>
                      )}
                      {margin !== null && (
                        <>
                          <Text style={[styles.metaDot, { color: colors.border }]}>·</Text>
                          <Text style={[styles.metaText, { color: "#22C55E" }]}>{margin}% margem</Text>
                        </>
                      )}
                    </View>
                    <View style={styles.itemMeta}>
                      <View style={[styles.stockBadge, { backgroundColor: stockLow ? colors.destructive + "22" : "#22C55E22" }]}>
                        <Feather name="package" size={10} color={stockLow ? colors.destructive : "#22C55E"} />
                        <Text style={[styles.stockText, { color: stockLow ? colors.destructive : "#22C55E" }]}>
                          {item.stock} em estoque{stockLow ? " — estoque baixo" : ""}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.itemActions}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.secondary }]} onPress={() => openEditProduct(item)}>
                      <Feather name="edit-2" size={14} color={colors.foreground} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: item.isActive ? "#16A34A22" : colors.secondary }]} onPress={() => toggleProductActive(item)}>
                      <Feather name={item.isActive ? "eye" : "eye-off"} size={14} color={item.isActive ? "#22C55E" : colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="package" size={40} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nenhum produto cadastrado</Text>
              <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.gold }]} onPress={openNewProduct}>
                <Text style={styles.emptyBtnText}>Adicionar produto</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Loyalty Tab */}
      {tab === "loyalty" && (
        <ScrollView
          contentContainerStyle={[styles.loyaltyContent, { paddingBottom: botPad + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.loyaltyInfoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.loyaltyIconRow, { backgroundColor: colors.gold + "18" }]}>
              <Feather name="award" size={28} color={colors.gold} />
            </View>
            <Text style={[styles.loyaltyTitle, { color: colors.foreground }]}>Programa de Fidelidade</Text>
            <Text style={[styles.loyaltySubtitle, { color: colors.mutedForeground }]}>
              Configure quantos pontos o cliente precisa acumular para ganhar o benefício.
              Os pontos são concedidos automaticamente ao concluir cada atendimento.
            </Text>
          </View>

          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formSection, { color: colors.foreground }]}>Configurações</Text>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Pontos para ganhar o benefício</Text>
            <View style={styles.pointsRow}>
              <TouchableOpacity
                style={[styles.pointsBtn, { backgroundColor: colors.secondary }]}
                onPress={() => {
                  const v = Math.max(1, parseInt(loyaltyForm.requiredPoints || "1", 10) - 1);
                  setLoyaltyForm((f) => ({ ...f, requiredPoints: v.toString() }));
                }}
              >
                <Feather name="minus" size={18} color={colors.foreground} />
              </TouchableOpacity>
              <View style={[styles.pointsValue, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text style={[styles.pointsValueText, { color: colors.gold }]}>{loyaltyForm.requiredPoints}</Text>
                <Text style={[styles.pointsUnit, { color: colors.mutedForeground }]}>pontos</Text>
              </View>
              <TouchableOpacity
                style={[styles.pointsBtn, { backgroundColor: colors.secondary }]}
                onPress={() => {
                  const v = Math.min(50, parseInt(loyaltyForm.requiredPoints || "1", 10) + 1);
                  setLoyaltyForm((f) => ({ ...f, requiredPoints: v.toString() }));
                }}
              >
                <Feather name="plus" size={18} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Benefício ao completar</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              value={loyaltyForm.benefitDescription}
              onChangeText={(v) => setLoyaltyForm((f) => ({ ...f, benefitDescription: v }))}
              placeholder="Ex: Corte de cabelo gratuito"
              placeholderTextColor={colors.mutedForeground}
            />

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.gold }]}
              onPress={saveLoyalty}
              disabled={loyaltySaving}
            >
              <Feather name="check" size={16} color="#0C0C0C" />
              <Text style={styles.saveBtnText}>{loyaltySaving ? "Salvando..." : "Salvar configurações"}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.gold + "44" }]}>
            <Text style={[styles.previewTitle, { color: colors.foreground }]}>Pré-visualização</Text>
            <Text style={[styles.previewSub, { color: colors.mutedForeground }]}>
              Como os clientes vão ver o programa
            </Text>
            <View style={[styles.previewProgress, { backgroundColor: colors.secondary }]}>
              <View style={[styles.previewFill, { backgroundColor: colors.gold, width: "40%" }]} />
            </View>
            <Text style={[styles.previewDesc, { color: colors.mutedForeground }]}>
              Faltam {Math.ceil(parseInt(loyaltyForm.requiredPoints || "10", 10) * 0.6)} pontos para ganhar: {loyaltyForm.benefitDescription || "benefício"}
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Service Modal */}
      <Modal visible={serviceModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setServiceModal(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setServiceModal(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editingService ? "Editar Serviço" : "Novo Serviço"}
            </Text>
            <TouchableOpacity onPress={saveService}>
              <Text style={[styles.saveText, { color: colors.gold }]}>Salvar</Text>
            </TouchableOpacity>
          </View>
          <KeyboardAwareScrollViewCompat contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
            {[
              { label: "Nome do serviço", key: "name", type: "default" as const },
              { label: "Preço (R$)", key: "price", type: "decimal-pad" as const },
              { label: "Duração (minutos)", key: "duration", type: "number-pad" as const },
              { label: "Descrição", key: "description", type: "default" as const },
            ].map((field) => (
              <View key={field.key}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{field.label}</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                  value={serviceForm[field.key as keyof typeof serviceForm]}
                  onChangeText={(v) => setServiceForm((f) => ({ ...f, [field.key]: v }))}
                  keyboardType={field.type}
                  placeholder={field.label}
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            ))}
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Categoria</Text>
            <View style={styles.catRow}>
              {SERVICE_CATEGORIES.map((cat) => (
                <TouchableOpacity key={cat} style={[styles.catChip, { backgroundColor: serviceForm.category === cat ? colors.gold : colors.secondary }]} onPress={() => setServiceForm((f) => ({ ...f, category: cat }))}>
                  <Text style={[styles.catChipText, { color: serviceForm.category === cat ? "#0C0C0C" : colors.mutedForeground }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </KeyboardAwareScrollViewCompat>
        </View>
      </Modal>

      {/* Product Modal */}
      <Modal visible={productModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setProductModal(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setProductModal(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editingProduct ? "Editar Produto" : "Novo Produto"}
            </Text>
            <TouchableOpacity onPress={saveProduct}>
              <Text style={[styles.saveText, { color: colors.gold }]}>Salvar</Text>
            </TouchableOpacity>
          </View>
          <KeyboardAwareScrollViewCompat contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
            {[
              { label: "Nome do produto", key: "name", type: "default" as const },
              { label: "Preço de venda (R$)", key: "price", type: "decimal-pad" as const },
              { label: "Preço de custo (R$)", key: "costPrice", type: "decimal-pad" as const },
              { label: "Quantidade em estoque", key: "stock", type: "number-pad" as const },
              { label: "Descrição", key: "description", type: "default" as const },
            ].map((field) => (
              <View key={field.key}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{field.label}</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                  value={productForm[field.key as keyof typeof productForm]}
                  onChangeText={(v) => setProductForm((f) => ({ ...f, [field.key]: v }))}
                  keyboardType={field.type}
                  placeholder={field.label}
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            ))}
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Categoria</Text>
            <View style={styles.catRow}>
              {PRODUCT_CATEGORIES.map((cat) => (
                <TouchableOpacity key={cat} style={[styles.catChip, { backgroundColor: productForm.category === cat ? colors.gold : colors.secondary }]} onPress={() => setProductForm((f) => ({ ...f, category: cat }))}>
                  <Text style={[styles.catChipText, { color: productForm.category === cat ? "#0C0C0C" : colors.mutedForeground }]}>{cat}</Text>
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
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, gap: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  addBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tabBar: { flexDirection: "row", borderRadius: 14, padding: 4, gap: 2 },
  tabBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 9, borderRadius: 11,
  },
  tabLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  list: { padding: 20 },
  itemCard: { borderRadius: 14, borderWidth: 1, marginBottom: 10, padding: 14 },
  itemMain: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  itemInfo: { flex: 1, gap: 5 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  catText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  itemDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  itemMeta: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
  itemPrice: { fontSize: 15, fontFamily: "Inter_700Bold" },
  metaDot: { fontSize: 14 },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  stockBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  stockText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  itemActions: { flexDirection: "row", gap: 8 },
  actionBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 14 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  emptyBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  emptyBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#0C0C0C" },
  // Loyalty tab
  loyaltyContent: { padding: 20, gap: 16 },
  loyaltyInfoCard: { borderRadius: 18, padding: 24, borderWidth: 1, alignItems: "center", gap: 10 },
  loyaltyIconRow: { width: 60, height: 60, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  loyaltyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  loyaltySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  formCard: { borderRadius: 18, padding: 20, borderWidth: 1, gap: 12 },
  formSection: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 4 },
  pointsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  pointsBtn: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  pointsValue: { flex: 1, alignItems: "center", borderWidth: 1.5, borderRadius: 14, paddingVertical: 8 },
  pointsValueText: { fontSize: 26, fontFamily: "Inter_700Bold" },
  pointsUnit: { fontSize: 11, fontFamily: "Inter_400Regular" },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 4 },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0C0C0C" },
  previewCard: { borderRadius: 18, padding: 20, borderWidth: 1.5, gap: 10 },
  previewTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  previewSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  previewProgress: { height: 6, borderRadius: 3, overflow: "hidden" },
  previewFill: { height: "100%", borderRadius: 3 },
  previewDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  // modals
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  saveText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  modalContent: { padding: 20, gap: 0 },
  catRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  catChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
