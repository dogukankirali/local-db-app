"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { CircularProgress, Box } from "@mui/material";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  adminOnly = false,
}) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Yükleme tamamlandıktan sonra kontrol et
    if (!loading) {
      if (!isAuthenticated) {
        // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
        router.push("/login");
      } else if (adminOnly && !isAdmin) {
        // Sayfa admin yetkisi gerektiriyorsa ve kullanıcı admin değilse ana sayfaya yönlendir
        router.push("/");
      }
    }
  }, [isAuthenticated, isAdmin, loading, router, adminOnly]);

  // Yükleme durumunda loading göster
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Kullanıcı giriş yapmışsa ve gerekli yetkiye sahipse içeriği göster
  if (isAuthenticated && (!adminOnly || (adminOnly && isAdmin))) {
    return <>{children}</>;
  }

  // Diğer durumlarda boş içerik göster (yönlendirme yapılacak)
  return null;
};

export default ProtectedRoute;
