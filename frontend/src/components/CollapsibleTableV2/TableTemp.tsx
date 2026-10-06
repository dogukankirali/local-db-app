/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { Box, Pagination, Skeleton, useMediaQuery } from "@mui/material";
import CrisisAlertIcon from "@mui/icons-material/CrisisAlert";
import { theme } from "../../theme/customTheme";
import CustomTableRowV2 from "./Components/CustomTableRowV2";
import TableHeader from "./Components/TableHeader";

// INewTableProps tipini genişletelim
declare namespace TEATableProps {
  interface INewTableProps<T> {
    data?: TEAData.WPagination<T>;
    setData?: React.Dispatch<React.SetStateAction<TEAData.WPagination<T>>>;
    header: TEATable.IColumnItems;
    sortHeader?: React.Dispatch<React.SetStateAction<TEATable.IColumnItems>>;
    collapsible: TEATable.ITableCollapse<T>;
    updateInnerCard?: TEATable.OnInnerUpdate;
    tableRerender: TEATable.FetchData;
    style?: React.CSSProperties;
    selectionFilters?: TEATable.IFilterType[];
    setSelectionFilters?: React.Dispatch<
      React.SetStateAction<TEATable.IFilterType[]>
    >;
    loading?: boolean;
    rowsPerPage?: number;
    extendedTable?: boolean;
    extraDependecies?: any[];
    dimensions?: {
      height: number;
      width: number;
    };
    tableName?: string;
    resetPage?: boolean; // Sayfa numarasını sıfırlamak için yeni özellik
    lastFetchParams?: TEATable.FetchDataParams; // Son fetch parametreleri
  }
}

