import React from "react";
import { Box, InputBase } from "@mui/material";
import { alpha } from "@mui/material/styles";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { HandleStateChange } from "./TableFilters";
import { palette } from "../../../../theme/customTheme";

type InputFilterProps = {
  elKey: string;
  value: string;
  label: string;
  handleStateChange: HandleStateChange;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
};

export default function InputFilter({ elKey, value, handleStateChange, label, onKeyDown }: InputFilterProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        height: 38,
        px: 1.25,
        borderRadius: "10px",
        border: `1px solid ${alpha(palette.overlay, 0.08)}`,
        backgroundColor: alpha(palette.overlay, 0.03),
        "&:focus-within": { borderColor: alpha(palette.primary, 0.6) },
      }}
    >
      <SearchRoundedIcon sx={{ fontSize: 18, color: palette.textMuted }} />
      <InputBase
        id={elKey}
        value={value}
        onChange={(e) => handleStateChange({ key: elKey, value: e.target.value })}
        onKeyDown={onKeyDown}
        placeholder={`${label} içinde ara…`}
        inputProps={{ "aria-label": label }}
        sx={{ flex: 1, fontSize: "0.875rem", color: palette.text }}
        autoFocus
      />
    </Box>
  );
}
