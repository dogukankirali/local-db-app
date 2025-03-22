import {
  Box,
  LinearProgress,
  LinearProgressProps,
  TableCell,
  Typography,
} from "@mui/material";
import { theme } from "../../../theme/customTheme";
import { epScale } from "@/constants/Constants";

export default function WatchStatus(props: { episode: number; total: number }) {
  function LinearProgressWithLabel(
    props: LinearProgressProps & { value: number }
  ) {
    return (
      <Box>
        <Box sx={{ width: "100%", mt: 1 }}>
          <LinearProgress variant="determinate" {...props} />
        </Box>
        <Box
          sx={{ minWidth: 35, display: "grid", placeItems: "center", mt: 1 }}
        >
          <Typography variant="body2" color={theme.primary_text}>{`${Math.round(
            props.value
          )}%`}</Typography>
        </Box>
      </Box>
    );
  }

  function epSetter(val: number) {
    if (val === 0) {
      return epScale["0"];
    } else if (val >= 1 && val < 25) {
      return epScale["25"];
    } else if (val >= 25 && val < 50) {
      return epScale["50"];
    } else if (val >= 50 && val < 75) {
      return epScale["75"];
    } else {
      return epScale["100"];
    }
  }

  return (
    <TableCell align="center">
      {props.episode === -1 ? (
        <Typography sx={{ color: theme.primary_text }}>Finished</Typography>
      ) : (
        <>
          {props.episode !== -1 && (
            <Box sx={{ color: theme.primary_text }}>
              {props.episode} Episode(s)
            </Box>
          )}
        </>
      )}{" "}
      <Box sx={{ width: "100%" }}>
        {props.episode === -1 ? (
          <LinearProgressWithLabel
            sx={{
              "& .MuiLinearProgress-colorPrimary": {
                backgroundColor: "red",
              },
              "& .MuiLinearProgress-barColorPrimary": {
                backgroundColor: epSetter(100),
              },
            }}
            value={100}
          />
        ) : (
          <LinearProgressWithLabel
            sx={{
              "& .MuiLinearProgress-colorPrimary": {
                backgroundColor: "red",
              },
              "& .MuiLinearProgress-barColorPrimary": {
                backgroundColor: epSetter((props.episode * 100) / props.total),
              },
            }}
            value={(props.episode * 100) / props.total}
          />
        )}
      </Box>
    </TableCell>
  );
}
