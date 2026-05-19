import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function PaginationBar({ page, totalPages, totalItems, pageSize, onPageChange }: Props) {
  const colors = useColors();
  if (totalItems <= pageSize) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(totalItems, page * pageSize);

  return (
    <View style={[styles.bar, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        {first}-{last} de {totalItems}
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: page <= 1 ? colors.secondary : colors.gold }]}
          onPress={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          <Feather name="chevron-left" size={16} color={page <= 1 ? colors.mutedForeground : colors.goldForeground} />
        </TouchableOpacity>
        <Text style={[styles.pageText, { color: colors.foreground }]}>
          {page}/{totalPages}
        </Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: page >= totalPages ? colors.secondary : colors.gold }]}
          onPress={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          <Feather name="chevron-right" size={16} color={page >= totalPages ? colors.mutedForeground : colors.goldForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  btn: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  pageText: { minWidth: 44, textAlign: "center", fontSize: 12, fontFamily: "Inter_700Bold" },
});
