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
import { useRef, useEffect } from "react";
import Select from "react-select";
import AsyncSelect from "react-select/async";
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
import EditIcon from "@mui/icons-material/Edit";

export default function InnerList({
  data,
  setData,
  list,
  wIcons,
  type,
}: TEATable.ICustomCollapseProps.NewList) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Veri değişikliklerini izle
  useEffect(() => {
    if (data) {
      console.log("InnerList - Veri değişti:", data);
    }
  }, [data]);

  // Veri değişikliklerini güncelleyen yardımcı fonksiyon
  const updateData = (key: string, value: any) => {
    if (!setData) return;

    console.log(`Alan değişti - ${key}:`, value);

    setData((prevState: any) => {
      const newData = {
        ...prevState,
        data: { ...prevState.data, [key]: value },
      };
      console.log("Güncellenmiş veri:", newData);
      return newData;
    });
  };

  const handleImageUpload = () => {
    const file = inputRef.current?.files?.[0];
    const reader = new FileReader();

    reader.onloadend = () => {
      const base64String = reader.result as string;
      updateData("Cover", base64String);
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
        gap: 2,
        p: 3,
        "@media (max-width: 600px)": {
          gridTemplateColumns: "1fr",
        },
      }}
    >
      {list.map((item: any) => (
        <ListItemButton
          key={item.key}
          disableRipple
          disableTouchRipple
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
            p: 2,
            borderRadius: 2,
            backgroundColor: theme.input_background,
            border: `1px solid ${theme.input_border}`,
            cursor: "default",
            "& > *": {
              width: "100%",
            },
            "&:hover": {
              backgroundColor: theme.input_background,
            },
            "&:active": {
              backgroundColor: theme.input_background,
            },
            "&:hover, &:focus, &:active": {
              backgroundColor: theme.input_background,
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              gap: 1,
              color: theme.primary_text,
              alignItems: "center",
            }}
          >
            {wIcons && (
              <ListItemIcon
                sx={{
                  minWidth: "auto",
                  color: theme.primary,
                }}
              >
                {item.icon}
              </ListItemIcon>
            )}
            <ListItemText
              primary={item.value}
              primaryTypographyProps={{
                fontWeight: "600",
                color: theme.primary_text,
              }}
            />
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
                disabled={
                  type === "delete" ||
                  type === "detail" ||
                  item.key === "SeriesName"
                }
                sx={{
                  width: "100%",
                  backgroundColor: "transparent",
                  "& .MuiInputBase-input": {
                    color: theme.primary_text,
                  },
                  "& .MuiInputLabel-root": {
                    color: theme.secondary_text,
                  },
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: theme.input_background,
                    borderRadius: "8px",
                    "& fieldset": {
                      borderColor: theme.input_border,
                    },
                    "&:hover fieldset": {
                      borderColor: theme.primary,
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: theme.primary,
                    },
                    "& .Mui-disabled": {
                      color: theme.primary_text,
                      "-webkit-text-fill-color": theme.primary_text,
                    },
                  },
                  "& .Mui-disabled": {
                    color: theme.primary_text,
                    "-webkit-text-fill-color": theme.primary_text,
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
                  disabled={type === "delete" || type === "detail"}
                  onChange={(e) => {
                    updateData(item.key, e.target.value);
                  }}
                  sx={{
                    backgroundColor: "transparent",
                    "& .MuiInputBase-input": {
                      color: theme.primary_text,
                    },
                    "& .MuiInputLabel-root": {
                      color: theme.secondary_text,
                    },
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: theme.input_background,
                      borderRadius: "8px 0 0 8px",
                      "& fieldset": {
                        borderColor: theme.input_border,
                      },
                      "&:hover fieldset": {
                        borderColor: theme.primary,
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: theme.primary,
                      },
                      "& .Mui-disabled": {
                        color: theme.primary_text,
                        "-webkit-text-fill-color": theme.primary_text,
                      },
                    },
                    "& .Mui-disabled": {
                      color: theme.primary_text,
                      "-webkit-text-fill-color": theme.primary_text,
                    },
                  }}
                />
                <StyledCustomButton
                  bg={theme.primary}
                  text="#FFFFFF"
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
                disabled={type === "delete" || type === "detail"}
                InputProps={{
                  onChange: (e) => {
                    try {
                      const newValue =
                        item.key === "MALScore"
                          ? parseFloat(e.target.value)
                          : e.target.value;
                      updateData(item.key, newValue);
                    } catch (error) {
                      console.error("Input değişikliği hatası:", error);
                    }
                  },
                  sx: {
                    borderRadius: "8px",
                  },
                }}
                id={item.key}
                defaultValue={data ? data![item.key as keyof typeof data] : ""}
                sx={{
                  backgroundColor: "transparent",
                  "& .MuiInputBase-input": {
                    color: theme.primary_text,
                  },
                  "& .MuiInputLabel-root": {
                    color: theme.secondary_text,
                  },
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: theme.input_background,
                    borderRadius: "8px",
                    "& fieldset": {
                      borderColor: theme.input_border,
                    },
                    "&:hover fieldset": {
                      borderColor: theme.primary,
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: theme.primary,
                    },
                    "& .Mui-disabled": {
                      color: theme.primary_text,
                      "-webkit-text-fill-color": theme.primary_text,
                    },
                  },
                  "& .Mui-disabled": {
                    color: theme.primary_text,
                    "-webkit-text-fill-color": theme.primary_text,
                  },
                }}
              />
            )}
            {item.type === "timezone" && (
              <StyledSelectFormControl size="small" fullWidth>
                <MaterialSelect
                  disabled={type === "delete" || type === "detail"}
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
                      sx: {
                        backgroundColor: theme.background,
                        color: theme.primary_text,
                        maxHeight: 450,
                        overflowY: "auto",
                        border: `1px solid ${theme.input_border}`,
                        borderRadius: "8px",
                        boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.35)",
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
                  }}
                  sx={{
                    "& .MuiSelect-select": {
                      color: theme.primary_text,
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: theme.input_border,
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: theme.primary,
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: theme.primary,
                    },
                    "& .MuiSvgIcon-root": {
                      color: theme.secondary_text,
                    },
                    "& .Mui-disabled": {
                      color: theme.primary_text,
                      "-webkit-text-fill-color": theme.primary_text,
                    },
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: theme.input_background,
                      borderRadius: "8px",
                      "& fieldset": {
                        borderColor: theme.input_border,
                      },
                      "&:hover fieldset": {
                        borderColor: theme.primary,
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: theme.primary,
                      },
                      "& .Mui-disabled": {
                        color: theme.primary_text,
                        "-webkit-text-fill-color": theme.primary_text,
                      },
                    },
                  }}
                >
                  {timezoneOptions.map((option) => (
                    <StyledMenuItem
                      key={String(option.value)}
                      value={String(option.value)}
                      sx={{
                        backgroundColor: "transparent",
                        color: theme.primary_text,
                        "&:hover": {
                          backgroundColor: theme.input_background,
                        },
                        "&.Mui-selected": {
                          backgroundColor: theme.primary,
                          color: "#FFFFFF",
                        },
                        "&.Mui-selected:hover": {
                          backgroundColor: theme.primary,
                          opacity: 0.9,
                        },
                      }}
                    >
                      {option.label}
                    </StyledMenuItem>
                  ))}
                </MaterialSelect>
              </StyledSelectFormControl>
            )}
            {item.type === "score" && (
              <StyledTextField
                disabled={type === "delete" || type === "detail"}
                fullWidth
                size="small"
                id={item.key}
                defaultValue={data ? data![item.key as keyof typeof data] : 0}
                onChange={(e) => {
                  // String değeri float'a dönüştür
                  const value = e.target.value;
                  if (/^\d*[.,]?\d*$/.test(value)) {
                    const normalizedValue = value.replace(",", ".");
                    const floatValue = parseFloat(normalizedValue);
                    updateData(item.key, floatValue);
                  }
                }}
                InputProps={{
                  type: "number",
                  inputProps: {
                    min: 0,
                    max: 10,
                    step: 0.1,
                  },
                  sx: {
                    "& input": {
                      "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button":
                        {
                          "-webkit-appearance": "none",
                          margin: 0,
                        },
                      "&[type=number]": {
                        "-moz-appearance": "textfield",
                      },
                    },
                  },
                }}
                sx={{
                  backgroundColor: "transparent",
                  "& .MuiInputBase-input": {
                    color: theme.primary_text,
                  },
                  "& .MuiInputLabel-root": {
                    color: theme.secondary_text,
                  },
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: theme.input_background,
                    borderRadius: "8px",
                    "& fieldset": {
                      borderColor: theme.input_border,
                    },
                    "&:hover fieldset": {
                      borderColor: theme.primary,
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: theme.primary,
                    },
                    "& .Mui-disabled": {
                      color: theme.primary_text,
                      "-webkit-text-fill-color": theme.primary_text,
                    },
                  },
                  "& .Mui-disabled": {
                    color: theme.primary_text,
                    "-webkit-text-fill-color": theme.primary_text,
                  },
                }}
              />
            )}
            {item.type === "textarea" && (
              <StyledTextField
                disabled={type === "delete" || type === "detail"}
                fullWidth
                size="medium"
                id={item.key}
                defaultValue={data ? data[item.key as keyof typeof data] : ""}
                onChange={(e) => {
                  updateData(item.key, e.target.value);
                }}
                multiline
                rows={2}
                maxRows={4}
                sx={{
                  backgroundColor: "transparent",
                  "& .MuiInputBase-input": {
                    color: theme.primary_text,
                  },
                  "& .MuiInputLabel-root": {
                    color: theme.secondary_text,
                  },
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: theme.input_background,
                    borderRadius: "8px",
                    "& fieldset": {
                      borderColor: theme.input_border,
                    },
                    "&:hover fieldset": {
                      borderColor: theme.primary,
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: theme.primary,
                    },
                    "& .Mui-disabled": {
                      color: theme.primary_text,
                      "-webkit-text-fill-color": theme.primary_text,
                    },
                  },
                  "& .Mui-disabled": {
                    color: theme.primary_text,
                    "-webkit-text-fill-color": theme.primary_text,
                  },
                }}
              />
            )}
            {item.type === "number" && (
              <StyledTextField
                fullWidth
                disabled={type === "delete" || type === "detail"}
                size="small"
                value={data ? data[item.key as keyof typeof data] : 0}
                InputProps={{
                  onChange: (e) => {
                    // String değeri sayıya dönüştür
                    const numValue = parseInt(e.target.value);

                    // WatchStatus için özel kontrol
                    if (item.key === "WatchStatus" && data) {
                      const totalEpisodes =
                        typeof data["TotalNumberOfEpisodes"] === "number"
                          ? data["TotalNumberOfEpisodes"]
                          : parseInt(data["TotalNumberOfEpisodes"] as string) ||
                            0;

                      // Eğer girilen değer toplam bölüm sayısından büyükse, toplam bölüm sayısını kullan
                      if (numValue > totalEpisodes) {
                        updateData(item.key, totalEpisodes);
                        return;
                      }
                    }

                    updateData(item.key, numValue);
                  },
                  sx: {
                    borderRadius: "8px",
                    "& input": {
                      "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button":
                        {
                          "-webkit-appearance": "none",
                          margin: 0,
                        },
                      "&[type=number]": {
                        "-moz-appearance": "textfield",
                      },
                    },
                  },
                  type: "number",
                  inputProps: {
                    min: 0,
                    // WatchStatus için max değeri ayarla
                    ...(item.key === "WatchStatus" && data
                      ? {
                          max:
                            typeof data["TotalNumberOfEpisodes"] === "number"
                              ? data["TotalNumberOfEpisodes"]
                              : parseInt(
                                  data["TotalNumberOfEpisodes"] as string
                                ) || 0,
                        }
                      : {}),
                  },
                }}
                id={item.key}
                defaultValue={data ? data![item.key as keyof typeof data] : 0}
                sx={{
                  backgroundColor: "transparent",
                  "& .MuiInputBase-input": {
                    color: theme.primary_text,
                  },
                  "& .MuiInputLabel-root": {
                    color: theme.secondary_text,
                  },
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: theme.input_background,
                    borderRadius: "8px",
                    "& fieldset": {
                      borderColor: theme.input_border,
                    },
                    "&:hover fieldset": {
                      borderColor: theme.primary,
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: theme.primary,
                    },
                    "& .Mui-disabled": {
                      color: theme.primary_text,
                      "-webkit-text-fill-color": theme.primary_text,
                    },
                  },
                  "& .Mui-disabled": {
                    color: theme.primary_text,
                    "-webkit-text-fill-color": theme.primary_text,
                  },
                }}
              />
            )}
            {item.type === "float" && (
              <StyledTextField
                fullWidth
                disabled={type === "delete" || type === "detail"}
                size="small"
                value={data ? data[item.key as keyof typeof data] : 0}
                InputProps={{
                  onChange: (e: any) => {
                    const { value } = e.target;
                    if (/^\d*[.,]?\d*$/.test(value)) {
                      const normalizedValue = value.replace(",", ".");
                      // String'i float'a dönüştür
                      const floatValue = parseFloat(normalizedValue);
                      updateData(item.key, floatValue);
                    }
                  },
                  type: "number",
                  inputProps: {
                    min: 0,
                    max: 10,
                    step: 0.1,
                  },
                  sx: {
                    borderRadius: "8px",
                    "& input": {
                      "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button":
                        {
                          "-webkit-appearance": "none",
                          margin: 0,
                        },
                      "&[type=number]": {
                        "-moz-appearance": "textfield",
                      },
                    },
                  },
                }}
                id={item.key}
                defaultValue={data ? data![item.key as keyof typeof data] : 0}
                sx={{
                  backgroundColor: "transparent",
                  "& .MuiInputBase-input": {
                    color: theme.primary_text,
                  },
                  "& .MuiInputLabel-root": {
                    color: theme.secondary_text,
                  },
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: theme.input_background,
                    borderRadius: "8px",
                    "& fieldset": {
                      borderColor: theme.input_border,
                    },
                    "&:hover fieldset": {
                      borderColor: theme.primary,
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: theme.primary,
                    },
                    "& .Mui-disabled": {
                      color: theme.primary_text,
                      "-webkit-text-fill-color": theme.primary_text,
                    },
                  },
                  "& .Mui-disabled": {
                    color: theme.primary_text,
                    "-webkit-text-fill-color": theme.primary_text,
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
                            <Box sx={{ position: "relative" }}>
                              <img
                                key={data![
                                  item.key as keyof typeof data
                                ]?.toString()}
                                onClick={handleImageClick}
                                src={`${data![item.key as keyof typeof data]}`}
                                alt={data["Name"] + "_cover"}
                                style={{ width: 100 }}
                              />
                              <Box
                                sx={{
                                  position: "absolute",
                                  top: 5,
                                  right: 5,
                                  backgroundColor: theme.primary,
                                  borderRadius: "50%",
                                  padding: "4px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                }}
                              >
                                <EditIcon
                                  sx={{ fontSize: 16, color: "#FFFFFF" }}
                                />
                              </Box>
                            </Box>
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
                      position: "relative",
                    }}
                  >
                    <input
                      type="file"
                      ref={inputRef}
                      style={{ display: "none" }}
                      disabled={type === "delete" || type === "detail"}
                      onChange={handleImageUpload}
                    />
                    <Box sx={{ position: "relative" }}>
                      <img
                        onClick={
                          type !== "detail" ? handleImageClick : undefined
                        }
                        src={`${data![item.key as keyof typeof data]}`}
                        alt={data["Name"] + "_cover"}
                        style={{
                          width: 100,
                          cursor: type !== "detail" ? "pointer" : "default",
                        }}
                      />
                      {type === "update" && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: 5,
                            right: 5,
                            backgroundColor: theme.primary,
                            borderRadius: "50%",
                            padding: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                          }}
                        >
                          <EditIcon sx={{ fontSize: 16, color: "#FFFFFF" }} />
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}
              </>
            )}
            {item.type === "multi-select" && (
              <StyledSelectFormControl size="small" fullWidth>
                <Select
                  isMulti
                  isDisabled={type === "delete" || type === "detail"}
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
                    updateData(item.key, result);
                  }}
                  options={item.options}
                  styles={{
                    ...customStyles,
                    placeholder: (provided) => ({
                      ...provided,
                      color: theme.secondary_text,
                      fontWeight: "400",
                      fontSize: "1rem",
                      lineHeight: "1.4375em",
                    }),
                    menu: (provided) => ({
                      ...provided,
                      zIndex: 10,
                      backgroundColor: theme.background,
                      border: `1px solid ${theme.input_border}`,
                      borderRadius: "8px",
                      boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.35)",
                    }),
                    menuList: (provided) => ({
                      ...provided,
                      padding: "8px",
                    }),
                    multiValue: (provided) => ({
                      ...provided,
                      backgroundColor: theme.primary,
                      borderRadius: "4px",
                    }),
                    multiValueLabel: (provided) => ({
                      ...provided,
                      color: "#FFFFFF",
                      fontWeight: "500",
                    }),
                    multiValueRemove: (provided) => ({
                      ...provided,
                      color: "#FFFFFF",
                      "&:hover": {
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        color: "#FFFFFF",
                      },
                    }),
                    valueContainer: (provided) => ({
                      ...provided,
                      padding: "8px",
                    }),
                    control: (provided, state) => ({
                      ...provided,
                      color: theme.primary_text,
                      backgroundColor: theme.input_background,
                      borderColor: state.isFocused
                        ? theme.primary
                        : theme.input_border,
                      boxShadow: state.isFocused
                        ? `0 0 0 1px ${theme.primary}`
                        : "none",
                      borderRadius: "8px",
                      ":hover": {
                        borderColor: theme.primary,
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
                    option: (provided, state) => ({
                      ...provided,
                      backgroundColor: state.isSelected
                        ? theme.primary
                        : state.isFocused
                        ? theme.input_background
                        : "transparent",
                      color: state.isSelected ? "#FFFFFF" : theme.primary_text,
                      "&:hover": {
                        backgroundColor: state.isSelected
                          ? theme.primary
                          : theme.input_background,
                        opacity: state.isSelected ? 0.9 : 1,
                      },
                    }),
                  }}
                  theme={(t) => ({
                    ...t,
                    colors: {
                      ...t.colors,
                      primary25: theme.primary25,
                      primary50: theme.primary50,
                      primary: theme.primary,
                      neutral0: theme.input_background,
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
                  disabled={type === "delete" || type === "detail"}
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
                    updateData(item.key, e.target.value);
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        backgroundColor: theme.background,
                        color: theme.primary_text,
                        maxHeight: 450,
                        overflowY: "auto",
                        borderColor: theme.input_border,
                        border: `1px solid ${theme.input_border}`,
                        borderRadius: "8px",
                        boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.35)",
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
                        padding: 0,
                      },
                    },
                  }}
                  sx={{
                    "& .MuiSelect-select": {
                      color: theme.primary_text,
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: theme.input_border,
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: theme.primary,
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: theme.primary,
                    },
                    "& .MuiSvgIcon-root": {
                      color: theme.secondary_text,
                    },
                    "& .Mui-disabled": {
                      color: theme.primary_text,
                      "-webkit-text-fill-color": theme.primary_text,
                    },
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: theme.input_background,
                      borderRadius: "8px",
                      "& fieldset": {
                        borderColor: theme.input_border,
                      },
                      "&:hover fieldset": {
                        borderColor: theme.primary,
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: theme.primary,
                      },
                      "& .Mui-disabled": {
                        color: theme.primary_text,
                        "-webkit-text-fill-color": theme.primary_text,
                      },
                    },
                  }}
                >
                  {item.options.map((option: any) => (
                    <StyledMenuItem
                      key={String(option.key)}
                      value={option.key}
                      disabled={option.disabled}
                      sx={{
                        backgroundColor: "transparent",
                        color: theme.primary_text,
                        "&:hover": {
                          backgroundColor: theme.input_background,
                        },
                        "&.Mui-selected": {
                          backgroundColor: theme.primary,
                          color: "#FFFFFF",
                        },
                        "&.Mui-selected:hover": {
                          backgroundColor: theme.primary,
                          opacity: 0.9,
                        },
                      }}
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
            {item.type === "select-api" && (
              <StyledSelectFormControl size="small" fullWidth>
                <AsyncSelect
                  isDisabled={type === "delete" || type === "detail"}
                  value={
                    data && data[item.key as keyof typeof data]
                      ? {
                          value: data[item.key as keyof typeof data],
                          label: data["SeriesName"] || "Seçiniz",
                        }
                      : null
                  }
                  onChange={(selectedOption: any) => {
                    if (selectedOption) {
                      updateData(item.key, selectedOption.value);
                      // SeriesName alanını da güncelle
                      updateData("SeriesName", selectedOption.label);
                    } else {
                      updateData(item.key, null);
                      updateData("SeriesName", "");
                    }
                  }}
                  defaultOptions={true}
                  cacheOptions
                  loadOptions={async (inputValue) => {
                    try {
                      const { AnimeService } = await import(
                        "../../../../services/AnimeServices"
                      );
                      const series = await AnimeService.getSeries();
                      console.log("Yüklenen seriler:", series);

                      // Eğer arama metni varsa, filtreleme yap
                      if (inputValue) {
                        return series.filter((option: any) =>
                          option.label
                            .toLowerCase()
                            .includes(inputValue.toLowerCase())
                        );
                      }

                      return series;
                    } catch (error) {
                      console.error("Series yüklenirken hata:", error);
                      return [];
                    }
                  }}
                  styles={{
                    ...customStyles,
                    placeholder: (provided) => ({
                      ...provided,
                      color: theme.secondary_text,
                      fontWeight: "400",
                      fontSize: "1rem",
                      lineHeight: "1.4375em",
                    }),
                    menu: (provided) => ({
                      ...provided,
                      zIndex: 10,
                      backgroundColor: theme.background,
                      border: `1px solid ${theme.input_border}`,
                      borderRadius: "8px",
                      boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.35)",
                    }),
                    menuList: (provided) => ({
                      ...provided,
                      padding: "8px",
                    }),
                    container: (provided) => ({
                      ...provided,
                    }),
                    control: (provided, state) => ({
                      ...provided,
                      color: theme.primary_text,
                      backgroundColor: theme.input_background,
                      borderColor: state.isFocused
                        ? theme.primary
                        : theme.input_border,
                      boxShadow: state.isFocused
                        ? `0 0 0 1px ${theme.primary}`
                        : "none",
                      borderRadius: "8px",
                      ":hover": {
                        borderColor: theme.primary,
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
                    option: (provided, state) => ({
                      ...provided,
                      backgroundColor: state.isSelected
                        ? theme.primary
                        : state.isFocused
                        ? theme.input_background
                        : "transparent",
                      color: state.isSelected ? "#FFFFFF" : theme.primary_text,
                      "&:hover": {
                        backgroundColor: state.isSelected
                          ? theme.primary
                          : theme.input_background,
                        opacity: state.isSelected ? 0.9 : 1,
                      },
                    }),
                  }}
                  theme={(t) => ({
                    ...t,
                    colors: {
                      ...t.colors,
                      primary25: theme.primary25,
                      primary50: theme.primary50,
                      primary: theme.primary,
                      neutral0: theme.input_background,
                      neutral80: theme.neutral80,
                      neutral10: theme.neutral10,
                      neutral5: theme.neutral5,
                    },
                  })}
                />
              </StyledSelectFormControl>
            )}
            {(item.type === "boolean" || item.type === "boolean-readOnly") && (
              <Box>
                <IOSSwitch
                  disabled={type === "delete" || type === "detail"}
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
                    updateData(item.key, e.target.checked);
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
