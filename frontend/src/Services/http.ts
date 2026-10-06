import axios from "axios";

// Yazma uçları (güncelle/sil/watchlist/sync) admin token'ı istiyor; düz axios çağrıları da
// giriş yapılmışsa token'ı taşısın. AuthService bu dosyayı yükler, AuthContext de her sayfada var.
if (typeof window !== "undefined") {
  axios.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
}

// Site ve API aynı Worker'da: varsayılan olarak aynı origin'deki /api kullanılır
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";
