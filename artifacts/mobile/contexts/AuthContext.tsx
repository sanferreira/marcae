import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type UserRole = "client" | "employee" | "admin";

export interface Barbershop {
  id: string;
  slug: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  phone?: string;
  address?: string;
  createdAt: string;
  trialEndsAt: string;
  plan: "trial" | "premium" | "expired";
  subscriptionRenewsAt?: string;
}

export interface AuthUser {
  id: string;
  barbershopId: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string;
  professionalId?: string;
  createdAt: string;
}

interface InternalUser extends AuthUser { password: string }

export interface PlanStatus {
  plan: "trial" | "premium" | "expired";
  trialDaysLeft: number;
  isActive: boolean; // any access (trial or premium)
  isPremium: boolean;
  trialEndsAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  barbershop: Barbershop | null;
  isLoading: boolean;
  planStatus: PlanStatus;
  // Lookup
  barbershopUsers: AuthUser[]; // employees + clients of current barbershop (no password)
  // Actions
  login: (slug: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  registerBarbershop: (data: {
    slug: string; name: string; ownerName: string; ownerEmail: string;
    password: string; phone?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  registerClient: (data: {
    slug: string; name: string; email: string; phone: string; password: string;
  }) => Promise<{ ok: boolean; error?: string; barbershopId?: string; userId?: string }>;
  upsertEmployeeUser: (data: {
    professionalId: string; name: string; email: string; password: string; phone?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  removeEmployeeUser: (userId: string) => Promise<void>;
  upgradeToPremium: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = "@barberpro_session_userId";
const SHOPS_KEY = "@barberpro_barbershops";
const USERS_KEY = "@barberpro_users";

// ── seed ────────────────────────────────────────────────────────────────────────
const ISO = (d: Date) => d.toISOString();
const daysFromNow = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

const SEED_BARBERSHOP: Barbershop = {
  id: "bb-001",
  slug: "primeiro_nucleo",
  name: "Primeiro Núcleo Barbearia",
  ownerName: "Carlos Ferreira",
  ownerEmail: "admin@barberpro.com",
  phone: "(11) 99999-0001",
  address: "Rua Augusta, 1000 — São Paulo",
  createdAt: "2024-01-01T00:00:00Z",
  trialEndsAt: ISO(daysFromNow(5)),
  plan: "trial",
};

const SEED_USERS: InternalUser[] = [
  {
    id: "admin-001", barbershopId: "bb-001", role: "admin",
    name: "Carlos Ferreira", email: "admin@barberpro.com",
    phone: "(11) 99999-0001", createdAt: "2024-01-01T00:00:00Z",
    password: "admin123",
  },
  {
    id: "emp-001", barbershopId: "bb-001", role: "employee",
    name: "Rafael Mendes", email: "rafael@barberpro.com",
    phone: "(11) 99111-1111", professionalId: "p1",
    createdAt: "2024-02-01T00:00:00Z", password: "func123",
  },
  {
    id: "client-001", barbershopId: "bb-001", role: "client",
    name: "João Silva", email: "joao@email.com",
    phone: "(11) 98765-4321", createdAt: "2024-03-15T00:00:00Z",
    password: "123456",
  },
];

const stripPassword = (u: InternalUser): AuthUser => {
  const { password: _p, ...rest } = u;
  return rest;
};

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
   .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

function computePlanStatus(b: Barbershop | null): PlanStatus {
  if (!b) return { plan: "trial", trialDaysLeft: 0, isActive: false, isPremium: false, trialEndsAt: "" };
  if (b.plan === "premium") {
    // Premium auto-expires if subscriptionRenewsAt has passed (mocking a failed renewal).
    if (b.subscriptionRenewsAt && new Date(b.subscriptionRenewsAt).getTime() < Date.now()) {
      return { plan: "expired", trialDaysLeft: 0, isActive: false, isPremium: false, trialEndsAt: b.trialEndsAt };
    }
    return { plan: "premium", trialDaysLeft: 0, isActive: true, isPremium: true, trialEndsAt: b.trialEndsAt };
  }
  // Respect explicit cancellation/expiration
  if (b.plan === "expired") {
    return { plan: "expired", trialDaysLeft: 0, isActive: false, isPremium: false, trialEndsAt: b.trialEndsAt };
  }
  const msLeft = new Date(b.trialEndsAt).getTime() - Date.now();
  const daysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
  if (daysLeft <= 0) {
    return { plan: "expired", trialDaysLeft: 0, isActive: false, isPremium: false, trialEndsAt: b.trialEndsAt };
  }
  return { plan: "trial", trialDaysLeft: daysLeft, isActive: true, isPremium: false, trialEndsAt: b.trialEndsAt };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [barbershops, setBarbershops] = useState<Barbershop[]>([SEED_BARBERSHOP]);
  const [users, setUsers] = useState<InternalUser[]>(SEED_USERS);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate
  useEffect(() => {
    (async () => {
      try {
        const [shopsRaw, usersRaw, sid] = await Promise.all([
          AsyncStorage.getItem(SHOPS_KEY),
          AsyncStorage.getItem(USERS_KEY),
          AsyncStorage.getItem(SESSION_KEY),
        ]);
        if (shopsRaw) {
          const stored: Barbershop[] = JSON.parse(shopsRaw);
          // Stored wins on id collision (preserves user edits/plan changes).
          // Only add seed shop if missing entirely (so demo data exists on fresh installs).
          const map = new Map<string, Barbershop>();
          if (!stored.some((s) => s.id === SEED_BARBERSHOP.id)) {
            map.set(SEED_BARBERSHOP.id, SEED_BARBERSHOP);
          }
          stored.forEach((s) => map.set(s.id, s));
          setBarbershops(Array.from(map.values()));
        }
        if (usersRaw) {
          const stored: InternalUser[] = JSON.parse(usersRaw);
          // Stored wins; only seed users that don't yet exist (by id).
          const map = new Map<string, InternalUser>();
          SEED_USERS.forEach((u) => { if (!stored.some((s) => s.id === u.id)) map.set(u.id, u); });
          stored.forEach((u) => map.set(u.id, u));
          setUsers(Array.from(map.values()));
        }
        if (sid) setCurrentUserId(sid);
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Persist
  useEffect(() => { AsyncStorage.setItem(SHOPS_KEY, JSON.stringify(barbershops)).catch(() => {}); }, [barbershops]);
  useEffect(() => { AsyncStorage.setItem(USERS_KEY, JSON.stringify(users)).catch(() => {}); }, [users]);

  const user = useMemo<AuthUser | null>(() => {
    if (!currentUserId) return null;
    const u = users.find((x) => x.id === currentUserId);
    return u ? stripPassword(u) : null;
  }, [currentUserId, users]);

  const barbershop = useMemo<Barbershop | null>(() => {
    if (!user) return null;
    return barbershops.find((b) => b.id === user.barbershopId) ?? null;
  }, [user, barbershops]);

  const planStatus = useMemo<PlanStatus>(() => computePlanStatus(barbershop), [barbershop]);

  const barbershopUsers = useMemo<AuthUser[]>(() => {
    if (!user) return [];
    return users.filter((u) => u.barbershopId === user.barbershopId).map(stripPassword);
  }, [user, users]);

  // ── actions ────────────────────────────────────────────────────────────────
  const login: AuthContextType["login"] = async (slug, email, password) => {
    const cleanSlug = slugify(slug);
    const cleanEmail = email.trim().toLowerCase();
    const shop = barbershops.find((b) => b.slug === cleanSlug);
    if (!shop) return { ok: false, error: "Barbearia não encontrada com esse ID." };
    const found = users.find(
      (u) => u.barbershopId === shop.id && u.email.toLowerCase() === cleanEmail && u.password === password
    );
    if (!found) return { ok: false, error: "Usuário ou senha inválidos." };
    setCurrentUserId(found.id);
    await AsyncStorage.setItem(SESSION_KEY, found.id).catch(() => {});
    return { ok: true };
  };

  const logout = async () => {
    setCurrentUserId(null);
    await AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
  };

  const registerBarbershop: AuthContextType["registerBarbershop"] = async (data) => {
    const slug = slugify(data.slug);
    if (!slug) return { ok: false, error: "ID da barbearia inválido." };
    if (barbershops.some((b) => b.slug === slug)) return { ok: false, error: "Esse ID de barbearia já está em uso." };
    if (!data.name.trim() || !data.ownerName.trim() || !data.ownerEmail.trim() || !data.password) {
      return { ok: false, error: "Preencha todos os campos." };
    }
    const ownerEmail = data.ownerEmail.trim().toLowerCase();
    const shopId = "bb-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const shop: Barbershop = {
      id: shopId, slug, name: data.name.trim(),
      ownerName: data.ownerName.trim(), ownerEmail, phone: data.phone,
      createdAt: ISO(new Date()),
      trialEndsAt: ISO(daysFromNow(7)),
      plan: "trial",
    };
    const adminUser: InternalUser = {
      id: "u-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      barbershopId: shopId, role: "admin",
      name: data.ownerName.trim(), email: ownerEmail,
      phone: data.phone, createdAt: ISO(new Date()),
      password: data.password,
    };
    setBarbershops((p) => [...p, shop]);
    setUsers((p) => [...p, adminUser]);
    setCurrentUserId(adminUser.id);
    await AsyncStorage.setItem(SESSION_KEY, adminUser.id).catch(() => {});
    return { ok: true };
  };

  const registerClient: AuthContextType["registerClient"] = async (data) => {
    const slug = slugify(data.slug);
    const shop = barbershops.find((b) => b.slug === slug);
    if (!shop) return { ok: false, error: "Barbearia não encontrada." };
    const email = data.email.trim().toLowerCase();
    if (users.some((u) => u.barbershopId === shop.id && u.email.toLowerCase() === email)) {
      return { ok: false, error: "Já existe usuário com esse email nessa barbearia." };
    }
    const newUser: InternalUser = {
      id: "u-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      barbershopId: shop.id, role: "client",
      name: data.name.trim(), email, phone: data.phone,
      createdAt: ISO(new Date()), password: data.password,
    };
    setUsers((p) => [...p, newUser]);
    setCurrentUserId(newUser.id);
    await AsyncStorage.setItem(SESSION_KEY, newUser.id).catch(() => {});
    return { ok: true, barbershopId: shop.id, userId: newUser.id };
  };

  const upsertEmployeeUser: AuthContextType["upsertEmployeeUser"] = async (data) => {
    if (!user) return { ok: false, error: "Não autenticado." };
    const email = data.email.trim().toLowerCase();
    if (!email) return { ok: false, error: "Email é obrigatório." };
    // Look for existing user linked to this professional in this shop
    const existing = users.find(
      (u) => u.barbershopId === user.barbershopId && u.professionalId === data.professionalId
    );
    // For new users, password is required. For existing, blank means "keep current".
    if (!existing && !data.password) {
      return { ok: false, error: "Senha é obrigatória ao criar um novo acesso." };
    }
    // Check email collision (excluding the same user)
    const collision = users.find(
      (u) => u.barbershopId === user.barbershopId && u.email.toLowerCase() === email && u.id !== existing?.id
    );
    if (collision) return { ok: false, error: "Email já está em uso por outro usuário." };

    if (existing) {
      setUsers((p) => p.map((u) => u.id === existing.id
        ? { ...u, name: data.name, email, phone: data.phone, ...(data.password ? { password: data.password } : {}) }
        : u));
    } else {
      const newUser: InternalUser = {
        id: "u-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        barbershopId: user.barbershopId, role: "employee",
        name: data.name, email, phone: data.phone,
        professionalId: data.professionalId,
        createdAt: ISO(new Date()), password: data.password,
      };
      setUsers((p) => [...p, newUser]);
    }
    return { ok: true };
  };

  const removeEmployeeUser = async (userId: string) => {
    if (!user) return;
    setUsers((p) => p.filter((u) => !(u.id === userId && u.barbershopId === user.barbershopId)));
  };

  const upgradeToPremium = async () => {
    if (!user) return;
    setBarbershops((p) =>
      p.map((b) => b.id === user.barbershopId
        ? { ...b, plan: "premium", subscriptionRenewsAt: ISO(daysFromNow(30)) }
        : b)
    );
  };

  const cancelSubscription = async () => {
    if (!user) return;
    setBarbershops((p) =>
      p.map((b) => b.id === user.barbershopId
        ? { ...b, plan: "expired", subscriptionRenewsAt: undefined }
        : b)
    );
  };

  return (
    <AuthContext.Provider value={{
      user, barbershop, isLoading, planStatus, barbershopUsers,
      login, logout,
      registerBarbershop, registerClient,
      upsertEmployeeUser, removeEmployeeUser,
      upgradeToPremium, cancelSubscription,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
