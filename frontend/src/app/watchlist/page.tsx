"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Container,
  Button,
  Paper,
  Stack,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
} from "@mui/material";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import DragHandleIcon from "@mui/icons-material/DragHandle";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { theme } from "../../theme/customTheme";
import Image from "next/image";
import CircularProgress from "@mui/material/CircularProgress";
import axios from "axios";
import { API_URL } from "../../constants/Constants";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface AnimeData {
  ID: number;
  Name: string;
  Cover: string;
  AnimeStatus: string;
  Score: number;
  TotalNumberOfEpisodes: number;
  PlanToWatch: boolean;
  [key: string]: any; // Diğer alanlar için
}

interface WatchListItem {
  id: number;
  anime_id: number;
  order_rank: number;
  anime: AnimeData;
}

// Sortable component for watch list items
function SortableWatchlistItem({
  item,
  index,
  onMoveUp,
  onMoveDown,
  onRemove,
  onComplete,
}: {
  item: WatchListItem;
  index: number;
  onMoveUp: (item: WatchListItem) => void;
  onMoveDown: (item: WatchListItem) => void;
  onRemove: (id: number) => void;
  onComplete: (animeId: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      sx={{
        p: 2,
        display: "flex",
        alignItems: "center",
        backgroundColor: theme.background_light,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mr: 2,
        }}
      >
        <div {...attributes} {...listeners}>
          <DragHandleIcon
            sx={{
              cursor: "grab",
              mr: 1,
              "&:active": {
                cursor: "grabbing",
              },
            }}
          />
        </div>
        <Typography variant="h6" color={theme.primary_text}>
          {index + 1}
        </Typography>
      </Box>

      <Box
        sx={{
          width: 80,
          height: 120,
          position: "relative",
          mr: 3,
          flexShrink: 0,
        }}
      >
        {item.anime && item.anime.Cover ? (
          <img
            src={item.anime.Cover}
            alt={item.anime.Name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: "8px",
            }}
          />
        ) : (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              backgroundColor: "#444",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography color="#aaa">No Image</Typography>
          </Box>
        )}
      </Box>

      <Box flexGrow={1}>
        <Typography variant="h6" color={theme.primary_text}>
          {item.anime ? item.anime.Name : "Unnamed Anime"}
        </Typography>
        <Typography color={theme.secondary_text}>
          Status: {item.anime ? item.anime.AnimeStatus || "-" : "-"}
        </Typography>
        <Typography color={theme.secondary_text}>
          Episodes: {item.anime ? item.anime.TotalNumberOfEpisodes : "-"}
        </Typography>
        {item.anime && item.anime.Score > 0 && (
          <Typography color={theme.secondary_text}>
            Score: {item.anime.Score}
          </Typography>
        )}
      </Box>

      <Box>
        <Tooltip title="Complete">
          <IconButton
            color="primary"
            onClick={() => onComplete(item.anime.ID)}
            sx={{ ml: 2 }}
          >
            <CheckCircleOutlineIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Remove from List">
          <IconButton
            color="error"
            onClick={() => onRemove(item.id)}
            sx={{ ml: 1 }}
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
}

export default function WatchListPage() {
  const [watchList, setWatchList] = useState<WatchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const router = useRouter();

  // İzleme listesini al -> Get the watch list
  const fetchWatchList = async () => {
    try {
      setLoading(true);
      console.log("API URL:", API_URL);
      const response = await axios.get(`${API_URL}/watchlist`);
      console.log("API Response:", response.data);
      setWatchList(response.data);
      setError("");
    } catch (err: any) {
      console.error("Failed to get watch list:", err);
      setError(`Failed to get watch list: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  // İzleme listesinden bir animeyi kaldır -> Remove an anime from the watch list
  const removeFromWatchList = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/watchlist?id=${id}`);
      setWatchList((prevList) => prevList.filter((item) => item.id !== id));
      setSuccess("Anime successfully removed from watch list");
      setOpenSnackbar(true);
    } catch (err: any) {
      console.error("Failed to remove anime from list:", err);
      setError(
        `Failed to remove anime from list: ${err.message || "Unknown error"}`
      );
      setOpenSnackbar(true);
    }
  };

  // Plan to Watch işaretli olan tüm animeleri izleme listesine ekle -> Add all animes marked as Plan to Watch to the watch list
  const syncPlanToWatch = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/watchlist/sync`);
      console.log("Sync response:", response.data);
      fetchWatchList();
      setSuccess(
        `${response.data.added} anime successfully added to watch list`
      );
      setOpenSnackbar(true);
    } catch (err: any) {
      console.error("Sync failed:", err);
      setError(
        `Failed to sync Plan to Watch animes: ${err.message || "Unknown error"}`
      );
      setOpenSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  // Bir animeyi listede yukarı taşı -> Move an anime up in the list
  const moveUp = async (item: WatchListItem) => {
    const currentIndex = watchList.findIndex((i) => i.id === item.id);
    if (currentIndex <= 0) return; // Already at the top

    const prevItem = watchList[currentIndex - 1];
    const newOrder = prevItem.order_rank;

    try {
      // Backend'e güncelleme gönder -> Send update to backend
      const response = await axios.put(`${API_URL}/watchlist/order`, {
        id: item.id,
        order_rank: newOrder,
      });
      console.log("Order update response:", response.data);

      // Önceki öğeyi de güncelle -> Update the previous item as well
      const prevResponse = await axios.put(`${API_URL}/watchlist/order`, {
        id: prevItem.id,
        order_rank: item.order_rank,
      });
      console.log("Previous item update response:", prevResponse.data);

      // UI'da listeyi güncelle -> Update the list in UI
      fetchWatchList();
      setSuccess("Order successfully updated");
      setOpenSnackbar(true);
    } catch (err: any) {
      console.error("Failed to update order:", err);
      setError(`Failed to update order: ${err.message || "Unknown error"}`);
      setOpenSnackbar(true);
    }
  };

  // Bir animeyi listede aşağı taşı -> Move an anime down in the list
  const moveDown = async (item: WatchListItem) => {
    const currentIndex = watchList.findIndex((i) => i.id === item.id);
    if (currentIndex >= watchList.length - 1) return; // Already at the bottom

    const nextItem = watchList[currentIndex + 1];
    const newOrder = nextItem.order_rank;

    try {
      // Backend'e güncelleme gönder -> Send update to backend
      const response = await axios.put(`${API_URL}/watchlist/order`, {
        id: item.id,
        order_rank: newOrder,
      });
      console.log("Order update response:", response.data);

      // Sonraki öğeyi de güncelle -> Update the next item as well
      const nextResponse = await axios.put(`${API_URL}/watchlist/order`, {
        id: nextItem.id,
        order_rank: item.order_rank,
      });
      console.log("Next item update response:", nextResponse.data);

      // UI'da listeyi güncelle -> Update the list in UI
      fetchWatchList();
      setSuccess("Order successfully updated");
      setOpenSnackbar(true);
    } catch (err: any) {
      console.error("Failed to update order:", err);
      setError(`Failed to update order: ${err.message || "Unknown error"}`);
      setOpenSnackbar(true);
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  // DnD sensörlerini ayarla
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum distance to start dragging
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Function to be called when drag ends
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setWatchList((items) => {
        // Find current order
        const oldIndex = items.findIndex(
          (item) => item.id.toString() === active.id
        );
        const newIndex = items.findIndex(
          (item) => item.id.toString() === over.id
        );

        // Calculate new order
        const newItems = arrayMove(items, oldIndex, newIndex);

        // Update backend
        const draggedItem = items[oldIndex];
        const targetItem = items[newIndex];

        // Make API call
        axios
          .put(`${API_URL}/watchlist/order`, {
            id: draggedItem.id,
            order_rank: targetItem.order_rank,
          })
          .then(() => {
            // Update the other item as well
            return axios.put(`${API_URL}/watchlist/order`, {
              id: targetItem.id,
              order_rank: draggedItem.order_rank,
            });
          })
          .then(() => {
            setSuccess("Order successfully updated");
            setOpenSnackbar(true);
          })
          .catch((err) => {
            console.error("Failed to update order:", err);
            setError(
              `Failed to update order: ${err.message || "Unknown error"}`
            );
            setOpenSnackbar(true);
            // Refresh list in case of error
            fetchWatchList();
          });

        return newItems;
      });
    }
  };

  // Go to anime page and open edit modal to complete an anime
  const completeAnime = (animeId: number) => {
    router.push(`/anime?id=${animeId}&edit=true&fromWatchList=true`);
  };

  useEffect(() => {
    fetchWatchList();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
      >
        <Typography variant="h4" component="h1" color={theme.primary_text}>
          Watch List
        </Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            onClick={syncPlanToWatch}
            sx={{ mr: 2 }}
            startIcon={<RefreshIcon />}
            disabled={loading}
          >
            Sync PTW Animes
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => router.push("/anime")}
            sx={{ mr: 2 }}
          >
            Go to Anime Page
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => router.push("/")}
          >
            Return to Main Page
          </Button>
        </Box>
      </Box>

      {error && (
        <Paper
          sx={{
            p: 2,
            mb: 3,
            backgroundColor: theme.error_light,
            color: theme.error_text,
          }}
        >
          <Typography>{error}</Typography>
        </Paper>
      )}

      <Button
        variant="outlined"
        color="primary"
        onClick={fetchWatchList}
        sx={{ mb: 2 }}
        startIcon={<RefreshIcon />}
        disabled={loading}
      >
        Refresh List
      </Button>

      {/* Watchlist */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : watchList.length === 0 ? (
        <Paper
          sx={{
            p: 4,
            textAlign: "center",
            backgroundColor: theme.background_light,
          }}
        >
          <Typography variant="h6" color={theme.secondary_text}>
            There are no animes in your watch list yet.
          </Typography>
          <Typography color={theme.secondary_text} sx={{ mt: 1 }}>
            Animes marked as PTW (Plan to Watch) will appear here.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => router.push("/anime")}
            sx={{ mt: 3 }}
          >
            Add Anime
          </Button>
        </Paper>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={watchList.map((item) => item.id.toString())}
            strategy={verticalListSortingStrategy}
          >
            <Stack spacing={2}>
              {watchList.map((item, index) => (
                <SortableWatchlistItem
                  key={item.id}
                  item={item}
                  index={index}
                  onMoveUp={moveUp}
                  onMoveDown={moveDown}
                  onRemove={removeFromWatchList}
                  onComplete={completeAnime}
                />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
      )}

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={error ? "error" : "success"}
          sx={{ width: "100%" }}
        >
          {error || success}
        </Alert>
      </Snackbar>
    </Container>
  );
}
