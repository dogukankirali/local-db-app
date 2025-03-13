import { TableCell } from "@mui/material";
import LocalMoviesIcon from "@mui/icons-material/LocalMovies";
import TvIcon from "@mui/icons-material/Tv";

export default function Type(props: { type: boolean }) {
  return props.type ? (
    <TableCell align="center" style={{ color: "green" }}>
      <LocalMoviesIcon />
    </TableCell>
  ) : (
    <TableCell align="center" style={{ color: "red" }}>
      <TvIcon />
    </TableCell>
  );
}
