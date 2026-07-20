// api/AuthContext.ts
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import NetInfo from "@react-native-community/netinfo";
import {
  authApi,
  loginAndSave,
  setSignupPasswordAndSave,
  tokenStore,
  User,
  projectApi,
} from "./api";

import {
  connectProjectSocket,
  disconnectProjectSocket,
} from "../app/realtime/projectSocket";
import { registerProjectBackgroundSync } from "../app/sync/projectBackgroundTask";
import { syncAssignedProjects } from "../app/sync/projectSyncEngine";

import {
  initAuthStorage,
  getCachedUser,
  cacheAuthenticatedSession,
  clearOfflineAuthState,
  isOfflineSessionValid,
  getCachedCompanies,
  getSelectedCompanyId,
  saveSelectedCompany,
} from "../app/offline/authStorage";

type AuthMode = "online" | "offline" | "none";

type Company = {
  id: string;
  name: string;
  [key: string]: any;
};

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnline: boolean;
  authMode: AuthMode;
  companies: Company[];
  selectedCompanyId: string | null;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  completeSignup: (setupToken: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  selectCompany: (companyId: string) => Promise<void>;
}

function normalizeCompanies(user: any, companies: Company[] = []): Company[] {
  if (companies.length > 0) return companies;

  if (user?.company?.id) {
    return [
      {
        id: user.company.id,
        name: user.company.name ?? user.companyName ?? "Company",
      },
    ];
  }

  if (user?.companyId) {
    return [
      {
        id: user.companyId,
        name: user.companyName ?? "Company",
      },
    ];
  }

  return [];
}

