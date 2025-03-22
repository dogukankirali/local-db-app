import React from "react";
import Select, { MultiValue } from "react-select";
import useCustomStyles from "../../Utils/CustomDropdownStyles";
import { theme } from "../../../../theme/customTheme";
import { HandleStateChange } from "./TableFilters";

type MultiSelectFilterProps = {
  label: string;
  value: string[];
  elKey: string;
  handleStateChange: HandleStateChange;
  options: {
    value: string;
    label: string;
  }[];
  style?: React.CSSProperties;
};

export default function MultiSelectFilter({
  label,
  value,
  elKey,
  handleStateChange,
  options,
  style,
}: MultiSelectFilterProps) {
  const customStyles = useCustomStyles();

  const onChange = (
    e: MultiValue<{
      value: string;
      label: string;
    }>
  ) => {
    const newValues = e.map((v) => v.value);
    handleStateChange({
      key: elKey,
      value: newValues,
    });
  };

  const properValue = value.map((v) => {
    const option = options.find((opt) => opt.value === v);
    return option ? { value: v, label: option.label } : { value: v, label: v };
  });

  const isSeries = elKey === "Series";

  return (
    <div style={style}>
      <Select
        isMulti
        placeholder={label}
        captureMenuScroll={false}
        options={options}
        styles={{
          ...customStyles,
          placeholder: (provided) => ({
            ...provided,
            color: theme.secondary_text,
            fontWeight: "400",
            fontSize: "1rem",
            lineHeight: "1.4375em",
          }),
          menu: (provided) => ({
            ...provided,
            zIndex: 10,
            width: isSeries ? "auto" : provided.width,
            minWidth: isSeries ? "250px" : provided.minWidth,
            backgroundColor: theme.background,
            border: `1px solid ${theme.input_border}`,
            borderRadius: "8px",
            boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.35)",
          }),
          menuList: (provided) => ({
            ...provided,
            maxHeight: isSeries ? "300px" : provided.maxHeight,
            padding: "8px",
          }),
          multiValue: (provided) => ({
            ...provided,
            maxWidth: isSeries ? "100%" : provided.maxWidth,
            overflow: "visible",
            backgroundColor: theme.primary,
            borderRadius: "4px",
          }),
          multiValueLabel: (provided) => ({
            ...provided,
            whiteSpace: isSeries ? "normal" : provided.whiteSpace,
            overflow: "visible",
            color: "#FFFFFF",
            fontWeight: "500",
          }),
          multiValueRemove: (provided) => ({
            ...provided,
            color: "#FFFFFF",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              color: "#FFFFFF",
            },
          }),
          valueContainer: (provided) => ({
            ...provided,
            flexWrap: "wrap",
            maxHeight: isSeries ? "100px" : provided.maxHeight,
            overflow: "auto",
            padding: "8px",
          }),
          control: (provided, state) => ({
            ...provided,
            color: theme.primary_text,
            backgroundColor: theme.input_background,
            borderColor: state.isFocused ? theme.primary : theme.input_border,
            boxShadow: state.isFocused ? `0 0 0 1px ${theme.primary}` : "none",
            borderRadius: "8px",
            minHeight: isSeries ? "50px" : provided.minHeight,
            ":hover": {
              borderColor: theme.primary,
            },
          }),
          input: (provided) => ({
            ...provided,
            color: theme.primary_text,
            ":hover": {
              cursor: "text",
            },
          }),
          option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected
              ? theme.primary
              : state.isFocused
              ? theme.input_background
              : "transparent",
            color: state.isSelected ? "#FFFFFF" : theme.primary_text,
            "&:hover": {
              backgroundColor: state.isSelected
                ? theme.primary
                : theme.input_background,
              opacity: state.isSelected ? 0.9 : 1,
            },
          }),
        }}
        value={properValue}
        theme={(t) => ({
          ...t,
          colors: {
            ...t.colors,
            primary25: theme.primary25,
            primary50: theme.primary50,
            primary: theme.primary,
            neutral0: theme.neutral0,
            neutral80: theme.neutral80,
            neutral10: theme.neutral10,
            neutral5: theme.neutral5,
          },
        })}
        onChange={onChange}
      />
    </div>
  );
}
