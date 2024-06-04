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
import { Input as BSInput, InputProps as BSInputProps } from "reactstrap";
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
    backgroundColor: customTheme.input_background,
    color: customTheme.primary_text,
    borderRadius: "100%",
    padding: 6,
    minWidth: 0,
    aspectRatio: "1",
    "&:hover": {
      backgroundColor: customTheme.foreground_alt,
    },
  };
});

export const StyledTeaButton = styled((props: ButtonProps) => (
  <Button variant="contained" {...props} />
))(() => {
  return {
    fontFamily: "Work Sans",
    backgroundColor: customTheme.scondary_button,
    color: customTheme.button_text,
    borderRadius: 20,
    textTransform: "none",
    ":hover": {
      backgroundColor: Utils.ChangeColorAlpha(customTheme.scondary_button, 0.8),
    },
  };
});

export const StyledFormInput = styled(
  (
    props: BSInputProps & {
      onEnter?: () => void;
    }
  ) => (
    <BSInput
      placeholder="..."
      {...props}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          props.onEnter?.();
        }
        props.onKeyDown?.(e);
      }}
    />
  )
)(() => {
  return {
    backgroundColor: "transparent",
    color: customTheme.primary_text,
    border: "solid",
    borderColor: customTheme.secondary_text,
    borderWidth: 1,
    ":focus": {
      color: customTheme.primary_text,
      backgroundColor: customTheme.table_header,
      borderColor: customTheme.scondary_button,
      boxShadow: `0 0 0 1px ${customTheme.scondary_button}`,
    },
  };
});

export const StyledNeutralButton = styled((props: ButtonProps) => (
  <Button variant="contained" {...props} />
))(() => {
  return {
    fontFamily: "Work Sans",
    backgroundColor: Utils.ChangeColorAlpha(customTheme.input_border, 0.4),
    color: customTheme.button_text,
    borderRadius: 20,
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
    fontFamily: "Work Sans",
    backgroundColor: customTheme.danger_alt,
    color: customTheme.button_text,
    borderRadius: 20,
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
    fontFamily: "Work Sans",
    backgroundColor: props.bg,
    color: props.text,
    borderRadius: props.radius ?? 20,
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