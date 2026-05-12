import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

/**
 * Slim banner shown only while the shop is on trial. Tappable for admins
 * (jumps to /upgrade); informational for everyone else.
 */
export function TrialBanner() {
  const router = useRouter();
  const colors = useColors();
  const { planStatus, user } = useAuth();

  if (!user || planStatus.plan !== "trial") return null;

  const days = planStatus.trialDaysLeft;
  const isAdmin = user.role === "admin";
  const label = days <= 0
    ? "Seu período gratuito acabou"
    : `Teste grátis: ${days} ${days === 1 ? "dia restante" : "dias restantes"}`;
  const cta = isAdmin
    ? (days <= 0 ? "Assinar agora" : "Assinar Premium")
    : null;

  const onPress = () => { if (isAdmin) router.push("/upgrade" as never); };

  return (
    <Pressable
      onPress={onPress}
      disabled={!isAdmin}
      style={[styles.bar, { backgroundColor: colors.gold + "1A", borderBottomColor: colors.gold + "55" }]}
    >
      <Feather name="clock" size={14} color={colors.gold} />
      <Text style={[styles.label, { color: colors.foreground }]} numberOfLines={1}>
        {label}
      </Text>
      {cta && (
        <View style={[styles.cta, { backgroundColor: colors.gold }]}>
          <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>{cta}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  label: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  cta: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  ctaText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
});
