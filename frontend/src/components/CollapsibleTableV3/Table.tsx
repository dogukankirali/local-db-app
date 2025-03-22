import React, { useEffect, useState, useRef } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { Box, Pagination, Skeleton, useMediaQuery } from "@mui/material";
import CrisisAlertIcon from "@mui/icons-material/CrisisAlert";
import { theme } from "../../theme/customTheme";
import CustomTableRow from "./TableRow";
import TableHeader from "./TableHeader";
import { Scrollbars } from "react-custom-scrollbars-2";

export default function CollapsibleTable<T extends Record<string, any>>(
  props: TEATable.ITableProps<T>
) {
  const [order, setOrder] = useState<TEATable.Order>("asc");
  const [orderBy, setOrderBy] = useState<string>("Name");
  const [page, setPage] = useState<number>(1);

  const handleChange = (event: React.ChangeEvent<unknown>, value: number) => {
    if (value === page) return;

    setPage(value);

    props.tableRerender(
      order,
      orderBy,
      (props.selectionFilters ?? []) as any[],
      props.rowsPerPage ?? 10,
      value
    );
  };

  useEffect(() => {
    if (
      props.data &&
      props.data.pagination &&
      props.data.pagination.currentPage
    ) {
      if (props.data.pagination.currentPage !== page) {
        setPage(props.data.pagination.currentPage);
      }
    }
  }, [props.data, page]);

  const isMobile = useMediaQuery("(max-width:768px)");

  const optimisticUpdate = (data: T) => {
    if (!props.setData || !("id" in data) || !props.data) return;
    const newData = props.data.data.map((d: T) => {
      if ("id" in d && (d as any).id === (data as any).id) return data;
      return d;
    });
    props.setData({ ...props.data, data: newData });
  };

  useEffect(() => {
    // Bu useEffect sadece ilk render'da ve
    // order, orderBy, rowsPerPage, selectionFilters değiştiğinde çalışsın
    // Sayfa değişikliği handleChange fonksiyonu tarafından ele alınıyor
    const abortController = new AbortController();

    // Sayfa değişikliği handleChange tarafından ele alındığı için
    // burada sadece ilk yükleme ve diğer parametreler değiştiğinde çalışsın
    if (!lastRenderRef.current) {
      props.tableRerender(
        order,
        orderBy,
        (props.selectionFilters ?? []) as any[],
        props.rowsPerPage ?? 10,
        page
      );
      lastRenderRef.current = true;
    }

    return () => {
      abortController.abort();
    };
  }, [
    order,
    orderBy,
    props.rowsPerPage,
    props.selectionFilters,
    props.tableRerender,
    ...(props.extraDependecies ?? []),
  ]);

  // Referans oluştur
  const lastRenderRef = useRef(false);

  const loading = props.loading === undefined ? false : props.loading;

  return (
    <Paper
      className="custom-table-scroll"
      sx={{
        width: "100%",
        borderTop: "1px solid gray",
        borderBottom: "1px solid gray",
        borderRadius: 5,
        boxShadow: "none",
        overflowY: "hidden",
        position: "relative",
        "& *": {
          borderColor: "gray !important",
        },
      }}
    >
      <TableContainer
        sx={{
          height: props.extendedTable
            ? "maxContent"
            : props.style?.height ?? 470,
          backgroundColor: theme.background,
          color: theme.primary_text,
          overflowX: isMobile ? "scroll" : "hidden",
        }}
        component={Paper}
      >
        <Scrollbars
          style={{
            height: props.dimensions?.height ?? 600,
          }}
        >
          <Table
            stickyHeader
            sx={{
              height: "max-content",
              overflowX: "hidden",
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
              tableName={props.tableName || ""}
              isCollapsible={props?.collapsible?.isCollapsible}
            />
            <TableBody sx={{ overflowX: "hidden", height: "100%" }}>
              {props.data?.data.length > 0 &&
                !loading &&
                props.data.data.map((singleData: T, i: number) => (
                  <CustomTableRow
                    key={i}
                    index={i}
                    singleData={singleData}
                    headers={props.header}
                    collapsible={props.collapsible}
                    updateInnerCard={props.updateInnerCard}
                    updateData={optimisticUpdate}
                    filterState={props.selectionFilters}
                    setFilterState={props.setSelectionFilters}
                  />
                ))}
              {!props.data?.data.length && !loading && (
                <TableRow
                  sx={{
                    backgroundColor: theme.table_row_dark,
                  }}
                >
                  <TableCell colSpan={100} rowSpan={6}>
                    <Box
                      sx={{
                        height: "378px",
                        width: "100%",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        flexDirection: "column",
                        gap: 0.5,
                      }}
                    >
                      <CrisisAlertIcon style={{ color: theme.input_text }} />
                      <b style={{ color: theme.input_text }}>No Data</b>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
              {loading &&
                Array(props.rowsPerPage ?? 10)
                  .fill(undefined)
                  .map((_, i) => (
                    <TableRow
                      key={i}
                      sx={{
                        width: "100%",
                        backgroundColor: theme.table_row_dark,
                      }}
                    >
                      {props.collapsible.isCollapsible && (
                        <TableCell height="73">
                          <Skeleton
                            variant="circular"
                            width={34}
                            height={34}
                            animation="wave"
                            sx={{
                              my: "2px",
                            }}
                          />
                        </TableCell>
                      )}
                      {props.header.map((_, index) => (
                        <TableCell key={index} height="73">
                          <Skeleton
                            variant="text"
                            width="100%"
                            height={32}
                            animation="wave"
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </Scrollbars>
      </TableContainer>
      {props.data && (
        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "40px",
            backgroundColor: theme.table_header,
            borderTop: "1px solid",
          }}
        >
          <Pagination
            sx={{
              "& .MuiPaginationItem-root": {
                color: theme.primary_text,
              },
              "& .MuiPaginationItem-page": {
                "&.Mui-selected": {
                  backgroundColor: theme.primary25,
                  color: theme.primary_text,
                },
              },
              "& .MuiPaginationItem-ellipsis": {
                color: theme.primary_text,
              },
              "& .MuiPaginationItem-icon": {
                color: theme.primary_text,
              },
            }}
            count={props.data.pagination.totalPageCount}
            page={page}
            siblingCount={1}
            showFirstButton
            showLastButton
            size="small"
            onChange={handleChange}
          />
        </Box>
      )}
    </Paper>
  );
}
