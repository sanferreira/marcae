import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { AppAvatar } from "@/components/AppAvatar";
import { PaginationBar } from "@/components/PaginationBar";

import {
  DAY_KEYS, DAY_LABELS, DAY_SHORT, DEFAULT_SCHEDULE,
  Category, Product, ProductOrder, Professional, ProfessionalSchedule, Service, ServicePackage,
  useData,
} from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  PAID_PLANS,
  PAYMENT_PENDING_PLAN,
  type PaidPlanKey,
  getPlanDisplayName,
  getPlanLimits,
  getPlanPrice,
  planHasFeature,
} from "@/constants/plans";
import { typedInputProps } from "@/lib/inputProps";
import {
  formatCurrencyInput,
  isValidEmail,
  isValidTime,
  maskCurrencyInput,
  maskInteger,
  maskPercent,
  maskPhone,
  maskTime,
  passwordPolicyError,
  parseCurrencyInput,
} from "@/lib/masks";

type Tab = "services" | "products" | "orders" | "packages" | "categories" | "team" | "loyalty" | "plan";
type ManagementGroupKey = "operations" | "sales" | "account";

const MANAGEMENT_TABS: Tab[] = ["services", "products", "orders", "packages", "categories", "team", "loyalty", "plan"];
const LIST_TABS: Tab[] = ["services", "products", "orders", "packages", "categories", "team"];
const PAGE_SIZE = 10;
const ORDER_PAYMENT_METHODS = ["PIX", "Dinheiro", "Cartão"];

function isManagementTab(value: unknown): value is Tab {
  return typeof value === "string" && MANAGEMENT_TABS.includes(value as Tab);
}

const uniqueValues = (values: string[]) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CATEGORY_TYPE_META: Record<Category["type"], { label: string; description: string; placeholder: string }> = {
  service: {
    label: "Serviços",
    description: "Use para organizar serviços por área, técnica ou segmento.",
    placeholder: "Ex: Tatuagem",
  },
  product: {
    label: "Produtos",
    description: "Use para organizar produtos vendidos ou retirados no local.",
    placeholder: "Ex: Aftercare",
  },
  income: {
    label: "Entradas",
    description: "Use nos lançamentos financeiros que aumentam o caixa.",
    placeholder: "Ex: Sinal de reserva",
  },
  expense: {
    label: "Despesas",
    description: "Use nos lançamentos financeiros que saem do caixa.",
    placeholder: "Ex: Materiais",
  },
};

const CATEGORY_TYPE_OPTIONS: Array<{ type: Category["type"]; label: string }> = [
  { type: "service", label: CATEGORY_TYPE_META.service.label },
  { type: "product", label: CATEGORY_TYPE_META.product.label },
  { type: "income", label: CATEGORY_TYPE_META.income.label },
  { type: "expense", label: CATEGORY_TYPE_META.expense.label },
];

