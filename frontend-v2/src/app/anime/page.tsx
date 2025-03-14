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
import { useRouter } from "next/navigation";
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

  function SettingsButtons(id: string, i: number, data?: any): JSX.Element {
    // Admin kontrolünü güvenli şekilde yapalım
    let isAdmin = false;

    if (typeof window !== "undefined") {
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
            fontFamily: "inherit",
            opacity: !isAdmin ? 0.5 : 1,
            cursor: !isAdmin ? "not-allowed" : "pointer",
          }}
          color="error"
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
      console.log("Veri çekiliyor:", { ...params, filters });
      const res = await AnimeService.getAnimes({ ...params, filters });

      if (!aborted) {
        setTableData(res);
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        aborted = true;
      } else {
        console.error("Veri çekme hatası:", err);
      }
    }

    if (!aborted) {
      setDataLoading(false);
    }
  };

  async function updateAnime() {
    try {
      const res = await AnimeService.updateAnime(modalData.data!);
      if (res.status === 200) {
        Toastify({
          text: "Anime başarıyla güncellendi",
          duration: 3000,
          close: true,
          gravity: "top",
          position: "right",
          backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
          stopOnFocus: true,
        }).showToast();
        setModalData({ status: false });
        getData({
          page: 1,
          count: 10,
          filters: [],
        });
      }
    } catch (err) {
      console.error(err);
      Toastify({
        text: "Anime güncellenirken bir hata oluştu",
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
          text: "Anime başarıyla silindi",
          duration: 3000,
          close: true,
          gravity: "top",
          position: "right",
          backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
          stopOnFocus: true,
        }).showToast();
        setModalData({ status: false });
        getData({
          page: 1,
          count: 10,
          filters: [],
        });
      }
    } catch (err) {
      console.error(err);
      Toastify({
        text: "Anime silinirken bir hata oluştu",
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
          text: "Anime başarıyla oluşturuldu",
          duration: 3000,
          close: true,
          gravity: "top",
          position: "right",
          backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
          stopOnFocus: true,
        }).showToast();
        setCreateModalData({ status: false });
        getData({
          page: 1,
          count: 10,
          filters: [],
        });
      }
    } catch (err) {
      console.error(err);
      Toastify({
        text: "Anime oluşturulurken bir hata oluştu",
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

  // Kullanıcı bilgisini yükle
  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);
        console.log("Kullanıcı bilgisi yüklendi:", userData);
      }
    } catch (error) {
      console.error("Kullanıcı bilgisi yüklenirken hata oluştu:", error);
    }
  }, []);

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
      // Çıkış işlemi
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      router.push("/login");
    } catch (error) {
      console.error("Çıkış yapılırken hata oluştu:", error);
      Toastify({
        text: "Çıkış yapılırken bir hata oluştu",
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
          {/* Profil ikonu ve popup */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
            <Tooltip title="Profil">
              <IconButton
                size={windowSize.width < 768 ? "small" : "medium"}
                onClick={handleProfileMenu}
              >
                <Avatar
                  sx={{
                    width: windowSize.width < 768 ? 28 : 36,
                    height: windowSize.width < 768 ? 28 : 36,
                  }}
                >
                  {user?.username ? user.username.charAt(0).toUpperCase() : "U"}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              id="profile-menu"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              open={Boolean(anchorEl)}
              onClose={handleCloseMenu}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {user?.username || "Kullanıcı"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email || "kullanici@ornek.com"}
                </Typography>
              </Box>
              <Divider />
              <MenuItem onClick={handleProfileClick}>
                <PersonIcon fontSize="small" sx={{ mr: 1 }} />
                Profil
              </MenuItem>
              {user?.isAdmin && (
                <MenuItem onClick={handleCloseMenu}>
                  <SettingsIcon fontSize="small" sx={{ mr: 1 }} />
                  Yönetici Paneli
                </MenuItem>
              )}
              <Divider />
              <MenuItem onClick={handleLogout}>
                <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                Çıkış Yap
              </MenuItem>
            </Menu>
          </Box>
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
