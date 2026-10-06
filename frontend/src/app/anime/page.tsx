"use client";

import React, { JSX, Suspense, useCallback } from "react";
import {
  Box,
  Container,
  Typography,
  IconButton,
  Avatar,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
} from "@mui/material";
import TableTemp from "../../components/CollapsibleTableV2/TableTemp";
import AnimeGrid from "../../components/AnimeGrid";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import { Slider, Typography as MuiTypography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import {
  getFilledFilters,
  useTableFilters,
} from "../../components/CollapsibleTableV2/Components/TableFilters/TableFilters";
import axios from "axios";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";
import { theme } from "../../theme/customTheme";
import { useTableSettings } from "../../components/CollapsibleTableV2/Components/TableSettings";
import { StyledTeaButton } from "../../components/CollapsibleTableV2/Components/StyledComponents";
import "../../assets/custom.css";
import CreateAnimeModal from "../../components/Modals/CreateAnimeModal";
import Constants from "../../constants/Constants";
import { AnimeService } from "../../Services/AnimeServices";
import TableHeaders from "../../components/CollapsibleTableV2/Components/Headers/Headers";
import UpdateDeleteAnimeModal from "../../components/Modals/UpdateDeleteAnimeModal";
import { useRouter, useSearchParams } from "next/navigation";
import PersonIcon from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

function AnimePageContent() {
  const [windowSize, setWindowSize] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });

      const handleResize = () => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      };

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }
  }, []);

  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"table" | "grid">("grid");
  // Kayıtlı görünüm okunana kadar hiçbir görünümü render etmiyoruz; aksi halde
  // tablo kayıtlıyken önce grid isteği de atılıyordu (çift istek).
  const [viewModeReady, setViewModeReady] = useState<boolean>(false);
  useEffect(() => {
    const saved = localStorage.getItem("viewMode");
    if (saved === "table" || saved === "grid") {
      setViewMode(saved);
    }
    setViewModeReady(true);
  }, []);
  
  const handleViewModeChange = (newView: "table" | "grid") => {
    setViewMode(newView);
    localStorage.setItem("viewMode", newView);
  };
  const [gridSize, setGridSize] = useState<number>(5);
  // Grid-specific cache: accumulates all loaded anime so column changes don't cause refetch
  const [gridCache, setGridCache] = useState<TEATable.IAnime[]>([]);
  const gridCachePage = useRef<number>(0); // last fetched page for grid
  const gridTotalPages = useRef<number>(Infinity);
  const [gridLoadingMore, setGridLoadingMore] = useState<boolean>(false);
  const gridFetchInFlight = useRef<boolean>(false);
  const GRID_PRE_FETCH = 24; // initial batch & page size for infinite scroll

  // Initial grid load & when viewMode switches to grid
  useEffect(() => {
    if (viewModeReady && viewMode === "grid" && gridCache.length === 0) {
      fetchGridPage(1, GRID_PRE_FETCH, true);
    }
  }, [viewMode, viewModeReady]);

  // gridSize change → no refetch, just re-layout (cache already has the data)

  const fetchGridPage = async (page: number, count: number, reset: boolean) => {
    if (gridFetchInFlight.current && !reset) return;
    gridFetchInFlight.current = true;
    if (reset) {
      setGridLoadingMore(false);
      setDataLoading(true);
    } else {
      setGridLoadingMore(true);
    }
    const filters = getFilledFilters(lastFetchParams.current?.filters ?? []);
    try {
      const res = await AnimeService.getAnimes({ page, count, filters, order: lastFetchParams.current?.order || "asc", orderBy: lastFetchParams.current?.orderBy || "Name" });
      gridCachePage.current = page;
      gridTotalPages.current = res?.pagination?.totalPageCount || Infinity;
      if (reset) {
        setGridCache(res?.data || []);
        setTableData(res); // keep tableData in sync for table view
      } else {
        setGridCache(prev => [...prev, ...(res?.data || [])]);
      }
    } catch (err) {
      console.error("Grid fetch error:", err);
    } finally {
      gridFetchInFlight.current = false;
      setDataLoading(false);
      setGridLoadingMore(false);
    }
  };

  // Stable reference so AnimeGrid's IntersectionObserver isn't rebuilt on every render
  const fetchGridPageRef = useRef(fetchGridPage);
  fetchGridPageRef.current = fetchGridPage;
  const handleGridLoadMore = useCallback(() => {
    if (gridFetchInFlight.current) return;
    const nextPage = gridCachePage.current + 1;
    if (nextPage <= gridTotalPages.current) {
      fetchGridPageRef.current(nextPage, GRID_PRE_FETCH, false);
    }
  }, []);

  // After a create/update/delete: keep gridCache in sync without refetching
  // everything, and only hit the table endpoint when the table is visible.
  const refreshAfterMutation = (
    kind: "create" | "update" | "delete",
    anime?: TEATable.IAnime
  ) => {
    if (kind === "create") {
      setGridCache([]);
      gridCachePage.current = 0;
      gridTotalPages.current = Infinity;
      if (viewMode === "grid") fetchGridPage(1, GRID_PRE_FETCH, true);
    } else if (anime) {
      setGridCache((prev) =>
        kind === "delete"
          ? prev.filter((a) => a.ID !== anime.ID)
          : prev.map((a) => (a.ID === anime.ID ? { ...a, ...anime } : a))
      );
    }
    if (viewMode === "table") {
      if (lastFetchParams.current) {
        getData(lastFetchParams.current);
      } else {
        getData({ page: 1, count: 20, filters: [], order: "asc", orderBy: "Name" });
      }
    }
  };

  const [outerColumns, setOuterColumns] = useState<TEATable.IColumnItems>(
    Constants({ type: "outerColumns", additionalData: { SettingsButtons } })!
  );
  const [innerColumns] = useState(Constants({ type: "innerColumns" })!);
  const [tableData, setTableData] = useState<
    TEAData.WPagination<TEATable.IAnime>
  >({
    data: [],
    pagination: {
      currentPage: 1,
      itemCount: 0,
      totalItemCount: 0,
      itemsPerPage: 10,
      totalPageCount: 0,
    },
  });
  const [modalData, setModalData] = useState<{
    data?: TEATable.IAnime;
    type?: "update" | "delete";
    status: boolean;
  }>({ status: false });
  const [createModalData, setCreateModalData] = useState<{
    data?: TEATable.IAnime;
    status: boolean;
  }>({ status: false });
  const [genres, setGenres] = useState<{ value: string; label: string }[]>();
  const [series, setSeries] = useState<{ value: string; label: string }[]>([]);
  const [user, setUser] = useState<any>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  function SettingsButtons(id: string, i: number, data?: any): JSX.Element {
    let isAdmin = false;
    if (typeof window !== 'undefined') {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData = JSON.parse(userStr);
          isAdmin = userData?.isAdmin || false;
        }
      } catch (error) {
        console.error('User information parsing failed:', error);
      }
    }

    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5 }}>
        <Tooltip title={data?.PlanToWatch ? 'Already in Watchlist' : 'Add to Watchlist'}>
          <span>
            <IconButton
              onClick={(e) => { e.stopPropagation(); addToWatchlist(data); }}
              sx={{ color: theme.success_alt, backgroundColor: 'transparent', '&:hover': { backgroundColor: 'rgba(16, 185, 129, 0.15)' }, opacity: data?.PlanToWatch ? 0.5 : 1 }}
              size='small'
              disabled={!isAdmin || data?.PlanToWatch}
            >
              <PlaylistAddIcon fontSize='small' />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title='Update Anime'>
          <span>
            <IconButton
              onClick={(e) => { e.stopPropagation(); setModalData({ status: true, type: 'update', data: data }); }}
              disabled={!isAdmin}
              sx={{ color: theme.primary, backgroundColor: 'transparent', '&:hover': { backgroundColor: 'rgba(0, 176, 240, 0.15)' } }}
              size='small'
            >
              <EditIcon fontSize='small' />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title='Delete Anime'>
          <span>
            <IconButton
              onClick={(e) => { e.stopPropagation(); setModalData({ status: true, type: 'delete', data: data }); }}
              disabled={!isAdmin}
              sx={{ color: theme.danger, backgroundColor: 'transparent', '&:hover': { backgroundColor: 'rgba(255, 0, 0, 0.15)' } }}
              size='small'
            >
              <DeleteIcon fontSize='small' />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    );
  }

  // Same IconButton actions for grid cards; stable identity keeps memoized cards from re-rendering
  const settingsButtonsRef = useRef(SettingsButtons);
  settingsButtonsRef.current = SettingsButtons;
  const renderGridActions = useCallback(
    (anime: TEATable.IAnime) =>
      settingsButtonsRef.current(String(anime.ID), 0, anime),
    []
  );

  const { filterState, handleClickFilters, ...tableFilterProps } =
    useTableFilters(Constants({ type: "tableFilters", additionalData: { genres, series } })!, () => {});
  const { handleClickSettings, ...settingsProps } = useTableSettings();

  const getGenres = async () => {
    try {
      const res = await AnimeService.getGenres();
      setGenres(res);
    } catch (err) {
      console.error(err);
    }
  };

  const getSeries = async () => {
    try {
      const res = await AnimeService.getSeries();
      setSeries(res);
    } catch (err) {
      console.error(err);
    }
  };


  const lastFetchParams = useRef<TEATable.FetchDataParams | undefined>(
    undefined
  );
  const getData: TEATable.FetchData = async (params) => {
    setDataLoading(true);
    lastFetchParams.current = { ...params };
    let aborted = false;
    const filters = getFilledFilters(params.filters ?? []);

    try {
      console.log("Fetching data:", { ...params, filters });
      const res = await AnimeService.getAnimes({ ...params, filters });

      if (!aborted) {
        setTableData(res);
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        aborted = true;
      } else {
        console.error("Data fetching error:", err);
      }
    }

    if (!aborted) {
      setDataLoading(false);
    }
  };

  async function updateAnime() {
    try {
      const fromWatchList = searchParams.get("fromWatchList") === "true";

      // Ensure modalData.data is defined
      if (!modalData.data) {
        console.error("Anime data not found");
        Toastify({
          text: "Anime data not found, update is not possible",
          duration: 3000,
          close: true,
          gravity: "top",
          position: "right",
          backgroundColor: "linear-gradient(to right, #ff5f6d, #ffc371)",
          stopOnFocus: true,
        }).showToast();
        return;
      }

      // Log data to be sent to backend
      console.log("Anime data to be sent to backend:", modalData.data);
      console.log("Coming from Watch List:", fromWatchList ? "Yes" : "No");

      // Clone and cast data to IAnime type
      const updatedData: TEATable.IAnime = { ...modalData.data };

      // If coming from watchlist, set WatchStatus and PlanToWatch values once
      if (fromWatchList) {
        updatedData.WatchStatus = -1;
        updatedData.PlanToWatch = false;

        console.log(
          "Special values set because it was opened from Watchlist (final check):"
        );
        console.log("WatchStatus value: set to -1");
        console.log("PlanToWatch value: set to false");
      } else {
        console.log("Normal editing. Existing values are preserved:");
        console.log("WatchStatus value:", updatedData.WatchStatus);
        console.log("PlanToWatch value:", updatedData.PlanToWatch);
      }

      const res = await AnimeService.updateAnime(updatedData);
      if (res.status === 200) {
        Toastify({
          text: "Anime successfully updated",
          duration: 3000,
          close: true,
          gravity: "top",
          position: "right",
          backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
          stopOnFocus: true,
        }).showToast();
        setModalData({ status: false });
        refreshAfterMutation("update", updatedData);
      }
    } catch (err) {
      console.error("Error updating anime:", err);
      Toastify({
        text: "An error occurred while updating the anime",
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        backgroundColor: "linear-gradient(to right, #ff5f6d, #ffc371)",
        stopOnFocus: true,
      }).showToast();
    }
  }

  async function deleteAnime() {
    try {
      const res = await AnimeService.deleteAnime(modalData.data!);
      if (res.status === 200) {
        Toastify({
          text: "Anime successfully deleted",
          duration: 3000,
          close: true,
          gravity: "top",
          position: "right",
          backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
          stopOnFocus: true,
        }).showToast();
        setModalData({ status: false });
        refreshAfterMutation("delete", modalData.data);
      }
    } catch (err) {
      console.error(err);
      Toastify({
        text: "An error occurred while deleting the anime",
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        backgroundColor: "linear-gradient(to right, #ff5f6d, #ffc371)",
        stopOnFocus: true,
      }).showToast();
    }
  }

  async function createAnime() {
    try {
      const res = await AnimeService.createAnime(createModalData.data!);
      if (res.status === 200) {
        Toastify({
          text: "Anime successfully created",
          duration: 3000,
          close: true,
          gravity: "top",
          position: "right",
          backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
          stopOnFocus: true,
        }).showToast();
        setCreateModalData({ status: false });
        refreshAfterMutation("create");
      }
    } catch (err) {
      console.error(err);
      Toastify({
        text: "An error occurred while creating the anime",
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        backgroundColor: "linear-gradient(to right, #ff5f6d, #ffc371)",
        stopOnFocus: true,
      }).showToast();
    }
  }

  const tableRerender: TEATable.FetchData = async (params) => {
    getData(params);
  };

  useEffect(() => {
    getGenres();
    getSeries();
    setOuterColumns((prev) => {
      if (!prev.some((column) => column.value === "Settings")) {
        return [
          ...prev,
          {
            key: SettingsButtons,
            value: "Settings",
            width: "5%",
            type: "button",
          },
        ];
      } else {
        return prev;
      }
    });
  }, []);

  // Load user information
  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);
        console.log("User information loaded:", userData);
      }
    } catch (error) {
      console.error("Error loading user information:", error);
    }
  }, []);

  // Open anime edit mode based on URL parameters
  useEffect(() => {
    const id = searchParams.get("id");
    const edit = searchParams.get("edit");
    const fromWatchList = searchParams.get("fromWatchList");

    if (id && edit === "true") {
      const animeId = parseInt(id);
      console.log("Opening anime edit modal, ID:", animeId);
      console.log(
        "Coming from Watch List:",
        fromWatchList === "true" ? "Yes" : "No"
      );

      // Fetch and open the anime for editing
      const fetchAnimeForEdit = async () => {
        try {
          const response = await AnimeService.getAnime(animeId);
          console.log("API Response:", response);

          if (response && response.data && response.data.data) {
            // Backend response: { status: "success", data: { anime data... } }
            // Therefore we use response.data.data
            const backendData = response.data.data;

            // Log detailed backend data
            console.log("Anime data from backend:", backendData);
            console.log("Data fields:", Object.keys(backendData));

            // Convert data to frontend format
            const convertedData: any = {};

            // First convert all fields
            Object.keys(backendData).forEach((key) => {
              // Capitalize first letter of key and keep the rest as is
              const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
              convertedData[capitalizedKey] = backendData[key];
            });

            // If coming from watchlist, specially set WatchStatus and PlanToWatch values
            if (fromWatchList === "true") {
              // Force set WatchStatus and PlanToWatch values
              // Even if the backend fields have different names, change the values here
              convertedData["WatchStatus"] = -1;
              convertedData["PlanToWatch"] = false;

              console.log(
                "Special values set because it was opened from Watchlist:"
              );
              console.log("WatchStatus value: set to -1");
              console.log("PlanToWatch value: set to false");
            } else {
              console.log("Normal editing. Original values preserved:");
              console.log("WatchStatus value:", convertedData["WatchStatus"]);
              console.log("PlanToWatch value:", convertedData["PlanToWatch"]);
            }

            console.log("Converted data:", convertedData);

            setModalData({
              status: true,
              type: "update",
              data: convertedData, // Use converted data
            });
          } else {
            console.error(
              "Anime not found or data structure not as expected, ID:",
              animeId
            );
            Toastify({
              text: "Anime to be edited not found or data structure not appropriate",
              duration: 3000,
              close: true,
              gravity: "top",
              position: "right",
              backgroundColor: "linear-gradient(to right, #ff5f6d, #ffc371)",
              stopOnFocus: true,
            }).showToast();
          }
        } catch (err) {
          console.error("Error getting anime information:", err);
          Toastify({
            text: "An error occurred while getting anime information",
            duration: 3000,
            close: true,
            gravity: "top",
            position: "right",
            backgroundColor: "linear-gradient(to right, #ff5f6d, #ffc371)",
            stopOnFocus: true,
          }).showToast();
        }
      };

      fetchAnimeForEdit();
    }
  }, [searchParams]);

  const handleProfileMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    handleCloseMenu();
    router.push("/profile");
  };

  const handleLogout = async () => {
    handleCloseMenu();
    try {
      // Logout process
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      router.push("/login");
    } catch (error) {
      console.error("Error occurred during logout:", error);
      Toastify({
        text: "An error occurred while logging out",
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        backgroundColor: "linear-gradient(to right, #ff5f6d, #ffc371)",
        stopOnFocus: true,
      }).showToast();
    }
  };

  async function addToWatchlist(animeData: TEATable.IAnime) {
    try {
      // Create a copy of the anime data
      const updatedData: TEATable.IAnime = { ...animeData };

      // Set WatchStatus to -1 and PlanToWatch to true
      updatedData.PlanToWatch = true;

      console.log("Adding to watchlist with values:");
      console.log("WatchStatus value: set to -1");
      console.log("PlanToWatch value: set to true");

      const res = await AnimeService.updateAnime(updatedData);
      if (res.status === 200) {
        Toastify({
          text: "Anime successfully added to watchlist",
          duration: 3000,
          close: true,
          gravity: "top",
          position: "right",
          backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
          stopOnFocus: true,
        }).showToast();
        refreshAfterMutation("update", updatedData);
      }
    } catch (err) {
      console.error("Error adding anime to watchlist:", err);
      Toastify({
        text: "An error occurred while adding anime to watchlist",
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        backgroundColor: "linear-gradient(to right, #ff5f6d, #ffc371)",
        stopOnFocus: true,
      }).showToast();
    }
  }

  return (
    <div>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          width: "100%",
          overflow: "hidden",
          "@media (max-width: 768px)": {
            width: "100%",
            position: "absolute",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            padding: "10px",
            left: "0px",
            top: "50px",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            width: "100%",
            padding: windowSize.width < 768 ? "10px" : "20px",
            overflow: "hidden",
          }}
        >
          <TableHeaders
            genres={genres}
            filterState={filterState}
            tableFilterProps={tableFilterProps}
            settingsProps={settingsProps}
            outerColumns={outerColumns}
            setOuterColumns={setOuterColumns}
            setCreateModalData={setCreateModalData}
            handleClickFilters={handleClickFilters}
            handleClickSettings={handleClickSettings}
            windowSize={windowSize}
            tableRerender={tableRerender}
            user={user}
          />

          
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, mr: 2 }}>
              
              {viewMode === 'grid' && (
                <Box sx={{ display: 'flex', alignItems: 'center', mr: 3, width: '150px' }}>
                  <MuiTypography variant="caption" sx={{ color: theme.secondary_text, mr: 2, whiteSpace: 'nowrap' }}>
                    Sütun: {gridSize}
                  </MuiTypography>
                  <Slider
                    value={gridSize}
                    min={2}
                    max={8}
                    step={1}
                    onChange={(e, val) => setGridSize(val as number)}
                    size="small"
                  />
                </Box>
              )}

              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(e, newView) => { if (newView) handleViewModeChange(newView as "table" | "grid"); }}
                aria-label="view toggle"
                size="small"
                sx={{ backgroundColor: theme.table_row_light }}
              >
                <ToggleButton value="table" aria-label="table view">
                  <ViewListIcon sx={{ color: viewMode === 'table' ? theme.primary : theme.secondary_text }} />
                </ToggleButton>
                <ToggleButton value="grid" aria-label="grid view">
                  <ViewModuleIcon sx={{ color: viewMode === 'grid' ? theme.primary : theme.secondary_text }} />
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {!viewModeReady ? null : viewMode === "grid" ? (
              <AnimeGrid
                allData={gridCache}
                loading={dataLoading}
                loadingMore={gridLoadingMore}
                gridSize={gridSize}
                onLoadMore={handleGridLoadMore}
                renderActions={renderGridActions}
              />
            ) : (
              <Box sx={{
                width: "100%",
                height: "100%",
                "& .MuiPaper-root": { backgroundColor: "transparent", boxShadow: "none", border: "none" },
                "& .MuiTableHead-root": { 
                   "& .MuiTableCell-root": { backgroundColor: "transparent", color: theme.primary, borderBottom: "2px solid rgba(255,255,255,0.05)", fontSize: "0.85rem", fontWeight: "bold", padding: "8px 12px" }
                },
                "& .MuiTableBody-root .MuiTableRow-root": {
                   transition: "background-color 0.2s ease",
                   backgroundColor: "transparent",
                   display: "table-row",
                   "&:hover": {
                      backgroundColor: "rgba(255,255,255,0.03)",
                   },
                   "& .MuiTableCell-root": { 
                      borderBottom: "1px solid rgba(255,255,255,0.03)", 
                      backgroundColor: "transparent !important", // Fix crazy column colors
                      padding: "8px 12px" // More compact
                   }
                }
              }}>
                <TableTemp
                  tableName="anime-table"
                  data={tableData}
                  setData={setTableData}
                  header={outerColumns}
                  sortHeader={setOuterColumns}
                  collapsible={{
                    isCollapsible: true,
                    size: "xl",
                    inner: {
                      type: "list",
                      list: innerColumns,
                      listType: "detail",
                    },
                  }}
                  tableRerender={tableRerender}
                  style={{
                    height: windowSize.height - (windowSize.width < 768 ? 150 : 200),
                    width: "100%",
                    maxWidth: "100vw",
                  }}
                  selectionFilters={filterState}
                  setSelectionFilters={tableFilterProps.setFilterState}
                  loading={dataLoading}
                  dimensions={{
                    height: windowSize.height - (windowSize.width < 768 ? 150 : 200),
                    width: windowSize.width - (windowSize.width < 768 ? 20 : 150),
                  }}
                  lastFetchParams={lastFetchParams.current}
                />
              </Box>
            )}
        </Box>
      </Box>
      <UpdateDeleteAnimeModal
        modalData={modalData}
        setModalData={setModalData}
        updateAnime={updateAnime}
        deleteAnime={deleteAnime}
        genres={genres}
      />
      <CreateAnimeModal
        genres={genres}
        createModalData={createModalData}
        setCreateModalData={setCreateModalData}
        handleCreate={createAnime}
      />
    </div>
  );
}

export default function AnimePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AnimePageContent />
    </Suspense>
  );
}
