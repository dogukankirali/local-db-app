import {
  InputLabel,
  Popover,
  Select,
  Box,
  FormControlLabel,
  Switch,
  MenuItem,
  FormControl,
  styled,
} from "@mui/material";
import { theme } from "../../theme/customTheme";
import { useState } from "react";

const StyledMenuItem = styled(MenuItem)({
  backgroundColor: theme.background,
  color: theme.input_text,
  "&:hover": {
    backgroundColor: theme.secondary,
    color: theme.input_text,
  },
  "&.Mui-selected": {
    backgroundColor: theme.secondary,
    color: theme.background,
    "&:hover": {
      backgroundColor: theme.secondary,
      color: theme.background,
    },
  },
});

const StyledSelectFormControl = styled(FormControl)({
  "& .MuiInputLabel-root": {
    color: theme.primary_text,
  },
  "& .MuiOutlinedInput-root": {
    "& fieldset": {
      borderColor: theme.input_border,
    },
    "&:hover fieldset": {
      borderColor: theme.input_border,
    },
    "&.Mui-focused fieldset": {
      borderColor: theme.secondary,
    },
  },
});

export const useTableSettings = (opts?: { extend?: boolean }) => {
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
      id="table-settings"
      open={isOpen}
      anchorEl={anchorElSettings}
      onClose={handleCloseSettings}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "left",
      }}
      sx={{
        "& .MuiPopover-paper": {
          backgroundColor: theme.background,
          overflow: "visible",
        },
      }}
    >
      <Box
        sx={{
          width: 300,
          m: 4,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          color: theme.primary_text,
        }}
      >
        <Box>
          <StyledSelectFormControl fullWidth>
            <InputLabel id="rows-per-page-label">Rows per Page</InputLabel>
            <Select
              size="small"
              labelId="rows-per-page-label"
              value={rowsPerPage}
              label="Rows Per Page"
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    backgroundColor: theme.background,
                  },
                },
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
