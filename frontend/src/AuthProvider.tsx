import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authApi } from "./api/authApi";

interface User {
  username: string;
  avatar: string | null;
}

interface LoginResponse {
  token: string;
  user: User;
}

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  login: (data: LoginResponse) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("token"),
  );

  useEffect(() => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchUser = async () => {
      try {
        const res = await authApi.get<User>("/me", {
          signal: controller.signal,
          headers: { "Cache-Control": "no-cache" },
        });
        setUser(res.data);
      } catch (err: any) {
        if (err.name !== "CanceledError") logout(); // only logout if not canceled
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();

    return () => {
      controller.abort();
    };
  }, [token]);

  const login = (data: { token: string; user: User }) => {
    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const value = useMemo(
    () => ({
      isLoading,
      isAuthenticated: !!user,
      user,
      login,
      logout,
    }),
    [isLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthState => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
