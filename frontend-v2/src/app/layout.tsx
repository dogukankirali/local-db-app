import type { Metadata } from "next";
import { Poppins, Montserrat } from "next/font/google";
import Layout from "@/components/layout/Layout";
import MUIProvider from "@/providers/MUIProvider";
import { AuthProvider } from "@/contexts/AuthContext";

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-poppins",
});

const montserrat = Montserrat({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
});

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
    <html lang="tr" className={`${poppins.variable} ${montserrat.variable}`}>
      <body className={poppins.className}>
        <MUIProvider>
          <AuthProvider>
            <Layout>{children}</Layout>
          </AuthProvider>
        </MUIProvider>
      </body>
    </html>
  );
}
