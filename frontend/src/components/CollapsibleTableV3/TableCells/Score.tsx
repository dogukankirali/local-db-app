import { colorScale } from "@/constants/Constants";
import {
  Box,
  CircularProgress,
  CircularProgressProps,
  TableCell,
  Typography,
} from "@mui/material";

function colorSetter(val: number) {
  if (val >= 0 && val < 10) {
    return colorScale["0-9"];
  } else if (val >= 10 && val < 20) {
    return colorScale["10-19"];
  } else if (val >= 10 && val < 30) {
    return colorScale["20-29"];
  } else if (val >= 10 && val < 40) {
    return colorScale["30-39"];
  } else if (val >= 10 && val < 50) {
    return colorScale["40-49"];
  } else if (val >= 10 && val < 60) {
    return colorScale["50-59"];
  } else if (val >= 10 && val < 70) {
    return colorScale["60-69"];
  } else if (val >= 10 && val < 80) {
    return colorScale["70-79"];
  } else if (val >= 10 && val < 90) {
    return colorScale["80-89"];
  } else if (val >= 10 && val < 100) {
    return colorScale["90-99"];
  } else {
    return colorScale["100"];
  }
}

function CircularProgressWithLabel(
  props: CircularProgressProps & { value: number }
) {
  return (
    <Box sx={{ position: "relative", display: "inline-flex" }}>
      <CircularProgress variant="determinate" {...props} />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: "absolute",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography
          variant="subtitle2"
          component="div"
          color={colorSetter(props.value)}
        >
          {props.value}
        </Typography>
      </Box>
    </Box>
  );
}

export default function Score(props: { score: number }) {
  return (
    <TableCell
      align="center"
      style={{
        color: "lightgray",
      }}
    >
      {props.score === -1 ? (
        "Unrated"
      ) : (
        <CircularProgressWithLabel
          variant="determinate"
          style={{
            color: colorSetter(props.score),
          }}
          value={props.score}
        />
      )}
    </TableCell>
  );
}
