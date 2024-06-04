import React from "react";
import { StyledTextField, StyledTooltip } from "./StyledComponents";
import { SxProps, Theme } from "@mui/material";

type Props = {
  defaultValue?: string | number;
  setState: (val: number | undefined) => void;
  min?: number;
  max?: number;
  sx?: SxProps<Theme>;
  label?: string;
  info?: string;
  group?: boolean;
};

const NumberInput = ({
  setState,
  defaultValue,
  max,
  min,
  sx,
  label,
  info,
  group,
}: Props) => {
  return (
    <>
      <StyledTooltip title={info}>
        <StyledTextField
          label={label}
          sx={{
            width: "100%",
            ...sx,
          }}
          type="text"
          onKeyPress={(e) => {
            if (!/[0-9]/.test(e.key) && e.key !== "-") {
              e.preventDefault();
            }
          }}
          InputProps={
            group ? { sx: { borderRadius: "4px 0 0 4px" } } : undefined
          }
          defaultValue={defaultValue ? String(defaultValue) : ""}
          onChange={(e) => {
            if (!/^-?d+$/.test(e.target.value)) {
              e.target.value = e.target.value.replace(/[^0-9-]/g, "");
            }
          }}
          size="small"
          onBlur={(e) => {
            let val = e.target.value;
            val = `${val[0] === "-" ? "-" : ""}${val.replace(/-/g, "")}`;
            e.target.value = val;
            if (val === "" || val === "-") {
              setState(undefined);
              e.target.value = "";
              return;
            }
            if (min !== undefined && Number(val) < min) {
              setState(min);
              e.target.value = String(min);
              return;
            }
            if (max !== undefined && Number(val) > max) {
              setState(max);
              e.target.value = String(max);
              return;
            }
            setState(Number(val));
          }}
        />
      </StyledTooltip>
    </>
  );
};

export default NumberInput;