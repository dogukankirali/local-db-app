"use client";

import React, { JSX, Suspense, useCallback } from "react";
import dynamic from "next/dynamic";
import { Box, CircularProgress, IconButton, Tooltip } from "@mui/material";
import SyncRoundedIcon from "@mui/icons-material/SyncRounded";
import AnimeGrid from "../../components/AnimeGrid";
import AnimeDetailPanel from "../../components/anime/AnimeDetailPanel";
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
import { toast } from "sonner";
import { theme } from "../../theme/customTheme";
import TableViewSettings, { columnId, ROWS_PER_PAGE_OPTIONS } from "../../components/CollapsibleTableV2/Components/TableFilters/TableViewSettings";
import { StyledTeaButton } from "../../components/CollapsibleTableV2/Components/StyledComponents";
import Constants from "../../constants/Constants";
import { AnimeService } from "../../Services/AnimeServices";
import TableHeaders from "../../components/CollapsibleTableV2/Components/Headers/Headers";
import { useRouter, useSearchParams } from "next/navigation";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";

// Grid varsayılan görünüm: tablo (moment-timezone vb. ağır bağımlılıklarıyla) ve
// modallar yalnızca gerektiğinde yüklenir, ilk açılış paketine girmez.
const TableTemp = dynamic(() => import("../../components/CollapsibleTableV2/TableTemp"), {
  ssr: false,
}) as typeof import("../../components/CollapsibleTableV2/TableTemp").default;
const AnimeCreateDialog = dynamic(() => import("../../components/anime/AnimeCreateDialog"), { ssr: false });
const BulkImportDialog = dynamic(() => import("../../components/anime/BulkImportDialog"), { ssr: false });
const AnimeEditorDialog = dynamic(() => import("../../components/anime/AnimeEditorDialog"), { ssr: false });
const AnimeForm = dynamic(() => import("../../components/anime/AnimeForm"), { ssr: false });
const ExportMenu = dynamic(() => import("../../components/anime/ExportMenu"), { ssr: false });
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

