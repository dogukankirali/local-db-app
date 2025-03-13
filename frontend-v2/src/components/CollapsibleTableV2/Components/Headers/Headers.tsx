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
}) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState({ updated: 0, failed: 0 });
  const [syncCancelled, setSyncCancelled] = useState(false);
  const syncControllerRef = useRef<AbortController | null>(null);

  // Synchronize all anime
  const handleSyncAllAnime = async () => {
    try {
      // Clear previous abort controller
      if (syncControllerRef.current) {
        syncControllerRef.current.abort();
      }

      // Create a new abort controller
      const controller = new AbortController();
      syncControllerRef.current = controller;

      setIsSyncing(true);
      setSyncCancelled(false);
      setSyncStats({ updated: 0, failed: 0 });

      // Send request to backend with signal parameter
      const res = await AnimeService.syncAnimeData(controller.signal);

      // Update synchronization statistics
      setSyncStats({
        updated: res.data.updated,
        failed: res.data.failed,
      });

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
          text: `Anime data successfully synchronized: ${res.data.updated} updated, ${res.data.failed} failed`,
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
    } catch (err: any) {
      // Don't show error message for cancelled requests
      if (err.name === "AbortError") {
        Toastify({
          text: "Synchronization process stopped by user",
          duration: 3000,
          close: true,
          gravity: "top",
          position: "right",
          backgroundColor: "linear-gradient(to right, #ff9966, #ff5e62)",
          stopOnFocus: true,
        }).showToast();
      } else {
        console.error("Synchronization error:", err);
        Toastify({
          text: "Error occurred while synchronizing anime data",
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
    }
  };

  // Stop synchronization process
  const handleStopSync = () => {
    if (syncControllerRef.current) {
      setSyncCancelled(true);
      syncControllerRef.current.abort();
      syncControllerRef.current = null;
      setIsSyncing(false);

      Toastify({
        text: "Synchronization process stopped",
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        backgroundColor: "linear-gradient(to right, #ff9966, #ff5e62)",
        stopOnFocus: true,
      }).showToast();
    }
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
          gap: 2,
          mb: 2,
        }}
      >
        <StyledTeaButton
          onClick={() => {
            props.setCreateModalData({ status: true });
          }}
          sx={{ fontFamily: "inherit" }}
          color="primary"
        >
          <Typography variant="button">Create</Typography>
        </StyledTeaButton>
        {!isSyncing ? (
          <StyledTeaButton
            onClick={handleSyncAllAnime}
            disabled={isSyncing}
            sx={{ fontFamily: "inherit" }}
            color="primary"
          >
            <SyncIcon sx={{ mr: 1 }} />
            <Typography variant="button">Sync All</Typography>
          </StyledTeaButton>
        ) : (
          <StyledTeaButton
            onClick={handleStopSync}
            sx={{ fontFamily: "inherit" }}
            color="error"
          >
            <SyncIcon sx={{ mr: 1 }} />
            <Typography variant="button">Stop Sync</Typography>
          </StyledTeaButton>
        )}
        {syncStats.updated > 0 && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="caption" sx={{ color: "success.main" }}>
              {syncStats.updated} updated
            </Typography>
            <Typography variant="caption" sx={{ color: "error.main" }}>
              {syncStats.failed} failed
            </Typography>
          </Box>
        )}
        <StyledMUIFilterButton onClick={props.handleClickFilters}>
          <FilterAltIcon />
        </StyledMUIFilterButton>
        <StyledMUIFilterButton onClick={props.handleClickSettings}>
          <SettingsIcon />
        </StyledMUIFilterButton>
      </Box>
    </Box>
  );
}
