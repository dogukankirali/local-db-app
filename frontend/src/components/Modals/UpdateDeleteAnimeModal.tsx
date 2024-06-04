import {
  Dialog,
  DialogTitle,
  Typography,
  DialogActions,
  Box,
} from "@mui/material";
import Scrollbars from "react-custom-scrollbars-2";
import Constants from "../../constants/Constants";
import { theme } from "../../theme/customTheme";
import InnerList from "../CollapsibleTableV2/Components/Collapse/NewInnerList";
import { StyledTeaButton } from "../CollapsibleTableV2/Components/StyledComponents";

export default function UpdateDeleteAnimeModal(props: {
  modalData: any;
  setModalData: any;
  updateAnime: any;
  deleteAnime: any;
  genres: any;
}) {
  //console.log(props.modalData);
  return (
    <Dialog
      open={props.modalData.status}
      onClose={() => props.setModalData({ status: !props.modalData.status })}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      maxWidth="xl"
      PaperProps={{ sx: { backgroundColor: theme.background } }}
      sx={{ "& .MuiDialog-paper": { width: "80%" } }}
    >
      <DialogTitle id="alert-dialog-title" sx={{ color: theme.primary_text }}>
        {props.modalData?.data !== undefined && (
          <Typography variant="h5">
            {props.modalData?.type === "delete"
              ? `Delete - ${props.modalData?.data.Name}`
              : `Update - ${props.modalData?.data!.Name}`}
          </Typography>
        )}
      </DialogTitle>
      <Scrollbars
        style={{
          height: 900,
          overflow: "hidden",
          width: "100%",
        }}
      >
        {props.modalData?.data && props.genres && (
          <InnerList
            data={props.modalData?.data!}
            list={Constants({ type: "modalList" }).toSpliced(8, 0, {
              key: "Genre",
              value: "Genre",
              icon: <></>,
              type: "multi-select",
              options: props.genres!,
            })}
            setData={props.setModalData}
            type={props.modalData?.type}
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
          {props.modalData?.type === "delete" ? (
            <>
              <StyledTeaButton
                sx={{ backgroundColor: theme.warning }}
                onClick={() => {
                  props.deleteAnime();
                }}
              >
                <Typography variant="button"> Delete </Typography>
              </StyledTeaButton>
              <StyledTeaButton
                sx={{ backgroundColor: theme.danger }}
                onClick={() => {
                  props.setModalData({ status: false });
                }}
              >
                <Typography variant="button"> Cancel </Typography>
              </StyledTeaButton>
            </>
          ) : (
            <>
              <StyledTeaButton
                sx={{ backgroundColor: theme.primary }}
                onClick={() => {
                  props.updateAnime();
                }}
              >
                <Typography variant="button"> Update </Typography>
              </StyledTeaButton>
              <StyledTeaButton
                sx={{ backgroundColor: theme.danger }}
                onClick={() => {
                  props.setModalData({ status: false });
                }}
              >
                <Typography variant="button"> Cancel </Typography>
              </StyledTeaButton>
            </>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
}
