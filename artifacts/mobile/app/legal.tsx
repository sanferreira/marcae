import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SupportChannels } from "@/components/SupportChannels";
import { useColors } from "@/hooks/useColors";

const terms = [
  "O Marcaê é uma plataforma de gestão para estabelecimentos que trabalham com atendimento agendado, permitindo o gerenciamento de agenda, clientes, equipe, produtos, pedidos, serviços e informações financeiras.",
  "O responsável pela conta do estabelecimento declara que possui autorização para cadastrar e utilizar os dados inseridos na plataforma, sendo responsável pelas informações fornecidas, pela gestão dos usuários vinculados à conta e pela utilização do sistema conforme a legislação aplicável.",
  "Os pagamentos da assinatura da plataforma são processados por meio da Stripe. Transações relacionadas a produtos ou serviços oferecidos pelos estabelecimentos são de responsabilidade exclusiva do próprio estabelecimento.",
  "É proibida qualquer tentativa de acesso não autorizado, compartilhamento indevido de credenciais, uso fraudulento da plataforma ou cadastro de informações falsas, podendo resultar em suspensão ou encerramento da conta.",
];

const privacyIntro = [
  "O Marcaê poderá tratar dados como nome, telefone, email, histórico de agendamentos, pedidos, preferências de atendimento e informações operacionais necessárias para funcionamento da plataforma.",
  "O estabelecimento é o responsável pela coleta e utilização dos dados de seus clientes, enquanto o Marcaê atua como plataforma de armazenamento, processamento e organização dessas informações.",
];

const privacyUses = [
  "Autenticação e acesso ao sistema.",
  "Gerenciamento de agenda e atendimentos.",
  "Comunicação entre estabelecimento e cliente.",
  "Emissão de relatórios e métricas.",
  "Processamento de assinatura.",
  "Segurança e prevenção contra fraudes.",
];

const privacyClosing = [
  "Os usuários podem solicitar atualização, correção ou exclusão de seus dados diretamente ao estabelecimento responsável pelo atendimento.",
  "O Marcaê adota medidas técnicas e organizacionais voltadas à proteção das informações armazenadas, buscando garantir segurança, integridade e confidencialidade dos dados.",
];

export default function LegalScreen() {
  const colors = useColors();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/login" as never))} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color={colors.foreground} />
          <Text style={[styles.backText, { color: colors.foreground }]}>Voltar</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.badge, { backgroundColor: colors.gold + "22", borderColor: colors.gold }]}>
          <Feather name="shield" size={14} color={colors.gold} />
          <Text style={[styles.badgeText, { color: colors.gold }]}>TERMOS E PRIVACIDADE</Text>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>Uso responsável e proteção de dados</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Termos de uso, privacidade e tratamento de dados da plataforma Marcaê.
        </Text>

        <Section title="Termos de uso" items={terms} colors={colors} />
        <PrivacySection colors={colors} />
        <SupportChannels />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, intro, items, colors }: { title: string; intro?: string; items: string[]; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {!!intro && <Text style={[styles.introText, { color: colors.mutedForeground }]}>{intro}</Text>}
      {items.map((item) => (
        <View key={item} style={styles.itemRow}>
          <View style={[styles.dot, { backgroundColor: colors.gold }]} />
          <Text style={[styles.itemText, { color: colors.foreground }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function PrivacySection({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Privacidade e LGPD</Text>
      {privacyIntro.map((item) => (
        <Text key={item} style={[styles.paragraphText, { color: colors.foreground }]}>{item}</Text>
      ))}
      <Text style={[styles.introText, { color: colors.mutedForeground }]}>Os dados são utilizados para:</Text>
      {privacyUses.map((item) => (
        <View key={item} style={styles.itemRow}>
          <View style={[styles.dot, { backgroundColor: colors.gold }]} />
          <Text style={[styles.itemText, { color: colors.foreground }]}>{item}</Text>
        </View>
      ))}
      {privacyClosing.map((item) => (
        <Text key={item} style={[styles.paragraphText, { color: colors.foreground }]}>{item}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { minHeight: 54, borderBottomWidth: 1, paddingHorizontal: 16, justifyContent: "center" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingVertical: 8, paddingRight: 12 },
  backText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  content: { padding: 20, paddingBottom: 44, gap: 16 },
  badge: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 7 },
  badgeText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.7 },
  title: { fontSize: 24, lineHeight: 29, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  introText: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_600SemiBold" },
  paragraphText: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular" },
  itemRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  itemText: { flex: 1, fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
});
