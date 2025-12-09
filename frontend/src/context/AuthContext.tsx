// src/context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

type UserRole = "admin" | "tenant" | "guest";

export interface AuthUser {
  user_name: string;
  user_role: UserRole;
  email: string;
  profile_image?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  // 👇 ให้ตรงกับที่ Login.tsx เรียก
  login: (
    accessToken: string,
    user_role: string,
    user_name: string,
    email: string,
    profile_image?: string | null
  ) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// key ใน localStorage
const LS_USER_KEY = "user";
const LS_TOKEN_KEY = "token";

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // โหลดค่าจาก localStorage ตอนเปิดเว็บ
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(LS_USER_KEY);
      const storedToken = localStorage.getItem(LS_TOKEN_KEY);

      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      }
    } catch (e) {
      console.error("Failed to restore auth from storage:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // 👇 ฟังก์ชัน login ที่ใช้ตรงกับ Login.tsx
  const loginFn = (
    accessToken: string,
    user_role: UserRole,
    user_name: string,
    email: string,
    profile_image?: string | null
  ) => {
    const userObj: AuthUser = {
      user_name,
      user_role: (user_role as UserRole) || "tenant",
      email,
      profile_image: profile_image ?? null,
    };

    setUser(userObj);
    setToken(accessToken);

    localStorage.setItem(LS_USER_KEY, JSON.stringify(userObj));
    localStorage.setItem(LS_TOKEN_KEY, accessToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(LS_USER_KEY);
    localStorage.removeItem(LS_TOKEN_KEY);
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    isAuthenticated: !!user && !!token,
    login: loginFn,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
