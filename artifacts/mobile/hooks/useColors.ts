import { useContext } from "react";
import { useColorScheme } from "react-native";

import colors from "@/constants/colors";
import { BrandColorsContext } from "@/contexts/BrandColorsContext";

/**
 * Returns the design tokens for the current color scheme, with the
 * authenticated establishment's brand colors overlaid on top of the
 * `gold` / `accent` / `primary` slots.
 *
 * Falls back to the default Marcaê gold when no brand override is in scope
 * (e.g. login / register screens, or when the user is not yet authenticated).
 */
export function useColors() {
  const scheme = useColorScheme();
  const palette = scheme === "dark" && "dark" in colors
    ? (colors as unknown as { dark: typeof colors.light }).dark
    : colors.light;
  const brand = useContext(BrandColorsContext);
  if (!brand) {
    return { ...palette, radius: colors.radius };
  }
  return {
    ...palette,
    gold: brand.primary,
    primary: brand.primary,
    accent: brand.primary,
    tint: brand.primary,
    radius: colors.radius,
  };
}
