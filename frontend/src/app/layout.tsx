import type { Metadata } from "next";
import Layout from "../components/layout/Layout";
import MUIProvider from "../providers/MUIProvider";
import { AuthProvider } from "../contexts/AuthContext";
import "../styles/fonts.css"; // Local fontlar için style dosyası

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Local DB App",
  description: "Your personal media tracker",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        <MUIProvider>
          <AuthProvider>
            <Layout>{children}</Layout>
          </AuthProvider>
        </MUIProvider>
      </body>
    </html>
  );
}
