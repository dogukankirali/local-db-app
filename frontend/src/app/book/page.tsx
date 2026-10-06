import type { Metadata } from "next";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import ComingSoon from "../../components/Common/ComingSoon";

export const metadata: Metadata = { title: "Kitaplar" };

export default function BookPage() {
  return <ComingSoon title="Kitaplar" description="Kitap arşivi yakında burada. Okuduğun ve okuyacağın kitapları listeleyebileceksin." icon={<AutoStoriesOutlinedIcon />} />;
}
