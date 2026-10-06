import type { Metadata } from "next";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import ComingSoon from "../../components/Common/ComingSoon";

export const metadata: Metadata = { title: "Manga" };

export default function MangaPage() {
  return <ComingSoon title="Manga" description="Manga takibi yakında burada. Okuduğun serileri, bölüm ilerlemesini ve puanlarını tek yerden yönetebileceksin." icon={<MenuBookOutlinedIcon />} />;
}
