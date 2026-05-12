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

import {
  DAY_KEYS, DAY_LABELS, DAY_SHORT, DEFAULT_SCHEDULE,
  Product, Professional, ProfessionalSchedule, Service,
  useData,
} from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";

type Tab = "services" | "products" | "team" | "loyalty";

export default function ManagementScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    services, products, professionals, professionalSchedules,
    addService, updateService, addProduct, updateProduct,
    addProfessional, updateProfessional, updateProfessionalSchedule,
    loyaltySettings, updateLoyaltySettings, getProfessionalStats,
    appointments,
  } = useData();

  const [tab, setTab] = useState<Tab>("services");
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  // ── Service state ─────────────────────────────────────────────────────────
  const [serviceModal, setServiceModal] = useState(false);
  const [editingSvc, setEditingSvc] = useState<Service | null>(null);
  const [svcForm, setSvcForm] = useState({ name: "", price: "", duration: "", description: "", category: "Cabelo" });
  const SVC_CATS = ["Cabelo", "Barba", "Combo", "Estética", "Tratamento"];

  const openNewSvc = () => { setEditingSvc(null); setSvcForm({ name: "", price: "", duration: "", description: "", category: "Cabelo" }); setServiceModal(true); };
  const openEditSvc = (s: Service) => { setEditingSvc(s); setSvcForm({ name: s.name, price: s.price.toString(), duration: s.duration.toString(), description: s.description, category: s.category }); setServiceModal(true); };
  const saveSvc = async () => {
    if (!svcForm.name || !svcForm.price || !svcForm.duration) { Alert.alert("Preencha nome, preço e duração"); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const s: Service = { id: editingSvc?.id ?? Date.now().toString(), name: svcForm.name, price: parseFloat(svcForm.price), duration: parseInt(svcForm.duration, 10), description: svcForm.description, category: svcForm.category, isActive: editingSvc?.isActive ?? true };
    if (editingSvc) await updateService(s); else await addService(s);
    setServiceModal(false);
  };
  const toggleSvc = (s: Service) => { Haptics.selectionAsync(); updateService({ ...s, isActive: !s.isActive }); };

  // ── Product state ─────────────────────────────────────────────────────────
  const [productModal, setProductModal] = useState(false);
  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const [prodForm, setProdForm] = useState({ name: "", price: "", costPrice: "", stock: "", category: "Pomada", description: "" });
  const PROD_CATS = ["Pomada", "Barba", "Cabelo", "Tratamento", "Acessório"];

  const openNewProd = () => { setEditingProd(null); setProdForm({ name: "", price: "", costPrice: "", stock: "", category: "Pomada", description: "" }); setProductModal(true); };
  const openEditProd = (p: Product) => { setEditingProd(p); setProdForm({ name: p.name, price: p.price.toString(), costPrice: p.costPrice.toString(), stock: p.stock.toString(), category: p.category, description: p.description }); setProductModal(true); };
  const saveProd = async () => {
    if (!prodForm.name || !prodForm.price || !prodForm.stock) { Alert.alert("Preencha nome, preço e estoque"); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const p: Product = { id: editingProd?.id ?? Date.now().toString(), name: prodForm.name, price: parseFloat(prodForm.price), costPrice: parseFloat(prodForm.costPrice || "0"), stock: parseInt(prodForm.stock, 10), category: prodForm.category, description: prodForm.description, isActive: editingProd?.isActive ?? true };
    if (editingProd) await updateProduct(p); else await addProduct(p);
    setProductModal(false);
  };
  const toggleProd = (p: Product) => { Haptics.selectionAsync(); updateProduct({ ...p, isActive: !p.isActive }); };

  // ── Team state ────────────────────────────────────────────────────────────
  const [teamModal, setTeamModal] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [editingProf, setEditingProf] = useState<Professional | null>(null);
  const [scheduleProf, setScheduleProf] = useState<Professional | null>(null);
  const [profForm, setProfForm] = useState({ name: "", specialty: "", bio: "", phone: "", email: "", commissionRate: "50" });
  const [editSchedule, setEditSchedule] = useState<ProfessionalSchedule>({ ...DEFAULT_SCHEDULE });

  const openNewProf = () => { setEditingProf(null); setProfForm({ name: "", specialty: "", bio: "", phone: "", email: "", commissionRate: "50" }); setTeamModal(true); };
  const openEditProf = (p: Professional) => {
    setEditingProf(p);
    setProfForm({ name: p.name, specialty: p.specialty, bio: p.bio, phone: p.phone ?? "", email: p.email ?? "", commissionRate: (p.commissionRate ?? 50).toString() });
    setTeamModal(true);
  };
  const saveProf = async () => {
    if (!profForm.name || !profForm.specialty) { Alert.alert("Preencha nome e especialidade"); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const initials = profForm.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
    const p: Professional = {
      id: editingProf?.id ?? Date.now().toString(),
      name: profForm.name, specialty: profForm.specialty, bio: profForm.bio,
      phone: profForm.phone, email: profForm.email,
      commissionRate: parseInt(profForm.commissionRate || "50", 10),
      rating: editingProf?.rating ?? 5.0,
      appointmentsCount: editingProf?.appointmentsCount ?? 0,
      isAvailable: editingProf?.isAvailable ?? true,
      avatar: initials,
    };
    if (editingProf) await updateProfessional(p); else await addProfessional(p);
    setTeamModal(false);
  };
  const openSchedule = (p: Professional) => {
    setScheduleProf(p);
    setEditSchedule(professionalSchedules[p.id] ? { ...professionalSchedules[p.id] } : { ...DEFAULT_SCHEDULE });
    setScheduleModal(true);
  };
  const saveSchedule = async () => {
    if (!scheduleProf) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateProfessionalSchedule(scheduleProf.id, editSchedule);
    setScheduleModal(false);
  };
  const toggleDay = (key: typeof DAY_KEYS[number]) => {
    Haptics.selectionAsync();
    setEditSchedule((prev) => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }));
  };
  const toggleProfAvail = (p: Professional) => { Haptics.selectionAsync(); updateProfessional({ ...p, isAvailable: !p.isAvailable }); };

  // ── Loyalty state ─────────────────────────────────────────────────────────
  const [loyaltyForm, setLoyaltyForm] = useState({ requiredPoints: loyaltySettings.requiredPoints.toString(), benefitDescription: loyaltySettings.benefitDescription });
  const [loyaltySaving, setLoyaltySaving] = useState(false);
  const saveLoyalty = async () => {
    const pts = parseInt(loyaltyForm.requiredPoints, 10);
    if (!pts || pts < 1 || pts > 50) { Alert.alert("Pontos deve ser entre 1 e 50"); return; }
    if (!loyaltyForm.benefitDescription.trim()) { Alert.alert("Descreva o benefício"); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoyaltySaving(true);
    await updateLoyaltySettings({ requiredPoints: pts, benefitDescription: loyaltyForm.benefitDescription.trim() });
    setLoyaltySaving(false);
    Alert.alert("Salvo!", "Configurações de fidelidade atualizadas.");
  };

  // ── Tabs config ───────────────────────────────────────────────────────────
  const TABS: { key: Tab; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
    { key: "services", label: "Serviços", icon: "scissors" },
    { key: "products", label: "Produtos", icon: "package" },
    { key: "team", label: "Equipe", icon: "users" },
    { key: "loyalty", label: "Fidelidade", icon: "award" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Gerenciamento</Text>
          {tab === "services" && <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.gold }]} onPress={openNewSvc}><Feather name="plus" size={18} color="#0C0C0C" /></TouchableOpacity>}
          {tab === "products" && <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.gold }]} onPress={openNewProd}><Feather name="plus" size={18} color="#0C0C0C" /></TouchableOpacity>}
          {tab === "team" && <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.gold }]} onPress={openNewProf}><Feather name="plus" size={18} color="#0C0C0C" /></TouchableOpacity>}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={[styles.tabBar, { backgroundColor: colors.secondary }]}>
            {TABS.map((t) => (
              <TouchableOpacity key={t.key} style={[styles.tabBtn, tab === t.key && { backgroundColor: colors.card }]} onPress={() => { Haptics.selectionAsync(); setTab(t.key); }}>
                <Feather name={t.icon} size={13} color={tab === t.key ? colors.gold : colors.mutedForeground} />
                <Text style={[styles.tabLabel, { color: tab === t.key ? colors.foreground : colors.mutedForeground }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* ── SERVICES TAB ── */}
      {tab === "services" && (
        <FlatList data={services} keyExtractor={(i) => i.id} contentContainerStyle={[styles.list, { paddingBottom: botPad + 100 }]} showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: item.isActive ? 1 : 0.55 }]}>
              <View style={styles.itemMain}>
                <View style={styles.itemInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                    <View style={[styles.catBadge, { backgroundColor: colors.secondary }]}><Text style={[styles.catText, { color: colors.mutedForeground }]}>{item.category}</Text></View>
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
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.secondary }]} onPress={() => openEditSvc(item)}><Feather name="edit-2" size={14} color={colors.foreground} /></TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: item.isActive ? "#16A34A22" : colors.secondary }]} onPress={() => toggleSvc(item)}><Feather name={item.isActive ? "eye" : "eye-off"} size={14} color={item.isActive ? "#22C55E" : colors.mutedForeground} /></TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* ── PRODUCTS TAB ── */}
      {tab === "products" && (
        <FlatList data={products} keyExtractor={(i) => i.id} contentContainerStyle={[styles.list, { paddingBottom: botPad + 100 }]} showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const margin = item.costPrice > 0 ? Math.round(((item.price - item.costPrice) / item.price) * 100) : null;
            const stockLow = item.stock <= 3;
            return (
              <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: item.isActive ? 1 : 0.55 }]}>
                <View style={styles.itemMain}>
                  <View style={styles.itemInfo}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                      <View style={[styles.catBadge, { backgroundColor: colors.secondary }]}><Text style={[styles.catText, { color: colors.mutedForeground }]}>{item.category}</Text></View>
                    </View>
                    <Text style={[styles.itemDesc, { color: colors.mutedForeground }]} numberOfLines={1}>{item.description}</Text>
                    <View style={styles.itemMeta}>
                      <Text style={[styles.itemPrice, { color: colors.gold }]}>R${item.price}</Text>
                      {margin !== null && <><Text style={[styles.metaDot, { color: colors.border }]}>·</Text><Text style={[styles.metaText, { color: "#22C55E" }]}>{margin}% margem</Text></>}
                    </View>
                    <View style={[styles.stockBadge, { backgroundColor: stockLow ? colors.destructive + "22" : "#22C55E22", alignSelf: "flex-start" }]}>
                      <Feather name="package" size={10} color={stockLow ? colors.destructive : "#22C55E"} />
                      <Text style={[styles.stockText, { color: stockLow ? colors.destructive : "#22C55E" }]}>{item.stock} em estoque{stockLow ? " — baixo" : ""}</Text>
                    </View>
                  </View>
                  <View style={styles.itemActions}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.secondary }]} onPress={() => openEditProd(item)}><Feather name="edit-2" size={14} color={colors.foreground} /></TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: item.isActive ? "#16A34A22" : colors.secondary }]} onPress={() => toggleProd(item)}><Feather name={item.isActive ? "eye" : "eye-off"} size={14} color={item.isActive ? "#22C55E" : colors.mutedForeground} /></TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<View style={styles.empty}><Feather name="package" size={40} color={colors.border} /><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nenhum produto</Text></View>}
        />
      )}

      {/* ── TEAM TAB ── */}
      {tab === "team" && (
        <FlatList
          data={professionals}
          keyExtractor={(i) => i.id}
          contentContainerStyle={[styles.list, { paddingBottom: botPad + 100 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={[styles.teamSummary, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.teamSummaryItem}>
                <Text style={[styles.teamSummaryValue, { color: colors.gold }]}>{professionals.length}</Text>
                <Text style={[styles.teamSummaryLabel, { color: colors.mutedForeground }]}>Profissionais</Text>
              </View>
              <View style={[styles.teamSummarySep, { backgroundColor: colors.border }]} />
              <View style={styles.teamSummaryItem}>
                <Text style={[styles.teamSummaryValue, { color: colors.gold }]}>{professionals.filter((p) => p.isAvailable).length}</Text>
                <Text style={[styles.teamSummaryLabel, { color: colors.mutedForeground }]}>Disponíveis</Text>
              </View>
              <View style={[styles.teamSummarySep, { backgroundColor: colors.border }]} />
              <View style={styles.teamSummaryItem}>
                <Text style={[styles.teamSummaryValue, { color: colors.gold }]}>{appointments.filter((a) => a.status === "completed").length}</Text>
                <Text style={[styles.teamSummaryLabel, { color: colors.mutedForeground }]}>Atendimentos</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const stats = getProfessionalStats(item.id);
            const schedule = professionalSchedules[item.id] ?? DEFAULT_SCHEDULE;
            const workDays = DAY_KEYS.filter((k) => schedule[k].enabled);
            return (
              <View style={[styles.profCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.profTop}>
                  <View style={[styles.profAvatar, { backgroundColor: item.isAvailable ? colors.gold : colors.secondary }]}>
                    <Text style={[styles.profAvatarText, { color: item.isAvailable ? "#0C0C0C" : colors.mutedForeground }]}>{item.avatar}</Text>
                  </View>
                  <View style={styles.profInfo}>
                    <View style={styles.profNameRow}>
                      <Text style={[styles.profName, { color: colors.foreground }]}>{item.name}</Text>
                      <TouchableOpacity
                        style={[styles.availPill, { backgroundColor: item.isAvailable ? "#22C55E22" : colors.destructive + "22" }]}
                        onPress={() => toggleProfAvail(item)}
                      >
                        <View style={[styles.availDot, { backgroundColor: item.isAvailable ? "#22C55E" : colors.destructive }]} />
                        <Text style={[styles.availText, { color: item.isAvailable ? "#22C55E" : colors.destructive }]}>
                          {item.isAvailable ? "Disponível" : "Indisponível"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.profSpecialty, { color: colors.mutedForeground }]}>{item.specialty}</Text>
                    {item.phone && (
                      <View style={styles.profContact}>
                        <Feather name="phone" size={11} color={colors.mutedForeground} />
                        <Text style={[styles.profContactText, { color: colors.mutedForeground }]}>{item.phone}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Stats row */}
                <View style={[styles.profStatsRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
                  <View style={styles.profStat}>
                    <Text style={[styles.profStatVal, { color: colors.foreground }]}>{stats.completed}</Text>
                    <Text style={[styles.profStatLabel, { color: colors.mutedForeground }]}>Concluídos</Text>
                  </View>
                  <View style={[styles.profStatSep, { backgroundColor: colors.border }]} />
                  <View style={styles.profStat}>
                    <Text style={[styles.profStatVal, { color: colors.foreground }]}>R${stats.revenue}</Text>
                    <Text style={[styles.profStatLabel, { color: colors.mutedForeground }]}>Receita</Text>
                  </View>
                  <View style={[styles.profStatSep, { backgroundColor: colors.border }]} />
                  <View style={styles.profStat}>
                    <Text style={[styles.profStatVal, { color: colors.foreground }]}>{item.commissionRate ?? 50}%</Text>
                    <Text style={[styles.profStatLabel, { color: colors.mutedForeground }]}>Comissão</Text>
                  </View>
                  <View style={[styles.profStatSep, { backgroundColor: colors.border }]} />
                  <View style={styles.profStat}>
                    <View style={styles.profRatingRow}>
                      <Feather name="star" size={11} color={colors.gold} />
                      <Text style={[styles.profStatVal, { color: colors.foreground }]}>{item.rating}</Text>
                    </View>
                    <Text style={[styles.profStatLabel, { color: colors.mutedForeground }]}>Avaliação</Text>
                  </View>
                </View>

                {/* Schedule preview */}
                <View style={styles.schedulePreview}>
                  <View style={styles.scheduleDays}>
                    {DAY_KEYS.map((k) => (
                      <View key={k} style={[styles.schedDayBadge, { backgroundColor: schedule[k].enabled ? colors.gold + "22" : colors.secondary }]}>
                        <Text style={[styles.schedDayText, { color: schedule[k].enabled ? colors.gold : colors.mutedForeground }]}>{DAY_SHORT[k].slice(0, 1)}</Text>
                      </View>
                    ))}
                  </View>
                  {workDays.length > 0 && (
                    <Text style={[styles.schedHoursText, { color: colors.mutedForeground }]}>
                      {schedule[workDays[0]].startTime}–{schedule[workDays[0]].endTime}
                    </Text>
                  )}
                </View>

                {/* Actions */}
                <View style={[styles.profActions, { borderTopColor: colors.border }]}>
                  <TouchableOpacity style={[styles.profActionBtn, { borderColor: colors.border }]} onPress={() => openEditProf(item)}>
                    <Feather name="edit-2" size={13} color={colors.foreground} />
                    <Text style={[styles.profActionText, { color: colors.foreground }]}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.profActionBtn, { borderColor: colors.border }]} onPress={() => openSchedule(item)}>
                    <Feather name="calendar" size={13} color={colors.gold} />
                    <Text style={[styles.profActionText, { color: colors.gold }]}>Escala</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* ── LOYALTY TAB ── */}
      {tab === "loyalty" && (
        <ScrollView contentContainerStyle={[styles.loyaltyContent, { paddingBottom: botPad + 100 }]} showsVerticalScrollIndicator={false}>
          <View style={[styles.loyaltyInfoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.loyaltyIconRow, { backgroundColor: colors.gold + "18" }]}>
              <Feather name="award" size={28} color={colors.gold} />
            </View>
            <Text style={[styles.loyaltyTitle, { color: colors.foreground }]}>Programa de Fidelidade</Text>
            <Text style={[styles.loyaltySubtitle, { color: colors.mutedForeground }]}>
              Configure quantos pontos o cliente precisa acumular para ganhar o benefício. Os pontos são concedidos ao concluir cada atendimento.
            </Text>
          </View>
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formSection, { color: colors.foreground }]}>Configurações</Text>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Pontos para ganhar o benefício</Text>
            <View style={styles.pointsRow}>
              <TouchableOpacity style={[styles.pointsBtn, { backgroundColor: colors.secondary }]} onPress={() => setLoyaltyForm((f) => ({ ...f, requiredPoints: String(Math.max(1, parseInt(f.requiredPoints || "1", 10) - 1)) }))}>
                <Feather name="minus" size={18} color={colors.foreground} />
              </TouchableOpacity>
              <View style={[styles.pointsValue, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text style={[styles.pointsValueText, { color: colors.gold }]}>{loyaltyForm.requiredPoints}</Text>
                <Text style={[styles.pointsUnit, { color: colors.mutedForeground }]}>pontos</Text>
              </View>
              <TouchableOpacity style={[styles.pointsBtn, { backgroundColor: colors.secondary }]} onPress={() => setLoyaltyForm((f) => ({ ...f, requiredPoints: String(Math.min(50, parseInt(f.requiredPoints || "1", 10) + 1)) }))}>
                <Feather name="plus" size={18} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Benefício ao completar</Text>
            <TextInput style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} value={loyaltyForm.benefitDescription} onChangeText={(v) => setLoyaltyForm((f) => ({ ...f, benefitDescription: v }))} placeholder="Ex: Corte de cabelo gratuito" placeholderTextColor={colors.mutedForeground} />
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.gold }]} onPress={saveLoyalty} disabled={loyaltySaving}>
              <Feather name="check" size={16} color="#0C0C0C" />
              <Text style={styles.saveBtnText}>{loyaltySaving ? "Salvando..." : "Salvar configurações"}</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.gold + "44" }]}>
            <Text style={[styles.previewTitle, { color: colors.foreground }]}>Pré-visualização</Text>
            <View style={[styles.previewProgress, { backgroundColor: colors.secondary }]}>
              <View style={[styles.previewFill, { backgroundColor: colors.gold, width: "40%" }]} />
            </View>
            <Text style={[styles.previewDesc, { color: colors.mutedForeground }]}>
              Faltam {Math.ceil(parseInt(loyaltyForm.requiredPoints || "10", 10) * 0.6)} pontos para ganhar: {loyaltyForm.benefitDescription || "benefício"}
            </Text>
          </View>
        </ScrollView>
      )}

      {/* ── SERVICE MODAL ── */}
      <Modal visible={serviceModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setServiceModal(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setServiceModal(false)}><Feather name="x" size={22} color={colors.foreground} /></TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{editingSvc ? "Editar Serviço" : "Novo Serviço"}</Text>
            <TouchableOpacity onPress={saveSvc}><Text style={[styles.saveText, { color: colors.gold }]}>Salvar</Text></TouchableOpacity>
          </View>
          <KeyboardAwareScrollViewCompat contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
            {([
              { label: "Nome do serviço", key: "name", type: "default" },
              { label: "Preço (R$)", key: "price", type: "decimal-pad" },
              { label: "Duração (minutos)", key: "duration", type: "number-pad" },
              { label: "Descrição", key: "description", type: "default" },
            ] as const).map((f) => (
              <View key={f.key}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{f.label}</Text>
                <TextInput style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]} value={svcForm[f.key]} onChangeText={(v) => setSvcForm((p) => ({ ...p, [f.key]: v }))} keyboardType={f.type as any} placeholder={f.label} placeholderTextColor={colors.mutedForeground} />
              </View>
            ))}
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Categoria</Text>
            <View style={styles.catRow}>{SVC_CATS.map((cat) => (<TouchableOpacity key={cat} style={[styles.catChip, { backgroundColor: svcForm.category === cat ? colors.gold : colors.secondary }]} onPress={() => setSvcForm((p) => ({ ...p, category: cat }))}><Text style={[styles.catChipText, { color: svcForm.category === cat ? "#0C0C0C" : colors.mutedForeground }]}>{cat}</Text></TouchableOpacity>))}</View>
          </KeyboardAwareScrollViewCompat>
        </View>
      </Modal>

      {/* ── PRODUCT MODAL ── */}
      <Modal visible={productModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setProductModal(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setProductModal(false)}><Feather name="x" size={22} color={colors.foreground} /></TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{editingProd ? "Editar Produto" : "Novo Produto"}</Text>
            <TouchableOpacity onPress={saveProd}><Text style={[styles.saveText, { color: colors.gold }]}>Salvar</Text></TouchableOpacity>
          </View>
          <KeyboardAwareScrollViewCompat contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
            {([
              { label: "Nome do produto", key: "name", type: "default" },
              { label: "Preço de venda (R$)", key: "price", type: "decimal-pad" },
              { label: "Preço de custo (R$)", key: "costPrice", type: "decimal-pad" },
              { label: "Estoque", key: "stock", type: "number-pad" },
              { label: "Descrição", key: "description", type: "default" },
            ] as const).map((f) => (
              <View key={f.key}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{f.label}</Text>
                <TextInput style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]} value={prodForm[f.key]} onChangeText={(v) => setProdForm((p) => ({ ...p, [f.key]: v }))} keyboardType={f.type as any} placeholder={f.label} placeholderTextColor={colors.mutedForeground} />
              </View>
            ))}
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Categoria</Text>
            <View style={styles.catRow}>{PROD_CATS.map((cat) => (<TouchableOpacity key={cat} style={[styles.catChip, { backgroundColor: prodForm.category === cat ? colors.gold : colors.secondary }]} onPress={() => setProdForm((p) => ({ ...p, category: cat }))}><Text style={[styles.catChipText, { color: prodForm.category === cat ? "#0C0C0C" : colors.mutedForeground }]}>{cat}</Text></TouchableOpacity>))}</View>
          </KeyboardAwareScrollViewCompat>
        </View>
      </Modal>

      {/* ── PROFESSIONAL MODAL ── */}
      <Modal visible={teamModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setTeamModal(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setTeamModal(false)}><Feather name="x" size={22} color={colors.foreground} /></TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{editingProf ? "Editar Profissional" : "Novo Profissional"}</Text>
            <TouchableOpacity onPress={saveProf}><Text style={[styles.saveText, { color: colors.gold }]}>Salvar</Text></TouchableOpacity>
          </View>
          <KeyboardAwareScrollViewCompat contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
            {([
              { label: "Nome completo *", key: "name", type: "default" },
              { label: "Especialidade *", key: "specialty", type: "default" },
              { label: "Bio / Descrição", key: "bio", type: "default" },
              { label: "Telefone", key: "phone", type: "phone-pad" },
              { label: "Email", key: "email", type: "email-address" },
              { label: "Comissão (%)", key: "commissionRate", type: "number-pad" },
            ] as const).map((f) => (
              <View key={f.key}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{f.label}</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                  value={profForm[f.key]}
                  onChangeText={(v) => setProfForm((p) => ({ ...p, [f.key]: v }))}
                  keyboardType={f.type as any}
                  autoCapitalize={f.key === "name" || f.key === "specialty" ? "words" : f.key === "email" ? "none" : "sentences"}
                  placeholder={f.label.replace(" *", "")}
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            ))}
          </KeyboardAwareScrollViewCompat>
        </View>
      </Modal>

      {/* ── SCHEDULE MODAL ── */}
      <Modal visible={scheduleModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setScheduleModal(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setScheduleModal(false)}><Feather name="x" size={22} color={colors.foreground} /></TouchableOpacity>
            <View>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Escala de Trabalho</Text>
              {scheduleProf && <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>{scheduleProf.name}</Text>}
            </View>
            <TouchableOpacity onPress={saveSchedule}><Text style={[styles.saveText, { color: colors.gold }]}>Salvar</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={[styles.scheduleContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
            <Text style={[styles.scheduleHint, { color: colors.mutedForeground }]}>
              Ative os dias e configure os horários de início e fim de cada turno.
            </Text>
            {DAY_KEYS.map((key) => {
              const day = editSchedule[key];
              return (
                <View key={key} style={[styles.scheduleRow, { backgroundColor: colors.card, borderColor: day.enabled ? colors.gold : colors.border }]}>
                  <TouchableOpacity style={styles.scheduleToggle} onPress={() => toggleDay(key)}>
                    <View style={[styles.scheduleCheck, { backgroundColor: day.enabled ? colors.gold : colors.secondary, borderColor: day.enabled ? colors.gold : colors.border }]}>
                      {day.enabled && <Feather name="check" size={12} color="#0C0C0C" />}
                    </View>
                    <Text style={[styles.scheduleDayName, { color: day.enabled ? colors.foreground : colors.mutedForeground }]}>
                      {DAY_LABELS[key]}
                    </Text>
                  </TouchableOpacity>
                  {day.enabled && (
                    <View style={styles.scheduleTimePicker}>
                      <TextInput
                        style={[styles.timeInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                        value={day.startTime}
                        onChangeText={(v) => setEditSchedule((p) => ({ ...p, [key]: { ...p[key], startTime: v } }))}
                        placeholder="08:00"
                        placeholderTextColor={colors.mutedForeground}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                      />
                      <Text style={[styles.timeSep, { color: colors.mutedForeground }]}>até</Text>
                      <TextInput
                        style={[styles.timeInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                        value={day.endTime}
                        onChangeText={(v) => setEditSchedule((p) => ({ ...p, [key]: { ...p[key], endTime: v } }))}
                        placeholder="18:00"
                        placeholderTextColor={colors.mutedForeground}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                      />
                    </View>
                  )}
                  {!day.enabled && (
                    <Text style={[styles.scheduleOff, { color: colors.mutedForeground }]}>Folga</Text>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  addBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tabBar: { flexDirection: "row", borderRadius: 14, padding: 4, gap: 2 },
  tabBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 11 },
  tabLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  list: { padding: 20 },
  itemCard: { borderRadius: 14, borderWidth: 1, marginBottom: 10, padding: 14 },
  itemMain: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  itemInfo: { flex: 1, gap: 5 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
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
  empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  // team
  teamSummary: { flexDirection: "row", borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, alignItems: "center" },
  teamSummaryItem: { flex: 1, alignItems: "center", gap: 4 },
  teamSummaryValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  teamSummaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  teamSummarySep: { width: 1, height: 32, marginHorizontal: 8 },
  profCard: { borderRadius: 16, borderWidth: 1, marginBottom: 14, overflow: "hidden" },
  profTop: { flexDirection: "row", gap: 12, padding: 14, alignItems: "flex-start" },
  profAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  profAvatarText: { fontSize: 17, fontFamily: "Inter_700Bold" },
  profInfo: { flex: 1, gap: 4 },
  profNameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  profName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  availPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  availDot: { width: 6, height: 6, borderRadius: 3 },
  availText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  profSpecialty: { fontSize: 12, fontFamily: "Inter_400Regular" },
  profContact: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  profContactText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  profStatsRow: { flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1 },
  profStat: { flex: 1, alignItems: "center", paddingVertical: 10, gap: 3 },
  profStatVal: { fontSize: 14, fontFamily: "Inter_700Bold" },
  profStatLabel: { fontSize: 9, fontFamily: "Inter_400Regular" },
  profStatSep: { width: 1 },
  profRatingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  schedulePreview: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10 },
  scheduleDays: { flexDirection: "row", gap: 4 },
  schedDayBadge: { width: 22, height: 22, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  schedDayText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  schedHoursText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  profActions: { flexDirection: "row", borderTopWidth: 1 },
  profActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11, borderRightWidth: 0 },
  profActionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  // loyalty
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
  previewProgress: { height: 6, borderRadius: 3, overflow: "hidden" },
  previewFill: { height: "100%", borderRadius: 3 },
  previewDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  // modals
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  modalSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  saveText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  modalContent: { padding: 20, gap: 0 },
  catRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  catChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  // schedule
  scheduleContent: { padding: 20, gap: 10 },
  scheduleHint: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginBottom: 6 },
  scheduleRow: { borderRadius: 14, borderWidth: 1.5, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  scheduleToggle: { flexDirection: "row", alignItems: "center", gap: 10 },
  scheduleCheck: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  scheduleDayName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  scheduleTimePicker: { flexDirection: "row", alignItems: "center", gap: 6 },
  timeInput: { width: 60, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6, fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  timeSep: { fontSize: 12, fontFamily: "Inter_400Regular" },
  scheduleOff: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
});
