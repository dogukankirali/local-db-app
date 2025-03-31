"use client";

import React, { JSX } from "react";
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
import TableTemp from "@/components/CollapsibleTableV2/TableTemp";
import { useEffect, useRef, useState } from "react";
import {
  getFilledFilters,
  useTableFilters,
} from "@/components/CollapsibleTableV2/Components/TableFilters/TableFilters";
import axios from "axios";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";
import { theme } from "@/theme/customTheme";
import { useTableSettings } from "@/components/CollapsibleTableV2/Components/TableSettings";
import { StyledTeaButton } from "@/components/CollapsibleTableV2/Components/StyledComponents";
import "@/assets/custom.css";
import CreateAnimeModal from "@/components/Modals/CreateAnimeModal";
import Constants from "@/constants/Constants";
import { AnimeService } from "@/services/AnimeServices";
import TableHeaders from "@/components/CollapsibleTableV2/Components/Headers/Headers";
import UpdateDeleteAnimeModal from "@/components/Modals/UpdateDeleteAnimeModal";
import { useRouter, useSearchParams } from "next/navigation";
import PersonIcon from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";

export default function AnimePage() {
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
    // Admin control securely
    let isAdmin = false;

    if (typeof window !== "undefined") {
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const userData = JSON.parse(userStr);
          isAdmin = userData?.isAdmin || false;
        }
      } catch (error) {
        console.error("User information parsing failed:", error);
      }
    }

    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 1,
        }}
      >
        <StyledTeaButton
          onClick={() => {
            setModalData({
              status: true,
              type: "update",
              data: data,
            });
          }}
          disabled={!isAdmin}
          sx={{
            fontFamily: "inherit",
            opacity: !isAdmin ? 0.5 : 1,
            cursor: !isAdmin ? "not-allowed" : "pointer",
          }}
          color="primary"
        >
          <Typography variant="button">Update</Typography>
        </StyledTeaButton>
        <StyledTeaButton
          onClick={() => {
            setModalData({
              status: true,
              type: "delete",
              data: data,
            });
          }}
          disabled={!isAdmin}
          sx={{
            backgroundColor: theme.danger,
            fontFamily: "inherit",
            opacity: !isAdmin ? 0.5 : 1,
            cursor: !isAdmin ? "not-allowed" : "pointer",
          }}
        >
          <Typography variant="button">Delete</Typography>
        </StyledTeaButton>
      </Box>
    );
  }

  const { filterState, handleClickFilters, ...tableFilterProps } =
    useTableFilters(
      Constants({ type: "tableFilters", additionalData: { genres, series } })!,
      () => {
        if (lastFetchParams.current) {
          const updatedParams = {
            ...lastFetchParams.current,
            page: 1,
          };
          getData(updatedParams);
        }
      }
    );
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

        // Reset order parameters to get new data
        getData({
          page: 1,
          count: 10,
          filters: [],
          order: "asc", // Specify default sorting direction
          orderBy: "Name", // Specify default sorting field
        });
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

        // Reset order parameters to get new data
        getData({
          page: 1,
          count: 10,
          filters: [],
          order: "asc", // Specify default sorting direction
          orderBy: "Name", // Specify default sorting field
        });
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

        // Reset order parameters to get new data
        getData({
          page: 1,
          count: 10,
          filters: [],
          order: "asc", // Specify default sorting direction
          orderBy: "Name", // Specify default sorting field
        });
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
