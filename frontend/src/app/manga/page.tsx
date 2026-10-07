import type { Metadata } from "next";
import MangaLibrary from "../../components/manga/MangaLibrary";

export const metadata: Metadata = { title: "Manga" };

export default function MangaPage() {
  return <MangaLibrary />;
}
