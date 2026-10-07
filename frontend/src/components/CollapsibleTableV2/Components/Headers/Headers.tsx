import { Badge, Box, Tooltip } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import TableFilters, { getFilledFilters } from "../TableFilters/TableFilters";
import { StyledMUIFilterButton, StyledTeaButton } from "../StyledComponents";
import { useRouter } from "next/navigation";

import FilterAltIcon from "@mui/icons-material/FilterAlt";
import SyncIcon from "@mui/icons-material/Sync";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import { AnimeService } from "../../../../Services/AnimeServices";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import SyncProgressIndicator from "../../../Sync/SyncProgressIndicator";
import { useAuth } from "../../../../contexts/AuthContext";

export default function TableHeaders(props: {
  genres: any;
  filterState: any;
  tableFilterProps: any;
  settingsProps?: any;
  outerColumns: any;
  setOuterColumns: any;
  setCreateModalData: any;
  handleClickFilters: any;
  handleClickSettings?: any;
  windowSize?: any;
  tableRerender?: TEATable.FetchData;
  user: any;
  // Toolbar'ın solunda (başlık/sayaç) ve aksiyonlardan önce (görünüm kontrolleri) gösterilecek içerik
  leading?: React.ReactNode;
  // Filtre panelinin altında gösterilecek tablo görünümü ayarları
  filterExtra?: React.ReactNode;
  // Filtre butonunun yanındaki ek ikon butonlar (ör. dışa aktar)
  actions?: React.ReactNode;
  // Admin için "CSV ile toplu ekle"
  onBulkImport?: () => void;
  trailing?: React.ReactNode;
}) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState({
    updated: 0,
    failed: 0,
    totalWork: 0,
    completed: 0,
  });
  const [syncCancelled, setSyncCancelled] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncMessage, setSyncMessage] = useState("");
  const [showProgressIndicator, setShowProgressIndicator] = useState(false);
  const syncControllerRef = useRef<AbortController | null>(null);
  const eventSourceRef = useRef<{ close: () => void } | null>(null);

  // Render sırasında localStorage okumak hydration hatası veriyordu; auth context mount sonrası doluyor
  const { isAdmin } = useAuth();
  const activeFilterCount = getFilledFilters(props.filterState ?? []).length;

  // Synchronize all anime
  const handleSyncAllAnime = async () => {
    try {
      // Clear previous abort controller
      if (syncControllerRef.current) {
        syncControllerRef.current.abort();
      }

      // Close previous event source if exists
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Create a new abort controller
      const controller = new AbortController();
      syncControllerRef.current = controller;

      setIsSyncing(true);
      setSyncCancelled(false);
      setSyncStats({ updated: 0, failed: 0, totalWork: 0, completed: 0 });
      setSyncProgress(0);
      setSyncMessage("Synchronization starting...");
      setShowProgressIndicator(true);

      // Use SSE for streaming updates
      eventSourceRef.current = AnimeService.syncAnimeDataStream(
        // onStart
        (data) => {
          setSyncStats({
            updated: 0,
            failed: 0,
            totalWork: data.totalWork,
            completed: 0,
          });
          setSyncMessage("Synchronization started");
        },
        // onProgress
        (data) => {
          setSyncStats({
            updated: data.updated,
            failed: data.failed,
            totalWork: data.totalWork,
            completed: data.completed,
          });
          setSyncProgress(data.progress);
          setSyncMessage(data.message);
        },
        // onComplete
        (data) => {
          setSyncStats({
            updated: data.updated,
            failed: data.failed,
            totalWork: data.totalWork,
            completed: data.completed,
          });
          setSyncProgress(100);
          setSyncMessage("Synchronization completed");

          // Reload the table
          if (props.tableRerender) {
            // First go to page 1
            props.tableRerender({
              page: 1,
              count: 10,
            });
          }

          if (!syncCancelled) {
            toast.success(`Anime data successfully synchronized: ${data.updated} updated, ${data.failed} failed`);
          }

          setIsSyncing(false);
          syncControllerRef.current = null;

          // Hide progress indicator after 3 seconds
          setTimeout(() => {
            setShowProgressIndicator(false);
          }, 3000);
        },
        // onError
        (error) => {
          console.error("Synchronization error:", error);

          // Don't show error message for cancelled requests
          if (error.name === "AbortError" || syncCancelled) {
            toast.error("Synchronization process was stopped by the user");
          } else {
            toast.error("Error synchronizing anime data");
          }

          setIsSyncing(false);
          syncControllerRef.current = null;

          // Hide progress indicator
          setShowProgressIndicator(false);
        }
      );
    } catch (err: any) {
      console.error("Synchronization setup error:", err);
      setIsSyncing(false);
      syncControllerRef.current = null;
      setShowProgressIndicator(false);
    }
  };

  // Stop synchronization process
  const handleStopSync = () => {
    if (syncControllerRef.current || eventSourceRef.current) {
      setSyncCancelled(true);

      if (syncControllerRef.current) {
        syncControllerRef.current.abort();
        syncControllerRef.current = null;
      }

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      setIsSyncing(false);
      setSyncMessage("Synchronization stopped");

      toast.error("Synchronization process stopped");

      // Hide progress indicator after 3 seconds
      setTimeout(() => {
        setShowProgressIndicator(false);
      }, 3000);
    }
  };

  // Close progress indicator
  const handleCloseProgressIndicator = () => {
    setShowProgressIndicator(false);
  };

  return (
    <Box>
      {props.genres && (
        <TableFilters
          filterState={props.filterState}
          {...props.tableFilterProps}
          extraSection={props.filterExtra}
          extraSectionTitle={props.filterExtra ? "Tablo görünümü" : undefined}
        />
      )}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          mb: 2.5,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ flex: "1 0 auto", whiteSpace: "nowrap" }}>{props.leading}</Box>
        {props.trailing}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title="Filtreler">
            <StyledMUIFilterButton
              onClick={props.handleClickFilters}
              aria-label="Filtreler"
              sx={activeFilterCount > 0 ? { color: "primary.main", borderColor: "rgba(255, 120, 73,0.5)" } : undefined}
            >
              <Badge badgeContent={activeFilterCount} color="primary" sx={{ "& .MuiBadge-badge": { fontSize: "0.65rem", height: 16, minWidth: 16, top: -4, right: -4 } }}>
                <FilterAltIcon sx={{ fontSize: 20 }} />
              </Badge>
            </StyledMUIFilterButton>
          </Tooltip>
          {isAdmin &&
            (!isSyncing ? (
              <Tooltip title="Tüm animeleri MAL ile senkronize et">
                <StyledMUIFilterButton onClick={handleSyncAllAnime} aria-label="Senkronize et">
                  <SyncIcon sx={{ fontSize: 20 }} />
                </StyledMUIFilterButton>
              </Tooltip>
            ) : (
              <Tooltip title="Senkronizasyonu durdur">
                <StyledMUIFilterButton onClick={handleStopSync} aria-label="Senkronizasyonu durdur" sx={{ color: "error.main" }}>
                  <SyncIcon sx={{ fontSize: 20, animation: "spin 2s linear infinite", "@keyframes spin": { to: { transform: "rotate(360deg)" } } }} />
                </StyledMUIFilterButton>
              </Tooltip>
            ))}
          {props.actions}
          {isAdmin && props.onBulkImport && (
            <Tooltip title="CSV ile toplu ekle">
              <StyledMUIFilterButton onClick={props.onBulkImport} aria-label="CSV ile toplu ekle">
                <UploadFileOutlinedIcon sx={{ fontSize: 20 }} />
              </StyledMUIFilterButton>
            </Tooltip>
          )}
        </Box>
        <StyledTeaButton
          onClick={() => router.push("/watchlist")}
          variant="outlined"
          sx={{
            backgroundColor: "transparent",
            color: "text.primary",
            border: "1px solid rgba(255,255,255,0.1)",
            "&:hover": { backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.16)" },
          }}
          startIcon={<PlaylistAddCheckIcon />}
        >
          Watchlist
        </StyledTeaButton>
        {isAdmin && (
          <StyledTeaButton onClick={() => props.setCreateModalData({ status: true })} startIcon={<AddRoundedIcon />}>
            Yeni anime
          </StyledTeaButton>
        )}
      </Box>

      {/* Sync Progress Indicator */}
      <SyncProgressIndicator
        isVisible={showProgressIndicator}
        progress={syncProgress}
        message={syncMessage}
        stats={syncStats}
        onClose={handleCloseProgressIndicator}
      />
    </Box>
  );
}