const GRID_MIN_COLUMNS = 5;
const GRID_MAX_COLUMNS = 10;

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

  // İlk veri gelene kadar "No anime found" yerine yükleniyor durumu gösterilsin
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  // Grid isteklerinde kullanılan güncel filtreler (useTableFilters aşağıda tanımlı)
  const filterStateRef = useRef<TEATable.IFilterType[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "grid">("grid");
  // Kayıtlı görünüm okunana kadar hiçbir görünümü render etmiyoruz; aksi halde
  // tablo kayıtlıyken önce grid isteği de atılıyordu (çift istek).
  const [viewModeReady, setViewModeReady] = useState<boolean>(false);
  useEffect(() => {
    const saved = localStorage.getItem("viewMode");
    if (saved === "table" || saved === "grid") {
      setViewMode(saved);
    }
    const savedSize = Number(localStorage.getItem("gridSize"));
    if (savedSize >= GRID_MIN_COLUMNS && savedSize <= GRID_MAX_COLUMNS) {
      setGridSize(savedSize);
    }
    setViewModeReady(true);
  }, []);

  const handleViewModeChange = (newView: "table" | "grid") => {
    setViewMode(newView);
    localStorage.setItem("viewMode", newView);
  };
  // Grid sütun sayısı tarayıcıda saklanır; her girişte yeniden ayarlamak gerekmesin
  const [gridSize, setGridSize] = useState<number>(GRID_MIN_COLUMNS);
  const handleGridSizeChange = (size: number) => {
    setGridSize(size);
    localStorage.setItem("gridSize", String(size));
  };
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
    const filters = getFilledFilters(filterStateRef.current);
    try {
      const res = await AnimeService.getAnimes({ page, count, filters, order: lastFetchParams.current?.order || "asc", orderBy: lastFetchParams.current?.orderBy || "Name" });
      gridCachePage.current = page;
      gridTotalPages.current = res?.pagination?.totalPageCount || Infinity;
      setTotalCount(res?.pagination?.totalItemCount ?? null);
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
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  // Ctrl+K paletinden gelen kısayollar: /anime?new=1 (yeni anime) ve /anime?import=1 (CSV import)
  const paletteNew = useSearchParams().get("new");
  const paletteImport = useSearchParams().get("import");
  const navRouter = useRouter();
  useEffect(() => {
    if (paletteNew !== "1" && paletteImport !== "1") return;
    if (paletteNew === "1") setCreateModalData({ status: true });
    if (paletteImport === "1") setBulkImportOpen(true);
    navRouter.replace("/anime");
  }, [paletteNew, paletteImport]);
  const [genres, setGenres] = useState<{ value: string; label: string }[]>();
  const [series, setSeries] = useState<{ value: string; label: string }[]>([]);
  const [user, setUser] = useState<any>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tek anime sync (#20): AniList'teki güncel durum, bölüm, MAL puanı, kapak ve türler; kullanıcı verisine dokunmaz
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const syncOne = async (anime: TEATable.IAnime) => {
    if (!anime) return;
    setSyncingId(anime.ID);
    try {
      const res = await AnimeService.syncSingleAnime(anime);
      toast.success(res.message ? `Senkronize edildi: ${res.message}` : "Senkronize edildi");
      refreshAfterMutation("update", res.anime);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Senkronize edilemedi");
    } finally {
      setSyncingId(null);
    }
  };

  function SettingsButtons(id: string, i: number, data?: any): JSX.Element {
    let isAdmin = false;
    let isLoggedIn = false;
    if (typeof window !== 'undefined') {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData = JSON.parse(userStr);
          isAdmin = userData?.isAdmin || false;
          isLoggedIn = Boolean(userData);
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
              disabled={!isLoggedIn || data?.PlanToWatch}
            >
              <PlaylistAddIcon fontSize='small' />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title='Update Anime'>
          <span>
            <IconButton
              onClick={(e) => { e.stopPropagation(); setModalData({ status: true, type: 'update', data: data }); }}
              disabled={!isLoggedIn}
              sx={{ color: theme.primary, backgroundColor: 'transparent', '&:hover': { backgroundColor: 'rgba(0, 176, 240, 0.15)' } }}
              size='small'
            >
              <EditIcon fontSize='small' />
            </IconButton>
          </span>
        </Tooltip>
        {isAdmin && (
          <Tooltip title='AniList ile senkronize et'>
            <span>
              <IconButton
                onClick={(e) => { e.stopPropagation(); syncOne(data); }}
                disabled={syncingId === data?.ID}
                sx={{ color: theme.primary, backgroundColor: 'transparent', '&:hover': { backgroundColor: 'rgba(0, 176, 240, 0.15)' } }}
                size='small'
              >
                {syncingId === data?.ID ? <CircularProgress size={16} color='inherit' /> : <SyncRoundedIcon fontSize='small' />}
              </IconButton>
            </span>
          </Tooltip>
        )}
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
  // Tablo görünümü (filtre panelinin altında): sayfa başına satır ve gizli sütunlar, tarayıcıda saklanır
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  useEffect(() => {
    try {
      const rpp = Number(localStorage.getItem("tableRowsPerPage"));
      if (ROWS_PER_PAGE_OPTIONS.includes(rpp)) setRowsPerPage(rpp);
      const hidden = JSON.parse(localStorage.getItem("tableHiddenColumns") || "[]");
      if (Array.isArray(hidden)) setHiddenColumns(hidden);
    } catch {}
  }, []);
  const changeRowsPerPage = (n: number) => {
    setRowsPerPage(n);
    localStorage.setItem("tableRowsPerPage", String(n));
  };
  const changeHiddenColumns = (hidden: string[]) => {
    setHiddenColumns(hidden);
    localStorage.setItem("tableHiddenColumns", JSON.stringify(hidden));
  };
  const visibleColumns = outerColumns.filter((c) => !hiddenColumns.includes(columnId(c)));
  // Tablo sütunları sürükleyerek sıralanınca gizli sütunlar kaybolmasın: yeni sıra + gizliler
  const sortVisibleColumns: React.Dispatch<React.SetStateAction<TEATable.IColumnItems>> = (next) => {
    setOuterColumns((prev) => {
      const visibleNext = typeof next === "function" ? next(prev.filter((c) => !hiddenColumns.includes(columnId(c)))) : next;
      return [...visibleNext, ...prev.filter((c) => hiddenColumns.includes(columnId(c)))];
    });
  };
  filterStateRef.current = filterState;

  // Grid görünümünde filtre değişince listeyi baştan yükle (tablo kendi isteğini atıyor)
  const filtersKey = JSON.stringify(getFilledFilters(filterState));
  const lastGridFiltersKey = useRef(filtersKey);
  useEffect(() => {
    if (!viewModeReady || viewMode !== "grid" || lastGridFiltersKey.current === filtersKey) return;
    lastGridFiltersKey.current = filtersKey;
    gridCachePage.current = 0;
    gridTotalPages.current = Infinity;
    fetchGridPage(1, GRID_PRE_FETCH, true);
  }, [filtersKey, viewMode, viewModeReady]);

  // Üst bardaki arama (?q=) isim filtresine yansır
  const searchQuery = searchParams.get("q") ?? "";
  useEffect(() => {
    tableFilterProps.setFilterState((prev) =>
      prev.map((f): TEATable.IFilterType => (f.key === "Name" && f.value !== searchQuery ? ({ ...f, value: searchQuery } as TEATable.IFilterType) : f))
    );
  }, [searchQuery]);

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
        setTotalCount(res?.pagination?.totalItemCount ?? null);
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
        toast.error("Anime bilgisi bulunamadı, güncellenemedi");
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
        toast.success("Anime güncellendi");
        setModalData({ status: false });
        refreshAfterMutation("update", updatedData);
      }
    } catch (err) {
      console.error("Error updating anime:", err);
      toast.error("Anime güncellenirken hata oluştu");
    }
  }

  async function deleteAnime() {
    try {
      const res = await AnimeService.deleteAnime(modalData.data!);
      if (res.status === 200) {
        toast.success("Anime silindi");
        setModalData({ status: false });
        refreshAfterMutation("delete", modalData.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Anime silinirken hata oluştu");
    }
  }

  async function createAnime(draft: Record<string, any>): Promise<boolean> {
    try {
      const res = await AnimeService.createAnime(draft as TEATable.IAnime);
      if (res.status === 200) {
        toast.success("Anime eklendi");
        refreshAfterMutation("create");
        return true;
      }
    } catch (err) {
      console.error(err);
      toast.error("Anime eklenirken hata oluştu");
    }
    return false;
  }

  const tableRerender: TEATable.FetchData = async (params) => {
    getData(params);
  };

  useEffect(() => {
    getGenres();
    getSeries();
    setOuterColumns((prev) => {
      if (!prev.some((column) => column.type === "button")) {
        return [
          ...prev,
          {
            key: SettingsButtons,
            value: "İşlemler",
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
            toast.error("Düzenlenecek anime bulunamadı");
          }
        } catch (err) {
          console.error("Error getting anime information:", err);
          toast.error("Anime bilgisi alınamadı");
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
      toast.error("Çıkış yapılırken hata oluştu");
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
        toast.success("Watchlist'e eklendi");
        refreshAfterMutation("update", updatedData);
      }
    } catch (err) {
      console.error("Error adding anime to watchlist:", err);
      toast.error("Watchlist'e eklenirken hata oluştu");
    }
  }

  return (
    <div>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          // Topbar (64px) + main padding çıkınca kalan alan; grid/tablo kendi içinde kayar
          height: { xs: "calc(100dvh - 64px - 24px)", md: "calc(100dvh - 64px - 48px)" },
          width: "100%",
          overflow: "hidden",
        }}
      >
          <TableHeaders
            leading={
              <Box>
                <MuiTypography sx={{ fontSize: "1.35rem", fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1.2 }}>
                  Anime arşivi
                </MuiTypography>
                <MuiTypography sx={{ fontSize: "0.8rem", color: theme.secondary_text }}>
                  {totalCount === null ? "Yükleniyor…" : `${totalCount} anime${searchQuery ? ` · “${searchQuery}” araması` : ""}`}
                </MuiTypography>
              </Box>
            }
            trailing={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                {viewMode === "grid" && (
                  <Box sx={{ display: { xs: "none", lg: "flex" }, alignItems: "center", gap: 1.5, width: 150 }}>
                    <MuiTypography variant="caption" sx={{ color: theme.secondary_text, whiteSpace: "nowrap" }}>
                      Sütun {gridSize}
                    </MuiTypography>
                    <Slider value={gridSize} min={GRID_MIN_COLUMNS} max={GRID_MAX_COLUMNS} step={1} marks onChange={(e, val) => handleGridSizeChange(val as number)} size="small" />
                  </Box>
                )}
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(e, newView) => { if (newView) handleViewModeChange(newView as "table" | "grid"); }}
                  aria-label="Görünüm"
                  size="small"
                  sx={{
                    height: 38,
                    backgroundColor: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "10px",
                    p: "3px",
                    "& .MuiToggleButton-root": { border: 0, borderRadius: "7px !important", px: 1, color: theme.secondary_text },
                    "& .Mui-selected": { backgroundColor: "rgba(124,92,255,0.18) !important", color: `${theme.primary} !important` },
                  }}
                >
                  <ToggleButton value="table" aria-label="Tablo görünümü">
                    <ViewListIcon fontSize="small" />
                  </ToggleButton>
                  <ToggleButton value="grid" aria-label="Kart görünümü">
                    <ViewModuleIcon fontSize="small" />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            }
            genres={genres}
            filterState={filterState}
            tableFilterProps={tableFilterProps}
            outerColumns={outerColumns}
            setOuterColumns={setOuterColumns}
            setCreateModalData={setCreateModalData}
            handleClickFilters={handleClickFilters}
            actions={<ExportMenu filters={getFilledFilters(filterState)} orderBy={lastFetchParams.current?.orderBy} order={lastFetchParams.current?.order} />}
            onBulkImport={() => setBulkImportOpen(true)}
            filterExtra={
              viewMode === "table" ? (
                <TableViewSettings columns={outerColumns} hidden={hiddenColumns} onHiddenChange={changeHiddenColumns} rowsPerPage={rowsPerPage} onRowsPerPageChange={changeRowsPerPage} />
              ) : undefined
            }
            windowSize={windowSize}
            tableRerender={tableRerender}
            user={user}
          />

            {!viewModeReady ? null : viewMode === "grid" ? (
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <AnimeGrid
                  allData={gridCache}
                  loading={dataLoading}
                  loadingMore={gridLoadingMore}
                  gridSize={gridSize}
                  onLoadMore={handleGridLoadMore}
                  renderActions={renderGridActions}
                />
              </Box>
            ) : (
              <Box sx={{
                width: "100%",
                // Başlık çubuğundan kalan alanı doldurur; tablo kendi içinde kayar
                flex: 1,
                minHeight: 0,
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
                  header={visibleColumns}
                  sortHeader={sortVisibleColumns}
                  rowsPerPage={rowsPerPage}
                  collapsible={{
                    isCollapsible: true,
                    size: "xl",
                    innerComponent: AnimeDetailPanel,
                  }}
                  tableRerender={tableRerender}
                  selectionFilters={filterState}
                  setSelectionFilters={tableFilterProps.setFilterState}
                  loading={dataLoading}
                  lastFetchParams={lastFetchParams.current}
                />
              </Box>
            )}
      </Box>
      {modalData.status && modalData.type && (
        <AnimeEditorDialog
          open
          mode={modalData.type}
          data={modalData.data}
          onClose={() => setModalData({ status: false })}
          onChange={(patch) => setModalData((m) => ({ ...m, data: { ...(m.data as TEATable.IAnime), ...patch } }))}
          onSave={updateAnime}
          onDelete={deleteAnime}
          onRequestDelete={user?.isAdmin || isAdminFromStorage() ? () => setModalData((m) => ({ ...m, type: "delete" })) : undefined}
          form={
            <AnimeForm
              value={modalData.data ?? {}}
              genres={genres ?? []}
              catalogLocked={!user?.isAdmin && !isAdminFromStorage()}
              onChange={(patch) => setModalData((m) => ({ ...m, data: { ...(m.data as TEATable.IAnime), ...patch } }))}
            />
          }
        />
      )}
      {createModalData.status && (
        <AnimeCreateDialog open genres={genres ?? []} onClose={() => setCreateModalData({ status: false })} onCreate={createAnime} />
      )}
      {bulkImportOpen && (
        <BulkImportDialog open onClose={() => setBulkImportOpen(false)} onDone={() => refreshAfterMutation("create")} />
      )}
    </div>
  );
}

function isAdminFromStorage() {
  try {
    return Boolean(JSON.parse(localStorage.getItem("user") ?? "null")?.isAdmin);
  } catch {
    return false;
  }
}

export default function AnimePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AnimePageContent />
    </Suspense>
  );
}
