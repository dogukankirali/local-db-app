import { Popover, Box, Button, IconButton, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useEffect, useState } from "react";
import InputFilter from "./InputFilter";
import SelectFilter from "./SelectFilter";
import MultiSelectFilter from "./MultiSelectFilter";
import ChipFilter from "./ChipFilter";
import NumberFilter from "./NumberFilter";
import React from "react";
import { palette } from "../../../../theme/customTheme";

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
    }
  | {
      // Az seçenekli alanlar: tıklanabilir chip'ler (exclusive: tek seçim)
      type: "chips";
      options: {
        label: string;
        value: string;
      }[];
      exclusive?: boolean;
    };

export type FilterStateProp = {
  label: string;
  key: string;
  style?: React.CSSProperties;
  // Panelde yarım genişlik (iki sütunlu yerleşim)
  half?: boolean;
} & FilterElementProps;

export type FilterState = TEATable.IFilterType;

export type HandleStateChange = (newState: FilterState) => void;

type TemporaryProps = {
  anchorEl: HTMLButtonElement | null;
  setAnchorEl: React.Dispatch<React.SetStateAction<HTMLButtonElement | null>>;
  filterElements: FilterStateProp[];
  filterState: FilterState[];
  setFilterState: React.Dispatch<React.SetStateAction<FilterState[]>>;
  onFilterChange?: () => void;
  // Filtrelerin altında gösterilen ek bölüm (ör. tablo görünümü ayarları); anında uygulanır
  extraSection?: React.ReactNode;
  extraSectionTitle?: string;
};

function createFilterState(opts: FilterStateProp[]): FilterState[] {
  const result: FilterState[] = [];
  opts.forEach((opt) => {
    if (opt.type === "number") {
      result.push({
        key: opt.key,
        value: null,
        operand: ">",
      });
      return;
    }
    result.push({
      key: opt.key,
      value: opt.type === "multi-select" || opt.type === "chips" ? [] : "",
    });
  });
  return result;
}

export const useTableFilters = (
  filterElements: FilterStateProp[],
  onFilterChange?: () => void
) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [filterState, setFilterState] = useState<FilterState[]>(
    createFilterState(filterElements)
  );

  const handleClickFilters = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  // Filtre durumu değiştiğinde callback'i çağıran özel bir setter
  const setFilterStateWithCallback = (
    newState: React.SetStateAction<FilterState[]>
  ) => {
    setFilterState(newState);
    if (onFilterChange) {
      onFilterChange();
    }
  };

  return {
    handleClickFilters,
    filterState,
    filterElements,
    anchorEl,
    setAnchorEl,
    setFilterState: setFilterStateWithCallback,
    onFilterChange,
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
  onFilterChange,
  extraSection,
  extraSectionTitle,
}: TemporaryProps) {
  const [localFilters, setLocalFilters] = useState(filterState);
  // Dışarıdan (tür chip'ine tıklama, üst bardaki arama) değişen filtreler panel açılınca görünsün
  useEffect(() => {
    if (anchorEl) setLocalFilters(filterState);
  }, [anchorEl, filterState]);

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

    if (onFilterChange) {
      onFilterChange();
    }
  };

  const clearFilters = () => {
    const newFilters = createFilterState(filterElements);
    setLocalFilters(newFilters);
    setFilterState(newFilters);
    setAnchorEl(null);

    if (onFilterChange) {
      onFilterChange();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      applyFilters();
    }
  };

  const isOpen = Boolean(anchorEl);
  const activeCount = getFilledFilters(localFilters).length;

  const renderControl = (element: FilterStateProp, index: number) => {
    const state = localFilters[index];
    if (!state) return null;
    switch (element.type) {
      case "input":
        return (
          <InputFilter
            label={element.label}
            elKey={element.key}
            value={state.value as string}
            handleStateChange={handleStateChange}
            onKeyDown={onKeyDown}
          />
        );
      case "single-select":
        return (
          <SelectFilter
            label={element.label}
            elKey={element.key}
            value={state.value as string}
            handleStateChange={handleStateChange}
            options={element.options}
          />
        );
      case "multi-select":
        return (
          <MultiSelectFilter
            label={`${element.label} seç…`}
            elKey={element.key}
            value={state.value as string[]}
            handleStateChange={handleStateChange}
            options={element.options}
          />
        );
      case "chips":
        return (
          <ChipFilter
            elKey={element.key}
            value={state.value as string[]}
            options={element.options}
            exclusive={element.exclusive}
            handleStateChange={handleStateChange}
          />
        );
      case "number":
        return (
          <NumberFilter
            label={element.label}
            state={state as TEATable.NumberFilterType}
            handleStateChange={handleStateChange}
            min={element.options?.min}
            max={element.options?.max}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Popover
      id="table-filters"
      open={isOpen}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      slotProps={{
        paper: {
          sx: {
            mt: 1,
            backgroundColor: palette.surface,
            backgroundImage: "none",
            boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
            borderRadius: "16px",
            border: `1px solid ${alpha(palette.overlay, 0.08)}`,
            overflow: "visible",
            width: { xs: "calc(100vw - 32px)", sm: 480 },
          },
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2.5, pt: 2, pb: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "1rem" }}>Filtreler</Typography>
          {activeCount > 0 && (
            <Box
              sx={{
                minWidth: 20,
                height: 20,
                px: 0.75,
                borderRadius: "10px",
                display: "grid",
                placeItems: "center",
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "#fff",
                backgroundColor: palette.primary,
              }}
            >
              {activeCount}
            </Box>
          )}
        </Box>
        <IconButton size="small" onClick={handleClose} aria-label="Kapat" sx={{ color: palette.textMuted }}>
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 2,
          px: 2.5,
          pb: 2.5,
          maxHeight: "min(70vh, 640px)",
          overflowY: "auto",
        }}
      >
        {filterElements.map((element, index) => {
          const control = renderControl(element, index);
          if (!control) return null;
          return (
            <Box key={element.key} sx={{ gridColumn: element.half ? "auto" : "1 / -1", minWidth: 0 }}>
              <Typography
                component="label"
                sx={{ display: "block", mb: 0.75, fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: palette.textMuted }}
              >
                {element.label}
              </Typography>
              {control}
            </Box>
          );
        })}
        {extraSection && (
          <Box sx={{ gridColumn: "1 / -1", pt: 2, mt: 0.5, borderTop: `1px solid ${alpha(palette.overlay, 0.06)}` }}>
            {extraSectionTitle && (
              <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", mb: 1.5 }}>{extraSectionTitle}</Typography>
            )}
            {extraSection}
          </Box>
        )}
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1,
          px: 2.5,
          py: 1.5,
          borderTop: `1px solid ${alpha(palette.overlay, 0.06)}`,
        }}
      >
        <Button onClick={clearFilters} sx={{ color: palette.textMuted }} disabled={activeCount === 0 && getFilledFilters(filterState).length === 0}>
          Tümünü temizle
        </Button>
        <Button variant="contained" onClick={applyFilters}>
          Uygula
        </Button>
      </Box>
    </Popover>
  );
}
