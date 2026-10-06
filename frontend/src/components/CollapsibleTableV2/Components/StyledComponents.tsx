import { Utils } from "../Utils/Utilities";
import { theme as customTheme } from "../../../theme/customTheme";
import {
  FormControl,
  MenuItem,
  Switch,
  SwitchProps,
  TextField,
  styled,
  Button,
  ButtonProps,
  CheckboxProps,
  Checkbox,
  checkboxClasses,
  TooltipProps,
  Tooltip,
  tooltipClasses,
  inputClasses,
  inputLabelClasses,
  formHelperTextClasses,
} from "@mui/material";
import React from "react";

export const StyledTextField = styled(TextField)(() => {
  return {
    [`& .${inputLabelClasses.root}.${inputLabelClasses.focused}:not(.${inputLabelClasses.error})`]:
      {
        color: customTheme.scondary_button,
      },
    [`& .${inputClasses.formControl}:not(.${inputClasses.error})`]: {
      [`&.${inputClasses.focused} fieldset`]: {
        borderColor: customTheme.scondary_button,
      },
    },
    [`& .${formHelperTextClasses.root}`]: {
      position: "absolute",
      bottom: "-1.3rem",
      left: "-14px",
      fontSize: "0.8rem",
      fontWeight: 400,
      fontFamily: "Roboto, Arial, sans-serif",
    },
  };
});

export const StyledSelectFormControl = styled(FormControl)(() => {
  return {
    "& label.Mui-focused": {
      color: customTheme.scondary_button,
    },
    "& .MuiInput-underline:after": {
      borderBottomColor: "green",
    },
    "& .MuiOutlinedInput-root": {
      "&.Mui-focused fieldset": {
        borderColor: customTheme.scondary_button,
      },
    },
  };
});

export const StyledMenuItem = styled(MenuItem)(() => {
  return {
    // backgroundColor: theme.scondary_button,
    "&.Mui-selected": {
      backgroundColor: Utils.ChangeColorAlpha(customTheme.scondary_button, 0.9),
      color: customTheme.button_text,
    },
    "&.Mui-selected:hover": {
      backgroundColor: customTheme.scondary_button,
    },
  };
});

export const IOSSwitch = styled((props: SwitchProps) => (
  <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />
))(({ theme }) => {
  return {
    width: 42,
    height: 26,
    padding: 0,
    "& .MuiSwitch-switchBase": {
      padding: 0,
      margin: 2,
      transitionDuration: "300ms",
      "&.Mui-checked": {
        transform: "translateX(16px)",
        color: "#fff",
        "& + .MuiSwitch-track": {
          backgroundColor: customTheme.scondary_button,
          opacity: 1,
          border: 0,
        },
        "&.Mui-disabled + .MuiSwitch-track": {
          opacity: 0.5,
        },
      },
      "&.Mui-focusVisible .MuiSwitch-thumb": {
        color: "#33cf4d",
        border: "6px solid #fff",
      },
      "&.Mui-disabled .MuiSwitch-thumb": {
        color:
          theme.palette.mode === "light"
            ? theme.palette.grey[100]
            : theme.palette.grey[600],
      },
      "&.Mui-disabled + .MuiSwitch-track": {
        opacity: theme.palette.mode === "light" ? 0.7 : 0.3,
      },
    },
    "& .MuiSwitch-thumb": {
      boxSizing: "border-box",
      width: 22,
      height: 22,
    },
    "& .MuiSwitch-track": {
      borderRadius: 26 / 2,
      backgroundColor: theme.palette.mode === "light" ? "#E9E9EA" : "#39393D",
      opacity: 1,
      transition: theme.transitions.create(["background-color"], {
        duration: 500,
      }),
    },
  };
});

export const StyledMUIFilterButton = styled((props: ButtonProps) => (
  <Button variant="contained" {...props} />
))(() => {
  return {
    backgroundColor: "rgba(255,255,255,0.04)",
    color: customTheme.secondary_text,
    border: "1px solid rgba(255,255,255,0.06)",
    boxShadow: "none",
    borderRadius: 10,
    padding: 6,
    minWidth: 0,
    width: 38,
    height: 38,
    "&:hover": {
      backgroundColor: "rgba(255,255,255,0.08)",
      color: customTheme.primary_text,
      boxShadow: "none",
    },
  };
});

