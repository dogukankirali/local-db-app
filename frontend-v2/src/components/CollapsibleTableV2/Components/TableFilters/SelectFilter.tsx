import React from "react";
import { InputLabel, Select, SelectChangeEvent } from "@mui/material";
import { StyledMenuItem, StyledSelectFormControl } from "../StyledComponents";
import { HandleStateChange } from "./TableFilters";
import { theme } from "../../../../theme/customTheme";

type SelectFilterProps = {
  label: string;
  value: string;
  elKey: string;
  handleStateChange: HandleStateChange;
  options: string[];
};

export default function SelectFilter({
  label,
  value,
  elKey,
  handleStateChange,
  options,
}: SelectFilterProps) {
  const onChange = (e: SelectChangeEvent<string>) => {
    handleStateChange({ key: elKey, value: e.target.value });
  };

  return (
    <StyledSelectFormControl size="small" fullWidth>
      <InputLabel id={elKey + "_label"}>{label}</InputLabel>
      <Select
        labelId={elKey + "_label"}
        id={elKey}
        value={value}
        label={label}
        onChange={onChange}
        sx={{
          "& .MuiSelect-select": {
            color: theme.input_text, // Seçili öğe yazı rengi
          },
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: theme.input_border, // Seçili öğe border rengi
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: theme.secondary, // Odaklanmış durumda border rengi
          },
          "& .MuiMenuItem-root.Mui-selected": {
            backgroundColor: theme.secondary, // Seçili öğe arkaplan rengi
            color: theme.background, // Seçili öğe yazı rengi
          },
          "& .MuiMenuItem-root.Mui-selected:hover": {
            backgroundColor: theme.secondary, // Seçili öğe hover arkaplan rengi
            color: theme.background, // Seçili öğe hover yazı rengi
          },
        }}
      >
        <StyledMenuItem value="">All</StyledMenuItem>
        {options.map((option) => (
          <StyledMenuItem key={option} value={option}>
            {option}
          </StyledMenuItem>
        ))}
      </Select>
    </StyledSelectFormControl>
  );
}
