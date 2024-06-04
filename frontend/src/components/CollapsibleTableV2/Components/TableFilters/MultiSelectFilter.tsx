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
};

export default function MultiSelectFilter({
  label,
  value,
  elKey,
  handleStateChange,
  options,
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

  const properValue = value.map((v) => ({ value: v, label: v }));

  return (
    <div>
      <Select
        isMulti
        placeholder={label}
        // components={{
        //   MenuList,
        // }}
        captureMenuScroll={false}
        options={options}
        styles={{
          ...customStyles,
          placeholder: (provided) => ({
            ...provided,
            color: "rgba(255, 255, 255, 0.7)",
            fontWeight: "400",
            fontSize: "1rem",
            lineHeight: "1.4375em",
          }),
          // valueContainer: (provided) => ({}),
          control: (provided, state) => ({
            ...provided,
            color: theme.primary_text,
            backgroundColor: "transparent",
            borderColor: state.isFocused
              ? theme.scondary_button
              : theme.secondary_text,
            boxShadow: state.isFocused ? theme.scondary_button : "transparent",
            ":hover": {
              borderColor: state.isFocused
                ? theme.scondary_button
                : theme.input_border,
              boxShadowColor: state.isFocused
                ? theme.scondary_button
                : theme.input_border,
            },
            ":focus": {
              borderColor: theme.input_border,
              boxShadowColor: state.isFocused ? "red" : "transparent",
            },
          }),
          input: (provided) => ({
            ...provided,
            color: theme.primary_text,
            ":hover": {
              cursor: "text",
            },
          }),
          menu: (provided) => ({ ...provided, zIndex: 10 }),
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
        // defaultValue={}
        onChange={onChange}
      />
    </div>
  );
}
