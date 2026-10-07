"use client";

// Kullanıcının izlemeye başlama/bitirme tarihi, takvimden seçilir ve hemen kaydedilir.
// 2000-01-01, mevcut kayıtlara geçişte yazılan "eski kayıt (tarih bilinmiyor)" işaretidir.

import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/tr";
import axios from "axios";
import { toast } from "sonner";
import { API_BASE } from "../../Services/http";
import { palette } from "../../theme/customTheme";
import { ANIME_DATA_CHANGED } from "./notesEvents";

export const OLD_RECORD_DATE = "2000-01-01";

export default function WatchDates({ animeId, startedAt, finishedAt, row = false }: { animeId: number; startedAt?: string; finishedAt?: string; row?: boolean }) {
  const [started, setStarted] = useState(startedAt ?? "");
  const [finished, setFinished] = useState(finishedAt ?? "");
  const [saving, setSaving] = useState(false);

  const save = async (next: { started: string; finished: string }) => {
    if (next.started && next.finished && next.finished < next.started) {
      toast.error("Bitiş tarihi başlamadan önce olamaz");
      return;
    }
    const prev = { started, finished };
    setStarted(next.started);
    setFinished(next.finished);
    setSaving(true);
    try {
      await axios.post(`${API_BASE}/myAnime/dates`, { ID: animeId, StartedAt: next.started, FinishedAt: next.finished });
      toast.success("Tarih kaydedildi");
      // Grid/tablo verisi yenilensin (pencere kapanıp açılınca yeni tarih görünsün)
      window.dispatchEvent(new Event(ANIME_DATA_CHANGED));
    } catch (err: any) {
      setStarted(prev.started);
      setFinished(prev.finished);
      toast.error(err?.response?.data?.message || "Tarih kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, value: string, onChange: (v: string) => void, minDate?: string) => (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <DatePicker
        label={label}
        value={value ? dayjs(value) : null}
        disabled={saving}
        disableFuture
        minDate={minDate && minDate !== OLD_RECORD_DATE ? dayjs(minDate) : undefined}
        format="DD.MM.YYYY"
        onAccept={(d: Dayjs | null) => onChange(d && d.isValid() ? d.format("YYYY-MM-DD") : "")}
        slotProps={{ popper: { sx: { zIndex: 1600 } }, textField: { size: "small", fullWidth: true }, field: { clearable: true, onClear: () => onChange("") } as any }}
      />
      {value === OLD_RECORD_DATE && <Typography sx={{ fontSize: "0.68rem", color: palette.textFaint, mt: 0.25 }}>Eski kayıt, tarih bilinmiyor</Typography>}
    </Box>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="tr">
      <Box sx={{ display: "grid", gap: 1.5, mt: row ? 0 : 2, gridTemplateColumns: row ? { xs: "1fr", sm: "repeat(2, minmax(0, 220px))" } : "1fr" }}>
        {field("Başladım", started, (v) => save({ started: v, finished }))}
        {field("Bitirdim", finished, (v) => save({ started, finished: v }), started)}
      </Box>
    </LocalizationProvider>
  );
}
