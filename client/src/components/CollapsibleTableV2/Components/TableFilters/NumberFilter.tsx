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
        [toggleButtonGroupClasses.grouped]: {
          "&:not(:first-of-type)": {
            // borderLeft: "none",
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
