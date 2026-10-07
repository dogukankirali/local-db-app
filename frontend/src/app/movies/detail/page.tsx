import type { Metadata } from "next";
import ScreenDetail from "../../../components/screen/ScreenDetail";

export const metadata: Metadata = { title: "Film" };

export default function MovieDetailPage() {
  return <ScreenDetail kind="movie" />;
}
