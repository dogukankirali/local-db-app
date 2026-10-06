import type { Metadata } from "next";
import LiveTvOutlinedIcon from "@mui/icons-material/LiveTvOutlined";
import ComingSoon from "../../components/Common/ComingSoon";

export const metadata: Metadata = { title: "Diziler" };

export default function SeriesPage() {
  return <ComingSoon title="Diziler" description="Dizi takibi yakında burada. Sezon ve bölüm ilerlemeni buradan izleyebileceksin." icon={<LiveTvOutlinedIcon />} />;
}
