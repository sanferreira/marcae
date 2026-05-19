import { useContext } from "react";

import colors from "@/constants/colors";
import { BrandColorsContext } from "@/contexts/BrandColorsContext";

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  const int = parseInt(normalized, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((channel) => clampChannel(channel).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function mixHex(foreground: string, background: string, weight = 0.5) {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);
  if (!fg || !bg) return foreground;
  return rgbToHex(
    fg.r * weight + bg.r * (1 - weight),
    fg.g * weight + bg.g * (1 - weight),
    fg.b * weight + bg.b * (1 - weight),
  );
}

function darkenHex(hex: string, amount = 0.18) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    rgb.r * (1 - amount),
    rgb.g * (1 - amount),
    rgb.b * (1 - amount),
  );
}

function luminance(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
}

function contrastText(hex: string) {
  return luminance(hex) > 0.6 ? "#0C0C0C" : "#FFFDF7";
}

/**
 * Before login, the app uses the landing palette.
 * After login, the active establishment can override the interactive brand colors.
 */
export function useColors() {
  const brand = useContext(BrandColorsContext);
  const palette = { ...colors.light, radius: colors.radius };

  if (!brand) return palette;

  const primary = brand.primary.toUpperCase();
  const accent = brand.accent.toUpperCase();
  const primarySoft = mixHex(primary, palette.background, 0.16);
  const accentSoft = mixHex(accent, palette.background, 0.22);
  const borderTint = mixHex(primary, palette.border, 0.2);

  return {
    ...palette,
    primary,
    primaryForeground: contrastText(primary),
    goldForeground: contrastText(primary),
    gold: primary,
    goldLight: primarySoft,
    goldDark: darkenHex(primary, 0.24),
    accent,
    accentForeground: contrastText(accent),
    tint: primary,
    secondary: accentSoft,
    muted: accentSoft,
    border: borderTint,
    input: borderTint,
  };
}
