import type { Metadata } from "next";

export const metadata: Metadata = { title: "Readlist" };

export default function ReadlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
