"use client";

// Kullanıcının izlemeye başlama/bitirme tarihi. Yalnızca düzenleme penceresinden değiştirilir
// (form ile birlikte /updateAnimeTable'a gider); detay kartı, tablo ve detay sayfası salt gösterir.
// 2000-01-01, mevcut kayıtlara geçişte yazılan "eski kayıt (tarih bilinmiyor)" işaretidir.

import { alpha } from "@mui/material/styles";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/tr";
import { palette } from "../../theme/customTheme";
import { Field, fieldBg, fieldBorder } from "../ui/FormControls";

export const OLD_RECORD_DATE = "2000-01-01";

/** "YYYY-MM-DD" → "07.10.2026"; boşsa "—", eski kayıt işaretiyse "Bilinmiyor" */
export function formatWatchDate(v?: string) {
  if (!v) return "—";
  if (v === OLD_RECORD_DATE) return "Bilinmiyor";
  const d = dayjs(v);
  return d.isValid() ? d.format("DD.MM.YYYY") : "—";
}

const pickerSx = {
  "& .MuiOutlinedInput-root": {
    minHeight: 40,
    borderRadius: "10px",
    fontSize: "0.9rem",
    backgroundColor: fieldBg,
    "& .MuiOutlinedInput-notchedOutline": { border: fieldBorder },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: alpha(palette.overlay, 0.14) },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { border: `1px solid ${alpha(palette.primary, 0.6)}` },
  },
};

/** Düzenleme formundaki iki tarih alanı; değişiklik `onChange` ile taslağa yazılır, Kaydet ile gider */
export default function WatchDateFields({
  startedAt,
  finishedAt,
  onChange,
  disabled,
}: {
  startedAt?: string;
  finishedAt?: string;
  onChange: (patch: { StartedAt?: string; FinishedAt?: string }) => void;
  disabled?: boolean;
}) {
  const field = (label: string, value: string | undefined, set: (v: string) => void, minDate?: string) => (
    <Field label={label} hint={value === OLD_RECORD_DATE ? "Eski kayıt, tarih bilinmiyor" : undefined}>
      <DatePicker
        value={value && value !== OLD_RECORD_DATE ? dayjs(value) : null}
        disabled={disabled}
        disableFuture
        minDate={minDate && minDate !== OLD_RECORD_DATE ? dayjs(minDate) : undefined}
        format="DD.MM.YYYY"
        onChange={(d: Dayjs | null) => {
          if (!d) set("");
          else if (d.isValid()) set(d.format("YYYY-MM-DD"));
        }}
        slotProps={{
          popper: { sx: { zIndex: 1600 } },
          textField: { size: "small", fullWidth: true, sx: pickerSx },
          field: { clearable: true, onClear: () => set("") } as any,
        }}
      />
    </Field>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="tr">
      {field("Başladım", startedAt, (v) => onChange({ StartedAt: v }))}
      {field("Bitirdim", finishedAt, (v) => onChange({ FinishedAt: v }), startedAt)}
    </LocalizationProvider>
  );
}