const orderStatusLabel: Record<ProductOrder["status"], string> = {
  pending: "Pendente",
  paid: "Pago",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const TAB_DETAILS: Record<Tab, { label: string; title: string; description: string; icon: React.ComponentProps<typeof Feather>["name"] }> = {
  services: {
    label: "Serviços",
    title: "Serviços",
    description: "Preços, duração, categorias e pontos de fidelidade.",
    icon: "scissors",
  },
  products: {
    label: "Produtos",
    title: "Produtos",
    description: "Estoque, preço de venda, custo e categorias.",
    icon: "package",
  },
  orders: {
    label: "Pedidos",
    title: "Pedidos",
    description: "Pedidos de produtos feitos pelos clientes.",
    icon: "shopping-bag",
  },
  packages: {
    label: "Pacotes",
    title: "Pacotes",
    description: "Pacotes de sessões para vender e acompanhar consumo.",
    icon: "layers",
  },
  categories: {
    label: "Categorias",
    title: "Categorias",
    description: "Organize serviços, produtos, entradas e despesas.",
    icon: "tag",
  },
  team: {
    label: "Equipe",
    title: "Equipe",
    description: "Funcionários, acesso ao app, serviços e escala.",
    icon: "users",
  },
  loyalty: {
    label: "Fidelidade",
    title: "Fidelidade",
    description: "Regras de pontos e benefício para clientes recorrentes.",
    icon: "award",
  },
  plan: {
    label: "Plano",
    title: "Plano",
    description: "Trial, assinatura, cobrança e link público.",
    icon: "credit-card",
  },
};

const MANAGEMENT_GROUPS: Array<{ key: ManagementGroupKey; label: string; tabs: Tab[] }> = [
  { key: "operations", label: "Operação", tabs: ["services", "team", "categories", "loyalty"] },
  { key: "sales", label: "Vendas", tabs: ["products", "orders", "packages"] },
  { key: "account", label: "Conta", tabs: ["plan"] },
];

const confirmDelete = (title: string, message: string, onConfirm: () => Promise<void>) => {
  const run = async () => {
    try {
      await onConfirm();
    } catch (err) {
      Alert.alert("Erro", err instanceof Error ? err.message : "Não foi possível excluir.");
    }
  };

  Alert.alert(title, message, [
    { text: "Voltar", style: "cancel" },
    { text: "Excluir", style: "destructive", onPress: () => { void run(); } },
  ]);
};

export default function ManagementScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const {
    services, products, categories, productOrders, servicePackages, professionals, professionalSchedules,
    addService, updateService, deleteService, addProduct, updateProduct, deleteProduct,
    addCategory, deleteCategory, updateProductOrderStatus,
    addServicePackage, updateServicePackage,
    addProfessional, updateProfessional, updateProfessionalSchedule,
    loyaltySettings, updateLoyaltySettings, getProfessionalStats,
    appointments, clients,
  } = useData();
  const {
    barbershop, planStatus, barbershopUsers,
    upsertEmployeeUser, removeEmployeeUser,
    upgradeToPremium, openBillingPortal,
  } = useAuth();

  const [tab, setTab] = useState<Tab>("services");
  const [listSearch, setListSearch] = useState("");
  const [listPage, setListPage] = useState(1);
  const topPad = insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const requestedTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;

  useEffect(() => {
    if (isManagementTab(requestedTab)) setTab(requestedTab);
  }, [requestedTab]);
  useEffect(() => {
    setListSearch("");
    setListPage(1);
  }, [tab]);

  // ── Service state ─────────────────────────────────────────────────────────
  const [serviceModal, setServiceModal] = useState(false);
  const [editingSvc, setEditingSvc] = useState<Service | null>(null);
  const [svcForm, setSvcForm] = useState({ name: "", price: "", duration: "", loyaltyPoints: "1", description: "", category: "Geral" });
  const serviceCategoryOptions = uniqueValues(["Geral", ...categories.filter((cat) => cat.type === "service").map((cat) => cat.name), ...services.map((service) => service.category)]);

  const openNewSvc = () => { setEditingSvc(null); setSvcForm({ name: "", price: "", duration: "", loyaltyPoints: "1", description: "", category: serviceCategoryOptions[0] ?? "Geral" }); setServiceModal(true); };
  const openEditSvc = (s: Service) => { setEditingSvc(s); setSvcForm({ name: s.name, price: formatCurrencyInput(s.price), duration: s.duration.toString(), loyaltyPoints: String(s.loyaltyPoints ?? 1), description: s.description, category: s.category }); setServiceModal(true); };
  const saveSvc = async () => {
    if (!svcForm.name || !svcForm.price || !svcForm.duration) { Alert.alert("Preencha nome, preço e duração"); return; }
    const price = parseCurrencyInput(svcForm.price);
    const duration = parseInt(svcForm.duration, 10);
    const loyaltyPoints = parseInt(svcForm.loyaltyPoints || "1", 10);
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(duration) || duration <= 0) { Alert.alert("Dados invalidos", "Informe preco e duracao validos."); return; }
    const category = svcForm.category.trim() || "Geral";
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const s: Service = { id: editingSvc?.id ?? Date.now().toString(), barbershopId: editingSvc?.barbershopId ?? (barbershop?.id ?? ""), name: svcForm.name, price, duration, loyaltyPoints, description: svcForm.description, category, isActive: editingSvc?.isActive ?? true };
    await addCategory({ type: "service", name: category });
    if (editingSvc) await updateService(s); else await addService(s);
    setServiceModal(false);
  };
  const toggleSvc = (s: Service) => { Haptics.selectionAsync(); updateService({ ...s, isActive: !s.isActive }); };
  const confirmDeleteSvc = (s: Service) => confirmDelete("Excluir serviço", `Excluir "${s.name}"? Agendamentos antigos continuam guardando o nome do serviço.`, async () => {
    await deleteService(s.id);
  });

  const [packageModal, setPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);
  const [packageForm, setPackageForm] = useState({ name: "", serviceId: "", sessionsTotal: "4", price: "", validityDays: "90", description: "" });
  const openNewPackage = () => {
    setEditingPackage(null);
    setPackageForm({ name: "", serviceId: services[0]?.id ?? "", sessionsTotal: "4", price: "", validityDays: "90", description: "" });
    setPackageModal(true);
  };
  const openEditPackage = (pkg: ServicePackage) => {
    setEditingPackage(pkg);
    setPackageForm({
      name: pkg.name,
      serviceId: pkg.serviceId ?? "",
      sessionsTotal: String(pkg.sessionsTotal),
      price: formatCurrencyInput(pkg.price),
      validityDays: String(pkg.validityDays),
      description: pkg.description,
    });
    setPackageModal(true);
  };
  const savePackage = async () => {
    if (!packageForm.name.trim() || !packageForm.sessionsTotal || !packageForm.price) {
      Alert.alert("Preencha nome, sessoes e valor do pacote.");
      return;
    }
    const price = parseCurrencyInput(packageForm.price);
    const sessionsTotal = parseInt(packageForm.sessionsTotal, 10);
    const validityDays = parseInt(packageForm.validityDays || "90", 10);
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(sessionsTotal) || sessionsTotal <= 0 || !Number.isFinite(validityDays) || validityDays <= 0) {
      Alert.alert("Dados invalidos", "Revise sessoes, valor e validade do pacote.");
      return;
    }
    const payload = {
      id: editingPackage?.id ?? Date.now().toString(),
      barbershopId: editingPackage?.barbershopId ?? (barbershop?.id ?? ""),
      createdAt: editingPackage?.createdAt ?? new Date().toISOString(),
      name: packageForm.name.trim(),
      serviceId: packageForm.serviceId || undefined,
      sessionsTotal,
      price,
      validityDays,
      description: packageForm.description,
      isActive: editingPackage?.isActive ?? true,
    };
    if (editingPackage) await updateServicePackage(payload);
    else await addServicePackage(payload);
    setPackageModal(false);
  };

  // ── Product state ─────────────────────────────────────────────────────────
  const [productModal, setProductModal] = useState(false);
  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const [prodForm, setProdForm] = useState({ name: "", price: "", costPrice: "", stock: "", category: "Geral", description: "" });
  const productCategoryOptions = uniqueValues(["Geral", ...categories.filter((cat) => cat.type === "product").map((cat) => cat.name), ...products.map((product) => product.category)]);

  const openNewProd = () => { setEditingProd(null); setProdForm({ name: "", price: "", costPrice: "", stock: "", category: productCategoryOptions[0] ?? "Geral", description: "" }); setProductModal(true); };
  const openEditProd = (p: Product) => { setEditingProd(p); setProdForm({ name: p.name, price: formatCurrencyInput(p.price), costPrice: formatCurrencyInput(p.costPrice), stock: p.stock.toString(), category: p.category, description: p.description }); setProductModal(true); };
  const saveProd = async () => {
    if (!prodForm.name || !prodForm.price || !prodForm.stock) { Alert.alert("Preencha nome, preço e estoque"); return; }
    const price = parseCurrencyInput(prodForm.price);
    const costPrice = parseCurrencyInput(prodForm.costPrice || "0");
    const stock = parseInt(prodForm.stock, 10);
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(costPrice) || costPrice < 0 || !Number.isFinite(stock) || stock < 0) {
      Alert.alert("Dados invalidos", "Revise preco, custo e estoque.");
      return;
    }
    const category = prodForm.category.trim() || "Geral";
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const p: Product = { id: editingProd?.id ?? Date.now().toString(), barbershopId: editingProd?.barbershopId ?? (barbershop?.id ?? ""), name: prodForm.name, price, costPrice, stock, category, description: prodForm.description, isActive: editingProd?.isActive ?? true };
    await addCategory({ type: "product", name: category });
    if (editingProd) await updateProduct(p); else await addProduct(p);
    setProductModal(false);
  };
  const toggleProd = (p: Product) => { Haptics.selectionAsync(); updateProduct({ ...p, isActive: !p.isActive }); };
  const confirmDeleteProd = (p: Product) => confirmDelete("Excluir produto", `Excluir "${p.name}"? Pedidos antigos continuam guardando o nome do produto.`, async () => {
    await deleteProduct(p.id);
  });

  // ── Category state ────────────────────────────────────────────────────────
  const [categoryModal, setCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState<{ type: Category["type"]; name: string }>({ type: "service", name: "" });
  const openNewCategory = () => { setCategoryForm({ type: "service", name: "" }); setCategoryModal(true); };
  const saveCategory = async () => {
    if (!categoryForm.name.trim()) { Alert.alert("Informe o nome da categoria"); return; }
    await addCategory({ type: categoryForm.type, name: categoryForm.name.trim() });
    setCategoryModal(false);
  };
  const confirmDeleteCategory = (cat: Category) => confirmDelete("Excluir categoria", `Excluir "${cat.name}"?`, async () => {
    await deleteCategory(cat.id);
  });

  const markOrderPaid = (order: ProductOrder) => {
    const run = async (paymentMethod: string) => {
      await updateProductOrderStatus(order.id, "paid", paymentMethod);
    };

    Alert.alert("Marcar pedido como pago", "Selecione a forma de pagamento:", [
      { text: "Cancelar", style: "cancel" },
      ...ORDER_PAYMENT_METHODS.map((method) => ({ text: method, onPress: () => { void run(method); } })),
    ]);
  };
  const cancelOrder = (order: ProductOrder) => confirmDelete("Cancelar pedido", `Cancelar pedido de ${order.clientName}? O estoque será devolvido.`, async () => {
    await updateProductOrderStatus(order.id, "cancelled");
  });

  // ── Team state ────────────────────────────────────────────────────────────
  const [teamModal, setTeamModal] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [editingProf, setEditingProf] = useState<Professional | null>(null);
  const [scheduleProf, setScheduleProf] = useState<Professional | null>(null);
  const [profForm, setProfForm] = useState({ name: "", specialty: "", bio: "", phone: "", email: "", commissionRate: "50", hasAccess: false, password: "", serviceIds: [] as string[] });
  const [editSchedule, setEditSchedule] = useState<ProfessionalSchedule>({ ...DEFAULT_SCHEDULE });

  const findProfUser = (profId: string) => barbershopUsers.find((u) => u.role === "employee" && u.professionalId === profId);

  const openNewProf = () => {
    const limits = getPlanLimits(planStatus.plan);
    if (professionals.length >= limits.professionals) {
      const label = limits.professionals === 1 ? "profissional" : "profissionais";
      Alert.alert(
        "Limite do plano",
        `Seu plano permite ate ${limits.professionals} ${label}. Faça upgrade para adicionar mais.`,
      );
      return;
    }
    setEditingProf(null);
    setProfForm({ name: "", specialty: "", bio: "", phone: "", email: "", commissionRate: "50", hasAccess: false, password: "", serviceIds: [] });
    setTeamModal(true);
  };
  const openEditProf = (p: Professional) => {
    setEditingProf(p);
    const linkedUser = findProfUser(p.id);
    setProfForm({
      name: p.name, specialty: p.specialty, bio: p.bio,
      phone: maskPhone(p.phone ?? ""), email: (p.email ?? linkedUser?.email ?? "").toLowerCase(),
      commissionRate: (p.commissionRate ?? 50).toString(),
      hasAccess: !!linkedUser, password: "",
      serviceIds: p.serviceIds ?? [],
    });
    setTeamModal(true);
  };
  const saveProf = async () => {
    if (!profForm.name || !profForm.specialty) { Alert.alert("Preencha nome e especialidade"); return; }
    if (services.length > 0 && profForm.serviceIds.length === 0) {
      Alert.alert("Atenção", "Selecione ao menos um serviço que este profissional realiza.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const initials = profForm.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
    const profId = editingProf?.id ?? Date.now().toString();
    const commissionRate = Math.min(100, Math.max(0, parseInt(profForm.commissionRate || "50", 10) || 0));
    const p: Professional = {
      id: profId, barbershopId: editingProf?.barbershopId ?? (barbershop?.id ?? ""),
      name: profForm.name, specialty: profForm.specialty, bio: profForm.bio,
      phone: profForm.phone, email: profForm.email,
      commissionRate,
      rating: editingProf?.rating ?? 5.0,
      appointmentsCount: editingProf?.appointmentsCount ?? 0,
      isAvailable: editingProf?.isAvailable ?? true,
      avatar: initials,
      serviceIds: profForm.serviceIds,
    };
    const existingUser = findProfUser(profId);

    // Pre-validate ALL access constraints before mutating anything, so a failure
    // here doesn't leave a half-saved professional behind.
    if (profForm.hasAccess) {
      if (!planHasFeature(planStatus.plan, "team")) {
        Alert.alert("Plano Medio necessario", "Acesso de funcionario e equipe com login estao disponiveis a partir do plano Medio.");
        return;
      }
      if (!existingUser && employeeAccessCount >= planLimits.employeeLogins) {
        Alert.alert("Limite do plano", `Seu plano permite ate ${planLimits.employeeLogins} login${planLimits.employeeLogins === 1 ? "" : "s"} de funcionario. Faça upgrade para liberar mais acessos.`);
        return;
      }
      const cleanEmail = profForm.email.trim().toLowerCase();
      if (!cleanEmail) { Alert.alert("Atenção", "Email é obrigatório para criar acesso de funcionário."); return; }
      if (!isValidEmail(cleanEmail)) { Alert.alert("Atencao", "Informe um email valido para criar acesso."); return; }
      if (!existingUser && !profForm.password) {
        Alert.alert("Atenção", "Defina uma senha para o novo acesso de funcionário.");
        return;
      }
      if (profForm.password) {
        const passwordError = passwordPolicyError(profForm.password);
        if (passwordError) {
          Alert.alert("Senha insegura", passwordError);
          return;
        }
      }
      const collision = barbershopUsers.find(
        (u) => u.email.toLowerCase() === cleanEmail && u.id !== existingUser?.id
      );
      if (collision) {
        Alert.alert("Erro no acesso", "Email já está em uso por outro usuário.");
        return;
      }
    }

    let savedProfessional = p;
    if (editingProf) await updateProfessional(p);
    else savedProfessional = await addProfessional(p);

    if (profForm.hasAccess) {
      const res = await upsertEmployeeUser({
        professionalId: savedProfessional.id, name: profForm.name, email: profForm.email,
        password: profForm.password, // empty string means "keep current" for existing users
        phone: profForm.phone,
      });
      if (!res.ok) { Alert.alert("Erro no acesso", res.error ?? ""); return; }
    } else if (existingUser) {
      await removeEmployeeUser(existingUser.id);
    }
    setTeamModal(false);
  };
  const openSchedule = (p: Professional) => {
    setScheduleProf(p);
    setEditSchedule(professionalSchedules[p.id] ? { ...professionalSchedules[p.id] } : { ...DEFAULT_SCHEDULE });
    setScheduleModal(true);
  };
  const saveSchedule = async () => {
    if (!scheduleProf) return;
    const invalidDay = DAY_KEYS.find((key) => {
      const day = editSchedule[key];
      return day.enabled && (!isValidTime(day.startTime) || !isValidTime(day.endTime) || day.startTime >= day.endTime);
    });
    if (invalidDay) {
      Alert.alert("Horario invalido", `Revise a escala de ${DAY_LABELS[invalidDay]}.`);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateProfessionalSchedule(scheduleProf.id, editSchedule);
    setScheduleModal(false);
  };
  const toggleDay = (key: typeof DAY_KEYS[number]) => {
    Haptics.selectionAsync();
    setEditSchedule((prev) => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }));
  };
  const toggleProfAvail = (p: Professional) => { Haptics.selectionAsync(); updateProfessional({ ...p, isAvailable: !p.isAvailable }); };
  const toggleProfService = (serviceId: string) => {
    Haptics.selectionAsync();
    setProfForm((current) => ({
      ...current,
      serviceIds: current.serviceIds.includes(serviceId)
        ? current.serviceIds.filter((id) => id !== serviceId)
        : [...current.serviceIds, serviceId],
    }));
  };

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

  const handleSubscribe = (plan: PaidPlanKey) => {
    const planData = PAID_PLANS.find((item) => item.key === plan);
    const title = `Assinar ${planData?.name ?? "plano"}`;
    const message = `Confirmar assinatura do plano ${planData?.name ?? ""} por ${planData?.price ?? ""}/mes?`;
    const run = async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const result = await upgradeToPremium(plan);
      if (!result.ok) Alert.alert("Nao foi possivel abrir o pagamento", result.error ?? "Tente novamente em instantes.");
    };

    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel" },
      { text: "Confirmar", onPress: () => { void run(); } },
    ]);
  };

  const handleManageSubscription = async () => {
    const r = await openBillingPortal();
    if (!r.ok) Alert.alert("Nao foi possivel abrir o portal", r.error ?? "Tente novamente em instantes.");
  };

  const activeTabInfo = TAB_DETAILS[tab];
  const activeGroup = MANAGEMENT_GROUPS.find((group) => group.tabs.includes(tab)) ?? MANAGEMENT_GROUPS[0];
  const planLimits = getPlanLimits(planStatus.plan);
  const employeeAccessCount = barbershopUsers.filter((u) => u.role === "employee").length;
  const primaryAction =
    tab === "services" ? { label: "Novo serviço", onPress: openNewSvc } :
      tab === "products" ? { label: "Novo produto", onPress: openNewProd } :
        tab === "packages" ? { label: "Novo pacote", onPress: openNewPackage } :
          tab === "categories" ? { label: "Nova categoria", onPress: openNewCategory } :
            tab === "team" ? { label: "Novo funcionário", onPress: openNewProf } :
              null;

  const planLabel = planStatus.plan === "trial" ? "Trial gratuito" : planStatus.isPremium ? getPlanDisplayName(planStatus.plan) : planStatus.plan === PAYMENT_PENDING_PLAN ? "Pagamento pendente" : "Expirado";
  const planAccent = planStatus.isPremium ? "#22C55E" : planStatus.plan === "trial" ? colors.gold : colors.destructive;
  const trialProgress = barbershop && planStatus.plan === "trial"
    ? Math.max(0, Math.min(1, planStatus.trialDaysLeft / 7))
    : 0;
  const term = listSearch.trim().toLowerCase();
  const filterByText = <T,>(items: T[], toText: (item: T) => string) =>
    term ? items.filter((item) => toText(item).toLowerCase().includes(term)) : items;
  const paginate = <T,>(items: T[]) => {
    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const page = Math.min(listPage, totalPages);
    return {
      data: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      page,
      totalPages,
      totalItems,
      pageSize: PAGE_SIZE,
    };
  };
  const filteredServices = filterByText(services, (item) => `${item.name} ${item.category} ${item.description}`);
  const filteredProducts = filterByText(products, (item) => `${item.name} ${item.category} ${item.description}`);
  const filteredOrders = filterByText(productOrders, (item) => `${item.clientName} ${item.status} ${item.items.map((orderItem) => orderItem.productName).join(" ")}`);
  const filteredPackages = filterByText(servicePackages, (item) => `${item.name} ${item.description} ${services.find((service) => service.id === item.serviceId)?.name ?? ""}`);
  const filteredCategories = filterByText(categories, (item) => `${item.name} ${CATEGORY_TYPE_META[item.type].label}`);
  const filteredProfessionals = filterByText(professionals, (item) => `${item.name} ${item.specialty} ${item.email ?? ""} ${item.phone ?? ""}`);
  const servicesPage = paginate(filteredServices);
  const productsPage = paginate(filteredProducts);
  const ordersPage = paginate(filteredOrders);
  const packagesPage = paginate(filteredPackages);
  const categoriesPage = paginate(filteredCategories);
  const professionalsPage = paginate(filteredProfessionals);
  const renderPagination = (info: { page: number; totalPages: number; totalItems: number; pageSize: number }) => (
    <PaginationBar
      page={info.page}
      totalPages={info.totalPages}
      totalItems={info.totalItems}
      pageSize={info.pageSize}
      onPageChange={setListPage}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleBlock}>
            <Text style={[styles.title, { color: colors.foreground }]}>{activeTabInfo.title}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>{activeTabInfo.description}</Text>
          </View>
          {primaryAction && (
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.gold }]} onPress={primaryAction.onPress}>
              <Feather name="plus" size={16} color={colors.goldForeground} />
              <Text style={[styles.addBtnText, { color: colors.goldForeground }]} numberOfLines={1}>{primaryAction.label}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.groupBar}>
          {MANAGEMENT_GROUPS.map((group) => {
            const selected = group.key === activeGroup.key;
            return (
              <TouchableOpacity
                key={group.key}
                style={[styles.groupBtn, { backgroundColor: selected ? colors.gold : colors.secondary, borderColor: selected ? colors.gold : colors.border }]}
                onPress={() => { Haptics.selectionAsync(); setTab(group.tabs[0]); }}
              >
                <Text style={[styles.groupLabel, { color: selected ? colors.goldForeground : colors.foreground }]}>{group.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={[styles.tabBar, { backgroundColor: colors.secondary }]}>
          {activeGroup.tabs.map((key) => {
            const t = TAB_DETAILS[key];
            return (
              <TouchableOpacity key={key} style={[styles.tabBtn, tab === key && { backgroundColor: colors.card }]} onPress={() => { Haptics.selectionAsync(); setTab(key); }}>
                <Feather name={t.icon} size={13} color={tab === key ? colors.gold : colors.mutedForeground} />
                <Text style={[styles.tabLabel, { color: tab === key ? colors.foreground : colors.mutedForeground }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {LIST_TABS.includes(tab) && (
          <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={15} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Filtrar esta lista..."
              placeholderTextColor={colors.mutedForeground}
              value={listSearch}
              onChangeText={(value) => { setListSearch(value); setListPage(1); }}
            />
            {listSearch.length > 0 && (
              <TouchableOpacity onPress={() => { setListSearch(""); setListPage(1); }}>
                <Feather name="x" size={15} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* ── SERVICES TAB ── */}
      {tab === "services" && (
        <FlatList data={servicesPage.data} keyExtractor={(i) => i.id} contentContainerStyle={[styles.list, { paddingBottom: botPad + 100 }]} showsVerticalScrollIndicator={false}
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
                    <Text style={[styles.metaDot, { color: colors.border }]}>-</Text>
                    <Feather name="award" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.loyaltyPoints ?? 1} pts</Text>
                  </View>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.secondary }]} onPress={() => openEditSvc(item)}><Feather name="edit-2" size={14} color={colors.foreground} /></TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: item.isActive ? "#16A34A22" : colors.secondary }]} onPress={() => toggleSvc(item)}><Feather name={item.isActive ? "eye" : "eye-off"} size={14} color={item.isActive ? "#22C55E" : colors.mutedForeground} /></TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.destructive + "18" }]} onPress={() => confirmDeleteSvc(item)}><Feather name="trash-2" size={14} color={colors.destructive} /></TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          ListFooterComponent={renderPagination(servicesPage)}
        />
      )}

      {/* ── PRODUCTS TAB ── */}
      {tab === "products" && (
        <FlatList data={productsPage.data} keyExtractor={(i) => i.id} contentContainerStyle={[styles.list, { paddingBottom: botPad + 100 }]} showsVerticalScrollIndicator={false}
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
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.destructive + "18" }]} onPress={() => confirmDeleteProd(item)}><Feather name="trash-2" size={14} color={colors.destructive} /></TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<View style={styles.empty}><Feather name="package" size={40} color={colors.border} /><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nenhum produto</Text></View>}
          ListFooterComponent={renderPagination(productsPage)}
        />
      )}

      {tab === "orders" && (
        <FlatList
          data={ordersPage.data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: botPad + 100 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: order }) => (
            <View style={[styles.ordersPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.ordersPanelHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ordersTitle, { color: colors.foreground }]}>{order.clientName}</Text>
                  <Text style={[styles.orderItems, { color: colors.mutedForeground }]} numberOfLines={2}>
                    {order.items.map((item) => `${item.quantity}x ${item.productName}`).join(", ")}
                  </Text>
                </View>
                <View style={[styles.orderStatus, { backgroundColor: order.status === "pending" ? colors.gold + "18" : order.status === "cancelled" ? colors.destructive + "18" : "#22C55E22" }]}>
                  <Text style={[styles.orderStatusText, { color: order.status === "pending" ? colors.gold : order.status === "cancelled" ? colors.destructive : "#22C55E" }]}>
                    {orderStatusLabel[order.status]}
                  </Text>
                </View>
              </View>
              <View style={styles.orderBottom}>
                <Text style={[styles.orderTotal, { color: colors.gold }]}>{formatCurrency(order.totalPrice)}</Text>
                <View style={styles.orderActions}>
                  {order.status === "pending" && (
                    <>
                      <TouchableOpacity style={[styles.orderBtn, { borderColor: colors.destructive + "55" }]} onPress={() => cancelOrder(order)}>
                        <Text style={[styles.orderBtnText, { color: colors.destructive }]}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.orderBtn, { borderColor: colors.gold }]} onPress={() => markOrderPaid(order)}>
                        <Text style={[styles.orderBtnText, { color: colors.gold }]}>Pago manual</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {order.status === "paid" && (
                    <TouchableOpacity style={[styles.orderBtn, { borderColor: "#22C55E" }]} onPress={() => { void updateProductOrderStatus(order.id, "delivered", order.paymentMethod); }}>
                      <Text style={[styles.orderBtnText, { color: "#22C55E" }]}>Entregue</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {!!order.appointmentId && (
                <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>Pedido vinculado a um agendamento</Text>
              )}
            </View>
          )}
          ListEmptyComponent={<View style={styles.empty}><Feather name="shopping-bag" size={40} color={colors.border} /><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nenhum pedido de produto</Text></View>}
          ListFooterComponent={renderPagination(ordersPage)}
        />
      )}

      {/* ── CATEGORIES TAB ── */}
      {tab === "packages" && (
        <FlatList
          data={packagesPage.data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: botPad + 100 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const linkedService = services.find((service) => service.id === item.serviceId);
            return (
              <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: item.isActive ? 1 : 0.55 }]}>
                <View style={styles.itemMain}>
                  <View style={styles.itemInfo}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                      <View style={[styles.catBadge, { backgroundColor: colors.secondary }]}>
                        <Text style={[styles.catText, { color: colors.mutedForeground }]}>{linkedService?.name ?? "Qualquer servico"}</Text>
                      </View>
                    </View>
                    <Text style={[styles.itemDesc, { color: colors.mutedForeground }]} numberOfLines={1}>{item.description || "Pacote de sessoes para venda manual ao cliente."}</Text>
                    <View style={styles.itemMeta}>
                      <Text style={[styles.itemPrice, { color: colors.gold }]}>{formatCurrency(item.price)}</Text>
                      <Text style={[styles.metaDot, { color: colors.border }]}>-</Text>
                      <Feather name="repeat" size={11} color={colors.mutedForeground} />
                      <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.sessionsTotal} sessoes</Text>
                      <Text style={[styles.metaDot, { color: colors.border }]}>-</Text>
                      <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.validityDays} dias</Text>
                    </View>
                  </View>
                  <View style={styles.itemActions}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.secondary }]} onPress={() => openEditPackage(item)}>
                      <Feather name="edit-2" size={14} color={colors.foreground} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<View style={styles.empty}><Feather name="layers" size={40} color={colors.border} /><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nenhum pacote cadastrado</Text></View>}
          ListFooterComponent={renderPagination(packagesPage)}
        />
      )}

      {tab === "categories" && (
        <FlatList
          data={categoriesPage.data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: botPad + 100 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.itemMain}>
                <View style={styles.itemInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                    <View style={[styles.catBadge, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.catText, { color: colors.mutedForeground }]}>
                        {CATEGORY_TYPE_META[item.type].label}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>
                    {CATEGORY_TYPE_META[item.type].description}
                  </Text>
                </View>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.destructive + "18" }]} onPress={() => confirmDeleteCategory(item)}>
                  <Feather name="trash-2" size={14} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="tag" size={40} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nenhuma categoria cadastrada</Text>
            </View>
          }
          ListFooterComponent={renderPagination(categoriesPage)}
        />
      )}

      {/* ── TEAM TAB ── */}
      {tab === "team" && (
        <FlatList
          data={professionalsPage.data}
          keyExtractor={(i) => i.id}
          contentContainerStyle={[styles.list, { paddingBottom: botPad + 100 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={[styles.teamSummary, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.teamSummaryGrid}>
                <View style={styles.teamSummaryItem}>
                  <Text style={[styles.teamSummaryValue, { color: colors.gold }]}>{professionals.length}/{planLimits.professionals}</Text>
                  <Text style={[styles.teamSummaryLabel, { color: colors.mutedForeground }]}>Profissionais</Text>
                </View>
                <View style={styles.teamSummaryItem}>
                  <Text style={[styles.teamSummaryValue, { color: colors.gold }]}>{employeeAccessCount}/{planLimits.employeeLogins}</Text>
                  <Text style={[styles.teamSummaryLabel, { color: colors.mutedForeground }]}>Logins equipe</Text>
                </View>
                <View style={styles.teamSummaryItem}>
                  <Text style={[styles.teamSummaryValue, { color: colors.gold }]}>{professionals.filter((p) => p.isAvailable).length}</Text>
                  <Text style={[styles.teamSummaryLabel, { color: colors.mutedForeground }]}>Disponíveis</Text>
                </View>
              </View>
              {(professionals.length >= planLimits.professionals || employeeAccessCount >= planLimits.employeeLogins) && (
                <Text style={[styles.teamLimitHint, { color: colors.mutedForeground }]}>
                  Limite do plano atual atingido. Faça upgrade para ampliar equipe ou acessos.
                </Text>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const stats = getProfessionalStats(item.id);
            const schedule = professionalSchedules[item.id] ?? DEFAULT_SCHEDULE;
            const workDays = DAY_KEYS.filter((k) => schedule[k].enabled);
            return (
              <View style={[styles.profCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.profTop}>
                  <AppAvatar
                    imageUri={item.avatarImage}
                    fallback={item.avatar}
                    size={56}
                    backgroundColor={item.isAvailable ? colors.gold : colors.secondary}
                    textColor={item.isAvailable ? colors.goldForeground : colors.mutedForeground}
                    fontSize={20}
                  />
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
          ListFooterComponent={renderPagination(professionalsPage)}
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
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              value={loyaltyForm.benefitDescription}
              onChangeText={(v) => setLoyaltyForm((f) => ({ ...f, benefitDescription: v }))}
              placeholder="Ex: Atendimento gratuito"
              placeholderTextColor={colors.mutedForeground}
              {...typedInputProps("text")}
            />
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.gold }]} onPress={saveLoyalty} disabled={loyaltySaving}>
              <Feather name="check" size={16} color={colors.goldForeground} />
              <Text style={[styles.saveBtnText, { color: colors.goldForeground }]}>{loyaltySaving ? "Salvando..." : "Salvar configurações"}</Text>
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

      {/* ── PLAN TAB ── */}
      {tab === "plan" && barbershop && (
        <ScrollView contentContainerStyle={[styles.loyaltyContent, { paddingBottom: botPad + 100 }]} showsVerticalScrollIndicator={false}>
          <View style={[styles.planHeroCard, { backgroundColor: colors.card, borderColor: planAccent + "55" }]}>
            <View style={styles.planHeroTop}>
              <View style={[styles.planBadge, { backgroundColor: planAccent }]}>
                <Text style={[styles.planBadgeText, { color: planStatus.plan === "trial" ? colors.goldForeground : "#FFFDF7" }]}>{planLabel.toUpperCase()}</Text>
              </View>
              <Feather name={planStatus.isPremium ? "check-circle" : planStatus.plan === "trial" ? "clock" : "alert-circle"} size={22} color={planAccent} />
            </View>
            <Text style={[styles.planShopName, { color: colors.foreground }]}>{barbershop.name}</Text>
            <Text style={[styles.planShopSlug, { color: colors.mutedForeground }]}>ID: {barbershop.slug}</Text>
            <View style={[styles.publicLinkBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="link" size={14} color={colors.gold} />
              <Text style={[styles.publicLinkText, { color: colors.foreground }]}>
                {Platform.OS === "web" && typeof window !== "undefined" ? `${window.location.origin}/register?slug=${barbershop.slug}` : `/register?slug=${barbershop.slug}`}
              </Text>
            </View>

            {planStatus.plan === "trial" && (
              <View style={{ marginTop: 14 }}>
                <View style={styles.planRow}>
                  <Text style={[styles.planRowLabel, { color: colors.mutedForeground }]}>Restam</Text>
                  <Text style={[styles.planRowValue, { color: colors.gold }]}>{planStatus.trialDaysLeft} dia{planStatus.trialDaysLeft !== 1 ? "s" : ""}</Text>
                </View>
                <View style={[styles.planProgressTrack, { backgroundColor: colors.secondary }]}>
                  <View style={[styles.planProgressFill, { backgroundColor: colors.gold, width: `${trialProgress * 100}%` }]} />
                </View>
                <Text style={[styles.planHint, { color: colors.mutedForeground }]}>
                  Trial termina em {new Date(barbershop.trialEndsAt).toLocaleDateString("pt-BR")}. Assine para manter acesso ininterrupto.
                </Text>
              </View>
            )}
            {planStatus.isPremium && (
              <View style={{ marginTop: 14 }}>
                <View style={styles.planRow}>
                  <Text style={[styles.planRowLabel, { color: colors.mutedForeground }]}>Renova em</Text>
                  <Text style={[styles.planRowValue, { color: colors.foreground }]}>
                    {barbershop.subscriptionRenewsAt ? new Date(barbershop.subscriptionRenewsAt).toLocaleDateString("pt-BR") : "—"}
                  </Text>
                </View>
                <Text style={[styles.planHint, { color: colors.mutedForeground }]}>
                  Sua assinatura {getPlanDisplayName(planStatus.plan)} esta ativa. Cobranca mensal de {getPlanPrice(planStatus.plan)} no cartao cadastrado.
                </Text>
              </View>
            )}
            {planStatus.plan === PAYMENT_PENDING_PLAN && (
              <Text style={[styles.planHint, { color: colors.destructive, marginTop: 14 }]}>
                O pagamento esta pendente. Atualize o cartao ou conclua o checkout para liberar o sistema.
              </Text>
            )}
            {planStatus.plan === "expired" && (
              <Text style={[styles.planHint, { color: colors.destructive, marginTop: 14 }]}>
                Seu plano expirou em {new Date(barbershop.trialEndsAt).toLocaleDateString("pt-BR")}. Assine para liberar o sistema.
              </Text>
            )}
          </View>

          {PAID_PLANS.map((plan) => {
            const current = planStatus.plan === plan.key;
            return (
              <View
                key={plan.key}
                style={[
                  styles.priceCard,
                  {
                    backgroundColor: current ? colors.gold + "12" : colors.card,
                    borderColor: current ? colors.gold : colors.border,
                  },
                ]}
              >
                <View style={styles.priceCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.priceBadge, { color: colors.gold }]}>{plan.badge}</Text>
                    <Text style={[styles.priceTitle, { color: colors.foreground }]}>{plan.name}</Text>
                  </View>
                  {current && (
                    <View style={[styles.currentPill, { backgroundColor: colors.gold + "22" }]}>
                      <Text style={[styles.currentPillText, { color: colors.gold }]}>Atual</Text>
                    </View>
                  )}
                </View>
                <View style={styles.priceRow}>
                  <Text style={[styles.priceValue, { color: colors.gold }]}>{plan.price}</Text>
                  <Text style={[styles.priceUnit, { color: colors.mutedForeground }]}>/mes</Text>
                </View>
                <Text style={[styles.priceSummary, { color: colors.mutedForeground }]}>{plan.summary}</Text>
                {plan.features.map((feat) => (
                  <View key={feat} style={styles.priceRowItem}>
                    <Feather name="check" size={14} color={colors.gold} />
                    <Text style={[styles.priceFeat, { color: colors.foreground }]}>{feat}</Text>
                  </View>
                ))}
                {plan.key === "super" && (
                  <View style={[styles.enterpriseCallout, { backgroundColor: colors.gold + "12", borderColor: colors.gold + "44" }]}>
                    <Feather name="message-circle" size={15} color={colors.gold} />
                    <Text style={[styles.enterpriseCalloutText, { color: colors.gold }]}>
                      Acima de 20 profissionais? Fale com suporte para um plano sob medida.
                    </Text>
                  </View>
                )}
                {!planStatus.isPremium && (
                  <TouchableOpacity style={[styles.subBtn, { backgroundColor: colors.gold }]} onPress={() => handleSubscribe(plan.key)}>
                    <Feather name="credit-card" size={16} color={colors.goldForeground} />
                    <Text style={[styles.subBtnText, { color: colors.goldForeground }]}>
                      {planStatus.plan === "expired" ? `Reativar ${plan.name}` : `Assinar ${plan.name}`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {planStatus.isPremium && (
            <TouchableOpacity style={[styles.subBtn, { backgroundColor: colors.gold }]} onPress={handleManageSubscription}>
              <Feather name="credit-card" size={16} color={colors.goldForeground} />
              <Text style={[styles.subBtnText, { color: colors.goldForeground }]}>Gerenciar assinatura</Text>
            </TouchableOpacity>
          )}

          {/* Stats */}
          <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.previewTitle, { color: colors.foreground }]}>Seu estabelecimento</Text>
            <View style={styles.planStatsRow}>
              <View style={styles.planStatItem}>
                <Text style={[styles.planStatVal, { color: colors.gold }]}>{clients.length}</Text>
                <Text style={[styles.planStatLabel, { color: colors.mutedForeground }]}>Clientes</Text>
              </View>
              <View style={styles.planStatItem}>
                <Text style={[styles.planStatVal, { color: colors.gold }]}>{employeeAccessCount}/{planLimits.employeeLogins}</Text>
                <Text style={[styles.planStatLabel, { color: colors.mutedForeground }]}>Funcionários</Text>
              </View>
              <View style={styles.planStatItem}>
                <Text style={[styles.planStatVal, { color: colors.gold }]}>{appointments.length}</Text>
                <Text style={[styles.planStatLabel, { color: colors.mutedForeground }]}>Agendamentos</Text>
              </View>
            </View>
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
              { label: "Pontos fidelidade", key: "loyaltyPoints", type: "number-pad" },
              { label: "Descrição", key: "description", type: "default" },
            ] as const).map((f) => (
              <View key={f.key}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{f.label}</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                  value={svcForm[f.key]}
                  onChangeText={(v) => {
                    const value = f.key === "price"
                      ? maskCurrencyInput(v)
                      : f.key === "duration"
                        ? maskInteger(v, 3)
                        : f.key === "loyaltyPoints"
                          ? maskInteger(v, 2)
                          : v;
                    setSvcForm((p) => ({ ...p, [f.key]: value }));
                  }}
                  placeholder={f.label}
                  placeholderTextColor={colors.mutedForeground}
                  {...typedInputProps(f.key === "price" ? "decimal" : f.key === "duration" || f.key === "loyaltyPoints" ? "number" : "text")}
                />
              </View>
            ))}
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Categoria</Text>
            <View style={styles.catRow}>{serviceCategoryOptions.map((cat) => (<TouchableOpacity key={cat} style={[styles.catChip, { backgroundColor: svcForm.category === cat ? colors.gold : colors.secondary }]} onPress={() => setSvcForm((p) => ({ ...p, category: cat }))}><Text style={[styles.catChipText, { color: svcForm.category === cat ? colors.goldForeground : colors.mutedForeground }]}>{cat}</Text></TouchableOpacity>))}</View>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card, marginTop: 10 }]}
              value={svcForm.category}
              onChangeText={(category) => setSvcForm((p) => ({ ...p, category }))}
              placeholder="Ex: Tatuagem, Piercing, Consulta"
              placeholderTextColor={colors.mutedForeground}
              {...typedInputProps("text")}
            />
          </KeyboardAwareScrollViewCompat>
        </View>
      </Modal>

      <Modal visible={packageModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPackageModal(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setPackageModal(false)}><Feather name="x" size={22} color={colors.foreground} /></TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{editingPackage ? "Editar Pacote" : "Novo Pacote"}</Text>
            <TouchableOpacity onPress={savePackage}><Text style={[styles.saveText, { color: colors.gold }]}>Salvar</Text></TouchableOpacity>
          </View>
          <KeyboardAwareScrollViewCompat contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
            {([
              { label: "Nome do pacote", key: "name", type: "default" },
              { label: "Sessoes inclusas", key: "sessionsTotal", type: "number-pad" },
              { label: "Valor do pacote (R$)", key: "price", type: "decimal-pad" },
              { label: "Validade em dias", key: "validityDays", type: "number-pad" },
              { label: "Descricao", key: "description", type: "default" },
            ] as const).map((f) => (
              <View key={f.key}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{f.label}</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                  value={packageForm[f.key]}
                  onChangeText={(v) => {
                    const value = f.key === "price"
                      ? maskCurrencyInput(v)
                      : f.key === "sessionsTotal" || f.key === "validityDays"
                        ? maskInteger(v, 4)
                        : v;
                    setPackageForm((p) => ({ ...p, [f.key]: value }));
                  }}
                  placeholder={f.label}
                  placeholderTextColor={colors.mutedForeground}
                  {...typedInputProps(f.key === "price" ? "decimal" : f.key === "sessionsTotal" || f.key === "validityDays" ? "number" : "text")}
                />
              </View>
            ))}
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Servico vinculado</Text>
            <View style={styles.catRow}>
              <TouchableOpacity style={[styles.catChip, { backgroundColor: packageForm.serviceId === "" ? colors.gold : colors.secondary }]} onPress={() => setPackageForm((p) => ({ ...p, serviceId: "" }))}>
                <Text style={[styles.catChipText, { color: packageForm.serviceId === "" ? colors.goldForeground : colors.mutedForeground }]}>Qualquer servico</Text>
              </TouchableOpacity>
              {services.map((service) => (
                <TouchableOpacity key={service.id} style={[styles.catChip, { backgroundColor: packageForm.serviceId === service.id ? colors.gold : colors.secondary }]} onPress={() => setPackageForm((p) => ({ ...p, serviceId: service.id }))}>
                  <Text style={[styles.catChipText, { color: packageForm.serviceId === service.id ? colors.goldForeground : colors.mutedForeground }]}>{service.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
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
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                  value={prodForm[f.key]}
                  onChangeText={(v) => {
                    const value = f.key === "price" || f.key === "costPrice"
                      ? maskCurrencyInput(v)
                      : f.key === "stock"
                        ? maskInteger(v, 5)
                        : v;
                    setProdForm((p) => ({ ...p, [f.key]: value }));
                  }}
                  placeholder={f.label}
                  placeholderTextColor={colors.mutedForeground}
                  {...typedInputProps(f.key === "price" || f.key === "costPrice" ? "decimal" : f.key === "stock" ? "number" : "text")}
                />
              </View>
            ))}
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Categoria</Text>
            <View style={styles.catRow}>{productCategoryOptions.map((cat) => (<TouchableOpacity key={cat} style={[styles.catChip, { backgroundColor: prodForm.category === cat ? colors.gold : colors.secondary }]} onPress={() => setProdForm((p) => ({ ...p, category: cat }))}><Text style={[styles.catChipText, { color: prodForm.category === cat ? colors.goldForeground : colors.mutedForeground }]}>{cat}</Text></TouchableOpacity>))}</View>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card, marginTop: 10 }]}
              value={prodForm.category}
              onChangeText={(category) => setProdForm((p) => ({ ...p, category }))}
              placeholder="Ex: Creme, Camiseta, Aftercare"
              placeholderTextColor={colors.mutedForeground}
              {...typedInputProps("text")}
            />
          </KeyboardAwareScrollViewCompat>
        </View>
      </Modal>

      {/* ── CATEGORY MODAL ── */}
      <Modal visible={categoryModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCategoryModal(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setCategoryModal(false)}><Feather name="x" size={22} color={colors.foreground} /></TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Nova Categoria</Text>
            <TouchableOpacity onPress={saveCategory}><Text style={[styles.saveText, { color: colors.gold }]}>Salvar</Text></TouchableOpacity>
          </View>
          <KeyboardAwareScrollViewCompat contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Usar em</Text>
            <View style={styles.catRow}>
              {CATEGORY_TYPE_OPTIONS.map((item) => (
                <TouchableOpacity
                  key={item.type}
                  style={[styles.catChip, { backgroundColor: categoryForm.type === item.type ? colors.gold : colors.secondary }]}
                  onPress={() => setCategoryForm((prev) => ({ ...prev, type: item.type }))}
                >
                  <Text style={[styles.catChipText, { color: categoryForm.type === item.type ? colors.goldForeground : colors.mutedForeground }]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ marginTop: 14 }}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Nome da categoria</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                value={categoryForm.name}
                onChangeText={(name) => setCategoryForm((prev) => ({ ...prev, name }))}
                placeholder={CATEGORY_TYPE_META[categoryForm.type].placeholder}
                placeholderTextColor={colors.mutedForeground}
                {...typedInputProps("text")}
              />
            </View>
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
                  onChangeText={(v) => {
                    const value = f.key === "phone"
                      ? maskPhone(v)
                      : f.key === "email"
                        ? v.trim().toLowerCase()
                        : f.key === "commissionRate"
                          ? maskPercent(v)
                          : v;
                    setProfForm((p) => ({ ...p, [f.key]: value }));
                  }}
                  autoCapitalize={f.key === "name" || f.key === "specialty" ? "words" : f.key === "email" ? "none" : "sentences"}
                  placeholder={f.label.replace(" *", "")}
                  placeholderTextColor={colors.mutedForeground}
                  {...typedInputProps(f.key === "phone" ? "phone" : f.key === "email" ? "email" : f.key === "commissionRate" ? "number" : "text")}
                />
              </View>
            ))}

            <View style={[styles.accessCard, { backgroundColor: colors.card, borderColor: profForm.serviceIds.length > 0 ? colors.gold : colors.border }]}>
              <Text style={[styles.accessTitle, { color: colors.foreground }]}>Serviços que realiza</Text>
              <Text style={[styles.accessHint, { color: colors.mutedForeground, marginBottom: 12 }]}>
                O cliente só verá este profissional quando escolher pelo menos um destes serviços.
              </Text>
              {services.length === 0 ? (
                <Text style={[styles.accessHint, { color: colors.mutedForeground }]}>
                  Cadastre serviços antes de vincular ao profissional.
                </Text>
              ) : (
                <View style={styles.catRow}>
                  {services.map((service) => {
                    const selected = profForm.serviceIds.includes(service.id);
                    return (
                      <TouchableOpacity
                        key={service.id}
                        style={[styles.catChip, { backgroundColor: selected ? colors.gold : colors.secondary }]}
                        onPress={() => toggleProfService(service.id)}
                      >
                        <Text style={[styles.catChipText, { color: selected ? colors.goldForeground : colors.mutedForeground }]}>
                          {service.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Employee access section */}
            <View style={[styles.accessCard, { backgroundColor: colors.card, borderColor: profForm.hasAccess ? colors.gold : colors.border }]}>
              <TouchableOpacity style={styles.accessRow} onPress={() => { Haptics.selectionAsync(); setProfForm((p) => ({ ...p, hasAccess: !p.hasAccess })); }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.accessTitle, { color: colors.foreground }]}>Acesso ao sistema</Text>
                  <Text style={[styles.accessHint, { color: colors.mutedForeground }]}>
                    Permite que este profissional faça login como funcionário e veja sua própria agenda, comissão e atendimentos.
                  </Text>
                </View>
                <View style={[styles.accessSwitch, { backgroundColor: profForm.hasAccess ? colors.gold : colors.secondary }]}>
                  <View style={[styles.accessKnob, { backgroundColor: "#fff", marginLeft: profForm.hasAccess ? 22 : 2 }]} />
                </View>
              </TouchableOpacity>
              {profForm.hasAccess && (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                    {editingProf && findProfUser(editingProf.id) ? "Nova senha (opcional)" : "Senha de acesso *"}
                  </Text>
                  <TextInput
                    style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={profForm.password}
                    onChangeText={(v) => setProfForm((p) => ({ ...p, password: v }))}
                    placeholder={editingProf && findProfUser(editingProf.id) ? "Deixe em branco para manter a atual" : "Min. 8 caracteres, letras e numeros"}
                    placeholderTextColor={colors.mutedForeground}
                    {...typedInputProps("password")}
                  />
                  <Text style={[styles.accessHint, { color: colors.mutedForeground, marginTop: 4 }]}>
                    Login: email acima · Slug: {barbershop?.slug ?? "—"}
                  </Text>
                </View>
              )}
            </View>
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
                      {day.enabled && <Feather name="check" size={12} color={colors.goldForeground} />}
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
                        onChangeText={(v) => setEditSchedule((p) => ({ ...p, [key]: { ...p[key], startTime: maskTime(v) } }))}
                        placeholder="08:00"
                        placeholderTextColor={colors.mutedForeground}
                        maxLength={5}
                        {...typedInputProps("time")}
                      />
                      <Text style={[styles.timeSep, { color: colors.mutedForeground }]}>até</Text>
                      <TextInput
                        style={[styles.timeInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                        value={day.endTime}
                        onChangeText={(v) => setEditSchedule((p) => ({ ...p, [key]: { ...p[key], endTime: maskTime(v) } }))}
                        placeholder="18:00"
                        placeholderTextColor={colors.mutedForeground}
                        maxLength={5}
                        {...typedInputProps("time")}
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
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  headerTitleBlock: { flex: 1, minWidth: 0 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  headerSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17, marginTop: 2 },
  addBtn: { minHeight: 40, maxWidth: 150, borderRadius: 12, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  addBtnText: { flexShrink: 1, fontSize: 12, fontFamily: "Inter_700Bold" },
  groupBar: { flexDirection: "row", gap: 8 },
  groupBtn: { flex: 1, minHeight: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  groupLabel: { fontSize: 12, fontFamily: "Inter_700Bold" },
  tabBar: { flexDirection: "row", flexWrap: "wrap", borderRadius: 14, padding: 4, gap: 2 },
  tabBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 11 },
  tabLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  searchBox: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", paddingVertical: 8 },
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
  ordersPanel: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 14 },
  ordersPanelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  ordersTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  ordersCount: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  orderCard: { borderTopWidth: 1, paddingTop: 12, marginTop: 10, gap: 10 },
  orderTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  orderClient: { fontSize: 14, fontFamily: "Inter_700Bold" },
  orderItems: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 17 },
  orderStatus: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  orderStatusText: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  orderBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  orderTotal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  orderActions: { flexDirection: "row", gap: 8 },
  orderBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, borderWidth: 1 },
  orderBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  // team
  teamSummary: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, gap: 12 },
  teamSummaryGrid: { flexDirection: "row", alignItems: "center" },
  teamSummaryItem: { flex: 1, alignItems: "center", gap: 4 },
  teamSummaryValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  teamSummaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  teamLimitHint: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_500Medium", textAlign: "center" },
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
  // employee access
  accessCard: { borderRadius: 14, borderWidth: 1.5, padding: 14, marginTop: 10 },
  accessRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  accessTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 3 },
  accessHint: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  accessSwitch: { width: 46, height: 26, borderRadius: 13, justifyContent: "center" },
  accessKnob: { width: 22, height: 22, borderRadius: 11 },
  // plan
  planHeroCard: { borderRadius: 18, borderWidth: 1.5, padding: 18 },
  planHeroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  planBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  planBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#0C0C0C", letterSpacing: 0.4 },
  planShopName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  planShopSlug: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  publicLinkBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, padding: 10, marginTop: 12 },
  publicLinkText: { flex: 1, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  planRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  planRowLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  planRowValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  planProgressTrack: { height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 8 },
  planProgressFill: { height: "100%", borderRadius: 4 },
  planHint: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17, marginTop: 4 },
  priceCard: { borderRadius: 18, borderWidth: 1.5, padding: 20, gap: 8 },
  priceCardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  priceBadge: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.6 },
  priceTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginBottom: 8 },
  priceValue: { fontSize: 32, fontFamily: "Inter_700Bold" },
  priceUnit: { fontSize: 14, fontFamily: "Inter_400Regular" },
  priceSummary: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17, marginBottom: 4 },
  priceRowItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  priceFeat: { fontSize: 13, fontFamily: "Inter_500Medium" },
  enterpriseCallout: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 12, borderWidth: 1, padding: 10, marginTop: 4 },
  enterpriseCalloutText: { flex: 1, fontSize: 12, fontFamily: "Inter_600SemiBold", lineHeight: 17 },
  currentPill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  currentPillText: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  subBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 10 },
  subBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0C0C0C" },
  planStatsRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  planStatItem: { flex: 1, alignItems: "center", gap: 2 },
  planStatVal: { fontSize: 22, fontFamily: "Inter_700Bold" },
  planStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
