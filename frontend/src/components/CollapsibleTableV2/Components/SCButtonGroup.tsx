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
        variant="text"
        sx={{
          color: theme.button_text_alt,
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
          bgcolor: theme.scondary_button,
          color: theme.button_text,
          ":hover": {
            bgcolor: Utils.ChangeColorAlpha(theme.scondary_button, 0.8),
          },
        }}
      >
        {confirmText}
      </Button>
    </Box>
  );
}