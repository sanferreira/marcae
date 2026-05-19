import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type Highlight = {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
};

type AuthScaffoldProps = {
  badge: string;
  title: string;
  subtitle: string;
  panelTitle: string;
  panelSubtitle: string;
  highlights: Highlight[];
  children: React.ReactNode;
  footer?: React.ReactNode;
  onBack?: () => void;
};

export function AuthScaffold({
  badge,
  title,
  subtitle,
  panelTitle,
  panelSubtitle,
  highlights,
  children,
  footer,
  onBack,
}: AuthScaffoldProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 1080;

  return (
    <KeyboardAvoidingView
      style={[styles.page, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={[`${colors.primary}18`, "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.topGlow}
        />
        <LinearGradient
          colors={[`${colors.gold}20`, "transparent"]}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 1, y: 1 }}
          style={styles.bottomGlow}
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 20,
            paddingBottom: Math.max(insets.bottom, 24) + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.shell, isWide && styles.shellWide]}>
          <View
            style={[
              styles.heroPane,
              {
                backgroundColor: colors.card,
                borderColor: `${colors.border}AA`,
              },
              isWide && styles.heroPaneWide,
            ]}
          >
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            <View style={[styles.badge, { backgroundColor: `${colors.gold}18`, borderColor: `${colors.gold}55` }]}>
              <View style={[styles.badgeDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.badgeText, { color: colors.foreground }]}>{badge}</Text>
            </View>

            <Text style={[styles.heroTitle, { color: colors.foreground }]}>{title}</Text>
            <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>

            <View style={styles.highlightList}>
              {highlights.map((item) => (
                <View
                  key={item.label}
                  style={[
                    styles.highlightItem,
                    { backgroundColor: colors.background, borderColor: `${colors.border}CC` },
                  ]}
                >
                  <View style={[styles.highlightIcon, { backgroundColor: `${colors.gold}18` }]}>
                    <Feather name={item.icon} size={15} color={colors.goldDark} />
                  </View>
                  <Text style={[styles.highlightLabel, { color: colors.foreground }]}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View
            style={[
              styles.formPane,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            {onBack ? (
              <TouchableOpacity onPress={onBack} style={[styles.backButton, { borderColor: colors.border }]}>
                <Feather name="arrow-left" size={18} color={colors.foreground} />
              </TouchableOpacity>
            ) : null}

            <View style={styles.panelHeader}>
              <Text style={[styles.panelTitle, { color: colors.foreground }]}>{panelTitle}</Text>
              <Text style={[styles.panelSubtitle, { color: colors.mutedForeground }]}>{panelSubtitle}</Text>
            </View>

            {children}
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  shell: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    gap: 18,
  },
  shellWide: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "center",
  },
  heroPane: {
    borderRadius: 30,
    borderWidth: 1.5,
    padding: 24,
    overflow: "hidden",
    gap: 16,
  },
  heroPaneWide: {
    flex: 1,
    minHeight: 720,
    justifyContent: "space-between",
  },
  formPane: {
    borderRadius: 30,
    borderWidth: 1.5,
    padding: 22,
    gap: 18,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  logo: {
    width: 180,
    height: 70,
  },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 36,
    lineHeight: 38,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1.1,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
    maxWidth: 480,
  },
  highlightList: {
    gap: 10,
  },
  highlightItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  highlightIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  highlightLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_500Medium",
  },
  panelHeader: {
    gap: 6,
  },
  panelTitle: {
    fontSize: 28,
    lineHeight: 30,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.6,
  },
  panelSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Inter_400Regular",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    marginTop: 4,
  },
  topGlow: {
    position: "absolute",
    top: -140,
    right: -80,
    width: 420,
    height: 420,
    borderRadius: 210,
  },
  bottomGlow: {
    position: "absolute",
    bottom: -180,
    left: -80,
    width: 360,
    height: 360,
    borderRadius: 180,
  },
});
