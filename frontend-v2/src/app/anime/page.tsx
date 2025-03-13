"use client";

import React, { JSX } from "react";
import { Box, Container, Typography } from "@mui/material";
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

export default function AnimePage() {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
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

  function SettingsButtons(id: string, i: number, data?: any): JSX.Element {
    return (
      <Box
        sx={{
          display: "flex",
          gap: 1,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <StyledTeaButton
          sx={{ fontFamily: "inherit", backgroundColor: theme.primary }}
          onClick={() => {
            setModalData({ data: data, type: "update", status: true });
          }}
        >
          <Typography variant="button">Update</Typography>
        </StyledTeaButton>
        <StyledTeaButton
          sx={{ fontFamily: "inherit", backgroundColor: theme.danger }}
          onClick={() => {
            setModalData({ data: data, type: "delete", status: true });
          }}
        >
          <Typography variant="button">Delete</Typography>
        </StyledTeaButton>
      </Box>
    );
  }

  const { filterState, handleClickFilters, ...tableFilterProps } =
    useTableFilters(
      Constants({ type: "tableFilters", additionalData: { genres } })!,
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
    modalData.data!.MALScore = parseFloat(modalData.data!.MALScore.toString());
    await AnimeService.updateAnime(modalData.data!)
      .then((resp: any) => {
        getData(lastFetchParams.current!);
        setModalData({ status: false });
        Toastify({
          text: "Anime updated successfully",
          duration: 3000,
          close: true,
          gravity: "top",
          position: "right",
          backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
          stopOnFocus: true,
        }).showToast();
      })
      .catch((err) => {
        Toastify({
          text: "Failed to update anime",
          duration: 3000,
          close: true,
          gravity: "top",
          position: "right",
          backgroundColor: "linear-gradient(to right, #ff5f6d, #ffc371)",
          stopOnFocus: true,
        }).showToast();
      });
  }

  async function deleteAnime() {
    await AnimeService.deleteAnime(modalData.data!)
      .then((resp: any) => {
        getData(lastFetchParams.current!);
        setModalData({ status: false });
        Toastify({
          text: "Anime deleted successfully",
          duration: 3000,
          close: true,
          gravity: "top",
          position: "right",
          backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
          stopOnFocus: true,
        }).showToast();
      })
      .catch((err) => {
        Toastify({
          text: "Failed to delete anime",
          duration: 3000,
          close: true,
          gravity: "top",
          position: "right",
          backgroundColor: "linear-gradient(to right, #ff5f6d, #ffc371)",
          stopOnFocus: true,
        }).showToast();
      });
  }

  async function createAnime() {
    createModalData.data!.MALScore = parseFloat(
      createModalData.data!.MALScore.toString()
    );
    await AnimeService.createAnime(createModalData.data!)
      .then((resp: any) => {
        getData(lastFetchParams.current!);
        setCreateModalData({ status: false });
        Toastify({
          text: "Anime created successfully",
          duration: 3000,
          close: true,
          gravity: "top",
          position: "right",
          backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
          stopOnFocus: true,
        }).showToast();
      })
      .catch((err) => {
        Toastify({
          text: "Failed to create anime",
          duration: 3000,
          close: true,
          gravity: "top",
          position: "right",
          backgroundColor: "linear-gradient(to right, #ff5f6d, #ffc371)",
          stopOnFocus: true,
        }).showToast();
      });
  }

  const tableRerender: TEATable.FetchData = async (params) => {
    const updatedParams = { ...params };

    if (
      lastFetchParams.current &&
      (lastFetchParams.current.order !== params.order ||
        lastFetchParams.current.orderBy !== params.orderBy ||
        JSON.stringify(lastFetchParams.current.filters) !==
          JSON.stringify(params.filters))
    ) {
      updatedParams.page = 1;
    }

    setTableData({
      data: [],
      pagination: {
        currentPage: updatedParams.page || 1,
        itemCount: 0,
        totalItemCount: 0,
        itemsPerPage: 10,
        totalPageCount: 0,
      },
    });

    await getData(updatedParams);
  };

  useEffect(() => {
    getGenres();
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
  }, []);

  return (
    <div className="mx-auto bg-white w-[1000px]">
      <div className="bg-background min-h-screen p-4 grid gap-4">
        <div className="h-[calc(100vh-550px)]">
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
              height: windowSize.height - 200,
            }}
            selectionFilters={filterState}
            setSelectionFilters={tableFilterProps.setFilterState}
            loading={dataLoading}
            dimensions={{
              height: windowSize.height - 200,
              width: windowSize.width - 150,
            }}
          />
        </div>
      </div>
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
