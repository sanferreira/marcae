import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Appointment, ProductOrder, useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";
import { PaginationBar } from "@/components/PaginationBar";
import { usePagination } from "@/hooks/usePagination";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDateBR = (date: string) => {
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
};

const orderStatusLabel: Record<ProductOrder["status"], string> = {
  pending: "Pendente",
  paid: "Pago",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const orderStatusHint: Record<ProductOrder["status"], string> = {
  pending: "Aguardando confirmação e pagamento direto com o estabelecimento.",
  paid: "Pagamento registrado pelo estabelecimento.",
  delivered: "Pedido entregue.",
  cancelled: "Pedido cancelado.",
};

const orderStatusIcon: Record<ProductOrder["status"], React.ComponentProps<typeof Feather>["name"]> = {
  pending: "clock",
  paid: "credit-card",
  delivered: "check-circle",
  cancelled: "x-circle",
};

type OrderStatusFilter = "all" | ProductOrder["status"];

const ORDER_FILTERS: Array<{ key: OrderStatusFilter; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendentes" },
  { key: "paid", label: "Pagos" },
  { key: "delivered", label: "Entregues" },
  { key: "cancelled", label: "Cancelados" },
];

function appointmentLabel(appointment?: Appointment) {
  if (!appointment) return null;
  const services = appointment.services.map((service) => service.name).join(" + ");
  return `${formatDateBR(appointment.date)} as ${appointment.time} · ${services || appointment.professionalName}`;
}

export default function ClientOrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { productOrders, appointments, updateProductOrderStatus } = useData();
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("all");
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const filteredOrders = statusFilter === "all"
    ? productOrders
    : productOrders.filter((order) => order.status === statusFilter);
  const ordersPage = usePagination(filteredOrders, 8);

  const cancelOrder = (order: ProductOrder) => {
    const run = async () => {
      try {
        await updateProductOrderStatus(order.id, "cancelled");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err) {
        Alert.alert("Não foi possível cancelar", err instanceof Error ? err.message : "Tente novamente.");
      }
    };

    Alert.alert("Cancelar pedido", "Cancelar este pedido?", [
      { text: "Voltar", style: "cancel" },
      { text: "Cancelar pedido", style: "destructive", onPress: () => { void run(); } },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: botPad + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.kicker, { color: colors.mutedForeground }]}>Pedidos</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Acompanhe suas compras</Text>
          </View>
          <TouchableOpacity style={[styles.headerButton, { backgroundColor: colors.gold }]} onPress={() => router.push("/(client)/products" as any)}>
            <Feather name="plus" size={16} color={colors.goldForeground} />
            <Text style={[styles.headerButtonText, { color: colors.goldForeground }]}>Comprar</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.paymentNotice, { backgroundColor: colors.gold + "12", borderColor: colors.gold + "44" }]}>
          <Feather name="info" size={15} color={colors.gold} />
          <Text style={[styles.paymentNoticeText, { color: colors.foreground }]}>
            Pedidos de produtos não são cobrados pela plataforma. O estabelecimento confirma pagamento e entrega.
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {ORDER_FILTERS.map((item) => {
              const selected = statusFilter === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.filterBtn, { backgroundColor: selected ? colors.gold : colors.card, borderColor: selected ? colors.gold : colors.border }]}
                  onPress={() => {
                    setStatusFilter(item.key);
                    ordersPage.setPage(1);
                  }}
                >
                  <Text style={[styles.filterText, { color: selected ? colors.goldForeground : colors.mutedForeground }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {filteredOrders.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="shopping-bag" size={40} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhum pedido ainda</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Produtos comprados separados ou junto do agendamento aparecem aqui.
            </Text>
            <TouchableOpacity style={[styles.emptyButton, { backgroundColor: colors.gold }]} onPress={() => router.push("/(client)/products" as any)}>
              <Text style={[styles.emptyButtonText, { color: colors.goldForeground }]}>Ver produtos</Text>
            </TouchableOpacity>
          </View>
        ) : (
          ordersPage.data.map((order) => {
            const appointment = order.appointmentId
              ? appointments.find((item) => item.id === order.appointmentId)
              : undefined;
            const linkedLabel = appointmentLabel(appointment);
            const statusColor = order.status === "cancelled"
              ? colors.destructive
              : order.status === "delivered"
                ? "#22C55E"
                : colors.gold;

            return (
              <View key={order.id} style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.orderHeader}>
                  <View style={[styles.statusIcon, { backgroundColor: statusColor + "22" }]}>
                    <Feather name={orderStatusIcon[order.status]} size={17} color={statusColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.orderTitle, { color: colors.foreground }]}>
                      {order.items.map((item) => `${item.quantity}x ${item.productName}`).join(", ")}
                    </Text>
                    <Text style={[styles.orderMeta, { color: colors.mutedForeground }]}>
                      {orderStatusLabel[order.status]} · {formatCurrency(order.totalPrice)}
                    </Text>
                    <Text style={[styles.orderHint, { color: colors.mutedForeground }]}>
                      {orderStatusHint[order.status]}
                    </Text>
                  </View>
                  {order.status === "pending" && (
                    <View style={styles.pendingActions}>
                      <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.destructive + "55" }]} onPress={() => cancelOrder(order)}>
                        <Text style={[styles.cancelText, { color: colors.destructive }]}>Cancelar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {linkedLabel && (
                  <View style={[styles.linkedBox, { backgroundColor: colors.secondary }]}>
                    <Feather name="calendar" size={14} color={colors.gold} />
                    <Text style={[styles.linkedText, { color: colors.foreground }]}>{linkedLabel}</Text>
                  </View>
                )}

                {!!order.notes && !linkedLabel && (
                  <Text style={[styles.notes, { color: colors.mutedForeground }]}>{order.notes}</Text>
                )}
              </View>
            );
          })
        )}
        <PaginationBar
          page={ordersPage.page}
          totalPages={ordersPage.totalPages}
          totalItems={ordersPage.totalItems}
          pageSize={ordersPage.pageSize}
          onPageChange={ordersPage.setPage}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  kicker: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 2 },
  headerButton: { minHeight: 40, borderRadius: 12, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 7 },
  headerButtonText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  paymentNotice: { borderRadius: 14, borderWidth: 1, padding: 12, flexDirection: "row", alignItems: "flex-start", gap: 9 },
  paymentNoticeText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: "Inter_500Medium" },
  filterRow: { flexDirection: "row", gap: 8, paddingRight: 20 },
  filterBtn: { minHeight: 34, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  filterText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", paddingVertical: 70, gap: 10 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 300 },
  emptyButton: { marginTop: 8, borderRadius: 13, paddingHorizontal: 18, paddingVertical: 12 },
  emptyButtonText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  orderCard: { borderRadius: 16, borderWidth: 1.5, padding: 14, gap: 12 },
  orderHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  statusIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  orderTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  orderMeta: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 3 },
  orderHint: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16, marginTop: 3 },
  pendingActions: { alignItems: "flex-end", gap: 7 },
  cancelBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  cancelText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  linkedBox: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  linkedText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: "Inter_600SemiBold" },
  notes: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
});
