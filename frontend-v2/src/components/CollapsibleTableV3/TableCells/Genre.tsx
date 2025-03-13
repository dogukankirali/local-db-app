import { genreColors } from "@/constants/Constants";
import { Box, Button, Chip, Popover, TableCell } from "@mui/material";
import { useState } from "react";

export default function Genre(props: {
  genres: string;
  key: string;
  setFilterState: any;
}) {
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<any>(null);
  const handlePopoverOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget as HTMLElement);
    setOpen(true);
  };

  const handlePopoverClose = () => {
    setOpen(false);
  };

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
    <TableCell align="center" id={props.key}>
      <Box
        style={{
          display: "grid",
          gridTemplateColumns: "4fr 4fr 4fr",
          gap: 5,
        }}
      >
        {props.genres.length !== 0 &&
          props.genres.split(", ").map((pill: string, index: number) => (
            <Button
              sx={{
                // Butonun tüm stil özelliklerini kaldır
                display: "inline-block",
                backgroundColor: "transparent",
                cursor: "pointer",
                padding: 0, // İç boşlukları sıfırlayın
                width: "auto",
                height: "auto",
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
                id={`chip-${pill}-${index}`}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  handlePopoverOpen(e as any);
                }}
                onMouseLeave={handlePopoverClose}
                size="small"
                label={pill}
                color="primary"
                style={{
                  backgroundColor: genreColors[pill as string],
                  color: getFontColor(genreColors[pill as string]),
                  minWidth: 80,
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
        open={open}
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
          size="small"
          label={anchorEl.innerText}
          color="primary"
          style={{
            backgroundColor: genreColors[anchorEl.innerText as string],
            color: getFontColor(genreColors[anchorEl.innerText as string]),
            minWidth: 80,
          }}
        />
      </Popover>
    </TableCell>
  );
}
