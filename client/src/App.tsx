import {
  AppBarProps,
  Box,
  CssBaseline,
  Divider,
  Grid,
  IconButton,
  Link,
  Paper,
  Toolbar,
  Typography,
  styled,
} from "@mui/material";
import TableTemp from "./components/CollapsibleTableV2/TableTemp";
import { useEffect, useState } from "react";
import TableFilters, {
  combineFilters,
  getFilledFilters,
  useTableFilters,
} from "./components/CollapsibleTableV2/Components/TableFilters/TableFilters";
import axios from "axios";
import Toastify from "./components/CollapsibleTableV2/Utils/Toastify";
import { theme } from "./theme/customTheme";
import TableSettings, {
  useTableSettings,
} from "./components/CollapsibleTableV2/Components/TableSettings";
import { StyledMUIFilterButton } from "./components/CollapsibleTableV2/Components/StyledComponents";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  Badge,
  Button,
  Col,
  Container,
  List,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
} from "reactstrap";
import InnerList from "./components/CollapsibleTableV2/Components/Collapse/NewInnerList";
import "bootstrap/dist/css/bootstrap.min.css";
import "./assets/custom.css";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import NotificationsIcon from "@mui/icons-material/Notifications";
import MuiAppBar, { AppBarProps as MuiAppBarProps } from "@mui/material/AppBar";
import MuiDrawer from "@mui/material/Drawer";
import MenuIcon from "@mui/icons-material/Menu";

