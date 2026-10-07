import React from "react";
import { Box, InputBase } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { HandleStateChange } from "./TableFilters";
import { palette } from "../../../../theme/customTheme";

type NumberFilterProps = {
  label: string;
  state: TEATable.NumberFilterType;
  handleStateChange: HandleStateChange;
  min?: number;
  max?: number;
};

const OPERANDS: { value: "<" | "=" | ">"; label: string; title: string }[] = [
  { value: ">", label: ">", title: "Büyük" },
  { value: "=", label: "=", title: "Eşit" },
  { value: "<", label: "<", title: "Küçük" },
];

// Operatör (segment) + sayı girişi tek satırda
export default function NumberFilter({ label, state, handleStateChange, min, max }: NumberFilterProps) {
  const onValue = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") return handleStateChange({ ...state, value: null });
    let n = Number(raw);
    if (Number.isNaN(n)) return;
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    handleStateChange({ ...state, value: n });
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        height: 38,
        borderRadius: "10px",
        border: `1px solid ${alpha(palette.overlay, 0.08)}`,
        backgroundColor: alpha(palette.overlay, 0.03),
        overflow: "hidden",
        "&:focus-within": { borderColor: alpha(palette.primary, 0.6) },
      }}
    >
      <Box sx={{ display: "flex", p: "3px", gap: "2px" }}>
        {OPERANDS.map((op) => {
          const active = state.operand === op.value;
          return (
            <Box
              key={op.value}
              component="button"
              type="button"
              title={op.title}
              aria-label={`${label}: ${op.title}`}
              aria-pressed={active}
              onClick={() => handleStateChange({ ...state, operand: op.value })}
              sx={{
                width: 30,
                height: 30,
                border: 0,
                borderRadius: "7px",
                fontFamily: "inherit",
                fontSize: "0.9rem",
                fontWeight: 700,
                cursor: "pointer",
                color: active ? "#fff" : palette.textMuted,
                backgroundColor: active ? palette.primary : "transparent",
                "&:hover": { color: "#fff" },
              }}
            >
              {op.label}
            </Box>
          );
        })}
      </Box>
      <InputBase
        type="number"
        value={state.value ?? ""}
        onChange={onValue}
        placeholder={min !== undefined && max !== undefined ? `${min}–${max}` : "Değer"}
        inputProps={{ min, max, "aria-label": label }}
        sx={{ flex: 1, px: 1.25, fontSize: "0.875rem", color: palette.text, borderLeft: `1px solid ${alpha(palette.overlay, 0.08)}`, height: "100%" }}
      />
    </Box>
  );
}
