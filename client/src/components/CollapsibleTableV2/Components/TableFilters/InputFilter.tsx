import React from "react";
import { StyledTextField } from "../StyledComponents";
import { HandleStateChange } from "./TableFilters";

type InputFilterProps = {
  elKey: string;
  value: string;
  label: string;
  handleStateChange: HandleStateChange;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
};

export default function InputFilter({
  elKey,
  value,
  handleStateChange,
  label,
  onKeyDown,
}: InputFilterProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleStateChange({ key: elKey, value: event.target.value });
  };

  return (
    <StyledTextField
      id={elKey}
      label={label}
      variant="outlined"
      value={value}
      onChange={handleChange}
      onKeyDown={onKeyDown}
      size="small"
      fullWidth
    />
  );
}
