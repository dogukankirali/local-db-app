import {
  Box,
  Dialog,
  DialogActions,
  DialogTitle,
  Typography,
} from "@mui/material";
import { theme } from "../../theme/customTheme";
import Scrollbars from "react-custom-scrollbars-2";
import { StyledTeaButton } from "../CollapsibleTableV2/Components/StyledComponents";
import InnerList from "../CollapsibleTableV2/Components/Collapse/NewInnerList";
import Constants from "../../constants/Constants";

type Props = {
  createModalData: any;
  setCreateModalData: any;
  genres: any;
  handleCreate: any;
};

export default function CreateAnimeModal({
  createModalData,
  setCreateModalData,
  genres,
  handleCreate,
}: Props) {
  return (
    <Dialog
      open={createModalData.status}
      onClose={() => setCreateModalData({ status: !createModalData.status })}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      fullWidth
      maxWidth="xl"
      PaperProps={{ sx: { backgroundColor: theme.background } }}
    >
      <DialogTitle
        id="alert-dialog-title"
        sx={{
          color: theme.primary_text,
        }}
      >
        <Typography variant="h5">Create Anime</Typography>
      </DialogTitle>

      <Scrollbars
        style={{
          height: 900,
          overflow: "hidden",
          width: "100%",
        }}
      >
        {genres && (
          <InnerList
            data={createModalData.data}
            list={Constants({ type: "modalList" }).toSpliced(8, 0, {
              key: "Genre",
              value: "Genre",
              icon: <></>,
              type: "multi-select",
              options: genres!,
            })}
            setData={setCreateModalData}
            type={"create"}
          />
        )}
      </Scrollbars>
      <DialogActions>
        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <StyledTeaButton onClick={handleCreate}>
            <Typography variant="button">Create</Typography>
          </StyledTeaButton>
          <StyledTeaButton
            onClick={() => {
              setCreateModalData({ status: false });
            }}
          >
            <Typography variant="button">Cancel</Typography>
          </StyledTeaButton>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