export default function App() {
  const [open, setOpen] = useState(false);
  const [openD, setOpenD] = useState(true);
  const toggleDrawer = () => {
    setOpen(!open);
  };
  const [modalData, setModalData] = useState<
    { data: TEATable.IAnime; type: "update" | "delete" } | undefined
  >(undefined);
  const [tableData, setTableData] = useState<
    TEAData.WPagination<TEATable.IAnime>
  >({
    data: [],
    pagination: {
      totalItemCount: 0,
      totalPageCount: 0,
      itemCount: 0,
      itemsPerPage: 10,
      currentPage: 1,
    },
  });
  const [genres, setGenres] = useState<
    {
      value: string;
      label: string;
    }[]
  >();
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [outerColumns, setOuterColumns] = useState<TEATable.IColumnItems>([
    { key: "Cover", value: "Cover", width: "2%", type: "base64" },
    { key: "Name", value: "Name", width: "40%", type: "string" },
    { key: "AnimeStatus", value: "Anime Status", width: "10%", type: "status" },
    {
      key: "WatchStatus",
      value: "Watch Status",
      width: "10%",
      type: "episode",
    },
    {
      key: "TotalNumberOfEpisodes",
      value: "Total Number Of Episodes",
      width: "10%",
      type: "number",
    },
    { key: "Score", value: "Score", width: "5%", type: "score" },
    { key: "IsMovie", value: "TV Series/Movie", width: "5%", type: "tv-movie" },
    { key: "Genre", value: "Genre", width: "15%", type: "pill" },
    { key: SettingsButtons, value: "Settings", width: "5%", type: "button" },
  ]);
  const headers: TEATable.IColumnItems = [
    { key: "Cover", value: "Cover", width: "50px", type: "base64" },
    { key: "Name", value: "Name", width: "100%", type: "string" },
    {
      key: "AnimeStatus",
      value: "Anime Status",
      width: "100%",
      type: "string",
    },
    {
      key: "WatchStatus",
      value: "Watch Status",
      width: "100%",
      type: "string",
    },
    {
      key: "TotalNumberOfEpisodes",
      value: "Total Number Of Episodes",
      width: "100%",
      type: "number",
    },
    { key: "Score", value: "Score", width: "100%", type: "number" },
    {
      key: "IsMovie",
      value: "TV Series/Movie",
      width: "100%",
      type: "boolean",
    },
    { key: "Genre", value: "Genre", width: "100%", type: "string" },
  ];
  const [innerColumns, setInnerColumns] = useState([
    { key: "MALScore", value: "MAL Score", icon: <></>, type: "string" },
    { key: "Notes", value: "Notes", icon: <></>, type: "string" },
    { key: "AnimeLink", value: "Watch Link", icon: <></>, type: "link" },
    { key: "MALAnimeLink", value: "MAL Page", icon: <></>, type: "link" },
  ]);
  const modalList = [
    { key: "Cover", value: "Cover", type: "base64" },
    { key: "Notes", value: "Notes", icon: <></>, type: "textarea" },
    { key: "Name", value: "Name", icon: <></>, type: "input" },
    {
      key: "AnimeStatus",
      value: "Anime Status",
      icon: <></>,
      type: "select",
      options: [
        { key: "OnAir", label: "On Air" },
        { key: "Finished", label: "Finished" },
      ],
    },
    { key: "WatchStatus", value: "Watch Status", icon: <></>, type: "input" },
    {
      key: "TotalNumberOfEpisodes",
      value: "Total Number Of Episodes",
      icon: <></>,
      type: "number",
    },
    { key: "Score", value: "Score", icon: <></>, type: "score" },
    { key: "IsMovie", value: "TV Series/Movie", icon: <></>, type: "boolean" },
    {
      key: "Genre",
      value: "Genre",
      icon: <></>,
      type: "multi-select",
      options: genres,
    },
    { key: "MALScore", value: "MAL Score", icon: <></>, type: "input" },
    { key: "AnimeLink", value: "Watch Link", icon: <></>, type: "input" },
    { key: "MALAnimeLink", value: "MAL Page", icon: <></>, type: "input" },
  ];
  const [dataState, setDataState] = useState<TEATable.IAnimeDetail>({
    ID: -1,
    Name: "hebelle",
    AnimeStatus: "Finished",
    WatchStatus: "",
    TotalNumberOfEpisodes: "",
    IsMovie: false,
    Genre: "",
    Score: "0",
    MALScore: "",
    Notes: "",
    AnimeLink: "",
    MALAnimeLink: "",
    Cover: "",
  });

  function SettingsButtons(id: string, i: number, data?: any) {
    return (
      <Box
        sx={{
          display: "flex",
          gap: 1,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Button
          onClick={() => {
            setModalData({ data: data, type: "update" });
            setOpen(true);
          }}
        >
          {" "}
          Update{" "}
        </Button>
        <Button
          onClick={() => {
            setModalData({ data: data, type: "delete" });
            setOpen(true);
          }}
        >
          {" "}
          Delete{" "}
        </Button>
      </Box>
    );
  }

  const drawerWidth: number = 240;

  function Copyright(props: any) {
    return (
      <Typography
        variant="body2"
        color="text.secondary"
        align="center"
        {...props}
      >
        {"Copyright © "}
        <Link color="inherit" href="https://mui.com/">
          Your Website
        </Link>{" "}
        {new Date().getFullYear()}
        {"."}
      </Typography>
    );
  }

  const { filterState, handleClickFilters, ...tableFilterProps } =
    useTableFilters([
      {
        label: "Name",
        key: "Name",
        type: "input",
      },
      {
        label: "AnimeStatus",
        key: "AnimeStatus",
        type: "multi-select",
        options: [
          {
            value: "OnAir",
            label: "On Air",
          },
          {
            value: "Finished",
            label: "Finished",
          },
        ],
      },
      {
        label: "WatchStatus",
        key: "WatchStatus",
        type: "input",
      },
      {
        label: "TotalNumberOfEpisodes",
        key: "TotalNumberOfEpisodes",
        type: "number",
        options: {
          min: 0,
          max: 400,
        },
      },
      {
        label: "IsMovie",
        key: "IsMovie",
        type: "multi-select",
        options: [
          {
            value: "true",
            label: "Movie",
          },
          {
            value: "false",
            label: "TV Series",
          },
        ],
      },
      {
        label: "Genre",
        key: "Genre",
        type: "multi-select",
        options: genres!,
      },
      {
        label: "Score",
        key: "Score",
        type: "number",
        options: {
          min: 0,
          max: 100,
        },
      },
    ]);
  const { handleClickSettings, ...settingsProps } = useTableSettings();

  const getGenres: any = async () => {
    try {
      const res = await axios.post("/getGenres", {
        filterArray: [],
      });
      const finalData: { value: string; label: string }[] = [];
      res.data.map((item: { name: string }) => {
        finalData.push({
          value: item.name,
          label: item.name,
        });
      });
      setGenres(finalData);
    } catch (err) {
      console.error(err);
    }
  };

  const getData: TEATable.FetchData = async (params) => {
    setDataLoading(true);
    let aborted = false;
    const filters = getFilledFilters(params.filters ?? []);
    try {
      let uri = "";
      if (params.order !== undefined) {
        uri = `/getAnimeTable?page=${params.page}&count=${params.count}&order=${params.order}&orderBy=${params.orderBy}`;
      } else {
        uri = `/getAnimeTable?page=${params.page}&count=${params.count}`;
      }
      const res = await axios.post(uri, {
        filterArray: filterState,
      });

      setTableData(res.data);
    } catch (err) {
      if (axios.isCancel(err)) {
        aborted = true;
      }
    }
    !aborted && setDataLoading(false);
  };

  async function updateAnime() {
    await axios
      .post("/updateAnimeTable", dataState)
      .then((resp: any) => {
        getData({ count: 10, page: 1 });
        setOpen(false);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  async function createAnime() {
    await axios
      .post("/createAnime", dataState)
      .then((resp: any) => {
        getData({ count: 10, page: 1 });
        setOpen(false);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  const tableRerender: TEATable.FetchData = (params) => {
    getData(params);
  };

  useEffect(() => {
    getGenres();
  }, []);

  interface AppBarProps extends MuiAppBarProps {
    open?: boolean;
  }

  const AppBar = styled(MuiAppBar, {
    shouldForwardProp: (prop) => prop !== "open",
  })<AppBarProps>(({ theme, open }) => ({
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    ...(open && {
      marginLeft: drawerWidth,
      width: `calc(100% - ${drawerWidth}px)`,
      transition: theme.transitions.create(["width", "margin"], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
  }));

  const Drawer = styled(MuiDrawer, {
    shouldForwardProp: (prop) => prop !== "open",
  })(({ theme, open }) => ({
    "& .MuiDrawer-paper": {
      position: "relative",
      whiteSpace: "nowrap",
      width: drawerWidth,
      transition: theme.transitions.create("width", {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
      boxSizing: "border-box",
      ...(!open && {
        overflowX: "hidden",
        transition: theme.transitions.create("width", {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
        width: theme.spacing(7),
        [theme.breakpoints.up("sm")]: {
          width: theme.spacing(9),
        },
      }),
    },
  }));

  return (
    <div className="App">
      <Box sx={{ display: "flex" }}>
        <CssBaseline />
        <AppBar position="absolute" open={openD}>
          <Toolbar
            sx={{
              pr: "24px", // keep right padding when drawer closed
            }}
          >
            <IconButton
              edge="start"
              color="inherit"
              aria-label="open drawer"
              onClick={toggleDrawer}
              sx={{
                marginRight: "36px",
                ...(openD && { display: "none" }),
              }}
            >
              <MenuIcon />
            </IconButton>
            <Typography
              component="h1"
              variant="h6"
              color="inherit"
              noWrap
              sx={{ flexGrow: 1 }}
            >
              Dashboard
            </Typography>
            <IconButton color="inherit">
              <Badge badgeContent={4} color="secondary">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Toolbar>
        </AppBar>
        <Drawer variant="permanent" open={openD}>
          <Toolbar
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              px: [1],
            }}
          >
            <IconButton onClick={toggleDrawer}>
              <ChevronLeftIcon />
            </IconButton>
          </Toolbar>
          <Divider />
          <List component="nav">
            <Divider sx={{ my: 1 }} />
          </List>
        </Drawer>
        <Box
          component="main"
          sx={{
            backgroundColor: (theme) =>
              theme.palette.mode === "light"
                ? theme.palette.grey[100]
                : theme.palette.grey[900],
            flexGrow: 1,
            height: "100vh",
            overflow: "auto",
          }}
        >
          <Toolbar />
          <Row>
            <Col lg="12" style={{ justifyContent: "center", display: "flex" }}>
              <Box sx={{ marginTop: 10 }}>
                <Button
                  onClick={() => {
                    alert("update cancel");
                  }}
                >
                  {" "}
                  Create{" "}
                </Button>
                <Box
                  sx={{
                    width: "2200px",
                    height: "600px",
                  }}
                >
                  <TableFilters
                    filterState={filterState}
                    {...tableFilterProps}
                  />
                  <TableSettings
                    {...settingsProps}
                    headers={outerColumns}
                    setHeaders={setOuterColumns}
                    headerOpts={headers}
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
                    <StyledMUIFilterButton onClick={handleClickFilters}>
                      <FilterAltIcon />
                    </StyledMUIFilterButton>
                    <StyledMUIFilterButton onClick={handleClickSettings}>
                      <SettingsIcon />
                    </StyledMUIFilterButton>
                  </Box>
                  <Box>
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
                        height: "900px",
                      }}
                      selectionFilters={filterState}
                      loading={dataLoading}
                    />
                  </Box>
                </Box>
              </Box>
            </Col>
          </Row>
        </Box>
      </Box>
      <Modal centered size={"xl"} isOpen={open} toggle={() => setOpen(!open)}>
        <ModalHeader toggle={() => setOpen(!open)}>
          {modalData?.type === "delete"
            ? `Delete - ${modalData?.data.Name}`
            : `Update - ${modalData?.data.Name}`}
        </ModalHeader>
        <ModalBody>
          <InnerList
            data={modalData?.data!}
            list={modalList}
            setDataState={setDataState}
            dataState={dataState}
            type={"update"}
          />
        </ModalBody>
        <ModalFooter>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {modalData?.type === "delete" ? (
              <>
                <Button
                  onClick={() => {
                    alert("delete");
                  }}
                >
                  {" "}
                  Delete{" "}
                </Button>
                <Button
                  onClick={() => {
                    alert("delete cancel");
                  }}
                >
                  {" "}
                  Cancel{" "}
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => {
                    updateAnime();
                  }}
                >
                  {" "}
                  Update{" "}
                </Button>
                <Button
                  onClick={() => {
                    alert("update cancel");
                    createAnime();
                  }}
                >
                  {" "}
                  Cancel{" "}
                </Button>
              </>
            )}
          </Box>
        </ModalFooter>
      </Modal>
    </div>
  );
}

/* style?: any;
    selectionFilters?: IFilterType[];
    tableRerender: FetchData;
    loading?: boolean;
    rowsPerPage?: number;
    updateInnerCard?: OnInnerUpdate;
    isInnerTable?: boolean;
    extendedTable?: boolean;
    extraDependecies?: any[]; */
