import { useState } from "react";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import { Box, Dialog, DialogTitle, Typography } from "@mui/material";
import { theme } from "../../theme/customTheme";
import Inner from "../CollapsibleTableV2/Components/Collapse/Inner";
import Type from "./TableCells/Anime/Type";
import AnimeStatus from "./TableCells/Anime/AnimeStatus";
import WatchStatus from "./TableCells/WatchStatus";

export default function CustomTableRow(props: TEATable.ICustomTableRowPropsV2) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Dialog
        open={open}
        onClose={() => setOpen(!open)}
        maxWidth="md"
        PaperProps={{ sx: { backgroundColor: theme.background } }}
        sx={{ "& .MuiDialog-paper": { width: "80%" } }}
      >
        <DialogTitle sx={{ color: theme.primary_text }}>
          {props.singleData && (
            <Typography variant="h5">
              {props.singleData.Name} - Details
            </Typography>
          )}
        </DialogTitle>
        {props.collapsible.isCollapsible && props.collapsible.inner?.type && (
          <Inner
            data={props.singleData}
            type={props.collapsible.inner.type}
            list={props.collapsible.inner.list}
            onUpdate={props.updateInnerCard}
            sortHeader={props.collapsible.inner.sortHeader}
            tableColumns={props.collapsible.inner.tableColumns}
            tableName={props.collapsible.inner.tableName}
            listType="detail"
          />
        )}
      </Dialog>

      <TableRow
        sx={{
          height: 58,
          backgroundColor:
            props.index! % 2 === 1
              ? theme.table_row_light
              : theme.table_row_dark,
        }}
      >
        {props.headers.map((header) => {
          const value = header.key as keyof typeof props.singleData;

          if (header.type === "tv-movie") {
            return <Type type={props.singleData[value]} />;
          }

          if (header.type === "status") {
            return <AnimeStatus status={props.singleData[value]} />;
          }

          if (header.type === "episode") {
            return (
              <WatchStatus
                episode={props.singleData[value]}
                total={props.singleData.TotalNumberOfEpisodes}
              />
            );
          }

          return (
            <TableCell align="center" sx={{ color: theme.primary_text }}>
              {props.singleData[value]}
            </TableCell>
          );
        })}
      </TableRow>
    </>
  );
}
