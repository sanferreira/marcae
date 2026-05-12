import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { onSubscriptionRequired } from "@/lib/api";

/**
 * Global listener for 402 responses. Renders nothing — it just intercepts
 * subscription_required errors so any screen attempting a write gets a
 * friendly explanation instead of a generic error.
 *
 * - Admin: redirect to /upgrade so they can pay.
 * - Client/employee: alert with a clear message; the shop owner needs to act.
 *
 * The listener is rate-limited to one alert every 5s so a burst of failed
 * requests (e.g. background refetch) doesn't stack popups.
 */
export function SubscriptionGate() {
  const router = useRouter();
  const { user, refreshSession } = useAuth();
  const lastShownRef = useRef(0);

  useEffect(() => {
    const off = onSubscriptionRequired(() => {
      const now = Date.now();
      if (now - lastShownRef.current < 5000) return;
      lastShownRef.current = now;

      // Refresh session so the planStatus the UI sees becomes accurate.
      void refreshSession();

      if (user?.role === "admin") {
        router.replace("/upgrade" as never);
        return;
      }
      Alert.alert(
        "Assinatura vencida",
        "Esta barbearia está com a assinatura mensal vencida. Avise o administrador para reativá-la — você pode continuar consultando informações enquanto isso.",
      );
    });
    return off;
  }, [user?.role, router, refreshSession]);

  return null;
}
