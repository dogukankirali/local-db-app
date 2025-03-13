import React, { JSX } from "react";
import { FilterStateProp } from "../components/CollapsibleTableV2/Components/TableFilters/TableFilters";

export default function Constants({
  type,
  additionalData,
}: {
  type: string;
  additionalData?: any | ((id: string, i: number, data?: any) => JSX.Element);
}): FilterStateProp[] | TEATable.IColumnItems[] | any {
  if (type === "tableFilters") {
    return [
      {
        label: "Name",
        key: "Name",
        type: "input",
      },
      {
        label: "AnimeStatus",
        key: "AnimeStatus",
        type: "multi-select",
        options: [
          {
            value: "OnAir",
            label: "On Air",
          },
          {
            value: "Finished",
            label: "Finished",
          },
        ],
      },
      {
        label: "WatchStatus",
        key: "WatchStatus",
        type: "string",
      },
      {
        label: "TotalNumberOfEpisodes",
        key: "TotalNumberOfEpisodes",
        type: "number",
        options: {
          min: 0,
          max: 10000,
        },
      },
      {
        label: "IsMovie",
        key: "IsMovie",
        type: "multi-select",
        options: [
          {
            value: "true",
            label: "Movie",
          },
          {
            value: "false",
            label: "TV Series",
          },
        ],
      },
      {
        label: "Genre",
        key: "Genre",
        type: "multi-select",
        options: additionalData.genres!,
      },
      {
        label: "Score",
        key: "Score",
        type: "number",
        options: {
          min: 0,
          max: 100,
        },
      },
    ];
  } else if (type === "headers") {
    return [
      { key: "Cover", value: "Cover", width: "50px", type: "base64" },
      { key: "Name", value: "Name", width: "100%", type: "string" },
      {
        key: "AnimeStatus",
        value: "Anime Status",
        width: "100%",
        type: "string",
      },
      {
        key: "WatchStatus",
        value: "Watch Status",
        width: "100%",
        type: "number",
      },
      {
        key: "TotalNumberOfEpisodes",
        value: "Total Number Of Episodes",
        width: "100%",
        type: "number",
      },
      { key: "Score", value: "Score", width: "100%", type: "number" },
      {
        key: "IsMovie",
        value: "TV Series/Movie",
        width: "100%",
        type: "boolean",
      },
      { key: "Genre", value: "Genre", width: "100%", type: "string" },
    ];
  } else if (type === "outerColumns") {
    return [
      { key: "Cover", value: "Cover", width: "2%", type: "base64" },
      { key: "Name", value: "Name", width: "40%", type: "string" },
      {
        key: "AnimeStatus",
        value: "Anime Status",
        width: "10%",
        type: "status",
      },
      {
        key: "WatchStatus",
        value: "Watch Status",
        width: "10%",
        type: "episode",
      },
      {
        key: "TotalNumberOfEpisodes",
        value: "Total Number Of Episodes",
        width: "10%",
        type: "number",
      },
      { key: "Score", value: "Score", width: "5%", type: "score" },
      {
        key: "IsMovie",
        value: "TV Series/Movie",
        width: "5%",
        type: "tv-movie",
      },
      { key: "Genre", value: "Genre", width: "15%", type: "pill" },
    ];
  } else if (type === "innerColumns") {
    return [
      { key: "MALScore", value: "MAL Score", icon: <></>, type: "string" },
      { key: "Notes", value: "Notes", icon: <></>, type: "string" },
      { key: "Series", value: "Series", icon: <></>, type: "series" },
      { key: "AnimeLink", value: "Watch Link", icon: <></>, type: "link" },
      { key: "MALAnimeLink", value: "MAL Page", icon: <></>, type: "link" },
    ];
  } else if (type === "modalList") {
    return [
      { key: "Cover", value: "Cover", type: "base64" },
      { key: "Notes", value: "Notes", icon: <></>, type: "textarea" },
      { key: "Name", value: "Name", icon: <></>, type: "input" },
      {
        key: "AnimeStatus",
        value: "Anime Status",
        icon: <></>,
        type: "select",
        options: [
          { key: "OnAir", label: "On Air" },
          { key: "Finished", label: "Finished" },
        ],
      },
      {
        key: "WatchStatus",
        value: "Watch Status",
        icon: <></>,
        type: "number",
      },
      {
        key: "TotalNumberOfEpisodes",
        value: "Total Number Of Episodes",
        icon: <></>,
        type: "number",
      },
      { key: "Score", value: "Score", icon: <></>, type: "float" },
      {
        key: "IsMovie",
        value: "TV Series/Movie",
        icon: <></>,
        type: "boolean",
      },
      {
        key: "Series",
        value: "Series",
        icon: <></>,
        type: "select-api",
        apiPath: "getSeries",
      },
      { key: "MALScore", value: "MAL Score", icon: <></>, type: "float" },
      { key: "AnimeLink", value: "Watch Link", icon: <></>, type: "input" },
      { key: "MALAnimeLink", value: "MAL Page", icon: <></>, type: "input" },
    ];
  }
}

