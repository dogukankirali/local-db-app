"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  AuthService,
  User,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from "../services/AuthService";
import { useRouter } from "next/navigation";

// Context için tip tanımlaması
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
  forgotPassword: (data: ForgotPasswordRequest) => Promise<void>;
  resetPassword: (data: ResetPasswordRequest) => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

// Context'i oluştur
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Context provider bileşeni
export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const router = useRouter();

  // Sayfa yüklendiğinde kullanıcı durumunu kontrol et
  useEffect(() => {
    const initAuth = async () => {
      try {
        // LocalStorage'dan kullanıcı bilgilerini al
        const storedUser = AuthService.getCurrentUser();
        const isAuth = AuthService.isAuthenticated();

        if (isAuth && storedUser) {
          setUser(storedUser);
          setIsAuthenticated(true);
          setIsAdmin(storedUser.isAdmin);

          // Opsiyonel: Sunucudan güncel kullanıcı bilgilerini al
          try {
            const currentUser = await AuthService.getProfile();
            setUser(currentUser);
            setIsAdmin(currentUser.isAdmin);
          } catch (error) {
            // Profil getirme hatası - token geçersiz olabilir
            console.error("Profil getirme hatası:", error);
            AuthService.logout();
            setUser(null);
            setIsAuthenticated(false);
            setIsAdmin(false);
          }
        }
      } catch (error) {
        console.error("Kimlik doğrulama hatası:", error);
        setError("Kimlik doğrulama hatası");
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Giriş işlevi
  const login = async (data: LoginRequest) => {
    setLoading(true);
    setError(null);
    try {
      const loggedInUser = await AuthService.login(data);
      setUser(loggedInUser);
      setIsAuthenticated(true);
      setIsAdmin(loggedInUser.isAdmin);
      router.push("/"); // Ana sayfaya yönlendir
    } catch (error: any) {
      console.error("Giriş hatası:", error);
      setError(error.response?.data?.message || "Giriş yapılamadı");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Kayıt işlevi
  const register = async (data: RegisterRequest) => {
    setLoading(true);
    setError(null);
    try {
      const registeredUser = await AuthService.register(data);
      setUser(registeredUser);
      setIsAuthenticated(true);
      setIsAdmin(registeredUser.isAdmin);
      router.push("/"); // Ana sayfaya yönlendir
    } catch (error: any) {
      console.error("Kayıt hatası:", error);
      setError(error.response?.data?.message || "Kayıt yapılamadı");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Çıkış işlevi
  const logout = () => {
    AuthService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    router.push("/login");
  };

  // Profil güncelleme işlevi
  const updateProfile = async (data: UpdateProfileRequest) => {
    setLoading(true);
    setError(null);
    try {
      const updatedUser = await AuthService.updateProfile(data);
      setUser(updatedUser);
      setIsAdmin(updatedUser.isAdmin);
    } catch (error: any) {
      console.error("Profil güncelleme hatası:", error);
      setError(error.response?.data?.message || "Profil güncellenemedi");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Şifre sıfırlama isteği gönderme işlevi
  const forgotPassword = async (data: ForgotPasswordRequest) => {
    setLoading(true);
    setError(null);
    try {
      await AuthService.forgotPassword(data);
    } catch (error: any) {
      console.error("Şifre sıfırlama isteği hatası:", error);
      setError(
        error.response?.data?.message || "Şifre sıfırlama isteği gönderilemedi"
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Şifre sıfırlama işlevi
  const resetPassword = async (data: ResetPasswordRequest) => {
    setLoading(true);
    setError(null);
    try {
      await AuthService.resetPassword(data);
    } catch (error: any) {
      console.error("Şifre sıfırlama hatası:", error);
      setError(error.response?.data?.message || "Şifre sıfırlanamadı");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Context değerlerini sağla
  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    forgotPassword,
    resetPassword,
    isAuthenticated,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Context hook'u
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
