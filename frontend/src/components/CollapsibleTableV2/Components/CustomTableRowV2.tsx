import { useState } from "react";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import DoneIcon from "@mui/icons-material/Done";
import ClearIcon from "@mui/icons-material/Clear";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  CircularProgressProps,
  Dialog,
  DialogTitle,
  IconButton,
  LinearProgress,
  LinearProgressProps,
  Popover,
  Typography,
  Collapse,
} from "@mui/material";
import moment from "moment-timezone";
import { theme } from "../../../theme/customTheme";
import Inner from "./Collapse/Inner";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import React from "react";
import LocalMoviesIcon from "@mui/icons-material/LocalMovies";
import TvIcon from "@mui/icons-material/Tv";
import { genreColors } from "../../../constants/Constants";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

// IColumnItem tipini genişleterek hide özelliğini ekleyelim
interface IExtendedColumnItem extends TEATable.IColumnItem {
  hide?: boolean;
}

export default function CustomTableRowV2(
  props: TEATable.ICustomTableRowPropsV2
) {
  const [open, setOpen] = useState(false);
  const [anchorElCover, setAnchorElCover] = React.useState<HTMLElement | null>(
    null
  );
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [popData, setPopData] = React.useState<string | null>(null);

  // headers'ı IExtendedColumnItem[] olarak belirtelim
  const headers = props.headers as IExtendedColumnItem[];
  const rowIndex = props.index || 0;

  const handlePopoverOpen = (
    event: React.MouseEvent<HTMLElement>,
    source: string
  ) => {
    if (source === "genre") {
      setPopData(event.currentTarget.childNodes[0].textContent);
      setAnchorEl(event.currentTarget);
    } else if (source === "cover") {
      setAnchorElCover(event.currentTarget);
    }
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
    setAnchorElCover(null);
  };

  const openAl = Boolean(anchorEl);
  const openAlCover = Boolean(anchorElCover);

  const epScale = {
    "0": "#FF0000", // Kırmızı
    "25": "#FF3200", // Turuncu
    "50": "#FF6500", // Sarı
    "75": "#00FF00", // Yeşil
    "100": "#00B0F0", // Mavi
  };

  const colorScale = {
    "0-9": "#FF0000", // Kırmızı
    "10-19": "#FF1900", // Turuncu Kırmızı
    "20-29": "#FF3200", // Turuncu
    "30-39": "#FF4C00", // Turuncu Sarı
    "40-49": "#FF6500", // Sarı
    "50-59": "#FF7F00", // Altın Sarısı
    "60-69": "#FF9800", // Portakal
    "70-79": "#FFB200", // Turuncu
    "80-89": "#FFDF00", // Sarı Yeşil
    "90-99": "#00FF00", // Yeşil
    "100": "#00B0F0", // Mavi
  };

  const colStyle = {
    // borderBottomColor: "gray",
  } as React.CSSProperties;

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

  const getFontColor = (bgColor: any) => {
    if (bgColor === undefined) return "black";
    // RGB renklerine dönüştürme
    const r = parseInt(bgColor.slice(1, 3), 16);
    const g = parseInt(bgColor.slice(3, 5), 16);
    const b = parseInt(bgColor.slice(5, 7), 16);

    // Parlaklık hesaplama
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

    // Parlaklığa göre font rengini belirleme
    return brightness > 128 ? "black" : "white";
  };

  return (
    <>
      {/* Dialog'u yorum satırına alıyoruz, gerekirse tamamen kaldırabiliriz */}
      {/* <Dialog
        open={open}
        onClose={() => setOpen(!open)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        maxWidth="md"
        PaperProps={{ sx: { backgroundColor: theme.background } }}
        sx={{ "& .MuiDialog-paper": { width: "80%" } }}
      >
        <DialogTitle
          id="alert-dialog-title"
          sx={{ color: theme.primary_text, backgroundColor: theme.background }}
        >
          {props.singleData !== undefined && (
            <Typography variant="h5">
              {props.singleData.Name} - Details
            </Typography>
          )}
        </DialogTitle>
        {props.collapsible.isCollapsible &&
          props.collapsible.innerComponent && (
            <props.collapsible.innerComponent
              key={props.singleData.id}
              data={props.singleData}
              update={props.updateData}
            />
          )}
        {props.collapsible.isCollapsible && props.collapsible.inner?.type && (
          <Inner
            data={props.singleData}
            type={props.collapsible.inner.type}
            list={props.collapsible.inner.list}
            onUpdate={props.updateInnerCard}
            sortHeader={props.collapsible.inner.sortHeader}
            tableColumns={props.collapsible.inner.tableColumns}
            tableName={props.collapsible.inner.tableName}
            listType="detail"
          />
        )}
      </Dialog> */}
      <TableRow
        sx={{
          "& > *": { borderBottom: open ? "none" : "unset" },
          backgroundColor: open
            ? theme.table_row_light
            : rowIndex % 2 === 0
            ? theme.table_row_dark
            : theme.table_row_light,
          borderTop:
            rowIndex % 2 === 0 ? "1px solid rgba(255, 255, 255, 0.12)" : "none",
          transition: "background-color 0.2s ease-in-out",
        }}
      >
        {props.collapsible?.isCollapsible && (
          <TableCell
            onClick={() => setOpen(!open)}
            sx={{
              width: "1%",
              backgroundColor: open
                ? theme.table_row_light
                : rowIndex % 2 === 0
                ? theme.table_row_dark
                : theme.table_row_light,
              cursor: "pointer",
            }}
          >
            {/* Akordiyon göstergesi ekliyoruz */}
            <IconButton
              aria-label="expand row"
              size="small"
              onClick={(e) => {
                e.stopPropagation(); // Ana satıra tıklama olayını engellemek için
                setOpen(!open);
              }}
              sx={{
                transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <KeyboardArrowDownIcon />
            </IconButton>
          </TableCell>
        )}
        {headers.map((header, index) => {
          // Mobil cihazlar için kontrol
          const isMobile =
            typeof window !== "undefined" && window.innerWidth < 768;

          // Eğer mobil görünümde ve header'ın hide özelliği true ise, null döndür
          if (isMobile && (header as IExtendedColumnItem).hide) {
            return null;
          }

          const colStyle = {
            backgroundColor: open
              ? theme.table_row_light
              : rowIndex % 2 === 0
              ? theme.table_row_dark
              : theme.table_row_light,
            color: theme.primary_text,
            fontSize: isMobile ? "0.75rem" : "inherit",
            padding: isMobile ? "8px 4px" : "16px",
          };

          if (typeof header.key === "string") {
            if (header.type === "string") {
              return (
                <TableCell
                  key={`cell-${header.key}-${index}`}
                  align="center"
                  style={colStyle}
                >
                  {props.singleData[header.key]}
                </TableCell>
              );
            } else if (header.type === "boolean") {
              if (props.singleData[header.key] === true) {
                return (
                  <TableCell
                    key={`cell-${header.key}-${index}`}
                    align="center"
                    style={{ ...colStyle, color: "green" }}
                  >
                    <DoneIcon />
                  </TableCell>
                );
              } else {
                return (
                  <TableCell
                    key={`cell-${header.key}-${index}`}
                    align="center"
                    style={{ ...colStyle, color: "red" }}
                  >
                    <ClearIcon />
                  </TableCell>
                );
              }
            } else if (header.type === "tv-movie") {
              if (props.singleData[header.key] === true) {
                return (
                  <TableCell
                    key={`cell-${header.key}-${index}`}
                    align="center"
                    style={{ ...colStyle, color: "green" }}
                  >
                    <LocalMoviesIcon />
                  </TableCell>
                );
              } else {
                return (
                  <TableCell
                    key={`cell-${header.key}-${index}`}
                    align="center"
                    style={{ ...colStyle, color: "red" }}
                  >
                    <TvIcon />
                  </TableCell>
                );
              }
            } else if (header.type === "number") {
              return (
                <TableCell
                  key={`cell-${header.key}-${index}`}
                  align="center"
                  style={{
                    ...colStyle,
                    color: theme.primary_text,
                    fontWeight: "semi-bold",
                    fontSize: 20,
                  }}
                >
                  {props.singleData[header.key]}
                </TableCell>
              );
            } else if (header.type === "timestamp") {
              return (
                <TableCell
                  key={`cell-${header.key}-${index}`}
                  align="center"
                  style={colStyle}
                >
                  {moment(props.singleData[header.key]).format(
                    "DD/MM/YYYY HH:mm"
                  )}
                </TableCell>
              );
            } else if (header.type === "selection") {
              return (
                <TableCell
                  key={`cell-${header.key}-${index}`}
                  align="center"
                  style={colStyle}
                >
                  {props.singleData[header.key]}
                </TableCell>
              );
            } else if (header.type === "button") {
              const renderFunction = header.key as any;
              return (
                <TableCell
                  key={`cell-button-${rowIndex}-${index}`}
                  className={`${props.collapsible.inner?.tableName}_${rowIndex}`}
                  id={`${props.collapsible.inner?.tableName}_${rowIndex}_row`}
                  align="center"
                  style={colStyle}
                  onClick={(e) => {
                    e.stopPropagation(); // Burada da tıklamayı durduruyoruz
                  }}
                >
                  {renderFunction(
                    props.singleData.id,
                    rowIndex,
                    props.singleData
                  )}
                </TableCell>
              );
            } else if (
              header.type === "node" &&
              typeof header.key !== "string"
            ) {
              const Node = header.key as React.FC<{ data: any }>;
              return (
                <TableCell
                  key={`cell-${header.key}-${index}`}
                  align="center"
                  style={colStyle}
                >
                  <Node data={props.singleData} />
                </TableCell>
              );
            } else if (header.type === "uptime") {
              return (
                <TableCell
                  key={`cell-${header.key}-${index}`}
                  align="center"
                  style={colStyle}
                >
                  {moment
                    .duration(parseInt(props.singleData[header.key]), "seconds")
                    .humanize()}
                </TableCell>
              );
            } else if ((header.type as any) === "series") {
              return (
                <TableCell
                  key={`cell-${header.key}-${index}`}
                  align="center"
                  style={{
                    ...colStyle,
                    color: theme.primary_text,
                    fontWeight: "semi-bold",
                  }}
                >
                  {props.singleData[header.key] > 0 ? (
                    <Chip
                      label={
                        props.singleData[`${header.key}Name`] ||
                        "Unknown Series"
                      }
                      sx={{
                        backgroundColor: theme.primary25,
                        color: theme.primary_text,
                        fontWeight: "bold",
                      }}
                    />
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{ color: theme.secondary_text }}
                    >
                      No Series
                    </Typography>
                  )}
                </TableCell>
              );
            } else if (header.type === "base64") {
              return (
                <TableCell
                  key={`cell-${header.key}-${index}`}
                  align="center"
                  style={colStyle}
                >
                  <div
                    style={{ position: "relative", display: "inline-block" }}
                  >
                    <img
                      src={`${props.singleData[header.key]}`}
                      onMouseEnter={(e) => {
                        handlePopoverOpen(e, "cover");
                      }}
                      onMouseLeave={handlePopoverClose}
                      alt={props.singleData["Name"] + "_cover"}
                      style={{ width: 70, borderRadius: 10 }}
                    />
                    {props.singleData["PlanToWatch"] === true && (
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          right: 0,
                          backgroundColor: "#FFD700",
                          color: "#000",
                          width: "24px",
                          height: "24px",
                          textAlign: "center",
                          fontSize: "8px",
                          fontWeight: "bold",
                          padding: "3px 0",
                          zIndex: 1,
                          clipPath: "polygon(0 0, 100% 0, 100% 100%)",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            top: "2px",
                            right: "2px",
                            fontSize: "8px",
                            fontWeight: "bold",
                            transform: "rotate(45deg)",
                          }}
                        >
                          PTW
                        </div>
                      </div>
                    )}
                  </div>
                  <Popover
                    id="mouse-over-popover"
                    sx={{
                      pointerEvents: "none",
                      backgroundColor: "transparent",
                      color: "transparent",
                      border: "none",
                    }}
                    open={openAlCover}
                    anchorEl={anchorElCover}
                    anchorOrigin={{
                      vertical: "bottom",
                      horizontal: "left",
                    }}
                    transformOrigin={{
                      vertical: "top",
                      horizontal: "left",
                    }}
                    onClose={handlePopoverClose}
                    disableRestoreFocus
                  >
                    <div
                      style={{ position: "relative", display: "inline-block" }}
                    >
                      <img
                        src={`${props.singleData[header.key]}`}
                        alt={props.singleData["Name"] + "_cover"}
                        style={{ width: 400 }}
                      />
                      {props.singleData["PlanToWatch"] === true && (
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            right: 0,
                            backgroundColor: "#FFD700",
                            color: "#000",
                            width: "60px",
                            height: "60px",
                            textAlign: "center",
                            fontSize: "14px",
                            fontWeight: "bold",
                            padding: "8px 0",
                            zIndex: 1,
                            clipPath: "polygon(0 0, 100% 0, 100% 100%)",
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              top: "8px",
                              right: "10px",
                              fontSize: "14px",
                              fontWeight: "bold",
                              transform: "rotate(45deg)",
                              transformOrigin: "center",
                            }}
                          >
                            PTW
                          </div>
                        </div>
                      )}
                    </div>
                  </Popover>
                </TableCell>
              );
            } else if (header.type === "link") {
              return (
                <TableCell
                  key={`cell-${header.key}-${index}`}
                  align="center"
                  style={colStyle}
                >
                  <a href={`${props.singleData[header.key]}`}>
                    {props.singleData[header.key]}
                  </a>
                </TableCell>
              );
            } else if (header.type === "status") {
              return (
                <TableCell
                  key={`cell-${header.key}-${index}`}
                  align="center"
                  style={{
                    color:
                      props.singleData[header.key] === "Finished"
                        ? "#00B0F0"
                        : "#FF0000",
                  }}
                >
                  {props.singleData[header.key]}
                </TableCell>
              );
            } else if (header.type === "score") {
              return (
                <TableCell
                  key={`cell-${header.key}-${index}`}
                  align="center"
                  style={{
                    color: "lightgray",
                  }}
                >
                  {props.singleData[header.key] === -1 ? (
                    "Unrated"
                  ) : (
                    <CircularProgressWithLabel
                      variant="determinate"
                      style={{
                        color: colorSetter(props.singleData[header.key]),
                      }}
                      value={props.singleData[header.key]}
                    />
                  )}
                </TableCell>
              );
            } else if (header.type === "episode") {
              return (
                <TableCell
                  key={`cell-${header.key}-${index}`}
                  align="center"
                  style={colStyle}
                >
                  {props.singleData[header.key] !== 0 &&
                  props.singleData[header.key] ===
                    props.singleData["TotalNumberOfEpisodes"] ? (
                    <Typography sx={{ color: theme.primary_text }}>
                      Finished
                    </Typography>
                  ) : (
                    <>
                      {props.singleData[header.key] !== -1 && (
                        <Box sx={{ color: theme.primary_text }}>
                          {props.singleData[header.key]} Episode(s)
                        </Box>
                      )}
                    </>
                  )}{" "}
                  <Box sx={{ width: "100%" }}>
                    {props.singleData[header.key] ===
                    props.singleData["TotalNumberOfEpisodes"] ? (
                      <>
                        {props.singleData[header.key] !== 0 ? (
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
                          "-"
                        )}
                      </>
                    ) : (
                      <LinearProgressWithLabel
                        sx={{
                          "& .MuiLinearProgress-colorPrimary": {
                            backgroundColor: "red",
                          },
                          "& .MuiLinearProgress-barColorPrimary": {
                            backgroundColor: epSetter(
                              (parseInt(props.singleData[header.key]) * 100) /
                                parseInt(
                                  props.singleData["TotalNumberOfEpisodes"]
                                )
                            ),
                          },
                        }}
                        value={
                          (parseInt(props.singleData[header.key]) * 100) /
                          parseInt(props.singleData["TotalNumberOfEpisodes"])
                        }
                      />
                    )}
                  </Box>
                </TableCell>
              );
            } else if (header.type === "pill") {
              return (
                <TableCell
                  key={`cell-${header.key}-${index}`}
                  align="center"
                  style={colStyle}
                  id={header.key}
                >
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "repeat(3, 1fr)", // Mobil görünümde 3 sütun
                        sm: "repeat(3, 1fr)", // Tablet görünümde 3 sütun
                        md: "repeat(3, 1fr)", // Küçük masaüstü görünümde 3 sütun
                        lg: "repeat(4, 1fr)", // Büyük masaüstü görünümde 4 sütun
                      },
                      gap: { xs: 1, sm: 1, md: 1.5, lg: 2 },
                      width: "100%",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {props.singleData[header.key].length !== 0 &&
                      props.singleData[header.key]
                        .split(", ")
                        .map((pill: string, index: number) => (
                          <Button
                            key={`button-${rowIndex}-${pill}-${index}`}
                            sx={{
                              // Butonun tüm stil özelliklerini kaldır
                              display: "inline-block",
                              backgroundColor: "transparent",
                              cursor: "pointer",
                              padding: 0, // İç boşlukları sıfırlayın
                              width: "100%",
                              height: "auto",
                              margin: "0 2px",
                              ":hover": {
                                backgroundColor: "transparent",
                              },
                              ":focus": {
                                backgroundColor: "transparent",
                              },
                            }}
                            onClick={() => {
                              props.setFilterState((prevState: any) => {
                                const newState = prevState;
                                newState.filter((item: any) => {
                                  if (item.key === "Genre") {
                                    if (item.value.includes(pill)) {
                                      item.value = item.value.filter(
                                        (genre: string) => genre !== pill
                                      );
                                    } else {
                                      item.value = item.value.concat([pill]);
                                    }
                                  }
                                  return item;
                                });
                                return newState;
                              });
                            }}
                          >
                            <Chip
                              key={`chip-${index}`}
                              id={`chip-${rowIndex}-${index}`}
                              onMouseEnter={(e) => {
                                handlePopoverOpen(e, "genre");
                              }}
                              onMouseLeave={handlePopoverClose}
                              size="small"
                              label={pill}
                              color="primary"
                              sx={{
                                backgroundColor: genreColors[pill as string],
                                color: getFontColor(
                                  genreColors[pill as string]
                                ),
                                minWidth: {
                                  xs: "100%",
                                  sm: "100%",
                                  md: "80px",
                                },
                                maxWidth: "100%",
                                height: "24px",
                                "& .MuiChip-label": {
                                  padding: "0 8px",
                                  fontSize: {
                                    xs: "0.7rem",
                                    sm: "0.75rem",
                                    md: "0.8rem",
                                  },
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                },
                              }}
                            />
                          </Button>
                        ))}
                  </Box>
                  <Popover
                    id="mouse-over-popover"
                    sx={{
                      pointerEvents: "none",
                      backgroundColor: "transparent",
                      color: /* "transparent" */ "red",
                      border: "none",
                    }}
                    open={openAl}
                    anchorEl={anchorEl}
                    anchorOrigin={{
                      vertical: "bottom",
                      horizontal: "left",
                    }}
                    transformOrigin={{
                      vertical: "top",
                      horizontal: "left",
                    }}
                    PaperProps={{
                      style: {
                        backgroundColor: "transparent",
                        boxShadow: "none", // Gölgeyi de kaldırmak için
                      },
                    }}
                    onClose={handlePopoverClose}
                    disableRestoreFocus
                  >
                    <Chip
                      key="popover-chip"
                      size="small"
                      label={popData}
                      color="primary"
                      sx={{
                        backgroundColor: genreColors[popData! as string],
                        color: getFontColor(genreColors[popData! as string]),
                        minWidth: "120px",
                        height: "28px",
                        "& .MuiChip-label": {
                          padding: "0 12px",
                          fontSize: "0.85rem",
                          fontWeight: 500,
                        },
                      }}
                    />
                  </Popover>
                </TableCell>
              );
            } else {
              return (
                <TableCell
                  key={`cell-${header.key}-${index}`}
                  align="center"
                  style={colStyle}
                >
                  {props.singleData[header.key]}
                </TableCell>
              );
            }
          } else {
            if (header.type === "button") {
              const renderFunction = header.key as any;
              return (
                <TableCell
                  key={`cell-button-${rowIndex}-${index}`}
                  className={`${props.collapsible.inner?.tableName}_${rowIndex}`}
                  id={`${props.collapsible.inner?.tableName}_${rowIndex}_row`}
                  align="center"
                  style={colStyle}
                  onClick={(e) => {
                    e.stopPropagation(); // Burada da tıklamayı durduruyoruz
                  }}
                >
                  {renderFunction(
                    props.singleData.id,
                    rowIndex,
                    props.singleData
                  )}
                </TableCell>
              );
            } else {
              return (
                <TableCell
                  key={`cell-other-${rowIndex}-${index}`}
                  align="center"
                  style={colStyle}
                >
                  Buraya Ne Gelmeli
                </TableCell>
              );
            }
          }
        })}
      </TableRow>

      {/* Akordiyon içeriği - satır genişletildiğinde gösterilecek */}
      <TableRow
        sx={{
          backgroundColor: theme.table_row_light,
        }}
      >
        <TableCell
          style={{ paddingBottom: 0, paddingTop: 0, border: 0 }}
          colSpan={headers.length + (props.collapsible?.isCollapsible ? 1 : 0)}
        >
          <Collapse
            in={open}
            timeout={300}
            easing="cubic-bezier(0.4, 0, 0.2, 1)"
            unmountOnExit
            sx={{
              willChange: "height, opacity",
              transformOrigin: "top",
              overflowY: "hidden",
            }}
          >
            <Box
              sx={{
                margin: 2,
                bgcolor: theme.background,
                borderRadius: 1,
                p: 2,
                boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                transition: "all 0.3s ease",
                "&:hover": {
                  boxShadow: "0 6px 12px rgba(0,0,0,0.15)",
                },
              }}
            >
              <Typography
                variant="h6"
                gutterBottom
                component="div"
                sx={{ color: theme.primary_text, mb: 2 }}
              >
                {props.singleData.Name} - Detaylar
              </Typography>

              {props.collapsible.innerComponent && (
                <props.collapsible.innerComponent
                  key={props.singleData.id}
                  data={props.singleData}
                  update={props.updateData}
                />
              )}

              {props.collapsible.inner?.type && (
                <Inner
                  data={props.singleData}
                  type={props.collapsible.inner.type}
                  list={props.collapsible.inner.list}
                  onUpdate={props.updateInnerCard}
                  sortHeader={props.collapsible.inner.sortHeader}
                  tableColumns={props.collapsible.inner.tableColumns}
                  tableName={props.collapsible.inner.tableName}
                  listType="detail"
                />
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}
