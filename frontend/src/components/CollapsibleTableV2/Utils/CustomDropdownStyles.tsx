import { theme } from "../../../theme/customTheme";

const useCustomStyles = () => {
  return {
    option: (provided: any) => ({
      ...provided,
      color: theme.primary_text,
    }),
    control: (provided: any) => ({
      ...provided,
      color: theme.primary_text,
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: theme.primary_text,
    }),
  };
};

export const useTeaSelectStyles = () => {
  return {
    control: (provided: any, state: any) => ({
      ...provided,
      color: theme.primary_text,
      backgroundColor: state.isFocused ? theme.table_header : "transparent",
      borderColor: state.isFocused
        ? theme.scondary_button
        : theme.secondary_text,
      boxShadow: state.isFocused
        ? `0 0 0 1px ${theme.scondary_button}`
        : "none",
      ":hover": {
        borderColor: state.isFocused
          ? theme.scondary_button
          : theme.input_border,
      },
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: theme.primary_text,
    }),
    input: (provided: any) => ({
      ...provided,
      color: theme.primary_text,
      ":hover": {
        cursor: "text",
      },
    }),
    menu: (provided: any) => ({
      ...provided,
      zIndex: 10,
      backgroundColor: theme.table_header,
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? theme.scondary_button : "transparent",
      color: state.isSelected ? theme.button_text : theme.primary_text,
      ":hover": {
        backgroundColor: state.isSelected
          ? theme.scondary_button
          : theme.foreground_alt,
      },
    }),
  };
};

export const useTeaSelectWTheme = () => {
  return {
    styles: {
      control: (provided: any, state: any) => ({
        ...provided,
        color: theme.primary_text,
        backgroundColor: state.isFocused ? theme.table_header : "transparent",
        borderColor: state.isFocused
          ? theme.scondary_button
          : theme.secondary_text,
        boxShadow: state.isFocused
          ? `0 0 0 1px ${theme.scondary_button}`
          : "none",
        ":hover": {
          borderColor: state.isFocused
            ? theme.scondary_button
            : theme.input_border,
        },
      }),
      singleValue: (provided: any) => ({
        ...provided,
        color: theme.primary_text,
      }),
      input: (provided: any) => ({
        ...provided,
        color: theme.primary_text,
        ":hover": {
          cursor: "text",
        },
      }),
      menu: (provided: any) => ({
        ...provided,
        zIndex: 10,
        backgroundColor: theme.table_header,
      }),
      option: (provided: any, state: any) => ({
        ...provided,
        backgroundColor: state.isSelected
          ? theme.scondary_button
          : "transparent",
        color: state.isSelected ? theme.button_text : theme.primary_text,
        ":hover": {
          backgroundColor: state.isSelected
            ? theme.scondary_button
            : theme.foreground_alt,
        },
      }),
    },
    theme: (themeT: any) => ({
      ...themeT,
      colors: {
        ...themeT.colors,
        primary25: theme.primary25,
        primary50: theme.primary50,
        primary: theme.primary_dropdown,
        neutral0: theme.neutral0,
        neutral80: theme.neutral80,
        neutral10: theme.neutral10,
        neutral5: theme.neutral5,
      },
    }),
  };
};

export default useCustomStyles;