//export const path = "https://localhost:3007";
//export const path = "https://192.168.1.33:3007";
export const path = process.env.REACT_APP_PATH;

export const epScale = {
  "0": "#FF0000", // Kırmızı
  "25": "#FF3200", // Turuncu
  "50": "#FF6500", // Sarı
  "75": "#00FF00", // Yeşil
  "100": "#00B0F0", // Mavi
};

export const colorScale = {
  "0-9": "#FF0000", // Kırmızı
  "10-19": "#FF1900", // Turuncu Kırmızı
  "20-29": "#FF3200", // Turuncu
  "30-39": "#FF4C00", // Turuncu Sarı
  "40-49": "#FF6500", // Sarı
  "50-59": "#FF7F00", // Altın Sarısı
  "60-69": "#FF9800", // Portakal
  "70-79": "#FFB200", // Turuncu
  "80-89": "#FFDF00", // Sarı Yeşil
  "90-99": "#00FF00", // Yeşil
  "100": "#00B0F0", // Mavi
};

export const genreColors: { [key: string]: string } = {
  Shounen: "#FF4500", // Ateş Kırmızısı
  Shoujo: "#FF69B4", // Barbie Pembesi
  Seinen: "#008080", // Deniz Yeşili
  Josei: "#FF1493", // Parlak Pembe
  Mecha: "#808080", // Metal Gri
  "Slice of Life": "#F0E68C", // Açık Sarı
  Fantastik: "#9932CC", // Şeftali Moru
  Korku: "#8B0000", // Kan Kırmızısı
  Spor: "#32CD32", // Çimen Yeşili
  "Bilim Kurgu": "#00CED1", // Açık Mavi
  Romantik: "#FFB6C1", // Gül Rengi
  Dram: "#696969", // Kurşuni Gri
  Aksiyon: "#FFD700", // Altın Sarısı
  Komedi: "#FF8C00", // Hardal Sarısı
  Macera: "#006400", // Orman Yeşili
  Doğaüstü: "#8A2BE2", // Bordo Mor
  Psikolojik: "#2F4F4F", // Teneke Gri
  Yaoi: "#FFA07A", // Açık Somon
  Yuri: "#9370DB", // Orkide Moru
  Harem: "#FFC0CB", // İnci Pembe
  "Mahou Shoujo": "#FF69B4", // Barbie Pembesi
  Müzik: "#8B4513", // Ahşap Kahverengi
  Savaş: "#4B0082", // İndigo
  Samuray: "#DC143C", // Alev Kırmızısı
  Vampir: "#800080", // Mor
  "Vahşi Batı": "#CD853F", // Perulu
  Okul: "#00FF7F", // Neon Yeşili
  "Bilim Kurgu Korku": "#00CED1", // Açık Mavi
  Gizem: "#483D8B", // Mor Mavi
  Gerilim: "#808080", // Metal Gri
  Zombi: "#556B2F", // Yeşil Kahverengi
  Mücadele: "#FF4500", // Ateş Kırmızısı
  Uzay: "#0000CD", // Orta Mavi
  Kült: "#FF5722", // Turuncu
  Suç: "#8B0000", // Kan Kırmızısı
  Historical: "#DAA520", // Altın Rengi
  "Mücadele Sporları": "#32CD32", // Çimen Yeşili
  Müzikal: "#FFD700", // Altın Sarısı
  "Günlük Yaşam": "#F0E68C", // Açık Sarı
  "Karakter Gelişimi": "#006400", // Orman Yeşili
  Fantezi: "#9932CC", // Şeftali Moru
  Eğlence: "#FF8C00", // Hardal Sarısı
  "Super Güçler": "#FFD700", // Altın Sarısı
  Hayalet: "#9370DB", // Orkide Moru
  "Kara Komedi": "#808080", // Metal Gri
  Kahramanlık: "#00FF7F", // Neon Yeşili
  "Hayatta Kalma": "#FF5722", // Turuncu
  Dönem: "#696969", // Kurşuni Gri
  Makine: "#A9A9A9", // Koyu Gri
  Parodi: "#FF8C00", // Hardal Sarısı
  "Hikayelere Dayalı": "#F0E68C", // Açık Sarı
  "Kıyamet Sonrası": "#FFA500", // Portakal
  Dedektif: "#000080", // Lacivert
  "Dövüş Sanatları": "#32CD32", // Çimen Yeşili
  Yetişkin: "#FF69B4", // Barbie Pembesi
  Büyücülük: "#9932CC", // Şeftali Moru
  "Samuraylar ve Ninja": "#DC143C", // Alev Kırmızısı
  Sihir: "#9370DB", // Orkide Moru
  "Bilgisayar Oyunu": "#0000CD", // Orta Mavi
  Soyut: "#483D8B", // Mor Mavi
  "Edebiyat Uyarlaması": "#8B4513", // Ahşap Kahverengi
  Koşu: "#00FF7F", // Neon Yeşili
  "Sevgililer Arasındaki İlişkiler": "#F06292", // Somon
  Havacılık: "#DAA520", // Altın Rengi
  Sürrealizm: "#AB82FF", // Parlak Lavanta
  "Uzay Operası": "#000080", // Lacivert
  "Kıyafetleri Değiştirme": "#FFEB3B", // Güneş Sarısı
  Dans: "#00CED1", // Açık Mavi
  Tarih: "#A0522D", // Koyu Kahverengi
  Yarış: "#4CAF50", // Orta Yeşil
  Yaratıklar: "#8B4513", // Ahşap Kahverengi
  Yolculuk: "#9E9E9E", // Gümüş
  "Aşk Üçgeni": "#BA55D3", // Orkide Rengi
  Mangaka: "#607D8B", // Mavi Gri
  "Öğretmen-Öğrenci İlişkisi": "#795548", // Kakao
  "Konusu Olmayan": "#FF4500", // Ateş Kırmızısı
  Yiyecek: "#FFA500", // Portakal
  Oyun: "#FFD700", // Altın Sarısı
  Polisiye: "#000080", // Lacivert
  Mafia: "#8B0000", // Kan Kırmızısı
  Suikastçılar: "#E57373", // Açık Kırmızı
  "Ekip Çalışması": "#32CD32", // Çimen Yeşili
  "Gösteri Sanatları": "#4CAF50", // Orta Yeşil
  İntikam: "#00CED1", // Açık Mavi
  "Kötü Karakterler": "#9E9E9E", // Gümüş
  Isekai: "#0000E4", // Isekai
  Çocuk: "#FF9E80", // Turuncu Pembe
  Ödüllü: "#FFD54F", // Amber
  Hayvan: "#8D6E63", // Kahverengi
  Antropomorfik: "#795548", // Kahverengi
  Sanat: "#9C27B0", // Mor
  Otomobil: "#F44336", // Kırmızı
  "Avant Garde": "#673AB7", // Derin Mor
  "Award Winning": "#FFD54F", // Amber
  "Boys Love": "#FFA07A", // Açık Somon (Yaoi ile aynı)
  "Girls Love": "#9370DB", // Orkide Moru (Yuri ile aynı)
  "Combat Sports": "#32CD32", // Çimen Yeşili
  "Competitive Sports": "#4CAF50", // Yeşil
  Educational: "#4CAF50", // Yeşil
  "Gag Humor": "#FF8C00", // Turuncu
  Gore: "#8B0000", // Kan Kırmızısı
  Gourmet: "#FFA500", // Portakal
  "High Stakes Game": "#FFD700", // Altın Sarısı
  "Idols (Female)": "#F06292", // Pembe
  "Idols (Male)": "#42A5F5", // Mavi
  Iyashikei: "#F0E68C", // Açık Sarı
  "Magical Sex Shift": "#FF69B4", // Pembe
  Medical: "#26A69A", // Yeşil
  Military: "#4B0082", // İndigo
  Mythology: "#9932CC", // Mor
  "Organized Crime": "#8B0000", // Kan Kırmızısı
  "Otaku Culture": "#607D8B", // Mavi Gri
  "Performing Arts": "#4CAF50", // Yeşil
  Pets: "#8D6E63", // Kahverengi
  Racing: "#4CAF50", // Yeşil
  Reincarnation: "#9932CC", // Mor
  "Reverse Harem": "#FFC0CB", // Pembe
  "Romantic Subtext": "#FFB6C1", // Açık Pembe
  Samurai: "#DC143C", // Kırmızı
  "School Club": "#00FF7F", // Neon Yeşili
  Showbiz: "#4CAF50", // Yeşil
  "Space Opera": "#0000CD", // Mavi
  "Strategy Game": "#FFD700", // Altın Sarısı
  Survival: "#FF5722", // Turuncu
  "Team Sports": "#32CD32", // Çimen Yeşili
  "Time Travel": "#00CED1", // Açık Mavi
  Vampire: "#800080", // Mor
  "Video Game": "#0000CD", // Mavi
  "Visual Arts": "#9C27B0", // Mor
  Workplace: "#F0E68C", // Açık Sarı
  "Adult Cast": "#FF69B4", // Pembe
  Anthropomorphic: "#8D6E63", // Kahverengi
  CGDCT: "#F06292", // Pembe
  Childcare: "#FF9E80", // Turuncu Pembe
  Cyberpunk: "#00BCD4", // Açık Mavi
  Demons: "#8B0000", // Kan Kırmızısı
  Erotica: "#FF69B4", // Pembe
  Gambling: "#FFD700", // Altın Sarısı
  "Gender Bending": "#FF69B4", // Pembe
  Henshin: "#FF69B4", // Pembe
  Loli: "#FF69B4", // Pembe
  "Martial Arts": "#32CD32", // Çimen Yeşili
  Moe: "#FF69B4", // Pembe
  "Monster Girls": "#9370DB", // Mor
  Necromancy: "#8B0000", // Kan Kırmızısı
  Noir: "#000000", // Siyah
  Revenge: "#00CED1", // Açık Mavi
  Robots: "#808080", // Metal Gri
  "Shoujo Ai": "#9370DB", // Mor
  "Shounen Ai": "#FFA07A", // Açık Somon
  Space: "#0000CD", // Mavi
  "Super Power": "#FFD700", // Altın Sarısı
  Tragedy: "#696969", // Gri
  "Urban Fantasy": "#9932CC", // Mor
  Witch: "#9932CC", // Mor
  Zombies: "#556B2F", // Yeşil Kahverengi

  // İngilizce türler (görselde görülen)
  Mystery: "#483D8B", // Mor Mavi (Gizem ile aynı)
  Suspense: "#808080", // Metal Gri (Gerilim ile aynı)
  Comedy: "#FF8C00", // Hardal Sarısı (Komedi ile aynı)
  Romance: "#FFB6C1", // Gül Rengi (Romantik ile aynı)
  Drama: "#696969", // Kurşuni Gri (Dram ile aynı)
  Supernatural: "#8A2BE2", // Bordo Mor (Doğaüstü ile aynı)
  Action: "#FFD700", // Altın Sarısı (Aksiyon ile aynı)
  Adventure: "#006400", // Orman Yeşili (Macera ile aynı)
  Fantasy: "#9932CC", // Şeftali Moru (Fantezi ile aynı)
  Horror: "#8B0000", // Kan Kırmızısı (Korku ile aynı)
  "Sci-Fi": "#00CED1", // Açık Mavi (Bilim Kurgu ile aynı)
  Sports: "#32CD32", // Çimen Yeşili (Spor ile aynı)
  Psychological: "#2F4F4F", // Teneke Gri (Psikolojik ile aynı)
  Ecchi: "#FF69B4", // Barbie Pembesi (Yetişkin ile aynı)
  Music: "#8B4513", // Ahşap Kahverengi (Müzik ile aynı)
  School: "#00FF7F", // Neon Yeşili (Okul ile aynı)
};
