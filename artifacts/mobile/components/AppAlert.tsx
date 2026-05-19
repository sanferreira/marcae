import { Feather } from "@expo/vector-icons";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Alert as NativeAlert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type AlertButton,
} from "react-native";

import { useColors } from "@/hooks/useColors";

type AlertFn = typeof NativeAlert.alert;

type DialogState = {
  title: string;
  message?: string;
  buttons: AlertButton[];
  cancelable: boolean;
};

const AppAlertContext = createContext<AlertFn | null>(null);
let externalAlert: AlertFn | null = null;

export function showAppAlert(...args: Parameters<AlertFn>) {
  if (externalAlert) {
    externalAlert(...args);
    return;
  }
  NativeAlert.alert(...args);
}

export function useAppAlert() {
  return useContext(AppAlertContext) ?? showAppAlert;
}

export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const openDialog = useCallback<AlertFn>((title, message, buttons, options) => {
    setDialog({
      title: String(title),
      message: typeof message === "string" ? message : undefined,
      buttons: buttons?.length ? buttons : [{ text: "OK" }],
      cancelable: options?.cancelable !== false,
    });
  }, []);

  useEffect(() => {
    externalAlert = openDialog;
    const nativeAlert = NativeAlert.alert;
    NativeAlert.alert = openDialog;
    return () => {
      externalAlert = null;
      NativeAlert.alert = nativeAlert;
    };
  }, [openDialog]);

  const close = useCallback((button?: AlertButton) => {
    setDialog(null);
    button?.onPress?.();
  }, []);

  const iconName = useMemo(() => {
    if (!dialog) return "info";
    if (dialog.buttons.some((button) => button.style === "destructive")) return "alert-triangle";
    return "info";
  }, [dialog]);

  return (
    <AppAlertContext.Provider value={openDialog}>
      {children}
      {dialog && (
        <Modal
          visible
          transparent
          animationType="fade"
          presentationStyle="overFullScreen"
          statusBarTranslucent
          hardwareAccelerated
          onRequestClose={() => {
            if (dialog.cancelable) setDialog(null);
          }}
        >
          <View style={styles.backdrop}>
            <Pressable
              style={styles.backdropPressable}
              onPress={() => {
                if (dialog.cancelable) setDialog(null);
              }}
            />
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.iconWrap, { backgroundColor: colors.gold + "18" }]}>
                <Feather name={iconName} size={22} color={colors.gold} />
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>{dialog.title}</Text>
              {!!dialog.message && (
                <Text style={[styles.message, { color: colors.mutedForeground }]}>{dialog.message}</Text>
              )}
              <View style={styles.actions}>
                {dialog.buttons.map((button, index) => {
                  const isCancel = button.style === "cancel";
                  const isDestructive = button.style === "destructive";
                  return (
                    <TouchableOpacity
                      key={`${button.text ?? "OK"}-${index}`}
                      style={[
                        styles.button,
                        {
                          backgroundColor: isCancel ? colors.secondary : isDestructive ? colors.destructive : colors.gold,
                          borderColor: isCancel ? colors.border : isDestructive ? colors.destructive : colors.gold,
                        },
                      ]}
                      onPress={() => close(button)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          { color: isCancel ? colors.foreground : isDestructive ? "#FFFFFF" : colors.goldForeground },
                        ]}
                      >
                        {button.text ?? "OK"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </AppAlertContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.48)",
    zIndex: 2147483647,
    elevation: 2147483647,
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2147483646,
    elevation: 2147483646,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    alignItems: "stretch",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    zIndex: 2147483647,
    elevation: 2147483647,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", lineHeight: 24 },
  message: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginTop: 8 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 20, flexWrap: "wrap" },
  button: { minHeight: 42, minWidth: 92, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  buttonText: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
