import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Layout from "../components/layout/Layout";
import MUIProvider from "../providers/MUIProvider";
import { AuthProvider } from "../contexts/AuthContext";
import { palette } from "../theme/customTheme";

export const runtime = "edge";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: { default: "Kiroku", template: "%s · Kiroku" },
  description: "Kiroku — anime, manga, kitap ve dizilerin için kişisel medya arşivi",
};

export const viewport: Viewport = {
  themeColor: palette.ink,
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={inter.variable}>
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