function getDefaultCompanyId(user: any, companies: Company[]): string | null {
  if (companies.length === 1) return companies[0].id;
  if (user?.company?.id) return user.company.id;
  if (user?.companyId) return user.companyId;
  return null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchCompaniesOnline(): Promise<Company[]> {
  try {
    if (typeof (authApi as any).getCompanies === "function") {
      const result = await (authApi as any).getCompanies();

      if (Array.isArray(result)) return result;
      if (Array.isArray(result?.companies)) return result.companies;

      return [];
    }

    if (typeof (authApi as any).companies === "function") {
      const result = await (authApi as any).companies();

      if (Array.isArray(result)) return result;
      if (Array.isArray(result?.companies)) return result.companies;

      return [];
    }

    return [];
  } catch {
    return [];
  }
}

async function startProjectAutoSync(companyId?: string | null) {
  try {
    const projectsResult = await projectApi.list(companyId || undefined);
    const projects = projectsResult.projects || [];
    const projectIds = projects.map((project) => project.id);

    await connectProjectSocket(projectIds);
    await registerProjectBackgroundSync();

    syncAssignedProjects(projects).catch((error) => {
      console.log("[project-auto-sync] failed", error);
    });
  } catch (error) {
    console.log("[project-auto-sync] skipped", error);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    isOnline: true,
    authMode: "none",
    companies: [],
    selectedCompanyId: null,
  });

  const bootstrap = useCallback(async () => {
    await initAuthStorage();

    const net = await NetInfo.fetch();
    const isOnline = !!net.isConnected && !!net.isInternetReachable;

    setState((prev) => ({ ...prev, isOnline, isLoading: true }));

    const token = await tokenStore.getToken();
    const cachedUser = await getCachedUser();

    if (isOnline && token) {
      try {
        const user = await authApi.me();

        const fetchedCompanies = await fetchCompaniesOnline();
        const companies = normalizeCompanies(user, fetchedCompanies);

        let selectedCompanyId = await getSelectedCompanyId(user.id);

        if (!selectedCompanyId) {
          selectedCompanyId = getDefaultCompanyId(user, companies);

          if (selectedCompanyId) {
            await saveSelectedCompany(user.id, selectedCompanyId);
          }
        }

        await cacheAuthenticatedSession({
          user,
          accessToken: token,
          refreshToken: await tokenStore.getRefreshToken(),
          companies,
          selectedCompanyId,
        });

        setState({
          user,
          isLoading: false,
          isAuthenticated: true,
          isOnline: true,
          authMode: "online",
          companies,
          selectedCompanyId,
        });

        startProjectAutoSync(selectedCompanyId).catch((error) => {
          console.log("[bootstrap-sync] failed", error);
        });

        return;
      } catch {
        const validOffline = await isOfflineSessionValid();

        if (cachedUser && validOffline) {
          const companies = await getCachedCompanies(cachedUser.id);
          const selectedCompanyId = await getSelectedCompanyId(cachedUser.id);

          setState({
            user: cachedUser as User,
            isLoading: false,
            isAuthenticated: true,
            isOnline: false,
            authMode: "offline",
            companies,
            selectedCompanyId,
          });

          return;
        }

        await clearOfflineAuthState();
        await tokenStore.clear();

        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          isOnline,
          authMode: "none",
          companies: [],
          selectedCompanyId: null,
        });

        return;
      }
    }

    if (!isOnline) {
      const validOffline = await isOfflineSessionValid();

      if (cachedUser && validOffline) {
        const companies = await getCachedCompanies(cachedUser.id);
        const selectedCompanyId = await getSelectedCompanyId(cachedUser.id);

        setState({
          user: cachedUser as User,
          isLoading: false,
          isAuthenticated: true,
          isOnline: false,
          authMode: "offline",
          companies,
          selectedCompanyId,
        });

        return;
      }
    }

    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      isOnline,
      authMode: "none",
      companies: [],
      selectedCompanyId: null,
    });
  }, []);

  useEffect(() => {
    void bootstrap();

    const unsubscribe = NetInfo.addEventListener((net) => {
      const isOnline = !!net.isConnected && !!net.isInternetReachable;
      setState((prev) => ({ ...prev, isOnline }));
    });

    return unsubscribe;
  }, [bootstrap]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await loginAndSave(username, password);

    const fetchedCompanies = await fetchCompaniesOnline();
    const companies = normalizeCompanies(res.user, fetchedCompanies);
    const selectedCompanyId = getDefaultCompanyId(res.user, companies);

    await cacheAuthenticatedSession({
      user: res.user,
      accessToken: res.tokens.accessToken,
      refreshToken: res.tokens.refreshToken ?? null,
      companies,
      selectedCompanyId,
    });

    setState({
      user: res.user,
      isLoading: false,
      isAuthenticated: true,
      isOnline: true,
      authMode: "online",
      companies,
      selectedCompanyId,
    });

    startProjectAutoSync(selectedCompanyId).catch((error) => {
      console.log("[login-sync] failed", error);
    });
  }, []);

  const completeSignup = useCallback(
    async (setupToken: string, password: string) => {
      const res = await setSignupPasswordAndSave({
        setupToken,
        password,
        role: "Inspector",
      });

      const fetchedCompanies = await fetchCompaniesOnline();
      const companies = normalizeCompanies(res.user, fetchedCompanies);
      const selectedCompanyId = getDefaultCompanyId(res.user, companies);

      await cacheAuthenticatedSession({
        user: res.user,
        accessToken: res.tokens.accessToken,
        refreshToken: res.tokens.refreshToken ?? null,
        companies,
        selectedCompanyId,
      });

      setState({
        user: res.user,
        isLoading: false,
        isAuthenticated: true,
        isOnline: true,
        authMode: "online",
        companies,
        selectedCompanyId,
      });

      startProjectAutoSync(selectedCompanyId).catch((error) => {
        console.log("[signup-sync] failed", error);
      });
    },
    []
  );

  const refreshSession = useCallback(async () => {
    await bootstrap();
  }, [bootstrap]);

  const selectCompany = useCallback(
    async (companyId: string) => {
      if (!state.user) return;

      await saveSelectedCompany(state.user.id, companyId);

      setState((prev) => ({
        ...prev,
        selectedCompanyId: companyId,
      }));

      startProjectAutoSync(companyId).catch((error) => {
        console.log("[company-sync] failed", error);
      });
    },
    [state.user]
  );

  const logout = useCallback(async () => {
    const net = await NetInfo.fetch();
    const isOnline = !!net.isConnected && !!net.isInternetReachable;

    try {
      if (isOnline) {
        await authApi.logout();
      }
    } catch {
      // continue local logout anyway
    }

    disconnectProjectSocket();

    await tokenStore.clear();
    await clearOfflineAuthState();

    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      isOnline,
      authMode: "none",
      companies: [],
      selectedCompanyId: null,
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        completeSignup,
        logout,
        refreshSession,
        selectCompany,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }

  return ctx;
}