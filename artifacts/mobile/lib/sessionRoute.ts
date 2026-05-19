import type { Href } from "expo-router";

import type { AuthUser, PlanStatus } from "@/contexts/AuthContext";

export function getPostAuthHref(
  user: Pick<AuthUser, "role"> | null | undefined,
  planStatus?: Pick<PlanStatus, "isActive"> | null,
): Href {
  if (!user) return "/(auth)/login";
  if (user.role === "admin") {
    return planStatus?.isActive === false ? "/upgrade" : "/(admin)/dashboard";
  }
  if (user.role === "employee") return "/(employee)/today";
  return "/(client)/home";
}
