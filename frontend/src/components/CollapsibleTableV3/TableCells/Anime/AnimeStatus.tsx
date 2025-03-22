import { TableCell } from "@mui/material";

export default function AnimeStatus(props: { status: string }) {
  return (
    <TableCell
      align="center"
      style={{
        color: props.status === "Finished" ? "#00B0F0" : "#FF0000",
      }}
    >
      {props.status}
    </TableCell>
  );
}
