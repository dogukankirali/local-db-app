import { Box, Typography } from "@mui/material";
import TableFilters from "../TableFilters/TableFilters";
import TableSettings from "../TableSettings";
import { StyledMUIFilterButton, StyledTeaButton } from "../StyledComponents";

import FilterAltIcon from "@mui/icons-material/FilterAlt";
import SettingsIcon from "@mui/icons-material/Settings";
import Constants from "../../../../constants/Constants";
import FileUpload from "../../../Common/FileUpload";

export default function TableHeaders(props: {
  genres: any;
  filterState: any;
  tableFilterProps: any;
  settingsProps: any;
  outerColumns: any;
  setOuterColumns: any;
  setCreateModalData: any;
  handleClickFilters: any;
  handleClickSettings: any;
  windowSize: any;
}) {
  return (
    <Box>
      {props.genres && (
        <TableFilters
          filterState={props.filterState}
          {...props.tableFilterProps}
        />
      )}
      <TableSettings
        {...props.settingsProps}
        headers={props.outerColumns}
        setHeaders={props.setOuterColumns}
        headerOpts={Constants({ type: "headers" })}
      />
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 2,
          mb: 2,
        }}
      >
        <StyledTeaButton
          onClick={() => {
            props.setCreateModalData({ status: true });
          }}
          sx={{ fontFamily: "inherit" }}
          color="primary"
        >
          <Typography variant="button">Create</Typography>
        </StyledTeaButton>
        <StyledMUIFilterButton onClick={props.handleClickFilters}>
          <FilterAltIcon />
        </StyledMUIFilterButton>
        <StyledMUIFilterButton onClick={props.handleClickSettings}>
          <SettingsIcon />
        </StyledMUIFilterButton>
      </Box>
    </Box>
  );
}
