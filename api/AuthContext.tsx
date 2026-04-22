import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import NetInfo from "@react-native-community/netinfo";
import { authApi, loginAndSave, tokenStore, User } from "./api";
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
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  selectCompany: (companyId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchCompaniesOnline(): Promise<Company[]> {
  if (typeof (authApi as any).getCompanies === "function") {
    return (authApi as any).getCompanies();
  }
  if (typeof (authApi as any).companies === "function") {
    return (authApi as any).companies();
  }
  return [];
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
        const companies = await fetchCompaniesOnline();
        const selectedCompanyId = await getSelectedCompanyId(user.id);

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

    const companies = await fetchCompaniesOnline().catch(() => []);
    const selectedCompanyId = companies.length === 1 ? companies[0].id : null;

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
  }, []);

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
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}