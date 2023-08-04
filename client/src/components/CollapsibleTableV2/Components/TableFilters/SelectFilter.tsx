import React from "react";
import { InputLabel, Select, SelectChangeEvent } from "@mui/material";
import {
  StyledMenuItem,
  StyledSelectFormControl,
} from "../StyledComponents";
import { HandleStateChange } from "./TableFilters";

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
