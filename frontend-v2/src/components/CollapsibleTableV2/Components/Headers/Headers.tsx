import { Box, Typography } from "@mui/material";
import TableFilters from "../TableFilters/TableFilters";
import TableSettings from "../TableSettings";
import { StyledMUIFilterButton, StyledTeaButton } from "../StyledComponents";

import FilterAltIcon from "@mui/icons-material/FilterAlt";
import SettingsIcon from "@mui/icons-material/Settings";
import SyncIcon from "@mui/icons-material/Sync";
import Constants from "../../../../constants/Constants";
import FileUpload from "../../../Common/FileUpload";
import { AnimeService } from "../../../../services/AnimeServices";
import Toastify from "toastify-js";
import { useState, useRef } from "react";
import SyncProgressIndicator from "../../../Sync/SyncProgressIndicator";
import axios from "axios";

export default function TableHeaders(props: {
  genres: any;
  filterState: any;
  tableFilterProps: any;
  settingsProps: any;
  outerColumns: any;
  setOuterColumns: any;
  setCreateModalData: any;
  handleClickFilters: any;
  handleClickSettings: any;
  windowSize: any;
  tableRerender?: TEATable.FetchData;
  user: any;
}) {
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
  const eventSourceRef = useRef<{
    eventSource: EventSource;
    close: () => void;
  } | null>(null);

  // isAdmin kontrolü ekleyelim
  let isAdmin = false;

  // Props'tan gelen user bilgisini kullan
  if (props.user) {
    isAdmin = props.user.isAdmin || false;
  }
  // Eğer props'tan gelen user bilgisi yoksa localStorage'dan kontrol et
  else if (typeof window !== "undefined") {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        isAdmin = userData?.isAdmin || false;
      }
    } catch (error) {
      console.error("Kullanıcı bilgisi ayrıştırılamadı:", error);
    }
  }

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
      setSyncMessage("Senkronizasyon başlatılıyor...");
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
          setSyncMessage("Senkronizasyon başladı");
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
          setSyncMessage("Senkronizasyon tamamlandı");

          // Reload the table
          if (props.tableRerender) {
            // First go to page 1
            props.tableRerender({
              page: 1,
              count: 10,
            });
          }

          if (!syncCancelled) {
            Toastify({
              text: `Anime verileri başarıyla senkronize edildi: ${data.updated} güncellendi, ${data.failed} başarısız`,
              duration: 3000,
              close: true,
              gravity: "top",
              position: "right",
              backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
              stopOnFocus: true,
            }).showToast();
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
            Toastify({
              text: "Senkronizasyon işlemi kullanıcı tarafından durduruldu",
              duration: 3000,
              close: true,
              gravity: "top",
              position: "right",
              backgroundColor: "linear-gradient(to right, #ff9966, #ff5e62)",
              stopOnFocus: true,
            }).showToast();
          } else {
            Toastify({
              text: "Anime verilerini senkronize ederken hata oluştu",
              duration: 3000,
              close: true,
              gravity: "top",
              position: "right",
              backgroundColor: "linear-gradient(to right, #ff5f6d, #ffc371)",
              stopOnFocus: true,
            }).showToast();
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

      // Backend'e iptal isteği gönder
      AnimeService.cancelSync()
        .then(() => {
          console.log("Backend senkronizasyon iptal isteği gönderildi");
        })
        .catch((err) => {
          console.error(
            "Backend senkronizasyon iptal isteği gönderilirken hata oluştu:",
            err
          );
        });

      setIsSyncing(false);
      setSyncMessage("Senkronizasyon durduruldu");

      Toastify({
        text: "Senkronizasyon işlemi durduruldu",
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        backgroundColor: "linear-gradient(to right, #ff9966, #ff5e62)",
        stopOnFocus: true,
      }).showToast();

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
        />
      )}
      <TableSettings
        {...props.settingsProps}
        headers={props.outerColumns}
        setHeaders={props.setOuterColumns}
        headerOpts={Constants({ type: "headers" })}
      />
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: props.windowSize.width < 768 ? 1 : 2,
          mb: 2,
          flexWrap: props.windowSize.width < 768 ? "wrap" : "nowrap",
        }}
      >
        <StyledTeaButton
          onClick={() => {
            props.setCreateModalData({ status: true });
          }}
          disabled={!isAdmin}
          sx={{
            fontFamily: "inherit",
            fontSize: props.windowSize.width < 768 ? "0.75rem" : "inherit",
            padding: props.windowSize.width < 768 ? "6px 10px" : "8px 16px",
            opacity: !isAdmin ? 0.5 : 1,
            cursor: !isAdmin ? "not-allowed" : "pointer",
          }}
          color="primary"
        >
          <Typography
            variant={props.windowSize.width < 768 ? "caption" : "button"}
          >
            Create
          </Typography>
        </StyledTeaButton>
        {!isSyncing ? (
          <StyledTeaButton
            onClick={handleSyncAllAnime}
            disabled={isSyncing || !isAdmin}
            sx={{
              fontFamily: "inherit",
              fontSize: props.windowSize.width < 768 ? "0.75rem" : "inherit",
              padding: props.windowSize.width < 768 ? "6px 10px" : "8px 16px",
              opacity: !isAdmin ? 0.5 : 1,
              cursor: !isAdmin ? "not-allowed" : "pointer",
            }}
            color="primary"
          >
            <SyncIcon
              sx={{
                mr: 1,
                fontSize: props.windowSize.width < 768 ? "0.875rem" : "1.25rem",
              }}
            />
            <Typography
              variant={props.windowSize.width < 768 ? "caption" : "button"}
            >
              {props.windowSize.width < 768 ? "Sync" : "Sync All"}
            </Typography>
          </StyledTeaButton>
        ) : (
          <StyledTeaButton
            onClick={handleStopSync}
            sx={{
              fontFamily: "inherit",
              fontSize: props.windowSize.width < 768 ? "0.75rem" : "inherit",
              padding: props.windowSize.width < 768 ? "6px 10px" : "8px 16px",
            }}
            color="error"
          >
            <SyncIcon
              sx={{
                mr: 1,
                animation: "spin 2s linear infinite",
                fontSize: props.windowSize.width < 768 ? "0.875rem" : "1.25rem",
              }}
            />
            <Typography
              variant={props.windowSize.width < 768 ? "caption" : "button"}
            >
              {props.windowSize.width < 768 ? "Stop" : "Stop Sync"}
            </Typography>
          </StyledTeaButton>
        )}
        <StyledMUIFilterButton
          onClick={props.handleClickFilters}
          sx={{
            padding: props.windowSize.width < 768 ? "6px" : "8px",
          }}
        >
          <FilterAltIcon
            sx={{
              fontSize: props.windowSize.width < 768 ? "1.25rem" : "1.5rem",
            }}
          />
        </StyledMUIFilterButton>
        <StyledMUIFilterButton
          onClick={props.handleClickSettings}
          sx={{
            padding: props.windowSize.width < 768 ? "6px" : "8px",
          }}
        >
          <SettingsIcon
            sx={{
              fontSize: props.windowSize.width < 768 ? "1.25rem" : "1.5rem",
            }}
          />
        </StyledMUIFilterButton>
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
