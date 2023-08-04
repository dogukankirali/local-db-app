import {
  InputLabel,
  Popover,
  Select,
  Box,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { theme } from '../../../theme/customTheme';
import { useIntl } from "react-intl";

import { useState } from "react";
import {
  StyledMenuItem,
  StyledSelectFormControl,
} from "./StyledComponents";

export const useTableSettings: TEATable.UseTableSettings = (opts) => {
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [extendTable, setExtendTable] = useState<boolean>(false);
  const [anchorElSettings, setAnchorElSettings] =
    useState<HTMLButtonElement | null>(null);

  const handleClickSettings = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorElSettings(event.currentTarget);
  };

  return {
    rowsPerPage,
    setRowsPerPage,
    anchorElSettings,
    setAnchorElSettings,
    handleClickSettings,
    ...(opts?.extend && { extendTable, setExtendTable }),
  };
};

export default function TableSettings({
  anchorElSettings,
  headerOpts,
  headers,
  rowsPerPage,
  setAnchorElSettings,
  setHeaders,
  setRowsPerPage,
  extendTable,
  setExtendTable,
}: TEATable.TableSettingsProps) {
  const isOpen = Boolean(anchorElSettings);

  const handleCloseSettings = () => {
    setAnchorElSettings(null);
  };

  return (
    <Popover
      id={"household"}
      open={isOpen}
      anchorEl={anchorElSettings}
      onClose={handleCloseSettings}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "left",
      }}
    >
      <Box
        sx={{
          width: 300,
          m: 4,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Box sx={{ zIndex: 2 }}>
          Columns
          {/* <CustomDropdown
            searchType={undefined}
            isMulti
            data={headerOpts.map((h) => ({
              value: h.value,
              label: h.value,
            }))}
            hasMore={true}
            itemLabel={"cID"}
            itemValue={"cID"}
            styles={{
              placeholder: (provided: any) => ({
                ...provided,
                color: "rgba(255, 255, 255, 0.7)",
                fontWeight: "400",
                fontSize: "1rem",
                lineHeight: "1.4375em",
              }),
              // valueContainer: (provided) => ({}),
              control: (provided: any, state: any) => ({
                ...provided,
                color: theme.primary_text,
                backgroundColor: "transparent",
                borderColor: state.isFocused
                  ? theme.scondary_button
                  : theme.secondary_text,
                boxShadow: state.isFocused
                  ? theme.scondary_button
                  : "transparent",
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
              input: (provided: any) => ({
                ...provided,
                color: theme.primary_text,
                ":hover": {
                  cursor: "text",
                },
              }),
              menu: (provided: any) => ({ ...provided, zIndex: 10 }),
            }}
            initialValue={headers.map((h) => ({
              value: h.value,
              label: h.value,
            }))}
            handleChange={(items: any[]) => {
              const result: TEATable.IColumnItem[] = [];
              items.forEach((item) => {
                headerOpts.forEach((h) => {
                  if (item.value === h.value) {
                    result.push(h);
                  }
                });
              });
              setHeaders(result);
            }}
          /> */}
        </Box>
        <Box>
          <StyledSelectFormControl fullWidth>
            <InputLabel id="demo-simple-select-label">
            Rows per Page
            </InputLabel>
            <Select
              size="small"
              labelId="demo-simple-select-label"
              id="demo-simple-select"
              value={rowsPerPage}
              label="Rows Per Page"
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
              }}
            >
              {[5, 10, 20, 50].map((item) => (
                <StyledMenuItem key={item} value={item}>
                  {item}
                </StyledMenuItem>
              ))}
            </Select>
          </StyledSelectFormControl>
        </Box>
        {setExtendTable && (
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={extendTable}
                  onChange={() => setExtendTable((prev) => !prev)}
                />
              }
              label="Show all rows"
            />
          </Box>
        )}
      </Box>
    </Popover>
  );
}
