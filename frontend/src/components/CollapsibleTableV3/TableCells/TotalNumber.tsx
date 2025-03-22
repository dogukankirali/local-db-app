import { TableCell } from "@mui/material";

export default function TotalNumber(props: { total: number }) {
  return <TableCell>{props.total}</TableCell>;
}
