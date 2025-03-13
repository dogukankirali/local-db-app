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
        backgroundColor: theme.background,
        "& .MuiInputBase-input": {
          color: theme.input_text, // Font rengi
        },
        "& .MuiInputLabel-root": {
          color: theme.input_text, // Label rengi
        },
        "& .MuiOutlinedInput-root": {
          "& fieldset": {
            borderColor: theme.input_border, // Normal border rengi
          },
          "&:hover fieldset": {
            borderColor: theme.input_border, // Hover'da border rengi
          },
          "&.Mui-focused fieldset": {
            borderColor: theme.input_border, // Odaklanmış durumda border rengi
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
