import { Popover, Box } from "@mui/material";
import { useState } from "react";
import InputFilter from "./InputFilter";
import SelectFilter from "./SelectFilter";
import MultiSelectFilter from "./MultiSelectFilter";
import SCButtonGroup from "../SCButtonGroup";
import NumberFilter from "./NumberFilter";
import React from "react";

type FilterElementProps =
  | {
      type: "single-select";
      options: string[];
    }
  | {
      type: "input";
      options?: never;
    }
  | {
      type: "multi-select";
      options: {
        label: string;
        value: string;
      }[];
    }
  | {
      type: "number";
      options?: {
        min?: number;
        max?: number;
      };
    };

export type FilterStateProp = {
  label: string;
  key: string;
} & FilterElementProps;

export type FilterState = TEATable.IFilterType;

export type HandleStateChange = (newState: FilterState) => void;

type TemporaryProps = {
  anchorEl: HTMLButtonElement | null;
  setAnchorEl: React.Dispatch<React.SetStateAction<HTMLButtonElement | null>>;
  filterElements: FilterStateProp[];
  filterState: FilterState[];
  setFilterState: React.Dispatch<React.SetStateAction<FilterState[]>>;
};

function createFilterState(opts: FilterStateProp[]): FilterState[] {
  const result: FilterState[] = [];
  opts.forEach((opt) => {
    if (opt.type === "number") {
      result.push({
        key: opt.key,
        value: null,
        operand: "<",
      });
      return;
    }
    result.push({
      key: opt.key,
      value: opt.type === "multi-select" ? [] : "",
    });
  });
  return result;
}

export const useTableFilters = (filterElements: FilterStateProp[]) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [filterState, setFilterState] = useState<FilterState[]>(
    createFilterState(filterElements)
  );

  const handleClickFilters = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  return {
    handleClickFilters,
    filterState,
    filterElements,
    anchorEl,
    setAnchorEl,
    setFilterState,
  };
};

export const combineFilters = (
  base: TEATable.IFilterType[],
  extend: FilterState[]
): TEATable.IFilterType[] => {
  const result: TEATable.IFilterType[] = [];
  const filledExtend = getFilledFilters(extend);
  if (base.length === 0) {
    return filledExtend;
  }
  if (filledExtend.length === 0) {
    return base;
  }
  base.forEach((b) => {
    const found = filledExtend.find((f) => f.key === b.key);
    if (found) {
      result.push(found);
    } else {
      result.push(b);
    }
  });
  filledExtend.forEach((f) => {
    const found = base.find((b) => b.key === f.key);
    if (!found) {
      result.push(f);
    }
  });
  return result;
};

export const getFilledFilters = (
  filterState: FilterState[]
): TEATable.IFilterType[] => {
  const filledFilters = filterState.filter((f) => {
    if (Array.isArray(f.value)) {
      return f.value.length > 0;
    }
    return f.value !== "" && f.value !== null;
  }) as TEATable.IFilterType[];
  return filledFilters;
};

export default function TableSettings({
  anchorEl,
  setAnchorEl,
  filterElements,
  filterState,
  setFilterState,
}: TemporaryProps) {
  const [localFilters, setLocalFilters] = useState(filterState);
  // const intl = useIntl();

  const handleClose = () => {
    setAnchorEl(null);
    setLocalFilters(filterState);
  };

  const handleStateChange: HandleStateChange = (newState) => {
    setLocalFilters((prev) =>
      prev.map((f) => {
        if (f.key === newState.key) {
          return newState;
        }
        return f;
      })
    );
  };

  const applyFilters = () => {
    setFilterState(localFilters);
    setAnchorEl(null);
  };

  const clearFilters = () => {
    const newFilters = createFilterState(filterElements);
    setLocalFilters(newFilters);
    setFilterState(newFilters);
    setAnchorEl(null);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      applyFilters();
    }
  };

  const isOpen = Boolean(anchorEl);

  return (
    <Popover
      id="table-filters"
      open={isOpen}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "left",
      }}
      sx={{
        "& .MuiPopover-paper": {
          overflow: "visible",
        },
      }}
    >
      <Box
        sx={{
          width: 300,
          m: 4,
          mb: 2,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {filterElements.map((element, index) => {
          if (element.type === "input") {
            return (
              <InputFilter
                label={element.label}
                elKey={element.key}
                value={localFilters[index].value as string}
                handleStateChange={handleStateChange}
                onKeyDown={onKeyDown}
              />
            );
          }
          if (element.type === "single-select") {
            return (
              <SelectFilter
                label={element.label}
                elKey={element.key}
                value={localFilters[index].value as string}
                handleStateChange={handleStateChange}
                options={element.options}
              />
            );
          }
          if (element.type === "multi-select") {
            return (
              <MultiSelectFilter
                label={element.label}
                elKey={element.key}
                value={localFilters[index].value as string[]}
                handleStateChange={handleStateChange}
                options={element.options}
              />
            );
          }
          if (element.type === "number") {
            return (
              <NumberFilter
                label={element.label}
                state={localFilters[index] as TEATable.NumberFilterType}
                handleStateChange={handleStateChange}
                min={element.options?.min}
                max={element.options?.max}
              />
            );
          }
          return null;
        })}
        <SCButtonGroup
          cancelText="Reset"
          confirmText="Apply"
          handleCancel={clearFilters}
          handleConfirm={applyFilters}
        />
      </Box>
    </Popover>
  );
}
