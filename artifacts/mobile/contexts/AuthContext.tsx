import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type UserRole = "client" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  createdAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  register: (
    name: string,
    email: string,
    phone: string,
    password: string
  ) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "@barberpro_user";

const DEMO_ACCOUNTS: Record<string, AuthUser & { password: string }> = {
  "admin@barberpro.com": {
    id: "admin-001",
    name: "Carlos Ferreira",
    email: "admin@barberpro.com",
    phone: "(11) 99999-0001",
    role: "admin",
    createdAt: "2024-01-01T00:00:00Z",
    password: "admin123",
  },
  "joao@email.com": {
    id: "client-001",
    name: "João Silva",
    email: "joao@email.com",
    phone: "(11) 98765-4321",
    role: "client",
    createdAt: "2024-03-15T00:00:00Z",
    password: "123456",
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (
    email: string,
    password: string,
    role: UserRole
  ): Promise<boolean> => {
    const account = DEMO_ACCOUNTS[email.toLowerCase()];
    if (account && account.password === password && account.role === role) {
      const { password: _, ...userData } = account;
      setUser(userData);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      return true;
    }
    // Allow any login for demo - create a new account
    const newUser: AuthUser = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      name: email.split("@")[0],
      email,
      phone: "",
      role,
      createdAt: new Date().toISOString(),
    };
    setUser(newUser);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    return true;
  };

  const register = async (
    name: string,
    email: string,
    phone: string,
    password: string
  ): Promise<boolean> => {
    const newUser: AuthUser = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      name,
      email,
      phone,
      role: "client",
      createdAt: new Date().toISOString(),
    };
    setUser(newUser);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    return true;
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
