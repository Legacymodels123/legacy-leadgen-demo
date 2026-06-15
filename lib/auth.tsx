"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "./types";
import { STARTING_CREDITS } from "./types";
import { generateId } from "./utils";

const USERS_KEY = "legacy-leadgen-users";
const SESSION_KEY = "legacy-leadgen-session";

function loadUsers(): User[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as User[]) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: User[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function ensureDemoUser(): void {
  const users = loadUsers();
  if (!users.find((u) => u.email === "levi@legacy.com")) {
    users.push({
      id: "demo-user",
      email: "levi@legacy.com",
      password: "legacy123",
      name: "Levi Kempen",
      company: "Legacy Scale Models",
      credits: STARTING_CREDITS,
      transactions: [
        {
          id: generateId(),
          type: "bonus",
          amount: STARTING_CREDITS,
          description: "Welkomstbonus",
          createdAt: new Date().toISOString(),
        },
      ],
      integrations: {
        linkedin: true,
        crm: false,
        webhooks: false,
        nightlyAgent: true,
      },
    });
    saveUsers(users);
  }
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => string | null;
  register: (name: string, email: string, password: string, company: string) => string | null;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(() => {
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      setUser(null);
      return;
    }
    const found = loadUsers().find((u) => u.id === sessionId);
    setUser(found ?? null);
    if (!found) localStorage.removeItem(SESSION_KEY);
  }, []);

  useEffect(() => {
    ensureDemoUser();
    refreshUser();
    setLoading(false);
  }, [refreshUser]);

  const login = useCallback((email: string, password: string): string | null => {
    ensureDemoUser();
    const found = loadUsers().find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!found) return "Onjuist e-mailadres of wachtwoord.";
    localStorage.setItem(SESSION_KEY, found.id);
    setUser(found);
    return null;
  }, []);

  const register = useCallback(
    (name: string, email: string, password: string, company: string): string | null => {
      if (!name.trim() || !email.trim() || !password.trim()) {
        return "Vul alle velden in.";
      }
      if (password.length < 6) return "Wachtwoord moet minimaal 6 tekens zijn.";
      ensureDemoUser();
      const users = loadUsers();
      if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
        return "Dit e-mailadres is al geregistreerd.";
      }
      const newUser: User = {
        id: generateId(),
        email: email.toLowerCase(),
        password,
        name: name.trim(),
        company: company.trim() || "Legacy Scale Models",
        credits: STARTING_CREDITS,
        transactions: [
          {
            id: generateId(),
            type: "bonus",
            amount: STARTING_CREDITS,
            description: "Welkomstbonus",
            createdAt: new Date().toISOString(),
          },
        ],
        integrations: {
          linkedin: false,
          crm: false,
          webhooks: false,
          nightlyAgent: true,
        },
      };
      users.push(newUser);
      saveUsers(users);
      localStorage.setItem(SESSION_KEY, newUser.id);
      setUser(newUser);
      return null;
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const updateUser = useCallback(
    (updates: Partial<User>) => {
      if (!user) return;
      const users = loadUsers();
      const idx = users.findIndex((u) => u.id === user.id);
      if (idx === -1) return;
      const updated = { ...users[idx], ...updates };
      users[idx] = updated;
      saveUsers(users);
      setUser(updated);
    },
    [user]
  );

  const value = useMemo(
    () => ({ user, loading, login, register, logout, updateUser, refreshUser }),
    [user, loading, login, register, logout, updateUser, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function getDataKey(userId: string): string {
  return `legacy-leadgen-data-${userId}`;
}
