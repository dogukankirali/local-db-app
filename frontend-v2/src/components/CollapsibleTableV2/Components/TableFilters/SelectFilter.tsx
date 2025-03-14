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
      <InputLabel
        id={elKey + "_label"}
        sx={{
          color: theme.secondary_text,
          "&.Mui-focused": {
            color: theme.primary,
          },
        }}
      >
        {label}
      </InputLabel>
      <Select
        labelId={elKey + "_label"}
        id={elKey}
        value={value}
        label={label}
        onChange={onChange}
        sx={{
          backgroundColor: theme.input_background,
          borderRadius: "8px",
          "& .MuiSelect-select": {
            color: theme.primary_text,
          },
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: theme.input_border,
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: theme.primary,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: theme.primary,
          },
          "& .MuiSvgIcon-root": {
            color: theme.secondary_text,
          },
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              backgroundColor: theme.background,
              border: `1px solid ${theme.input_border}`,
              borderRadius: "8px",
              boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.35)",
            },
          },
        }}
      >
        <StyledMenuItem
          value=""
          sx={{
            color: theme.primary_text,
            "&:hover": {
              backgroundColor: theme.input_background,
            },
          }}
        >
          Tümü
        </StyledMenuItem>
        {options.map((option) => (
          <StyledMenuItem
            key={option}
            value={option}
            sx={{
              color: theme.primary_text,
              "&:hover": {
                backgroundColor: theme.input_background,
              },
              "&.Mui-selected": {
                backgroundColor: theme.primary,
                color: "#FFFFFF",
              },
              "&.Mui-selected:hover": {
                backgroundColor: theme.primary,
                opacity: 0.9,
              },
            }}
          >
            {option}
          </StyledMenuItem>
        ))}
      </Select>
    </StyledSelectFormControl>
  );
}
