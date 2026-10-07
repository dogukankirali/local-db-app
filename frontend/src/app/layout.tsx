import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Layout from "../components/layout/Layout";
import MUIProvider from "../providers/MUIProvider";
import { AuthProvider } from "../contexts/AuthContext";
import { palette } from "../theme/customTheme";

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
    <html lang="tr" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Seçilen aydınlık/karanlık tema ilk boyamadan önce zemine uygulanır (beyaz/siyah parlama olmasın) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var l=localStorage.getItem("kirokuMode")==="light";document.documentElement.style.background=l?"#F4F5F8":"#0B0D12";document.documentElement.style.colorScheme=l?"light":"dark"}catch(e){}`,
          }}
        />
        {/* Kapak CDN'lerine bağlantı erken açılsın */}
        <link rel="preconnect" href="https://s4.anilist.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.myanimelist.net" />
      </head>
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
