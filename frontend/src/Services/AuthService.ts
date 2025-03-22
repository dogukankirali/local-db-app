import axios from "axios";

const path = process.env.NEXT_PUBLIC_API_URL || "https://localhost:8080";

// Kullanıcı tipi tanımlamaları
export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isAdmin: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  token?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface UpdateProfileRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

// Axios instance oluştur
const authAxios = axios.create({
  baseURL: path,
  headers: {
    "Content-Type": "application/json",
  },
});

// İstek interceptor'ı - her istekte token ekle
authAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Yanıt interceptor'ı - 401 hatası durumunda kullanıcıyı çıkış yaptır
authAxios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token geçersiz veya süresi dolmuş
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const AuthService = {
  // Kullanıcı kaydı
  register: async (data: RegisterRequest): Promise<User> => {
    try {
      const response = await axios.post(`${path}/auth/register`, data);
      // Token ve kullanıcı bilgilerini localStorage'a kaydet
      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data));
      }
      return response.data;
    } catch (error) {
      console.error("Kayıt hatası:", error);
      throw error;
    }
  },

  // Kullanıcı girişi
  login: async (data: LoginRequest): Promise<User> => {
    try {
      const response = await axios.post(`${path}/auth/login`, data);
      // Token ve kullanıcı bilgilerini localStorage'a kaydet
      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data));
      }
      return response.data;
    } catch (error) {
      console.error("Giriş hatası:", error);
      throw error;
    }
  },

  // Kullanıcı çıkışı
  logout: (): void => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  },

  // Kullanıcı profili getir
  getProfile: async (): Promise<User> => {
    try {
      const response = await authAxios.get(`${path}/auth/profile`);
      return response.data;
    } catch (error) {
      console.error("Profil getirme hatası:", error);
      throw error;
    }
  },

  // Kullanıcı profilini güncelle
  updateProfile: async (data: UpdateProfileRequest): Promise<User> => {
    try {
      const response = await authAxios.put(`${path}/auth/profile`, data);
      // Kullanıcı bilgilerini güncelle
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const updatedUser = { ...currentUser, ...response.data };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      return response.data;
    } catch (error) {
      console.error("Profil güncelleme hatası:", error);
      throw error;
    }
  },

  // Mevcut kullanıcıyı getir
  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  },

  // Token kontrolü
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem("token");
  },

  // Admin kontrolü
  isAdmin: (): boolean => {
    const user = AuthService.getCurrentUser();
    return !!user && user.isAdmin;
  },

  // Şifre sıfırlama isteği gönder
  forgotPassword: async (data: ForgotPasswordRequest): Promise<void> => {
    try {
      await axios.post(`${path}/auth/forgot-password`, data);
    } catch (error) {
      console.error("Şifre sıfırlama isteği hatası:", error);
      throw error;
    }
  },

  // Şifre sıfırlama işlemini tamamla
  resetPassword: async (data: ResetPasswordRequest): Promise<void> => {
    try {
      await axios.post(`${path}/auth/reset-password`, data);
    } catch (error) {
      console.error("Şifre sıfırlama hatası:", error);
      throw error;
    }
  },
};
