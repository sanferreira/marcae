import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PaginationBar } from "@/components/PaginationBar";
import { Product, useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";
import { usePagination } from "@/hooks/usePagination";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ClientProductsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products, createProductOrder } = useData();
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const cartBottom = Platform.OS === "web" ? 84 : 72;
  const availableProducts = products.filter((product) => product.isActive && product.stock > 0);
  const categories = useMemo(() => {
    const values = Array.from(new Set(availableProducts.map((product) => product.category).filter(Boolean))).sort();
    return ["Todos", ...values];
  }, [availableProducts]);
  const filteredProducts = selectedCategory === "Todos"
    ? availableProducts
    : availableProducts.filter((product) => product.category === selectedCategory);
  const searchTerm = search.trim().toLowerCase();
  const visibleProducts = searchTerm
    ? filteredProducts.filter((product) =>
        `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(searchTerm)
      )
    : filteredProducts;
  const productsPage = usePagination(visibleProducts, 8);
  const cartItems = availableProducts
    .map((product) => ({ product, quantity: quantities[product.id] ?? 0 }))
    .filter((item) => item.quantity > 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const updateQuantity = (product: Product, next: number) => {
    Haptics.selectionAsync();
    setQuantities((current) => ({
      ...current,
      [product.id]: Math.max(0, Math.min(product.stock, next)),
    }));
  };

  const submitOrder = async () => {
    if (cartItems.length === 0) return;
    const run = async () => {
      try {
        setSubmitting(true);
        await createProductOrder(cartItems.map((item) => ({ productId: item.product.id, quantity: item.quantity })));
        setQuantities({});
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        Alert.alert("Pedido enviado", "Acompanhe o status na aba Pedidos e combine o pagamento com o estabelecimento.", [
          { text: "Continuar", style: "cancel" },
          { text: "Ver pedidos", onPress: () => router.push("/(client)/orders" as any) },
        ]);
      } catch (err) {
        Alert.alert("Não foi possível enviar", err instanceof Error ? err.message : "Tente novamente.");
      } finally {
        setSubmitting(false);
      }
    };

    Alert.alert("Confirmar pedido", `Total: ${formatCurrency(cartTotal)}`, [
      { text: "Voltar", style: "cancel" },
      { text: "Enviar", onPress: () => { void run(); } },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: botPad + (cartItems.length > 0 ? 220 : 120) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.kicker, { color: colors.mutedForeground }]}>Produtos</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Escolha produtos para comprar</Text>
          </View>
          <View style={[styles.headerIcon, { backgroundColor: colors.gold + "22" }]}>
            <Feather name="shopping-bag" size={22} color={colors.gold} />
          </View>
        </View>

        <View style={[styles.paymentNotice, { backgroundColor: colors.gold + "12", borderColor: colors.gold + "44" }]}>
          <Feather name="info" size={15} color={colors.gold} />
          <Text style={[styles.paymentNoticeText, { color: colors.foreground }]}>
            O pedido fica pendente para o estabelecimento confirmar. O pagamento é combinado diretamente com a loja.
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categoryRow}>
            {categories.map((category) => {
              const selected = selectedCategory === category;
              return (
                <TouchableOpacity
                  key={category}
                  style={[styles.categoryChip, { backgroundColor: selected ? colors.gold : colors.card, borderColor: selected ? colors.gold : colors.border }]}
                  onPress={() => {
                    setSelectedCategory(category);
                    productsPage.setPage(1);
                  }}
                >
                  <Text style={[styles.categoryText, { color: selected ? colors.goldForeground : colors.foreground }]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            value={search}
            onChangeText={(value) => {
              setSearch(value);
              productsPage.setPage(1);
            }}
            placeholder="Buscar produto..."
            placeholderTextColor={colors.mutedForeground}
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearch("");
                productsPage.setPage(1);
              }}
            >
              <Feather name="x" size={15} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {visibleProducts.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="package" size={40} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nenhum produto disponível</Text>
          </View>
        ) : (
          productsPage.data.map((product) => {
            const quantity = quantities[product.id] ?? 0;
            return (
              <View key={product.id} style={[styles.productCard, { backgroundColor: colors.card, borderColor: quantity > 0 ? colors.gold : colors.border }]}>
                <View style={styles.productTop}>
                  <View style={[styles.productIcon, { backgroundColor: colors.secondary }]}>
                    <Feather name="package" size={18} color={colors.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.productNameRow}>
                      <Text style={[styles.productName, { color: colors.foreground }]}>{product.name}</Text>
                      <View style={[styles.catBadge, { backgroundColor: colors.secondary }]}>
                        <Text style={[styles.catText, { color: colors.mutedForeground }]}>{product.category}</Text>
                      </View>
                    </View>
                    {!!product.description && (
                      <Text style={[styles.productDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                        {product.description}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.productBottom}>
                  <View>
                    <Text style={[styles.productPrice, { color: colors.gold }]}>{formatCurrency(product.price)}</Text>
                    <Text style={[styles.stockText, { color: colors.mutedForeground }]}>{product.stock} em estoque</Text>
                  </View>
                  <View style={styles.stepper}>
                    <TouchableOpacity style={[styles.stepBtn, { backgroundColor: colors.secondary }]} onPress={() => updateQuantity(product, quantity - 1)} disabled={quantity === 0}>
                      <Feather name="minus" size={15} color={quantity === 0 ? colors.mutedForeground : colors.foreground} />
                    </TouchableOpacity>
                    <Text style={[styles.qtyText, { color: colors.foreground }]}>{quantity}</Text>
                    <TouchableOpacity style={[styles.stepBtn, { backgroundColor: colors.gold }]} onPress={() => updateQuantity(product, quantity + 1)} disabled={quantity >= product.stock}>
                      <Feather name="plus" size={15} color={colors.goldForeground} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
        <PaginationBar
          page={productsPage.page}
          totalPages={productsPage.totalPages}
          totalItems={productsPage.totalItems}
          pageSize={productsPage.pageSize}
          onPageChange={productsPage.setPage}
        />
      </ScrollView>

      {cartItems.length > 0 && (
        <View style={[styles.cartBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 14, bottom: cartBottom }]}>
          <View>
            <Text style={[styles.cartLabel, { color: colors.mutedForeground }]}>{cartItems.reduce((sum, item) => sum + item.quantity, 0)} item(ns)</Text>
            <Text style={[styles.cartTotal, { color: colors.foreground }]}>{formatCurrency(cartTotal)}</Text>
          </View>
          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.gold, opacity: submitting ? 0.7 : 1 }]} onPress={submitOrder} disabled={submitting}>
            <Text style={[styles.submitText, { color: colors.goldForeground }]}>{submitting ? "Enviando..." : "Enviar pedido"}</Text>
            <Feather name="arrow-right" size={16} color={colors.goldForeground} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 18 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kicker: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 2 },
  headerIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  paymentNotice: { borderRadius: 14, borderWidth: 1, padding: 12, flexDirection: "row", alignItems: "flex-start", gap: 9 },
  paymentNoticeText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: "Inter_500Medium" },
  categoryRow: { flexDirection: "row", gap: 8, paddingRight: 20 },
  categoryChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  categoryText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  searchBox: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", paddingVertical: 8 },
  productCard: { borderRadius: 16, borderWidth: 1.5, padding: 14, gap: 14 },
  productTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  productIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  productNameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  productName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  catText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  productDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17, marginTop: 4 },
  productBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  productPrice: { fontSize: 18, fontFamily: "Inter_700Bold" },
  stockText: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  qtyText: { minWidth: 22, textAlign: "center", fontSize: 16, fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", paddingVertical: 70, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  cartBar: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cartLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  cartTotal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 14 },
  submitText: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
