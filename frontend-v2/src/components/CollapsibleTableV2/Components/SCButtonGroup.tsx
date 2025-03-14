import Button from "@mui/material/Button";
import { theme } from "../../../theme/customTheme";
import { Utils } from "../Utils/Utilities";
import { Box } from "@mui/material";
import React from "react";

type Props = {
  cancelText?: React.ReactNode;
  confirmText?: React.ReactNode;
  handleCancel: () => void;
  handleConfirm: () => void;
  cancelDisabled?: boolean;
  confirmDisabled?: boolean;
};

export default function SCButtonGroup({
  cancelText = "Cancel",
  confirmText = "Save",
  handleCancel,
  handleConfirm,
  cancelDisabled,
  confirmDisabled,
}: Props) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 1,
      }}
    >
      <Button
        onClick={handleCancel}
        variant="outlined"
        sx={{
          color: theme.primary_text,
          borderColor: theme.input_border,
          borderRadius: "20px",
          textTransform: "none",
          "&:hover": {
            borderColor: theme.secondary_text,
            backgroundColor: "rgba(255, 255, 255, 0.05)",
          },
        }}
        disabled={cancelDisabled}
      >
        {cancelText}
      </Button>
      <Button
        onClick={handleConfirm}
        variant="contained"
        autoFocus
        disabled={confirmDisabled}
        sx={{
          bgcolor: theme.primary,
          color: "#FFFFFF",
          borderRadius: "20px",
          textTransform: "none",
          fontWeight: "500",
          ":hover": {
            bgcolor: Utils.ChangeColorAlpha(theme.primary, 0.8),
          },
        }}
      >
        {confirmText}
      </Button>
    </Box>
  );
}
