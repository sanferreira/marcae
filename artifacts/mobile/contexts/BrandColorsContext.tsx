import React, { createContext, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface BrandColors {
  primary: string;
  accent: string;
}

/**
 * Holds the brand colors for the active establishment so that `useColors`
 * can overlay them on the base palette without every screen needing to
 * thread props through.
 */
export const BrandColorsContext = createContext<BrandColors | null>(null);

export function BrandColorsProvider({ children }: { children: React.ReactNode }) {
  const { barbershop } = useAuth();
  const value = useMemo<BrandColors | null>(() => {
    if (!barbershop?.brandPrimary || !barbershop?.brandAccent) return null;
    return { primary: barbershop.brandPrimary, accent: barbershop.brandAccent };
  }, [barbershop?.brandPrimary, barbershop?.brandAccent]);
  return (
    <BrandColorsContext.Provider value={value}>
      {children}
    </BrandColorsContext.Provider>
  );
}
