import React from "react";
import { Box, Card, CardMedia, CardContent, Typography, Grid, Chip, Pagination } from "@mui/material";
import { Scrollbars } from "react-custom-scrollbars-2";
import { theme } from "../theme/customTheme";
import StarIcon from "@mui/icons-material/Star";

interface AnimeGridProps {
  data: TEATable.IAnime[];
  pagination: TEAData.Pagination;
  onPageChange: (event: React.ChangeEvent<unknown>, value: number) => void;
  loading: boolean;
  gridSize: number;
  onLoadMore: () => void;
}

const getStatusLabel = (status: number) => {
  switch (status) {
    case -1: return "Plan to Watch";
    case 0: return "Unknown";
    default: return `Watched: ${status}`;
  }
};

const getStatusColor = (status: number) => {
  if (status === -1) return "#C88900"; // Plan to Watch
  if (status > 0) return "#60BB46"; // Watching / Watched
  return theme.secondary; // Unknown
};

export default function AnimeGrid({ data, pagination, onPageChange, loading, gridSize, onLoadMore }: AnimeGridProps) {
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 5, color: theme.primary_text }}>
        <Typography variant="h6">Loading Anime Grid...</Typography>
      </Box>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 5, color: theme.primary_text }}>
        <Typography variant="h6">No anime found.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, height: "100%", overflow: "hidden" }}>
      <Scrollbars 
        autoHide 
        onScrollFrame={(values) => {
          if (values.top >= 0.99 && !loading) {
            onLoadMore();
          }
        }}
      >
        <Box sx={{ p: 1 }}>
      <Grid container spacing={3}>
        {data.map((anime, index) => (
          <Grid item xs={12} sm={6} md={12/Math.max(1, gridSize-2)} lg={12/Math.max(1, gridSize-1)} xl={12/gridSize} key={anime.ID || index}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                backgroundColor: theme.table_row_light,
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-8px)",
                  boxShadow: "0 12px 28px rgba(0,0,0,0.5)",
                },
                position: "relative",
              }}
            >
              {/* Cover Image */}
              <Box sx={{ position: "relative", paddingTop: "140%", backgroundColor: theme.background_light }}>
                {anime.Cover ? (
                  <CardMedia
                    component="img"
                    image={anime.Cover.startsWith("data:") ? anime.Cover : `data:image/jpeg;base64,${anime.Cover}`}
                    alt={anime.Name}
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: theme.secondary_text,
                    }}
                  >
                    No Cover
                  </Box>
                )}
                {/* Score overlay */}
                {parseFloat(anime.Score) !== -1 && parseFloat(anime.Score) > 0 && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      backgroundColor: "rgba(0,0,0,0.7)",
                      backdropFilter: "blur(4px)",
                      borderRadius: "8px",
                      padding: "4px 8px",
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      color: "#FFD700",
                    }}
                  >
                    <StarIcon fontSize="small" />
                    <Typography variant="body2" fontWeight="bold">
                      {anime.Score}
                    </Typography>
                  </Box>
                )}
              </Box>

              <CardContent sx={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: theme.primary_text,
                    fontWeight: "bold",
                    lineHeight: 1.2,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {anime.Name}
                </Typography>
                
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: "auto" }}>
                  <Chip
                    label={anime.PlanToWatch ? "Plan to Watch" : getStatusLabel(anime.WatchStatus)}
                    size="small"
                    sx={{
                      backgroundColor: anime.PlanToWatch ? "#C88900" : getStatusColor(anime.WatchStatus),
                      color: "#fff",
                      fontWeight: "bold",
                      fontSize: "0.7rem",
                    }}
                  />
                  <Typography variant="caption" sx={{ color: theme.secondary_text }}>
                    {anime.AnimeStatus === "Finished" 
                      ? "Completed" 
                      : (anime.TotalNumberOfEpisodes || "Ongoing")}
                  </Typography>
                </Box>

              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      
    </Box>
      </Scrollbars>
    </Box>
  );
}
