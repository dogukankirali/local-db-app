import React from "react";
import { StyledTextField } from "../StyledComponents";
import { HandleStateChange } from "./TableFilters";
import { theme } from "../../../../theme/customTheme";

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
      sx={{
        backgroundColor: "transparent",
        "& .MuiInputBase-input": {
          color: theme.primary_text,
        },
        "& .MuiInputLabel-root": {
          color: theme.secondary_text,
        },
        "& .MuiOutlinedInput-root": {
          backgroundColor: theme.input_background,
          borderRadius: "8px",
          "& fieldset": {
            borderColor: theme.input_border,
          },
          "&:hover fieldset": {
            borderColor: theme.primary,
          },
          "&.Mui-focused fieldset": {
            borderColor: theme.primary,
          },
        },
      }}
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
