import { Divider, IconButton, List, Toolbar, styled } from "@mui/material";
import MuiDrawer from "@mui/material/Drawer";
import { theme } from "../../theme/customTheme";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";

const drawerWidth: number = 240;

export const Drawer = styled(MuiDrawer, {
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

export default function DrawerComponent(props: {
  open: boolean;
  toggleDrawer: () => void;
}) {
  return (
    <Drawer
      variant="permanent"
      open={props.open}
      PaperProps={{
        sx: {
          backgroundColor: theme.background,
          color: "red",
          border: "solid",
          borderWidth: "1px",
          borderColor: theme.foreground,
        },
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          px: [1],
        }}
      >
        <IconButton onClick={props.toggleDrawer}>
          <ChevronLeftIcon style={{ color: theme.input_text }} />
        </IconButton>
      </Toolbar>
      <Divider />
      <List
        component="nav"
        sx={{
          backgroundColor: theme.background,
        }}
      >
        <Divider sx={{ my: 1 }} />
      </List>
    </Drawer>
  );
}
