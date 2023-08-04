import {
  Box,
  ButtonGroup,
  CircularProgress,
  Input,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Select as MaterialSelect,
  Typography,
} from "@mui/material";
import moment from "moment-timezone";
import { theme } from "../../../../theme/customTheme";
import { languageOptions, timezoneOptions } from "./Common";
import { useEffect, useRef, useState } from "react";
import Select, { MultiValue } from "react-select";
import {
  IOSSwitch,
  StyledMenuItem,
  StyledSelectFormControl,
  StyledTextField,
  StyledCustomButton,
  StyledTooltip,
} from "../StyledComponents";
import { Utils } from "../../Utils/Utilities";
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

export default function InnerList({
  data,
  dataState,
  setDataState,
  list,
  wIcons,
}: TEATable.ICustomCollapseProps.List) {
  const [updating, setUpdating] = useState<boolean>(false);
  const [updateStatus, setUpdateStatus] = useState<
    [string, "success" | "error"] | null
  >(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const bgColor = {
    success: Utils.ChangeColorAlpha(theme.success_alt, 0.4),
    error: Utils.ChangeColorAlpha(theme.danger, 0.4),
  };

  const handleImageUpload = () => {
    const file = inputRef.current?.files?.[0];
    const reader = new FileReader();

    reader.onloadend = () => {
      const base64String = reader.result as string;
      setDataState!((prevState: any) => ({
        ...prevState,
        Cover: base64String,
      }))
    };

    reader.readAsDataURL(file as Blob);
  };

  console.log(data)

  const handleImageClick = () => {
    inputRef.current?.click();
  };

  useEffect(() => {
    setDataState(data)
  },[data])

  const getStrValue = (item: any) => {
    switch (item.type) {
      case "string":
        return data[item.key];
      case "timestamp":
        if (data[item.key])
          return moment(data[item.key]).format("DD/MM/YYYY - HH:mm:ss");
        else return "-";
      case "uptime":
        if (data[item.key])
          return moment
            .duration(data[item.key], "seconds")
            .format("D [D] H [H] m [M] s [S]");
        else return "-";
      default:
        return "-";
    }
  };

  const openInNewTab = (url: any) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <List
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 1,
        p: 3,
        "@media (max-width: 600px)": {
          gridTemplateColumns: "1fr",
        },
      }}
    >
      {updating && (
        <CircularProgress
          sx={{
            color: theme.scondary_button,
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 1,
          }}
        />
      )}
      {list.map((item: any) => (
        <ListItemButton
          disabled={updating}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
            p: 1,
            borderRadius: 2,
            backgroundColor:
              updateStatus?.[0] === item.key
                ? bgColor[updateStatus?.[1] as "success" | "error"]
                : Utils.ChangeColorAlpha(theme.foreground, 0.3),
            "&:hover, &:focus": {
              backgroundColor:
                updateStatus?.[0] === item.key
                  ? bgColor[updateStatus?.[1] as "success" | "error"]
                  : undefined,
            },
            "& > *": {
              width: "100%",
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              gap: 1,
              color: theme.input_text,
              alignItems: "center",
            }}
          >
            {wIcons && (
              <ListItemIcon
                sx={{
                  minWidth: "auto",
                }}
              >
                {item.icon}
              </ListItemIcon>
            )}
            <ListItemText primary={item.value} />
          </Box>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              height: "100%",
            }}
          >
            {["string", "uptime", "timestamp"].includes(item.type) && (
              <Input
                size="small"
                sx={{ width: "100%"}}
                defaultValue={getStrValue(item)}
                
              />
            )}
            {item.type === "link" && (
              <ButtonGroup
                sx={{
                  width: "100%",
                }}
              >
                <StyledTextField
                  fullWidth
                  size="small"
                  id={item.key}
                  defaultValue={data[item.key]}
                  onChange={(e) => {
                    setDataState!((prevState: any) => ({
                      ...prevState,
                      [item.key]: e.target.value,
                    }))
                  }}
                />
                <StyledCustomButton
                  bg={theme.scondary_button}
                  text={theme.button_text}
                  sx={{
                    borderRadius: "0px 5px 5px 0px"
                  }}
                  onClick={() => {
                    openInNewTab(dataState![item.key as keyof typeof dataState])
                  }}
                >
                  <Typography >
                    Open
                  </Typography>

                </StyledCustomButton>
              </ButtonGroup>
            )}
            {item.type === "input" && (
                <StyledTextField
                  fullWidth
                  size="small"
                  value={
                    dataState![item.key as keyof typeof dataState]
                  }
                  InputProps={{
                    onChange: (e) => {
                      setDataState!((prevState: any) => ({
                        ...prevState,
                        [item.key]: e.target.value,
                      }))
                    },
                    sx: {
                      borderRadius: "5px 0px 0px 5px",
                    },
                  }}
                  id={item.key}
                  defaultValue={dataState![item.key as keyof typeof dataState]}
                />
            )}
            {item.type === "timezone" && (
              <StyledSelectFormControl size="small" fullWidth>
                <MaterialSelect
                  value={
                    timezoneOptions.filter(
                      (opt) => opt.value === data[item.key]
                    )[0]?.value
                  }
                  onChange={(e) => {
                    if (!e.target.value) return;
                    console.log(e, "timezone")
                  }}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 450,
                        overflowY: "auto",
                      },
                    },
                  }}
                >
                  {timezoneOptions.map((option) => (
                    <StyledMenuItem
                      key={String(option.value)}
                      value={String(option.value)}
                    >
                      {option.label}
                    </StyledMenuItem>
                  ))}
                </MaterialSelect>
              </StyledSelectFormControl>
            )}
            {item.type === "score" && (
              <StyledTextField
              fullWidth
              size="small"
              id={item.key}
              defaultValue={dataState![item.key as keyof typeof dataState]}
              onChange={(e) => {
                setDataState!((prevState: any) => ({
                  ...prevState,
                  [item.key]: parseInt(e.target.value),
                }))
              }}
            />
            )}
            {item.type === "textarea" && (
                <StyledTextField
                  fullWidth
                  size="medium"
                  id={item.key}
                  defaultValue={dataState![item.key as keyof typeof dataState]}
                  onChange={(e) => {
                    setDataState!((prevState: any) => ({
                      ...prevState,
                      [item.key]: e.target.value,
                    }))
                  }}
                  multiline
                  rows={2}
                  maxRows={4}
                />
            )}
            {item.type === "number" && (
                <StyledTextField
                  fullWidth

                  size="small"
                  value={
                     dataState![item.key as keyof typeof dataState]
                  }
                  InputProps={{
                    onChange: (e) => {
                      setDataState!((prevState: any) => ({
                        ...prevState,
                        [item.key]: parseInt(e.target.value),
                      }))
                    },
                    sx: {
                      borderRadius: "5px 0px 0px 5px",
                    },
                    type: "number",
                    inputProps: {
                      min: 0
                    }

                  }}
                  id={item.key}
                  defaultValue={data[item.key]}
                />
            )}
            {item.type === "base64" && (
              <Box sx={{ display: "grid", placeItems: "center", width: "100%"}}><input type="file" ref={inputRef} style={{ display: 'none' }} onChange={handleImageUpload} /><img onClick={handleImageClick} src={`${dataState![item.key as keyof typeof dataState]}`} alt={data["Name"] + "_cover"} style={{ width: 100 }} /></Box>
            )}
            {item.type === "multi-select" && (
              <StyledSelectFormControl size="small" fullWidth>
                <Select
                  isMulti
                  value={
                    item.options.filter((option: { value: string, label: string }) => (dataState![item.key as keyof typeof dataState]! as string).split(", ").some((str: string) => str === option.value)) ?? []
                  }
                  onChange={(e) => {
                    const values = e.map((genre: any) => genre.value);
                    const result = values.join(", ");
                    setDataState!((prevState: any) => ({
                      ...prevState,
                      [item.key]: result,
                    }))
                  }}
                  options={item.options}
                  styles={{
                    placeholder: (provided) => ({
                      ...provided,
                      color: "rgba(255, 255, 255, 0.7)",
                      fontWeight: "400",
                      fontSize: "1rem",
                      lineHeight: "1.4375em",
                    }),
                    control: (provided, state) => ({
                      ...provided,
                      color: theme.primary_text,
                      backgroundColor: "transparent",
                      borderColor: state.isFocused
                        ? theme.scondary_button
                        : theme.secondary_text,
                      boxShadow: state.isFocused ? theme.scondary_button : "transparent",
                      ":hover": {
                        borderColor: state.isFocused
                          ? theme.scondary_button
                          : theme.input_border,
                        boxShadowColor: state.isFocused
                          ? theme.scondary_button
                          : theme.input_border,
                      },
                      ":focus": {
                        borderColor: theme.input_border,
                        boxShadowColor: state.isFocused ? "red" : "transparent",
                      },
                    }),
                    input: (provided) => ({
                      ...provided,
                      color: theme.primary_text,
                      ":hover": {
                        cursor: "text",
                      },
                    }),
                    menu: (provided) => ({ ...provided, zIndex: 10 }),
                  }}
                />
              </StyledSelectFormControl>
            )}
            {item.type === "select" && (
              <StyledSelectFormControl size="small" fullWidth>
                <MaterialSelect
                  value={
                    item.options.filter((option: { key: string, label: string }) => dataState![item.key as keyof typeof dataState] === option.key)[0].key
                    //{value: "deneme", label: "deneme"}
                  } 
                  onChange={(e) => {
                    setDataState!((prevState: any) => ({
                      ...prevState,
                      [item.key]: e.target.value,
                    })) 
                  }}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 450,
                        overflowY: "auto",
                      },
                    },
                  }}
                >
                  {item.options.map((option: any) => (
                    <StyledMenuItem
                      key={String(option.key)}
                      value={option.key}
                      disabled={option.disabled}
                    >
                      <StyledTooltip title={option.tooltip}>
                        <Box
                          sx={{
                            display: "flex",
                            gap: 0.5,
                            alignItems: "center",
                            width: "100%",
                          }}
                        >
                          {option.label}
                        </Box>
                      </StyledTooltip>
                    </StyledMenuItem>
                  ))}
                </MaterialSelect>
              </StyledSelectFormControl>
            )}
            {(item.type === "boolean" || item.type === "boolean-readOnly") && (
              <Box>
                <IOSSwitch
                  disabled={item.type === "boolean-readOnly"}
                  defaultChecked={data[item.key]}
                  sx={{
                    color: theme.scondary_button,
                    "&.Mui-checked": {
                      color: theme.scondary_button,
                    },
                    "&.Mui-checked + .MuiSwitch-track": {
                      backgroundColor: theme.scondary_button,
                    },
                  }}
                  onChange={(e) => {
                    setDataState!((prevState: any) => ({
                      ...prevState,
                      [item.key]: e.target.checked,
                    }))
                  }}
                />
              </Box>
            )}
            {item.type === "custom" &&
              item.custom &&
              item.custom(data, (type: "success" | "error") =>
                setUpdateStatus([item.key, type])
              )}

            {item?.right && item.right(data)}
          </Box>
        </ListItemButton>
      ))}
    </List>
  );
}