export const StyledTeaButton = styled((props: ButtonProps) => (
  <Button variant="contained" {...props} />
))(() => {
  return {
    fontFamily: "inherit",
    backgroundColor: customTheme.primary,
    color: "#FFFFFF",
    borderRadius: 10,
    textTransform: "none",
    fontWeight: 600,
    height: 38,
    paddingInline: 16,
    ":hover": {
      backgroundColor: customTheme.primary_button_sub,
    },
  };
});

interface StyledInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onEnter?: () => void;
}

export const StyledFormInput = React.forwardRef<
  HTMLInputElement,
  StyledInputProps
>(({ onEnter, onKeyDown, className, ...props }, ref) => (
  <input
    ref={ref}
    {...props}
    className={className}
    style={{
      background: "transparent",
      color: customTheme.primary_text,
      border: `1px solid ${customTheme.input_border}`,
      borderRadius: 10,
      padding: "8px 12px",
      ...props.style,
    }}
    placeholder="..."
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        onEnter?.();
      }
      onKeyDown?.(e);
    }}
  />
));

export const StyledNeutralButton = styled((props: ButtonProps) => (
  <Button variant="contained" {...props} />
))(() => {
  return {
    fontFamily: "inherit",
    backgroundColor: Utils.ChangeColorAlpha(customTheme.input_border, 0.4),
    color: customTheme.button_text,
    borderRadius: 10,
    textTransform: "none",
    ":hover": {
      backgroundColor: Utils.ChangeColorAlpha(customTheme.input_border, 0.7),
    },
  };
});

export const StyledDangerButton = styled((props: ButtonProps) => (
  <Button variant="contained" {...props} />
))(() => {
  return {
    fontFamily: "inherit",
    backgroundColor: customTheme.danger_alt,
    color: customTheme.button_text,
    borderRadius: 10,
    textTransform: "none",
    ":hover": {
      backgroundColor: Utils.ChangeColorAlpha(customTheme.danger_alt, 0.8),
    },
  };
});

export const StyledCustomButton = styled((props: ButtonProps) => (
  <Button variant="contained" {...props} />
))((props: { bg: string; text: string; radius?: number; hoverBg?: string }) => {
  return {
    fontFamily: "inherit",
    backgroundColor: props.bg,
    color: props.text,
    borderRadius: props.radius ?? 10,
    textTransform: "none",
    ":hover": {
      backgroundColor: props.hoverBg ?? Utils.ChangeColorAlpha(props.bg, 0.8),
    },
  };
});

export const StyledSwitch = styled((props: SwitchProps) => (
  <Switch focusVisibleClassName=".Mui-focusVisible" {...props} />
))(({ theme }) => {
  return {
    "& .MuiSwitch-switchBase": {
      "&.Mui-checked": {
        color: customTheme.scondary_button,
        "& + .MuiSwitch-track": {
          backgroundColor: Utils.ChangeColorAlpha(
            customTheme.scondary_button,
            0.7
          ),
        },
      },
      "&.Mui-focusVisible .MuiSwitch-thumb": {
        color: customTheme.scondary_button,
      },
      "&.Mui-disabled .MuiSwitch-thumb": {
        color:
          theme.palette.mode === "light"
            ? theme.palette.grey[100]
            : theme.palette.grey[600],
      },
      "&.Mui-disabled + .MuiSwitch-track": {
        opacity: theme.palette.mode === "light" ? 0.7 : 0.3,
      },
    },
    "& .MuiSwitch-track": {
      backgroundColor: customTheme.neutral80,
    },
  };
});

export const StyledCheckbox = styled((props: CheckboxProps) => (
  <Checkbox {...props} />
))(() => {
  return {
    [`&.${checkboxClasses.checked}`]: {
      color: customTheme.scondary_button,
    },
  };
});

export const StyledTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip
    {...props}
    arrow
    disableInteractive
    classes={{ popper: className }}
  />
))(({ theme }) => ({
  [`& .${tooltipClasses.arrow}`]: {
    color: theme.palette.common.black,
  },
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.common.black,
    fontSize: theme.typography.pxToRem(14),
  },
}));
