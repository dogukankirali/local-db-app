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
import { Scrollbars } from "react-custom-scrollbars-2";

export default function TableTemp<T extends {}>(
  props: TEATable.INewTableProps<T>
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

  useEffect(() => {
    const abortController = new AbortController();
    props.tableRerender({
      order,
      orderBy,
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

  const loading = props.loading === undefined ? false : props.loading;

  const SkeletonRow = () => (
    <TableRow
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
      {props.header.map((_) => {
        return (
          <TableCell height="73">
            <Skeleton
              variant="text"
              width="100%"
              height={32}
              animation="wave"
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
        // borderTop: "1px solid #515151",
        borderTop: "1px solid gray",
        borderBottom: "1px solid gray",
        borderRadius: 5,
        boxShadow: "none",
        overflowY: "hidden",
        position: "relative",
        "& *": {
          // borderColor: "#515151 !important",
          borderColor: "gray !important",
        },
      }}
    >
      <TableContainer
        sx={{
          height: props.extendedTable
            ? "maxContent"
            : props.style !== undefined
            ? props.style.height
            : 470,
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
              tableName={props.tableName}
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
                    updateInnerCard={props.updateInnerCard}
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
                new Array(props.rowsPerPage ?? 10)
                  .fill(undefined)
                  .map((_, i) => <SkeletonRow key={i} />)}
            </TableBody>
          </Table>
        </Scrollbars>
      </TableContainer>
      {props.data !== undefined && (
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
              // Aşağıdaki stil özellikleri, Pagination bileşeninin alt bileşenlerine uygulanır
              "& .MuiPaginationItem-root": {
                color: theme.primary_text, // Normal yazı rengi
              },
              "& .MuiPaginationItem-page": {
                "&.Mui-selected": {
                  backgroundColor: theme.primary25,
                  color: theme.primary_text, // Seçili yazı rengi
                },
              },
              "& .MuiPaginationItem-ellipsis": {
                color: theme.primary_text, // "..." yazı rengi
              },
              "& .MuiPaginationItem-icon": {
                color: theme.primary_text, // İlk ve Son butonlarındaki ikonların rengi
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
