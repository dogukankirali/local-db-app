import { useState } from "react";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import DoneIcon from "@mui/icons-material/Done";
import ClearIcon from "@mui/icons-material/Clear";
import CloseIcon from "@mui/icons-material/Close";
import RemoveFromQueueIcon from "@mui/icons-material/RemoveFromQueue";
import AddToQueueIcon from "@mui/icons-material/AddToQueue";
import { Box, Chip, CircularProgress, CircularProgressProps, Grid, IconButton, LinearProgress, LinearProgressProps, Popover, Stack, Typography } from "@mui/material";
import { Col, Modal, Row } from "reactstrap";
import moment from "moment-timezone";
import { theme } from "../../../theme/customTheme"
import JsxParser from "react-jsx-parser";
import { useIntl } from "react-intl";
import Inner from "./Collapse/Inner";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import React from "react";
import LocalMoviesIcon from '@mui/icons-material/LocalMovies';
import TvIcon from '@mui/icons-material/Tv';

export default function CustomTableRowV2(
  props: TEATable.ICustomTableRowPropsV2
) {
  const [open, setOpen] = useState(false);
  //const intl = useIntl();
  const [anchorElCover, setAnchorElCover] = React.useState<HTMLElement | null>(null);
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [popData, setPopData] = React.useState<string | null>(null);

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>, source: string) => {
    if(source === "genre") {
      setPopData(event.currentTarget.childNodes[0].textContent)
      setAnchorEl(event.currentTarget);
    } else if(source === "cover") {
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
    '0': '#FF0000',   // Kırmızı
    '25': '#FF3200',  // Turuncu 
    '50': '#FF6500',  // Sarı
    '75': '#00FF00',  // Yeşil 
    '100': '#00B0F0'  // Mavi
  };

  const colorScale = {
    '0-9': '#FF0000',      // Kırmızı
    '10-19': '#FF1900',   // Turuncu Kırmızı
    '20-29': '#FF3200',   // Turuncu
    '30-39': '#FF4C00',   // Turuncu Sarı
    '40-49': '#FF6500',   // Sarı
    '50-59': '#FF7F00',   // Altın Sarısı
    '60-69': '#FF9800',   // Portakal
    '70-79': '#FFB200',   // Turuncu
    '80-89': '#FFDF00',   // Sarı Yeşil
    '90-99': '#00FF00',   // Yeşil
    '100': '#00B0F0'      // Mavi
  };

  const genreColors: { [key: string]: string } = {
    'Shounen': '#FF4500', // Ateş Kırmızısı
    'Shoujo': '#FF69B4', // Barbie Pembesi
    'Seinen': '#008080', // Deniz Yeşili
    'Josei': '#FF1493', // Parlak Pembe
    'Mecha': '#808080', // Metal Gri
    'Slice of Life': '#F0E68C', // Açık Sarı
    'Fantastik': '#9932CC', // Şeftali Moru
    'Korku': '#8B0000', // Kan Kırmızısı
    'Spor': '#32CD32', // Çimen Yeşili
    'Bilim Kurgu': '#00CED1', // Açık Mavi
    'Romantik': '#FFB6C1', // Gül Rengi
    'Dram': '#696969', // Kurşuni Gri
    'Aksiyon': '#FFD700', // Altın Sarısı
    'Komedi': '#FF8C00', // Hardal Sarısı
    'Macera': '#006400', // Orman Yeşili
    'Doğaüstü': '#8A2BE2', // Bordo Mor
    'Psikolojik': '#2F4F4F', // Teneke Gri
    'Yaoi': '#FFA07A', // Açık Somon
    'Yuri': '#9370DB', // Orkide Moru
    'Harem': '#FFC0CB', // İnci Pembe
    'Mahou Shoujo': '#FF69B4', // Barbie Pembesi
    'Müzik': '#8B4513', // Ahşap Kahverengi
    'Savaş': '#4B0082', // İndigo
    'Samuray': '#DC143C', // Alev Kırmızısı
    'Vampir': '#800080', // Mor
    'Vahşi Batı': '#CD853F', // Perulu
    'Okul': '#00FF7F', // Neon Yeşili
    'Bilim Kurgu Korku': '#00CED1', // Açık Mavi
    'Gizem': '#483D8B', // Mor Mavi
    'Gerilim': '#808080', // Metal Gri
    'Zombi': '#556B2F', // Yeşil Kahverengi
    'Mücadele': '#FF4500', // Ateş Kırmızısı
    'Uzay': '#0000CD', // Orta Mavi
    'Kült': '#FF5722', // Turuncu
    'Suç': '#8B0000', // Kan Kırmızısı
    'Historical': '#DAA520', // Altın Rengi
    'Mücadele Sporları': '#32CD32', // Çimen Yeşili
    'Müzikal': '#FFD700', // Altın Sarısı
    'Günlük Yaşam': '#F0E68C', // Açık Sarı
    'Karakter Gelişimi': '#006400', // Orman Yeşili
    'Fantezi': '#9932CC', // Şeftali Moru
    'Eğlence': '#FF8C00', // Hardal Sarısı
    'Super Güçler': '#FFD700', // Altın Sarısı
    'Hayalet': '#9370DB', // Orkide Moru
    'Kara Komedi': '#808080', // Metal Gri
    'Kahramanlık': '#00FF7F', // Neon Yeşili
    'Hayatta Kalma': '#FF5722', // Turuncu
    'Dönem': '#696969', // Kurşuni Gri
    'Makine': '#A9A9A9', // Koyu Gri
    'Parodi': '#FF8C00', // Hardal Sarısı
    'Hikayelere Dayalı': '#F0E68C', // Açık Sarı
    'Kıyamet Sonrası': '#FFA500', // Portakal
    'Dedektif': '#000080', // Lacivert
    'Dövüş Sanatları': '#32CD32', // Çimen Yeşili
    'Yetişkin': '#FF69B4', // Barbie Pembesi
    'Büyücülük': '#9932CC', // Şeftali Moru
    'Samuraylar ve Ninja': '#DC143C', // Alev Kırmızısı
    'Sihir': '#9370DB', // Orkide Moru
    'Bilgisayar Oyunu': '#0000CD', // Orta Mavi
    'Soyut': '#483D8B', // Mor Mavi
    'Edebiyat Uyarlaması': '#8B4513', // Ahşap Kahverengi
    'Koşu': '#00FF7F', // Neon Yeşili
    'Sevgililer Arasındaki İlişkiler': '#F06292', // Somon
    'Havacılık': '#DAA520', // Altın Rengi
    'Sürrealizm': '#AB82FF', // Parlak Lavanta
    'Uzay Operası': '#000080', // Lacivert
    'Kıyafetleri Değiştirme': '#FFEB3B', // Güneş Sarısı
    'Dans': '#00CED1', // Açık Mavi
    'Tarih': '#A0522D', // Koyu Kahverengi
    'Yarış': '#4CAF50', // Orta Yeşil
    'Yaratıklar': '#8B4513', // Ahşap Kahverengi
    'Yolculuk': '#9E9E9E', // Gümüş
    'Aşk Üçgeni': '#BA55D3', // Orkide Rengi
    'Mangaka': '#607D8B', // Mavi Gri
    'Öğretmen-Öğrenci İlişkisi': '#795548', // Kakao
    'Konusu Olmayan': '#FF4500', // Ateş Kırmızısı
    'Yiyecek': '#FFA500', // Portakal
    'Oyun': '#FFD700', // Altın Sarısı
    'Polisiye': '#000080', // Lacivert
    'Mafia': '#8B0000', // Kan Kırmızısı
    'Suikastçılar': '#E57373', // Açık Kırmızı
    'Ekip Çalışması': '#32CD32', // Çimen Yeşili
    'Gösteri Sanatları': '#4CAF50', // Orta Yeşil
    'İntikam': '#00CED1', // Açık Mavi
    'Kötü Karakterler': '#9E9E9E' // Gümüş
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

  function LinearProgressWithLabel(props: LinearProgressProps & { value: number }) {
    return (
      <Box>
        <Box sx={{ width: '100%', mt: 1 }}>
          <LinearProgress variant="determinate" {...props} />
        </Box>
        <Box sx={{ minWidth: 35, display: 'grid', placeItems: 'center', mt: 1 }}>
          <Typography variant="body2" color="text.secondary">{`${Math.round(
            props.value,
          )}%`}</Typography>
        </Box>
      </Box>
    );
  }

  function CircularProgressWithLabel(
    props: CircularProgressProps & { value: number },
  ) {
    return (
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress variant="determinate" {...props} />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            variant="subtitle2"
            component="div"
            color={colorSetter(props.value)}
          >{props.value}</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <>
      <Modal
        centered
        size={props.collapsible?.size}
        isOpen={open}
        toggle={() => setOpen(!open)}
        title="Details"
      >
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
      </Modal>
      <TableRow
        id={`${props.collapsible.inner?.tableName}_${props.index}`}
        style={{
          height: 58,
          backgroundColor:
            props.index! % 2 === 1
              ? theme.table_row_light
              : theme.table_row_dark,
        }}
      >
        {props.collapsible.isCollapsible && (
          <TableCell style={colStyle}>
            <IconButton
              aria-label="expand row"
              size="small"
              onClick={() => setOpen(!open)}
            >
              <OpenInNewIcon />
            </IconButton>
          </TableCell>
        )}
        {props.headers.map((header) => {
          if (typeof header.key === "string") {
            if (header.type === "string") {
              return (
                <TableCell align="center" style={colStyle}>
                  {props.singleData[header.key]}
                </TableCell>
              );
            } else if (header.type === "boolean") {
              if (props.singleData[header.key] === true) {
                return (
                  <TableCell
                    align="center"
                    style={{ ...colStyle, color: "green" }}
                  >
                    <DoneIcon />
                  </TableCell>
                );
              } else {
                return (
                  <TableCell
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
                    align="center"
                    style={{ ...colStyle, color: "green" }}
                  >
                    <LocalMoviesIcon />
                  </TableCell>
                );
              } else {
                return (
                  <TableCell
                    align="center"
                    style={{ ...colStyle, color: "red" }}
                  >
                    <TvIcon />
                  </TableCell>
                );
              }
            } else if (header.type === "number") {
              return (
                <TableCell align="center" style={colStyle}>
                  {props.singleData[header.key]}
                </TableCell>
              );
            } else if (header.type === "timestamp") {
              return (
                <TableCell align="center" style={colStyle}>
                  {moment(props.singleData[header.key]).format(
                    "DD/MM/YYYY HH:mm"
                  )}
                </TableCell>
              );
            } else if (header.type === "selection") {
              return (
                <TableCell align="center" style={colStyle}>
                  {props.singleData[header.key]}
                </TableCell>
              );
            } else if (header.type === "button") {
              return (
                <TableCell align="center" style={colStyle}>
                </TableCell>
              );
            } else if (
              header.type === "node" &&
              typeof header.key !== "string"
            ) {
              const Node = header.key as React.FC<{ data: any }>;
              return (
                <TableCell align="center" style={colStyle}>
                  <Node data={props.singleData} />
                </TableCell>
              );
            } else if (header.type === "uptime") {
              return (
                <TableCell align="center" style={colStyle}>
                  {moment
                    .duration(parseInt(props.singleData[header.key]), "seconds")
                    .format(
                      "D [Day(s)] H [Hour(s)] m [Minute(s)] s [Second(s)]"
                    )}
                </TableCell>
              );
            } else if (header.type === "base64") {
              return (
                <TableCell align="center" style={colStyle}>
                  <img src={`${props.singleData[header.key]}`} onMouseEnter={(e) => {handlePopoverOpen(e, "cover")}} onMouseLeave={handlePopoverClose} alt={props.singleData["Name"] + "_cover"} style={{ width: 100 }} />
                  <Popover
                    id="mouse-over-popover"
                    sx={{
                      pointerEvents: 'none',
                      backgroundColor: "transparent",
                      color: "transparent",
                      border: "none",
                    }}
                    open={openAlCover}
                    anchorEl={anchorElCover}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'left',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'left',
                    }}
                    onClose={handlePopoverClose}
                    disableRestoreFocus
                  >
                    <img src={`${props.singleData[header.key]}`} alt={props.singleData["Name"] + "_cover"} style={{ width: 400 }} />
                  </Popover>
                </TableCell>
              );
            } else if (header.type === "link") {
              return (
                <TableCell align="center" style={colStyle}>
                  <a href={`${props.singleData[header.key]}`}>{props.singleData[header.key]}</a>
                </TableCell>
              );
            } else if (header.type === "status") {
              return (
                <TableCell align="center" style={{ color: props.singleData[header.key] === "Finished" ? '#00B0F0' : '#FF0000'}}>
                  {props.singleData[header.key]}
                </TableCell>
              );
            } else if (header.type === "score") {
              return (
                <TableCell align="center" style={{
                  color: "lightgray"
                }}>
                  {props.singleData[header.key] === -1 ? "Unrated" : <CircularProgressWithLabel variant="determinate" style={{ color: colorSetter(props.singleData[header.key]) }} value={props.singleData[header.key]} />}

                </TableCell>
              );
            } else if (header.type === "episode") {
              return (
                <TableCell align="center" style={colStyle}>
                  {props.singleData[header.key] === -1 ? "Finished" : props.singleData[header.key]} {props.singleData[header.key] !== -1 && "Episode(s)"}
                  <Box sx={{ width: '100%' }}>
                    {props.singleData[header.key] === -1 ? <LinearProgressWithLabel sx={{
                      "& .MuiLinearProgress-colorPrimary": {
                        backgroundColor: "red",
                      },
                      "& .MuiLinearProgress-barColorPrimary": {
                        backgroundColor: epSetter(100),
                      },
                    }} value={100} /> : <LinearProgressWithLabel sx={{
                      "& .MuiLinearProgress-colorPrimary": {
                        backgroundColor: "red",
                      },
                      "& .MuiLinearProgress-barColorPrimary": {
                        backgroundColor: epSetter((parseInt(props.singleData[header.key]) * 100) / parseInt(props.singleData["TotalNumberOfEpisodes"])),
                      },
                    }} value={(parseInt(props.singleData[header.key]) * 100) / parseInt(props.singleData["TotalNumberOfEpisodes"])} />}

                  </Box>
                </TableCell>
              );
            } else if (header.type === "pill") {
              return (
                <TableCell align="center" style={colStyle}>
                  <Grid container spacing={1}>
                    {props.singleData[header.key].length !== 0 && props.singleData[header.key].split(", ").map((pill: string, index: number) => (
                      <Grid item xs={4}>
                        <Chip key={`chip-${index}`} id={`chip-${props.index}-${index}`} onMouseEnter={(e) => {handlePopoverOpen(e, "genre")}} onMouseLeave={handlePopoverClose} size="small" label={pill} color='primary' style={{ backgroundColor: genreColors[pill as string], minWidth: 80 }} />
                      </Grid>
                    ))}
                  </Grid>
                  <Popover
                    id="mouse-over-popover"
                    sx={{
                      pointerEvents: 'none',
                      backgroundColor: "transparent",
                      color: "transparent",
                      border: "none",
                    }}
                    open={openAl}
                    anchorEl={anchorEl}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'left',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'left',
                    }}
                    onClose={handlePopoverClose}
                    disableRestoreFocus
                  >
                    <Chip size="small" label={popData} color='primary' style={{ backgroundColor: genreColors[popData!], minWidth: 80 }} />
                  </Popover>
                </TableCell>
              );
            } else {
              return (
                <TableCell align="center" style={colStyle}>
                  {props.singleData[header.key]}
                </TableCell>
              );
            }
          } else {
            if (header.type === "button") {
              return (
                <TableCell
                  className={`${props.collapsible.inner?.tableName}_${props.index}`}
                  id={`${props.collapsible.inner?.tableName}_${props.index}_row`}
                  align="center"
                  style={colStyle}
                >
                  {header.key(
                    props.singleData.id,
                    props.index!,
                    props.singleData
                  )}
                </TableCell>
              );
            } else {
              return (
                <TableCell align="center" style={colStyle}>
                  Buraya Ne Gelmeli
                </TableCell>
              );
            }
          }
        })}
      </TableRow>
    </>
  );
}


