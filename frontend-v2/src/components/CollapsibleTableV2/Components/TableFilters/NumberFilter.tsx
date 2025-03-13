import React from "react";
import { HandleStateChange } from "./TableFilters";
import NumberInput from "../NumberInput";
import {
  ButtonGroup,
  ToggleButton,
  ToggleButtonGroup,
  ToggleButtonProps,
  toggleButtonClasses,
  toggleButtonGroupClasses,
} from "@mui/material";
import { theme } from "../../../../theme/customTheme";

type NumberFilterProps = {
  label: string;
  state: TEATable.NumberFilterType;
  handleStateChange: HandleStateChange;
  min?: number;
  max?: number;
};

const CustomToggleButton = ({
  index,
  ...props
}: ToggleButtonProps & {
  index?: number;
}) => {
  return (
    <ToggleButton
      sx={{
        px: 2,
        fontSize: 21,
        py: 0,
        borderRadius: index === 0 ? 0 : undefined,
        ["&." + toggleButtonClasses.selected]: {
          color: theme.button_text,
          backgroundColor: theme.scondary_button,
          "&:hover": {
            backgroundColor: theme.scondary_button,
          },
        },
      }}
      {...props}
    />
  );
};

export default function NumberFilter({
  label,
  state,
  handleStateChange,
  min,
  max,
}: NumberFilterProps) {
  return (
    <ButtonGroup
      sx={{
        width: "100%",
        [`& .${toggleButtonGroupClasses.grouped}`]: {
          borderColor: theme.input_border, // Normal border rengi
          "&:not(:first-of-type)": {
            // borderLeft: "none", // İlk düğme haricindekilerin sol sınırını kaldırmak için
          },
          "&:hover": {
            borderColor: theme.scondary_button, // Hover durumundaki border rengi
          },
          "&.Mui-selected": {
            borderColor: theme.scondary_button, // Seçili durumda border rengi
          },
        },
      }}
    >
      <NumberInput
        label={label}
        defaultValue={state.value ?? undefined}
        min={min}
        max={max}
        group
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
        setState={(val) => {
          handleStateChange({
            ...state,
            value: val === undefined ? null : val,
          });
        }}
      />
      <ToggleButtonGroup
        size="small"
        value={state.operand}
        onChange={(_, value) => {
          if (!["<", "=", ">"].includes(value)) return;
          handleStateChange({
            ...state,
            operand: value,
          });
        }}
        exclusive
      >
        <CustomToggleButton value="<" key="<" index={0}>
          {"<"}
        </CustomToggleButton>
        <CustomToggleButton value="=" key="=">
          {"="}
        </CustomToggleButton>

        <CustomToggleButton value=">" key=">">
          {">"}
        </CustomToggleButton>
      </ToggleButtonGroup>
    </ButtonGroup>
  );
}
