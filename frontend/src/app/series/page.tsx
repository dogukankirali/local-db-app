import type { Metadata } from "next";
import ScreenLibrary from "../../components/screen/ScreenLibrary";

export const metadata: Metadata = { title: "Diziler" };

export default function SeriesPage() {
  return <ScreenLibrary kind="series" />;
}
