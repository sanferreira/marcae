import { useRouter } from "expo-router";
import React from "react";

import { Section, SettingsPage } from "@/components/admin-settings/SettingsShared";
import { SupportChannels } from "@/components/SupportChannels";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function SupportSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();

  if (!user || user.role !== "admin") {
    router.replace("/" as never);
    return null;
  }

  return (
    <SettingsPage title="Suporte Marcae">
      <Section title="Canais oficiais" colors={colors}>
        <SupportChannels compact />
      </Section>
    </SettingsPage>
  );
}
