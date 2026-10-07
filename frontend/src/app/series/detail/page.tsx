import type { Metadata } from "next";
import ScreenDetail from "../../../components/screen/ScreenDetail";

export const metadata: Metadata = { title: "Dizi" };

export default function SeriesDetailPage() {
  return <ScreenDetail kind="series" />;
}
