import type { Metadata } from "next";
import ScreenLibrary from "../../components/screen/ScreenLibrary";

export const metadata: Metadata = { title: "Filmler" };

export default function MoviesPage() {
  return <ScreenLibrary kind="movie" />;
}