export default function TableTemp<T extends {}>(
  props: TEATableProps.INewTableProps<T>
) {
  const [order, setOrder] = useState<TEATable.Order>("asc");
  const [orderBy, setOrderBy] = useState<string>("Name");
  const [page, setPage] = useState<number>(1);
  const handleChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const isMobile = useMediaQuery("(max-width:768px)");

  const optimisticUpdate = (data: T) => {
    if (!props.setData || !("id" in data) || !props.data) return;
    const newData = props.data.data.map((d) => {
      if ("id" in d && (d as any).id === (data as any).id) return data;
      return d;
    });
    props.setData({ ...props.data, data: newData });
  };

  // Veri değiştiğinde sayfa numarasını kontrol et
  useEffect(() => {
    // Eğer veri değişirse, sayfa 1'e dön
    if (
      props.data &&
      props.data.pagination &&
      props.data.pagination.currentPage === 1
    ) {
      setPage(1);
    }
  }, [props.data]);

  // Props'tan gelen sıralama parametrelerini kontrol et ve güncelle
  useEffect(() => {
    // Eğer props'tan lastFetchParams değeri geldiyse
    if (props.lastFetchParams) {
      // Order ve orderBy değerleri varsa, mevcut state'leri güncelle
      if (props.lastFetchParams.order) {
        setOrder(props.lastFetchParams.order as TEATable.Order);
        console.log("Order state güncellendi:", props.lastFetchParams.order);
      }

      if (props.lastFetchParams.orderBy) {
        setOrderBy(props.lastFetchParams.orderBy);
        console.log(
          "OrderBy state güncellendi:",
          props.lastFetchParams.orderBy
        );
      }
    }
  }, [props.lastFetchParams]);

  useEffect(() => {
    const abortController = new AbortController();

    // Sıralama parametrelerini kontrol et
    const validOrder = order === "asc" || order === "desc" ? order : "asc";
    const validOrderBy = orderBy || "Name";

    console.log("Tablo yeniden render ediliyor:", {
      order: validOrder,
      orderBy: validOrderBy,
      page,
      count: props.rowsPerPage ?? 10,
      filters: props.selectionFilters,
    });

    props.tableRerender({
      order: validOrder,
      orderBy: validOrderBy,
      abortController,
      page,
      count: props.rowsPerPage ?? 10,
      filters: props.selectionFilters,
    });

    return () => {
      abortController.abort();
    };
  }, [
    order,
    orderBy,
    page,
    props.rowsPerPage,
    props.selectionFilters,
    ...(props.extraDependecies ?? []),
  ]);

  // Veri değiştiğinde sayfa numarasını güncelle
  useEffect(() => {
    if (props.data && props.data.pagination) {
      // Eğer backend'den gelen sayfa numarası, mevcut sayfa numarasından farklıysa güncelle
      if (props.data.pagination.currentPage !== page) {
        setPage(props.data.pagination.currentPage);
      }
    }
  }, [props.data]);

  useEffect(() => {
    if (props.resetPage) {
      setPage(1);
    }
  }, [props.resetPage]);

  // Filtre değiştiğinde sayfa numarasını sıfırla
  useEffect(() => {
    if (props.selectionFilters) {
      setPage(1);
    }
  }, [props.selectionFilters]);

  // Filtre değişikliği eventini dinle
  useEffect(() => {
    const handleFilterChange = () => {
      setPage(1);
    };

    window.addEventListener("filterChange", handleFilterChange);

    return () => {
      window.removeEventListener("filterChange", handleFilterChange);
    };
  }, []);

  const loading = props.loading === undefined ? false : props.loading;

  const SkeletonRow = () => (
    <TableRow
      sx={{
        width: "100%",
        backgroundColor: theme.table_row_dark,
      }}
    >
      {props.collapsible.isCollapsible && (
        <TableCell height="72">
          <Skeleton variant="rounded" width={24} height={24} animation="wave" sx={{ bgcolor: "rgba(255,255,255,0.05)" }} />
        </TableCell>
      )}
      {props.header.map((h, index) => {
        const isCover = h.type === "base64";
        return (
          <TableCell key={index} height="72">
            <Skeleton
              variant="rounded"
              width={isCover ? 40 : "80%"}
              height={isCover ? 56 : 14}
              animation="wave"
              sx={{ mx: "auto", borderRadius: isCover ? "6px" : "4px", bgcolor: "rgba(255,255,255,0.05)" }}
            />
          </TableCell>
        );
      })}
    </TableRow>
  );

  return (
    <Paper
      className="custom-table-scroll"
      sx={{
        width: "100%",
        // Tek dış çerçeve; iç hücrelerde yalnızca ince satır ayırıcıları (üst üste binen gri çizgiler kaldırıldı)
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "12px",
        boxShadow: "none",
        overflow: "hidden",
        position: "relative",
        // Ebeveynin yüksekliğini doldurur: satırlar kendi içinde kayar, sayfalama her zaman altta görünür
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: `${theme.background_light} !important`,
        "& .MuiTableCell-root": { borderColor: "rgba(255,255,255,0.05)" },
      }}
    >
      <TableContainer
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: isMobile ? "auto" : "hidden",
          backgroundColor: theme.background,
          color: theme.primary_text,
          borderRadius: 0,
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.18) transparent",
        }}
        component={Paper}
      >
          <Table
            stickyHeader
            sx={{
              height: "max-content",
              overflowX: "hidden",
              scrollbarColor: "blue",
              backgroundColor: theme.table_header,
            }}
            aria-label="collapsible table"
          >
            <TableHeader
              headers={props.header}
              setHeaders={props.sortHeader}
              order={order}
              orderBy={orderBy}
              setOrder={setOrder}
              setOrderBy={setOrderBy}
              tableName={props.tableName ?? ""}
              isCollapsible={props?.collapsible?.isCollapsible}
            />
            <TableBody sx={{ overflowX: "hidden", height: "100%" }}>
              {props.data !== undefined &&
                props.data.data.length > 0 &&
                !loading &&
                props.data.data.map((singleData, i) => (
                  <CustomTableRowV2
                    index={i}
                    key={i}
                    singleData={singleData}
                    headers={props.header}
                    collapsible={props.collapsible}
                    updateInnerCard={props.updateInnerCard as any}
                    updateData={optimisticUpdate}
                    filterState={props.selectionFilters}
                    setFilterState={props.setSelectionFilters}
                  />
                ))}
              {(props.data === undefined || props.data.data.length === 0) &&
                !loading && (
                  <TableRow
                    sx={{
                      backgroundColor: theme.table_row_dark,
                    }}
                  >
                    <TableCell colSpan={100} rowSpan={6} sx={{ borderBottom: 0 }}>
                      <Box
                        sx={{
                          height: "320px",
                          width: "100%",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          flexDirection: "column",
                          gap: 0.75,
                          color: theme.secondary_text,
                        }}
                      >
                        <CrisisAlertIcon />
                        <b style={{ color: theme.primary_text }}>Sonuç yok</b>
                        <span style={{ fontSize: "0.85rem" }}>Filtreleri değiştirip tekrar dene.</span>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              {loading &&
                new Array(props.rowsPerPage ?? 10)
                  .fill(undefined)
                  .map((_, i) => <SkeletonRow key={i} />)}
            </TableBody>
          </Table>
      </TableContainer>
      {props.data !== undefined && (() => {
        const p = props.data.pagination;
        const current = p.currentPage || page;
        const per = p.itemsPerPage || props.rowsPerPage || 10;
        const from = p.totalItemCount ? (current - 1) * per + 1 : 0;
        const to = Math.min(current * per, p.totalItemCount);
        return (
          <Box
            sx={{
              width: "100%",
              flexShrink: 0,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1,
              px: 2,
              py: 1,
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <Box sx={{ fontSize: "0.8rem", color: theme.secondary_text }}>
              {p.totalItemCount ? `${from}–${to} / ${p.totalItemCount} anime` : "Kayıt yok"}
            </Box>
            <Pagination
              shape="rounded"
              size="small"
              sx={{
                "& .MuiPaginationItem-root": {
                  color: theme.secondary_text,
                  borderRadius: "8px",
                  minWidth: 30,
                  height: 30,
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  border: "1px solid transparent",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.06)", color: theme.primary_text },
                },
                "& .MuiPaginationItem-page.Mui-selected": {
                  backgroundColor: "rgba(124,92,255,0.18)",
                  borderColor: "rgba(124,92,255,0.45)",
                  color: theme.primary_text,
                  fontWeight: 700,
                  "&:hover": { backgroundColor: "rgba(124,92,255,0.26)" },
                },
                "& .MuiPaginationItem-ellipsis": { border: 0 },
              }}
              count={p.totalPageCount}
              page={current}
              siblingCount={isMobile ? 0 : 1}
              boundaryCount={1}
              showFirstButton={!isMobile}
              showLastButton={!isMobile}
              onChange={handleChange}
            />
          </Box>
        );
      })()}
    </Paper>
  );
}
