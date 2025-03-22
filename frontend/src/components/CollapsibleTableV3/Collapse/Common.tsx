import moment from "moment";
import React from "react";
import { components } from "react-select";

interface ISelectOption {
  value: string | boolean;
  label: string;
  selected?: boolean;
  disabled?: boolean;
}

export const InnerMap: Record<
  TEATable.InnerTypes,
  {
    table: boolean;
    list:
      | {
          show: true;
          icon?: boolean;
        }
      | false;
  }
> = {
  list: {
    table: false,
    list: {
      show: true,
    },
  },
  listWithIcons: {
    table: false,
    list: {
      show: true,
      icon: true,
    },
  },
  table: {
    table: true,
    list: false,
  },
  tableList: {
    table: true,
    list: {
      show: true,
    },
  },
  tableListWithIcons: {
    table: true,
    list: {
      show: true,
      icon: true,
    },
  },
} as const;

export const customStyles = {
  option: (provided: any, state: any) => ({
    ...provided,
    borderBottom: "1px dotted pink",
    borderColor: "black",
    padding: 20,
  }),
  control: () => ({
    // none of react-select's styles are passed to <Control />
    width: 200,
  }),
  singleValue: (provided: any, state: any) => {
    const opacity = state.isDisabled ? 0.5 : 1;
    const transition = "opacity 300ms";

    return { ...provided, opacity, transition };
  },
};

export const languageOptions = [
  { value: "english", label: "English" },
  { value: "french", label: "Française" },
];

export const timezoneOptions = moment.tz.names().map((item) => {
  return { value: item, label: item } as ISelectOption;
});

const { Option } = components;
export const IconOption = (props: any) => (
  <Option {...props}>
    {props.data.label === "English" ? (
      <>EN</>
    ) : (
      <>{props.data.value}</>
    )}
    <span> </span>
    {props.data.label}
  </Option>
);
