"use client";

// Uygulama genelinde kullanılan sade form parçaları (filtre paneli ve modallarla aynı görünüm)
import React from "react";
import { Box, InputBase, InputBaseProps, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { palette } from "../../theme/customTheme";

export const fieldBorder = `1px solid ${alpha(palette.overlay, 0.08)}`;
export const fieldBg = alpha(palette.overlay, 0.03);

export function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1, mb: 0.75 }}>
      <Typography
        component="span"
        sx={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: palette.textMuted }}
      >
        {children}
      </Typography>
      {hint && <Typography component="span" sx={{ fontSize: "0.72rem", color: palette.textFaint }}>{hint}</Typography>}
    </Box>
  );
}

export function Field({ label, hint, children, sx }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode; sx?: object }) {
  return (
    <Box sx={{ minWidth: 0, ...sx }}>
      <FieldLabel hint={hint}>{label}</FieldLabel>
      {children}
    </Box>
  );
}

export const TextInput = React.forwardRef<HTMLInputElement, InputBaseProps & { endAdornmentNode?: React.ReactNode }>(
  function TextInput({ sx, endAdornmentNode, multiline, ...props }, ref) {
    return (
      <InputBase
        inputRef={ref}
        fullWidth
        multiline={multiline}
        endAdornment={endAdornmentNode}
        sx={{
          minHeight: 40,
          px: 1.5,
          py: multiline ? 1 : 0,
          borderRadius: "10px",
          fontSize: "0.9rem",
          color: palette.text,
          border: fieldBorder,
          backgroundColor: fieldBg,
          alignItems: multiline ? "flex-start" : "center",
          transition: "border-color .15s ease",
          "&:hover": { borderColor: alpha(palette.overlay, 0.14) },
          "&.Mui-focused": { borderColor: alpha(palette.primary, 0.6) },
          "&.Mui-disabled": { opacity: 0.6 },
          "& input[type=number]::-webkit-inner-spin-button": { opacity: 0.5 },
          ...sx,
        }}
        {...props}
      />
    );
  }
);

export function Segmented<T extends string | boolean>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <Box sx={{ display: "inline-flex", p: "3px", gap: "3px", borderRadius: "10px", border: fieldBorder, backgroundColor: fieldBg, height: 40, width: "100%" }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Box
            key={String(o.value)}
            component="button"
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            sx={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.75,
              border: 0,
              borderRadius: "7px",
              fontFamily: "inherit",
              fontSize: "0.82rem",
              fontWeight: active ? 600 : 500,
              cursor: disabled ? "default" : "pointer",
              color: active ? "#fff" : palette.textMuted,
              backgroundColor: active ? alpha(palette.primary, 0.85) : "transparent",
              transition: "background-color .15s ease, color .15s ease",
              "&:hover": disabled || active ? undefined : { color: palette.text },
              "& svg": { fontSize: 16 },
            }}
          >
            {o.label}
          </Box>
        );
      })}
    </Box>
  );
}
