import {
  Box,
  ButtonGroup,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Select as MaterialSelect,
  Typography,
} from "@mui/material";
import moment from "moment-timezone";
import { theme } from "../../../../theme/customTheme";
import { customStyles, timezoneOptions } from "./Common";
import { useRef } from "react";
import Select from "react-select";
import {
  IOSSwitch,
  StyledMenuItem,
  StyledSelectFormControl,
  StyledTextField,
  StyledCustomButton,
  StyledTooltip,
  StyledTeaButton,
} from "../StyledComponents";
import { Utils } from "../../Utils/Utilities";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

export default function InnerList({
  data,
  setData,
  list,
  wIcons,
  type,
}: TEATable.ICustomCollapseProps.NewList) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = () => {
    const file = inputRef.current?.files?.[0];
    const reader = new FileReader();

    reader.onloadend = () => {
      const base64String = reader.result as string;
      setData!((prevState: any) => ({
        ...prevState,
        data: { ...prevState.data, Cover: base64String },
      }));
    };

    reader.readAsDataURL(file as Blob);
  };

  const handleImageClick = () => {
    inputRef.current?.click();
  };

  const getStrValue = (item: any) => {
    switch (item.type) {
      case "string":
        return data[item.key as keyof typeof data] ?? "-";
      case "timestamp":
        if (data[item.key as keyof typeof data])
          return moment(data[item.key as keyof typeof data] as string).format(
            "DD/MM/YYYY - HH:mm:ss"
          );
        else return "-";
      default:
        return "-";
    }
  };

  const openInNewTab = (url: any) => {
    window.open(url, "_blank", "noopener,noreferrer");
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
      {list.map((item: any) => (
        <ListItemButton
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
            p: 1,
            borderRadius: 2,
            backgroundColor: Utils.ChangeColorAlpha(theme.foreground, 0.3),
            "& > *": {
              width: "100%",
            },
            "&:hover": {
              backgroundColor: Utils.ChangeColorAlpha(theme.foreground, 0.3), // Hover durumunda arka plan rengi değişmez
            },
            "&:active": {
              backgroundColor: Utils.ChangeColorAlpha(theme.foreground, 0.3), // Tıklama durumunda arka plan rengi değişmez
            },
            "&:hover, &:focus, &:active": {
              backgroundColor: Utils.ChangeColorAlpha(theme.foreground, 0.3), // Hover, tıklama ve odaklanma durumlarında arka plan rengi değişmez
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
              <StyledTextField
                size="small"
                defaultValue={getStrValue(item)}
                disabled={type === "delete"}
                sx={{
                  width: "100%",
                  backgroundColor: theme.background,
                  "& .MuiInputBase-input": {
                    color: theme.input_text, // Font rengi
                  },
                  "& .MuiInputLabel-root": {
                    color: theme.input_text, // Label rengi
                  },
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: theme.input_border, // Normal border rengi
                    },
                    "&:hover fieldset": {
                      borderColor: theme.input_border, // Hover'da border rengi
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: theme.input_border, // Odaklanmış durumda border rengi
                    },
                    "& .Mui-disabled": {
                      color: theme.input_text, // Disable durumu için font rengi
                      "-webkit-text-fill-color": theme.input_text, // Chrome'da disable durumunu düzgün göstermek için
                    },
                  },
                  "& .Mui-disabled": {
                    color: theme.input_text, // Disable durumu için font rengi
                    "-webkit-text-fill-color": theme.input_text, // Chrome'da disable durumunu düzgün göstermek için
                  },
                }}
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
                  defaultValue={data ? data[item.key as keyof typeof data] : ""}
                  disabled={type === "delete"}
                  onChange={(e) => {
                    setData!((prevState: any) => ({
                      ...prevState,
                      data: { ...prevState.data, [item.key]: e.target.value },
                    }));
                  }}
                  sx={{
                    backgroundColor: theme.background,
                    "& .MuiInputBase-input": {
                      color: theme.input_text, // Font rengi
                    },
                    "& .MuiInputLabel-root": {
                      color: theme.input_text, // Label rengi
                    },
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": {
                        borderColor: theme.input_border, // Normal border rengi
                      },
                      "&:hover fieldset": {
                        borderColor: theme.input_border, // Hover'da border rengi
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: theme.input_border, // Odaklanmış durumda border rengi
                      },
                      "& .Mui-disabled": {
                        color: theme.input_text, // Disable durumu için font rengi
                        "-webkit-text-fill-color": theme.input_text, // Chrome'da disable durumunu düzgün göstermek için
                      },
                    },
                    "& .Mui-disabled": {
                      color: theme.input_text, // Disable durumu için font rengi
                      "-webkit-text-fill-color": theme.input_text, // Chrome'da disable durumunu düzgün göstermek için
                    },
                  }}
                />
                <StyledCustomButton
                  bg={theme.scondary_button}
                  text={theme.button_text}
                  sx={{
                    borderRadius: "0px 5px 5px 0px",
                  }}
                  onClick={() => {
                    openInNewTab(data![item.key as keyof typeof data]);
                  }}
                >
                  <Typography>Open</Typography>
                </StyledCustomButton>
              </ButtonGroup>
            )}
            {item.type === "input" && (
              <StyledTextField
                fullWidth
                size="small"
                value={data ? data![item.key as keyof typeof data] : ""}
                disabled={type === "delete"}
                InputProps={{
                  onChange: (e) => {
                    try {
                      const newValue =
                        item.key === "MALScore"
                          ? parseFloat(e.target.value)
                          : e.target.value;
                      setData((prevState: any) => ({
                        ...prevState,
                        data: { ...prevState.data, [item.key]: newValue },
                      }));
                    } catch (error) {
                      console.error(error);
                    }
                  },
                  sx: {
                    borderRadius: "5px 0px 0px 5px",
                  },
                }}
                id={item.key}
                defaultValue={data ? data![item.key as keyof typeof data] : ""}
                sx={{
                  backgroundColor: theme.background,
                  "& .MuiInputBase-input": {
                    color: theme.input_text, // Font rengi
                  },
                  "& .MuiInputLabel-root": {
                    color: theme.input_text, // Label rengi
                  },
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: theme.input_border, // Normal border rengi
                    },
                    "&:hover fieldset": {
                      borderColor: theme.input_border, // Hover'da border rengi
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: theme.input_border, // Odaklanmış durumda border rengi
                    },
                    "& .Mui-disabled": {
                      color: theme.input_text, // Disable durumu için font rengi
                      "-webkit-text-fill-color": theme.input_text, // Chrome'da disable durumunu düzgün göstermek için
                    },
                  },
                  "& .Mui-disabled": {
                    color: theme.input_text, // Disable durumu için font rengi
                    "-webkit-text-fill-color": theme.input_text, // Chrome'da disable durumunu düzgün göstermek için
                  },
                }}
              />
            )}
            {item.type === "timezone" && (
              <StyledSelectFormControl size="small" fullWidth>
                <MaterialSelect
                  disabled={type === "delete"}
                  value={
                    timezoneOptions.filter(
                      (opt) => opt.value === data[item.key as keyof typeof data]
                    )[0]?.value
                  }
                  onChange={(e) => {
                    if (!e.target.value) return;
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
                disabled={type === "delete"}
                fullWidth
                size="small"
                id={item.key}
                defaultValue={data ? data![item.key as keyof typeof data] : 0}
                onChange={(e) => {
                  setData!((prevState: any) => ({
                    ...prevState,
                    data: {
                      ...prevState.data,
                      [item.key]: parseInt(e.target.value),
                    },
                  }));
                }}
                sx={{
                  backgroundColor: theme.background,
                  "& .MuiInputBase-input": {
                    color: theme.input_text, // Font rengi
                  },
                  "& .MuiInputLabel-root": {
                    color: theme.input_text, // Label rengi
                  },
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: theme.input_border, // Normal border rengi
                    },
                    "&:hover fieldset": {
                      borderColor: theme.input_border, // Hover'da border rengi
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: theme.input_border, // Odaklanmış durumda border rengi
                    },
                    "& .Mui-disabled": {
                      color: theme.input_text, // Disable durumu için font rengi
                      "-webkit-text-fill-color": theme.input_text, // Chrome'da disable durumunu düzgün göstermek için
                    },
                  },
                  "& .Mui-disabled": {
                    color: theme.input_text, // Disable durumu için font rengi
                    "-webkit-text-fill-color": theme.input_text, // Chrome'da disable durumunu düzgün göstermek için
                  },
                }}
              />
            )}
            {item.type === "textarea" && (
              <StyledTextField
                disabled={type === "delete"}
                fullWidth
                size="medium"
                id={item.key}
                defaultValue={data ? data[item.key as keyof typeof data] : ""}
                onChange={(e) => {
                  setData!((prevState: any) => ({
                    ...prevState,
                    data: { ...prevState.data, [item.key]: e.target.value },
                  }));
                }}
                multiline
                rows={2}
                maxRows={4}
                sx={{
                  backgroundColor: theme.background,
                  "& .MuiInputBase-input": {
                    color: theme.input_text, // Font rengi
                  },
                  "& .MuiInputLabel-root": {
                    color: theme.input_text, // Label rengi
                  },
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: theme.input_border, // Normal border rengi
                    },
                    "&:hover fieldset": {
                      borderColor: theme.input_border, // Hover'da border rengi
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: theme.input_border, // Odaklanmış durumda border rengi
                    },
                    "& .Mui-disabled": {
                      color: theme.input_text, // Disable durumu için font rengi
                      "-webkit-text-fill-color": theme.input_text, // Chrome'da disable durumunu düzgün göstermek için
                    },
                  },
                  "& .Mui-disabled": {
                    color: theme.input_text, // Disable durumu için font rengi
                    "-webkit-text-fill-color": theme.input_text, // Chrome'da disable durumunu düzgün göstermek için
                  },
                }}
              />
            )}
            {item.type === "number" && (
              <StyledTextField
                fullWidth
                disabled={type === "delete"}
                size="small"
                value={data ? data[item.key as keyof typeof data] : 0}
                InputProps={{
                  onChange: (e) => {
                    setData!((prevState: any) => ({
                      ...prevState,
                      data: {
                        ...prevState.data,
                        [item.key]: parseInt(e.target.value),
                      },
                    }));
                  },
                  sx: {
                    borderRadius: "5px 0px 0px 5px",
                  },
                  type: "number",
                  inputProps: {
                    min: 0,
                  },
                }}
                id={item.key}
                defaultValue={data ? data![item.key as keyof typeof data] : 0}
                sx={{
                  backgroundColor: theme.background,
                  "& .MuiInputBase-input": {
                    color: theme.input_text, // Font rengi
                  },
                  "& .MuiInputLabel-root": {
                    color: theme.input_text, // Label rengi
                  },
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: theme.input_border, // Normal border rengi
                    },
                    "&:hover fieldset": {
                      borderColor: theme.input_border, // Hover'da border rengi
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: theme.input_border, // Odaklanmış durumda border rengi
                    },
                    "& .Mui-disabled": {
                      color: theme.input_text, // Disable durumu için font rengi
                      "-webkit-text-fill-color": theme.input_text, // Chrome'da disable durumunu düzgün göstermek için
                    },
                  },
                  "& .Mui-disabled": {
                    color: theme.input_text, // Disable durumu için font rengi
                    "-webkit-text-fill-color": theme.input_text, // Chrome'da disable durumunu düzgün göstermek için
                  },
                }}
              />
            )}
            {item.type === "float" && (
              <StyledTextField
                fullWidth
                disabled={type === "delete"}
                size="small"
                value={data ? data[item.key as keyof typeof data] : 0}
                InputProps={{
                  onChange: (e: any) => {
                    const { value } = e.target;
                    if (/^\d*[.,]?\d*$/.test(value)) {
                      const normalizedValue = value.replace(",", ".");
                      setData((prevState: any) => ({
                        ...prevState,
                        data: {
                          ...prevState.data,
                          [item.key]: normalizedValue,
                        },
                      }));
                    }
                  },
                  sx: {
                    borderRadius: "5px 0px 0px 5px",
                  },
                }}
                id={item.key}
                defaultValue={data ? data![item.key as keyof typeof data] : 0}
                sx={{
                  backgroundColor: theme.background,
                  "& .MuiInputBase-input": {
                    color: theme.input_text, // Font rengi
                  },
                  "& .MuiInputLabel-root": {
                    color: theme.input_text, // Label rengi
                  },
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: theme.input_border, // Normal border rengi
                    },
                    "&:hover fieldset": {
                      borderColor: theme.input_border, // Hover'da border rengi
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: theme.input_border, // Odaklanmış durumda border rengi
                    },
                    "& .Mui-disabled": {
                      color: theme.input_text, // Disable durumu için font rengi
                      "-webkit-text-fill-color": theme.input_text, // Chrome'da disable durumunu düzgün göstermek için
                    },
                  },
                  "& .Mui-disabled": {
                    color: theme.input_text, // Disable durumu için font rengi
                    "-webkit-text-fill-color": theme.input_text, // Chrome'da disable durumunu düzgün göstermek için
                  },
                }}
              />
            )}
            {item.type === "base64" && (
              <>
                {type === "create" ? (
                  <>
                    <Box
                      sx={{
                        display: "grid",
                        placeItems: "center",
                        width: "100%",
                      }}
                    >
                      <input
                        type="file"
                        ref={inputRef}
                        style={{ display: "none" }}
                        onChange={handleImageUpload}
                      />
                      <>
                        {!data ||
                        (data !== undefined &&
                          !data![item.key as keyof typeof data]) ? (
                          <StyledTeaButton onClick={handleImageClick}>
                            <Typography variant="button">
                              Upload Cover Image
                            </Typography>
                          </StyledTeaButton>
                        ) : (
                          <></>
                        )}
                      </>
                      {data && (
                        <>
                          {data![item.key as keyof typeof data] && (
                            <img
                              key={data![
                                item.key as keyof typeof data
                              ]?.toString()}
                              onClick={handleImageClick}
                              src={`${data![item.key as keyof typeof data]}`}
                              alt={data["Name"] + "_cover"}
                              style={{ width: 100 }}
                            />
                          )}
                        </>
                      )}
                    </Box>
                  </>
                ) : (
                  <Box
                    sx={{
                      display: "grid",
                      placeItems: "center",
                      width: "100%",
                    }}
                  >
                    <input
                      type="file"
                      ref={inputRef}
                      style={{ display: "none" }}
                      disabled={type === "delete"}
                      onChange={handleImageUpload}
                    />
                    <img
                      onClick={handleImageClick}
                      src={`${data![item.key as keyof typeof data]}`}
                      alt={data["Name"] + "_cover"}
                      style={{ width: 100 }}
                    />
                  </Box>
                )}
              </>
            )}
            {item.type === "multi-select" && (
              <StyledSelectFormControl size="small" fullWidth>
                <Select
                  isMulti
                  isDisabled={type === "delete"}
                  value={
                    data
                      ? data[item.key as keyof typeof data]
                        ? item.options.filter(
                            (option: { value: string; label: string }) =>
                              (data![item.key as keyof typeof data]! as string)
                                .split(", ")
                                .some((str: string) => str === option.value)
                          ) ?? []
                        : []
                      : []
                  }
                  onChange={(e) => {
                    const values = e.map((genre: any) => genre.value);
                    const result = values.join(", ");
                    setData!((prevState: any) => ({
                      ...prevState,
                      data: { ...prevState.data, [item.key]: result },
                    }));
                  }}
                  options={item.options}
                  styles={{
                    ...customStyles,
                    placeholder: (provided) => ({
                      ...provided,
                      color: "rgba(255, 255, 255, 0.7)",
                      fontWeight: "400",
                      fontSize: "1rem",
                      lineHeight: "1.4375em",
                    }),
                    /* valueContainer: (provided) => ({
                      width: 400,
                    }), */
                    container: (provided) => ({
                      ...provided,
                    }),
                    control: (provided, state) => ({
                      ...provided,
                      color: theme.primary_text,
                      backgroundColor: "transparent",
                      borderColor: state.isFocused
                        ? theme.scondary_button
                        : theme.secondary_text,
                      boxShadow: state.isFocused
                        ? theme.scondary_button
                        : "transparent",
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
                      ":disabled": {
                        color: theme.primary_text,
                      },
                    }),
                    menu: (provided) => ({
                      ...provided,
                      zIndex: 10,
                    }),
                  }}
                  theme={(t) => ({
                    ...t,
                    colors: {
                      ...t.colors,
                      primary25: theme.primary25,
                      primary50: theme.primary50,
                      primary: theme.primary,
                      neutral0: theme.neutral0,
                      neutral80: theme.neutral80,
                      neutral10: theme.neutral10,
                      neutral5: theme.neutral5,
                    },
                  })}
                />
              </StyledSelectFormControl>
            )}
            {item.type === "select" && (
              <StyledSelectFormControl size="small" fullWidth>
                <MaterialSelect
                  disabled={type === "delete"}
                  value={
                    data
                      ? data[item.key as keyof typeof data]
                        ? item.options.filter(
                            (option: { key: string; label: string }) =>
                              data![item.key as keyof typeof data] ===
                              option.key
                          )[0].key
                        : item.options[0].key
                      : undefined
                  }
                  onChange={(e) => {
                    setData!((prevState: any) => ({
                      ...prevState,
                      data: { ...prevState.data, [item.key]: e.target.value },
                    }));
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        backgroundColor: theme.background, // Menü arka plan rengi
                        color: theme.input_text, // Menü yazı rengi
                        maxHeight: 450,
                        overflowY: "auto",
                        borderColor: theme.input_border,
                      },
                    },
                    anchorOrigin: {
                      vertical: "bottom",
                      horizontal: "left",
                    },
                    transformOrigin: {
                      vertical: "top",
                      horizontal: "left",
                    },
                    MenuListProps: {
                      sx: {
                        padding: 0, // Menü içeriği içindeki boşlukları kaldırır
                      },
                    },
                  }}
                  sx={{
                    "& .MuiSelect-select": {
                      color: theme.input_text, // Seçili öğe yazı rengi
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: theme.input_border, // Seçili öğe border rengi
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: theme.secondary, // Odaklanmış durumda border rengi
                    },
                    "& .MuiMenuItem-root.Mui-selected": {
                      backgroundColor: theme.secondary, // Seçili öğe arkaplan rengi
                      color: theme.background, // Seçili öğe yazı rengi
                    },
                    "& .MuiMenuItem-root.Mui-selected:hover": {
                      backgroundColor: theme.secondary, // Seçili öğe hover arkaplan rengi
                      color: theme.background, // Seçili öğe hover yazı rengi
                    },
                    "& .Mui-disabled": {
                      color: theme.input_text, // Disable durumu için font rengi
                      "-webkit-text-fill-color": theme.input_text, // Chrome'da disable durumunu düzgün göstermek için
                    },
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": {
                        borderColor: theme.input_border, // Normal border rengi
                      },
                      "&:hover fieldset": {
                        borderColor: theme.input_border, // Hover'da border rengi
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: theme.input_border, // Odaklanmış durumda border rengi
                      },
                      "& .Mui-disabled": {
                        color: theme.input_text, // Disable durumu için font rengi
                        "-webkit-text-fill-color": theme.input_text, // Chrome'da disable durumunu düzgün göstermek için
                      },
                    },
                  }}
                >
                  {item.options.map((option: any) => (
                    <StyledMenuItem
                      key={String(option.key)}
                      value={option.key}
                      disabled={option.disabled}
                      sx={{ backgroundColor: theme.background }}
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
                  disabled={type === "delete"}
                  //disabled={item.type === "boolean-readOnly"}
                  defaultChecked={
                    data
                      ? (data[item.key as keyof typeof data] as boolean)
                      : false
                  }
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
                    setData!((prevState: any) => ({
                      ...prevState,
                      data: { ...prevState.data, [item.key]: e.target.checked },
                    }));
                  }}
                />
              </Box>
            )}

            {item?.right && item.right(data)}
          </Box>
        </ListItemButton>
      ))}
    </List>
  );
}
